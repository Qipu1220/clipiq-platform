/**
 * Explorer Service
 * Business logic for explorer/discovery feed with weighted scoring algorithm
 * 
 * Scoring Logic:
 * - Normal: likes(5) + shares(3) + comments(2) + impressions(3)
 * - Recent (24h): likes(20) + shares(13) + comments(9) + impressions(13)
 * - Fresh/Random: Recent uploads with randomization for variety
 */

import pool from '../config/database.js';

/**
 * Build base condition for explorer queries
 * @param {string|null} userId - User ID for excluding watched
 * @param {boolean} excludeWatched - Whether to exclude watched videos
 * @returns {string} SQL condition string
 */
function buildBaseCondition(userId, excludeWatched) {
    let condition = `v.status = 'active' AND v.processing_status = 'ready'`;

    if (excludeWatched && userId) {
        condition += ` AND v.id NOT IN (
      SELECT DISTINCT video_id 
      FROM view_history 
      WHERE user_id = '${userId}'
    )`;
    }

    return condition;
}

/**
 * Get explorer feed with fresh/random sorting
 * @param {Object} options - Query options
 * @returns {Promise<{videos: Array, total: number}>}
 */
async function getFreshRandomFeed({ limitNum, offset, userId, baseCondition, randomSeed }) {
    const query = `
    WITH recent_videos AS (
      SELECT 
        v.*,
        u.username,
        u.display_name,
        u.avatar_url,
        COALESCE(likes_agg.likes_count, 0) as likes_count,
        COALESCE(comments_agg.comments_count, 0) as comments_count,
        COALESCE(impressions_agg.impressions_count, 0) as impressions_count,
        COALESCE(v.shares_count, 0) as shares_count,
        (hashtext(v.id::text) % 1000000 + ${randomSeed} * 1000000) as random_seed
      FROM videos v
      LEFT JOIN users u ON v.uploader_id = u.id
      LEFT JOIN (
        SELECT video_id, COUNT(*) as likes_count
        FROM likes
        GROUP BY video_id
      ) likes_agg ON v.id = likes_agg.video_id
      LEFT JOIN (
        SELECT video_id, COUNT(*) as comments_count
        FROM comments
        GROUP BY video_id
      ) comments_agg ON v.id = comments_agg.video_id
      LEFT JOIN (
        SELECT video_id, COUNT(*) as impressions_count
        FROM impressions
        GROUP BY video_id
      ) impressions_agg ON v.id = impressions_agg.video_id
      WHERE ${baseCondition}
        AND v.created_at >= NOW() - INTERVAL '7 days'
    )
    SELECT 
      rv.*,
      EXISTS(
        SELECT 1 FROM likes l 
        WHERE l.video_id = rv.id AND l.user_id = $3
      ) as is_liked,
      EXISTS(
        SELECT 1 FROM playlist_videos pv
        JOIN playlists p ON pv.playlist_id = p.id
        WHERE pv.video_id = rv.id AND p.user_id = $3 AND p.name = 'Đã lưu'
      ) as is_saved
    FROM recent_videos rv
    ORDER BY rv.random_seed
    LIMIT $1 OFFSET $2
  `;

    const countQuery = `
    SELECT COUNT(*) as count 
    FROM videos v
    WHERE ${baseCondition}
      AND v.created_at >= NOW() - INTERVAL '7 days'
  `;

    const [result, countResult] = await Promise.all([
        pool.query(query, [limitNum, offset, userId]),
        pool.query(countQuery, [])
    ]);

    return {
        videos: result.rows,
        total: parseInt(countResult.rows[0].count)
    };
}

/**
 * Get explorer feed with weighted scoring
 * @param {Object} options - Query options
 * @returns {Promise<{videos: Array, total: number}>}
 */
