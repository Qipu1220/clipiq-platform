import pool from '../config/database.js';

// MinIO configuration for URL construction
const MINIO_PUBLIC_ENDPOINT = process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = process.env.MINIO_PORT || '9000';
const MINIO_PROTOCOL = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';

/**
 * Construct full thumbnail URL from filename
 * @param {string} thumbnailUrl - Thumbnail filename or full URL
 * @param {string} fallbackId - ID for fallback placeholder image
 * @returns {string} - Full MinIO URL or placeholder
 */
function getFullThumbnailUrl(thumbnailUrl, fallbackId = null) {
  if (!thumbnailUrl) {
    return fallbackId ? `https://picsum.photos/seed/${fallbackId}/400/600` : null;
  }
  if (thumbnailUrl.startsWith('http')) return thumbnailUrl;
  return `${MINIO_PROTOCOL}://${MINIO_PUBLIC_ENDPOINT}:${MINIO_PORT}/clipiq-thumbnails/${thumbnailUrl}`;
}

/**
 * Analytics Service
 * Provides video popularity metrics based on watch behavior
 */

/**
 * Calculate watch10s rate (percentage of watches >= 10 seconds) for last 7 days
 * @param {number} videoId - Video ID
 * @returns {Promise<number>} Watch10s rate (0-1)
 */
async function getWatch10sRate7d(videoId) {
  const query = `
    SELECT 
      COUNT(*) as total_watches,
      COUNT(*) FILTER (WHERE watch_duration >= 10) as watch_10s_count
    FROM view_history vh
    INNER JOIN impressions i ON vh.impression_id = i.id
    WHERE i.video_id = $1
      AND vh.created_at >= NOW() - INTERVAL '7 days'
  `;

  const result = await pool.query(query, [videoId]);

  if (!result.rows[0] || result.rows[0].total_watches === '0') {
    return null; // Not enough data
  }

  const totalWatches = parseInt(result.rows[0].total_watches);
  const watch10sCount = parseInt(result.rows[0].watch_10s_count);

  return watch10sCount / totalWatches;
}

/**
 * Calculate average watch duration for last 7 days
 * @param {number} videoId - Video ID
 * @returns {Promise<number>} Average watch duration in seconds
 */
async function getAvgWatch7d(videoId) {
  const query = `
    SELECT AVG(watch_duration) as avg_watch
    FROM view_history vh
    INNER JOIN impressions i ON vh.impression_id = i.id
    WHERE i.video_id = $1
      AND vh.created_at >= NOW() - INTERVAL '7 days'
  `;

  const result = await pool.query(query, [videoId]);

  if (!result.rows[0] || !result.rows[0].avg_watch) {
    return null; // Not enough data
  }

  return parseFloat(result.rows[0].avg_watch);
}

/**
 * Get comprehensive video popularity stats with fallback for low impression count
 * @param {number} videoId - Video ID
 * @param {number} minImpressions - Minimum impressions required (default: 5)
 * @returns {Promise<Object>} Stats object with watch10s_rate, avg_watch, impression_count, has_sufficient_data
 */
async function getVideoPopularityStats(videoId, minImpressions = 5) {
  const query = `
    SELECT 
      COUNT(DISTINCT i.id) as impression_count,
      COUNT(vh.id) as watch_count,
      COUNT(vh.id) FILTER (WHERE vh.watch_duration >= 10) as watch_10s_count,
      AVG(vh.watch_duration) as avg_watch_duration
    FROM impressions i
    LEFT JOIN view_history vh ON i.id = vh.impression_id
    WHERE i.video_id = $1
      AND i.shown_at >= NOW() - INTERVAL '7 days'
  `;

  const result = await pool.query(query, [videoId]);
  const row = result.rows[0];

  const impressionCount = parseInt(row.impression_count);
  const watchCount = parseInt(row.watch_count);
  const watch10sCount = parseInt(row.watch_10s_count);
  const avgWatchDuration = row.avg_watch_duration ? parseFloat(row.avg_watch_duration) : null;

  const hasSufficientData = impressionCount >= minImpressions;

  // Calculate watch10s rate (only if we have watch data)
  const watch10sRate = watchCount > 0 ? watch10sCount / watchCount : null;

  return {
    video_id: videoId,
    impression_count: impressionCount,
    watch_count: watchCount,
    watch_10s_count: watch10sCount,
    watch_10s_rate: watch10sRate,
    avg_watch_duration: avgWatchDuration,
    has_sufficient_data: hasSufficientData,
    period_days: 7
  };
}

