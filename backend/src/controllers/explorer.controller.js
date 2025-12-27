/**
 * Explorer Controller
 * Handles explorer/discovery feed with weighted scoring algorithm
 * 
 * Scoring Logic:
 * - Normal: likes(5) + shares(3) + comments(2) + impressions(3)
 * - Recent (24h): likes(20) + shares(13) + comments(9) + impressions(13)
 * - Fresh/Random: Recent uploads with randomization for variety
 */

import pool from '../config/database.js';
import ApiError from '../utils/apiError.js';

/**
 * GET /api/v1/explorer
 * Get explorer feed with weighted scoring
 * 
 * @route GET /api/v1/explorer
 * @access Public
 * @query {number} [page=1] - Page number
 * @query {number} [limit=20] - Items per page (max 50)
 * @query {string} [sort=weighted] - Sort type: 'weighted', 'fresh', 'random'
 * @query {boolean} [excludeWatched=false] - Exclude videos user has watched (requires auth)
 * @query {number} [seed] - Random seed for consistent pagination (optional)
 */
export async function getExplorerFeed(req, res, next) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sort = 'weighted',
      excludeWatched = 'false',
      seed
    } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 50);
    const offset = (pageNum - 1) * limitNum;
    const userId = (req.user && req.user.userId) || null;
    const shouldExcludeWatched = excludeWatched === 'true' && userId;

    let query;
    let countQuery;
    let params;
    let countParams;

    // Base condition - only active and ready videos
    let baseCondition = `v.status = 'active' AND v.processing_status = 'ready'`;
    
    // Exclude watched videos if requested (requires authentication)
    if (shouldExcludeWatched) {
      baseCondition += ` AND v.id NOT IN (
        SELECT DISTINCT video_id 
        FROM view_history 
        WHERE user_id = '${userId}'
      )`;
    }
    
    // Determine random seed: use provided seed, or generate based on timestamp for variety
    const randomSeed = seed ? parseFloat(seed) : Math.random();

    if (sort === 'fresh' || sort === 'random') {
      // Fresh/Random: Recent uploads (last 7 days) with randomization
      query = `
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
            -- Seeded random for consistent pagination within a session
            -- Use video id + seed to ensure different videos get different random values
            -- But same video gets same random value for same seed
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

      countQuery = `
        SELECT COUNT(*) as count 
        FROM videos v
        WHERE ${baseCondition}
          AND v.created_at >= NOW() - INTERVAL '7 days'
      `;

      params = [limitNum, offset, userId];
      countParams = [];

    } else {
      // Weighted scoring algorithm
      query = `
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
            WHERE created_at >= NOW() - INTERVAL '24 hours'
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
            -- Videos with similar scores will shuffle on each refresh
            -- Using hash of video id + seed for consistent pagination
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
        ORDER BY final_score DESC, sv.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      countQuery = `
        SELECT COUNT(*) as count 
        FROM videos v
        WHERE ${baseCondition}
      `;

      params = [limitNum, offset, userId];
      countParams = [];
    }

    // Get total count
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Get videos
    const result = await pool.query(query, params);
    
    // Format response
    const videos = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      videoUrl: `http://localhost:9000/clipiq-videos/${row.video_url}`,
      thumbnailUrl: row.thumbnail_url
        ? (row.thumbnail_url.startsWith('http') ? row.thumbnail_url : `http://localhost:9000/clipiq-thumbnails/${row.thumbnail_url}`)
        : `https://picsum.photos/seed/${row.id}/400/600`,
      duration: row.duration,
      views: row.views,
      likes: row.likes_count || 0,
      comments: row.comments_count || 0,
      shares: row.shares_count || 0,
      impressions: row.impressions_count || 0,
      isLiked: row.is_liked || false,
      isSaved: row.is_saved || false,
      uploaderUsername: row.username,
      uploaderDisplayName: row.display_name,
      uploaderAvatarUrl: row.avatar_url,
      createdAt: row.created_at,
      uploadedAt: row.created_at,
      // Include score for debugging (can be removed in production)
      ...(sort === 'weighted' && { score: parseFloat(row.final_score?.toFixed(2) || 0) })
    }));

    const pages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      data: {
        videos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages,
          hasMore: pageNum < pages,
        }
      }
    });

  } catch (error) {
    console.error('Error fetching explorer feed:', error);
    return next(new ApiError(500, 'Failed to fetch explorer feed'));
  }
}

/**
 * GET /api/v1/explorer/stats
 * Get statistics about explorer feed
 * Useful for debugging and analytics
 * 
 * @route GET /api/v1/explorer/stats
 * @access Public (can be restricted to admin if needed)
 */
export async function getExplorerStats(req, res, next) {
  try {
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

    return res.status(200).json({
      success: true,
      data: {
        totalVideos: parseInt(stats.total_videos),
        videos24h: parseInt(stats.videos_24h),
        videos7d: parseInt(stats.videos_7d),
        totalViews: parseInt(stats.total_views || 0),
        avgViews: parseFloat(parseFloat(stats.avg_views || 0).toFixed(2))
      }
    });

  } catch (error) {
    console.error('Error fetching explorer stats:', error);
    return next(new ApiError(500, 'Failed to fetch explorer stats'));
  }
}