async function getWeightedFeed({ limitNum, offset, userId, baseCondition, randomSeed }) {
    const query = `
    WITH video_stats AS (
      SELECT 
        v.id,
        v.title,
        v.description,
        v.video_url,
        v.thumbnail_url,
        v.duration,
        v.views,
        v.status,
        v.processing_status,
        v.created_at,
        v.uploader_id,
        u.username,
        u.display_name,
        u.avatar_url,
        
        -- Count metrics
        COALESCE(likes_agg.likes_count, 0) as likes_count,
        COALESCE(likes_recent.likes_recent_count, 0) as likes_recent_count,
        COALESCE(comments_agg.comments_count, 0) as comments_count,
        COALESCE(comments_recent.comments_recent_count, 0) as comments_recent_count,
        COALESCE(impressions_agg.impressions_count, 0) as impressions_count,
        COALESCE(impressions_recent.impressions_recent_count, 0) as impressions_recent_count,
        COALESCE(v.shares_count, 0) as shares_count,
        COALESCE(shares_recent.shares_recent_count, 0) as shares_recent_count
        
      FROM videos v
      LEFT JOIN users u ON v.uploader_id = u.id
      
      -- Total likes
      LEFT JOIN (
        SELECT video_id, COUNT(*) as likes_count
        FROM likes
        GROUP BY video_id
      ) likes_agg ON v.id = likes_agg.video_id
      
      -- Recent likes (24h)
      LEFT JOIN (
        SELECT video_id, COUNT(*) as likes_recent_count
        FROM likes
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY video_id
      ) likes_recent ON v.id = likes_recent.video_id
      
      -- Total comments
      LEFT JOIN (
        SELECT video_id, COUNT(*) as comments_count
        FROM comments
        GROUP BY video_id
      ) comments_agg ON v.id = comments_agg.video_id
      
      -- Recent comments (24h)
      LEFT JOIN (
        SELECT video_id, COUNT(*) as comments_recent_count
        FROM comments
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY video_id
      ) comments_recent ON v.id = comments_recent.video_id
      
      -- Total impressions
      LEFT JOIN (
        SELECT video_id, COUNT(*) as impressions_count
        FROM impressions
        GROUP BY video_id
      ) impressions_agg ON v.id = impressions_agg.video_id
      
      -- Recent impressions (24h)
      LEFT JOIN (
        SELECT video_id, COUNT(*) as impressions_recent_count
        FROM impressions
        WHERE shown_at >= NOW() - INTERVAL '24 hours'
        GROUP BY video_id
      ) impressions_recent ON v.id = impressions_recent.video_id
      
      -- Recent shares (24h)
      LEFT JOIN (
        SELECT video_id, COUNT(*) as shares_recent_count
        FROM shares
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY video_id
      ) shares_recent ON v.id = shares_recent.video_id
      
      WHERE ${baseCondition}
    ),
    scored_videos AS (
      SELECT 
        *,
        -- Calculate weighted score
        -- Normal weights: likes(5) + shares(3) + comments(2) + impressions(3)
        -- Recent weights (24h): likes(20) + shares(13) + comments(9) + impressions(13)
        (
          (likes_count - likes_recent_count) * 5 +
          (shares_count - shares_recent_count) * 3 +
          (comments_count - comments_recent_count) * 2 +
          (impressions_count - impressions_recent_count) * 3 +
          likes_recent_count * 20 +
          shares_recent_count * 13 +
          comments_recent_count * 9 +
          impressions_recent_count * 13
        ) as weighted_score,
        
        -- Add seeded randomness (10% of max possible score) to prevent stale rankings
        (hashtext(id::text) % 1000 + ${randomSeed} * 1000) * 0.01 as randomness_factor
        
      FROM video_stats
    )
    SELECT 
      sv.*,
      (sv.weighted_score + sv.randomness_factor) as final_score,
      EXISTS(
        SELECT 1 FROM likes l 
        WHERE l.video_id = sv.id AND l.user_id = $3
      ) as is_liked,
      EXISTS(
        SELECT 1 FROM playlist_videos pv
        JOIN playlists p ON pv.playlist_id = p.id
        WHERE pv.video_id = sv.id AND p.user_id = $3 AND p.name = 'Đã lưu'
      ) as is_saved
    FROM scored_videos sv
    ORDER BY final_score DESC, sv.views DESC
    LIMIT $1 OFFSET $2
  `;

    const countQuery = `
    SELECT COUNT(*) as count 
    FROM videos v
    WHERE ${baseCondition}
  `;

    const [result, countResult] = await Promise.all([
        pool.query(query, [limitNum, offset, userId]),
        pool.query(countQuery, [])
    ]);

    return {
        videos: result.rows,
        total: parseInt(countResult.rows[0].count)
    };
}

/**
 * Get explorer feed with weighted scoring
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default 1)
 * @param {number} options.limit - Items per page (default 20, max 50)
 * @param {string} options.sort - Sort type: 'weighted', 'fresh', 'random'
 * @param {boolean} options.excludeWatched - Exclude watched videos
 * @param {number} options.seed - Random seed for consistent pagination
 * @param {string|null} options.userId - Current user ID
 * @returns {Promise<{videos: Array, pagination: Object}>}
 */
export async function getExplorerFeed({
    page = 1,
    limit = 20,
    sort = 'weighted',
    excludeWatched = false,
    seed = null,
    userId = null
} = {}) {
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 50);
    const offset = (pageNum - 1) * limitNum;
    const shouldExcludeWatched = excludeWatched && userId;

    const baseCondition = buildBaseCondition(userId, shouldExcludeWatched);
    const randomSeed = seed ? parseFloat(seed) : Math.random();

    let result;

    if (sort === 'fresh' || sort === 'random') {
        result = await getFreshRandomFeed({ limitNum, offset, userId, baseCondition, randomSeed });
    } else {
        result = await getWeightedFeed({ limitNum, offset, userId, baseCondition, randomSeed });
    }

    const pages = Math.ceil(result.total / limitNum);

    return {
        videos: result.videos,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: result.total,
            pages,
            hasMore: pageNum < pages,
        },
        sort
    };
}

/**
 * Get explorer statistics
 * @returns {Promise<Object>} Statistics object
 */
export async function getExplorerStats() {
    const statsQuery = `
    SELECT 
      COUNT(*) as total_videos,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as videos_24h,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as videos_7d,
      SUM(views) as total_views,
      AVG(views) as avg_views
    FROM videos
    WHERE status = 'active' AND processing_status = 'ready'
  `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    return {
        totalVideos: parseInt(stats.total_videos),
        videos24h: parseInt(stats.videos_24h),
        videos7d: parseInt(stats.videos_7d),
        totalViews: parseInt(stats.total_views || 0),
        avgViews: parseFloat(parseFloat(stats.avg_views || 0).toFixed(2))
    };
}

export default {
    getExplorerFeed,
    getExplorerStats
};