/**
 * Get trending videos based on watch10s rate and volume
 * @param {number} limit - Maximum number of videos to return
 * @param {number} minImpressions - Minimum impressions required (default: 10)
 * @returns {Promise<Array>} Array of trending video stats
 */
async function getTrendingVideos(limit = 50, minImpressions = 10) {
  const query = `
    WITH video_stats AS (
      SELECT 
        v.id as video_id,
        v.title,
        v.uploader_id,
        v.views as total_views,
        COUNT(DISTINCT i.id) as impression_count_7d,
        COUNT(vh.id) as watch_count_7d,
        COUNT(vh.id) FILTER (WHERE vh.watch_duration >= 10) as watch_10s_count_7d,
        AVG(vh.watch_duration) as avg_watch_duration_7d,
        MAX(vh.created_at) as last_watched_at
      FROM videos v
      LEFT JOIN impressions i ON v.id = i.video_id 
        AND i.shown_at >= NOW() - INTERVAL '7 days'
      LEFT JOIN view_history vh ON i.id = vh.impression_id
      WHERE v.status = 'active'
      GROUP BY v.id, v.title, v.uploader_id, v.views
    )
    SELECT 
      video_id,
      title,
      uploader_id,
      total_views,
      impression_count_7d,
      watch_count_7d,
      watch_10s_count_7d,
      avg_watch_duration_7d,
      last_watched_at,
      CASE 
        WHEN watch_count_7d > 0 
        THEN CAST(watch_10s_count_7d AS FLOAT) / watch_count_7d 
        ELSE 0 
      END as watch_10s_rate,
      -- Popularity score: combines engagement rate with volume
      CASE 
        WHEN watch_count_7d > 0 
        THEN (CAST(watch_10s_count_7d AS FLOAT) / watch_count_7d) * LN(1 + watch_count_7d)
        ELSE 0 
      END as popularity_score
    FROM video_stats
    WHERE impression_count_7d >= $1
    ORDER BY popularity_score DESC, watch_10s_rate DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [minImpressions, limit]);
  return result.rows;
}

/**
 * Get batch popularity stats for multiple videos (optimized for feed generation)
 * @param {Array<number>} videoIds - Array of video IDs
 * @param {number} minImpressions - Minimum impressions for "sufficient data" flag
 * @returns {Promise<Map>} Map of video_id -> stats object
 */
async function getBatchVideoStats(videoIds, minImpressions = 5) {
  if (!videoIds || videoIds.length === 0) {
    return new Map();
  }

  const query = `
    SELECT 
      i.video_id,
      COUNT(DISTINCT i.id) as impression_count,
      COUNT(vh.id) as watch_count,
      COUNT(vh.id) FILTER (WHERE vh.watch_duration >= 10) as watch_10s_count,
      AVG(vh.watch_duration) as avg_watch_duration,
      MAX(vh.created_at) as last_watched_at
    FROM impressions i
    LEFT JOIN view_history vh ON i.id = vh.impression_id
    WHERE i.video_id = ANY($1)
      AND i.shown_at >= NOW() - INTERVAL '7 days'
    GROUP BY i.video_id
  `;

  const result = await pool.query(query, [videoIds]);

  const statsMap = new Map();

  result.rows.forEach(row => {
    const impressionCount = parseInt(row.impression_count);
    const watchCount = parseInt(row.watch_count);
    const watch10sCount = parseInt(row.watch_10s_count);
    const avgWatchDuration = row.avg_watch_duration ? parseFloat(row.avg_watch_duration) : null;

    const hasSufficientData = impressionCount >= minImpressions;
    const watch10sRate = watchCount > 0 ? watch10sCount / watchCount : null;

    statsMap.set(row.video_id, {
      video_id: row.video_id,
      impression_count: impressionCount,
      watch_count: watchCount,
      watch_10s_count: watch10sCount,
      watch_10s_rate: watch10sRate,
      avg_watch_duration: avgWatchDuration,
      has_sufficient_data: hasSufficientData,
      last_watched_at: row.last_watched_at
    });
  });

  // Fill in missing videos with null stats
  videoIds.forEach(videoId => {
    if (!statsMap.has(videoId)) {
      statsMap.set(videoId, {
        video_id: videoId,
        impression_count: 0,
        watch_count: 0,
        watch_10s_count: 0,
        watch_10s_rate: null,
        avg_watch_duration: null,
        has_sufficient_data: false,
        last_watched_at: null
      });
    }
  });

  return statsMap;
}

/**
 * Get comprehensive analytics statistics for admin dashboard
 * Returns current month stats with month-over-month comparison
 * @returns {Promise<Object>} Analytics statistics object
 */
async function getAnalyticsStats() {
  // Get date ranges for current and previous month
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Query for total views (current month)
  const viewsQuery = `
    SELECT 
      COALESCE(SUM(views), 0) as total_views
    FROM videos
    WHERE created_at >= $1
  `;

  // Query for total views (previous month)
  const viewsPrevQuery = `
    SELECT 
      COALESCE(SUM(views), 0) as total_views
    FROM videos
    WHERE created_at >= $1 AND created_at <= $2
  `;

  // Query for videos uploaded
  const videosQuery = `
    SELECT COUNT(*) as count
    FROM videos
    WHERE created_at >= $1
  `;

  // Query for active users (users who watched or uploaded)
  const activeUsersQuery = `
    SELECT COUNT(DISTINCT user_id) as count
    FROM (
      SELECT uploader_id as user_id FROM videos WHERE created_at >= $1
      UNION
      SELECT user_id FROM impressions WHERE shown_at >= $1
    ) as active
  `;

  // Query for top videos with like count from likes table and uploader info
  const topVideosQuery = `
    SELECT 
      v.id, 
      v.title, 
      v.views,
      v.thumbnail_url,
      COALESCE(l.like_count, 0) as likes,
      v.uploader_id,
      u.username,
      u.display_name,
      u.avatar_url
    FROM videos v
    LEFT JOIN (
      SELECT video_id, COUNT(*) as like_count
      FROM likes
      GROUP BY video_id
    ) l ON v.id = l.video_id
    LEFT JOIN users u ON v.uploader_id = u.id
    WHERE v.status = 'active'
    ORDER BY v.views DESC
    LIMIT 5
  `;

  try {
    const [
      viewsCurrentResult,
      viewsPrevResult,
      videosCurrentResult,
      videosPrevResult,
      activeUsersCurrentResult,
      activeUsersPrevResult,
      topVideosResult
    ] = await Promise.all([
      pool.query(viewsQuery, [currentMonthStart]),
      pool.query(viewsPrevQuery, [previousMonthStart, previousMonthEnd]),
      pool.query(videosQuery, [currentMonthStart]),
      pool.query(videosQuery, [previousMonthStart]),
      pool.query(activeUsersQuery, [currentMonthStart]),
      pool.query(activeUsersQuery, [previousMonthStart]),
      pool.query(topVideosQuery)
    ]);

    const totalViewsCurrent = parseInt(viewsCurrentResult.rows[0]?.total_views || 0);
    const totalViewsPrevious = parseInt(viewsPrevResult.rows[0]?.total_views || 0);
    const videosUploadedCurrent = parseInt(videosCurrentResult.rows[0]?.count || 0);
    const videosUploadedPrevious = parseInt(videosPrevResult.rows[0]?.count || 0);
    const activeUsersCurrent = parseInt(activeUsersCurrentResult.rows[0]?.count || 0);
    const activeUsersPrevious = parseInt(activeUsersPrevResult.rows[0]?.count || 0);

    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      totalViews: {
        current: totalViewsCurrent,
        previous: totalViewsPrevious,
        change: calculateChange(totalViewsCurrent, totalViewsPrevious)
      },
      videosUploaded: {
        current: videosUploadedCurrent,
        previous: videosUploadedPrevious,
        change: calculateChange(videosUploadedCurrent, videosUploadedPrevious)
      },
      activeUsers: {
        current: activeUsersCurrent,
        previous: activeUsersPrevious,
        change: calculateChange(activeUsersCurrent, activeUsersPrevious)
      },
      averageWatchTime: {
        current: 0,
        previous: 0,
        change: 0
      },
      engagementRate: {
        current: 0,
        previous: 0,
        change: 0
      },
      topVideos: topVideosResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        views: parseInt(row.views || 0),
        likes: parseInt(row.likes || 0),
        thumbnailUrl: getFullThumbnailUrl(row.thumbnail_url, row.id),
        uploader: {
          id: row.uploader_id,
          username: row.username || 'unknown',
          displayName: row.display_name,
          avatarUrl: row.avatar_url
        }
      }))
    };
  } catch (error) {
    console.error('Error getting analytics stats:', error);
    throw error;
  }
}

export {
  getWatch10sRate7d,
  getAvgWatch7d,
  getVideoPopularityStats,
  getTrendingVideos,
  getBatchVideoStats,
  getAnalyticsStats
};
