/**
 * Share Controller
 * Handles video sharing operations
 */

import pool from '../config/database.js';
import ApiError from '../utils/apiError.js';

// Valid share types
const VALID_SHARE_TYPES = [
  'link',        // Copy link
  'facebook',    // Share to Facebook
  'twitter',     // Share to Twitter/X
  'whatsapp',    // Share to WhatsApp
  'telegram',    // Share to Telegram
  'reddit',      // Share to Reddit
  'linkedin',    // Share to LinkedIn
  'email',       // Share via email
  'embed',       // Embed code
  'qr',          // QR code
  'other'        // Other methods
];

/**
 * POST /api/v1/videos/:id/share
 * Record a video share
 * 
 * @route POST /api/v1/videos/:id/share
 * @access Public (optional auth - can track anonymous shares)
 * @param {string} id - Video ID
 * @body {string} share_type - Type of share (link, facebook, twitter, etc.)
 */
export async function shareVideo(req, res, next) {
  try {
    const { id } = req.params;
    const { share_type = 'link' } = req.body;
    const userId = req.user?.userId || null; // Optional auth

    // Validate share_type
    if (!VALID_SHARE_TYPES.includes(share_type)) {
      return next(new ApiError(400, `Invalid share_type. Must be one of: ${VALID_SHARE_TYPES.join(', ')}`));
    }

    // Check if video exists and is active
    const videoCheck = await pool.query(
      'SELECT id, status, processing_status FROM videos WHERE id = $1',
      [id]
    );

    if (videoCheck.rows.length === 0) {
      return next(new ApiError(404, 'Video not found'));
    }

    if (videoCheck.rows[0].status !== 'active') {
      return next(new ApiError(400, 'Video is not active'));
    }

    if (videoCheck.rows[0].processing_status !== 'ready') {
      return next(new ApiError(400, 'Video is not ready for sharing'));
    }

    // Record the share
    const shareResult = await pool.query(
      `INSERT INTO shares (video_id, user_id, share_type)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [id, userId, share_type]
    );

    // Note: shares_count is auto-updated by database trigger
    // But we can also do it manually if trigger is not enabled:
    // await pool.query(
    //   'UPDATE videos SET shares_count = shares_count + 1 WHERE id = $1',
    //   [id]
    // );

    // Get updated share count
    const countResult = await pool.query(
      'SELECT shares_count FROM videos WHERE id = $1',
      [id]
    );

    return res.status(201).json({
      success: true,
      message: 'Video shared successfully',
      data: {
        shareId: shareResult.rows[0].id,
        shareType: share_type,
        sharesCount: countResult.rows[0].shares_count,
        sharedAt: shareResult.rows[0].created_at
      }
    });

  } catch (error) {
    console.error('Error sharing video:', error);
    return next(new ApiError(500, 'Failed to record video share'));
  }
}

/**
 * GET /api/v1/videos/:id/shares
 * Get share statistics for a video
 * 
 * @route GET /api/v1/videos/:id/shares
 * @access Public
 * @param {string} id - Video ID
 */
export async function getVideoShares(req, res, next) {
  try {
    const { id } = req.params;

    // Check if video exists
    const videoCheck = await pool.query(
      'SELECT id, title, shares_count FROM videos WHERE id = $1',
      [id]
    );

    if (videoCheck.rows.length === 0) {
      return next(new ApiError(404, 'Video not found'));
    }

    // Get share statistics by type
    const statsQuery = `
      SELECT 
        share_type,
        COUNT(*) as count,
        MAX(created_at) as last_shared
      FROM shares
      WHERE video_id = $1
      GROUP BY share_type
      ORDER BY count DESC
    `;

    const statsResult = await pool.query(statsQuery, [id]);

    // Get recent shares (last 10)
    const recentQuery = `
      SELECT 
        s.id,
        s.share_type,
        s.created_at,
        u.username,
        u.display_name
      FROM shares s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.video_id = $1
      ORDER BY s.created_at DESC
      LIMIT 10
    `;

    const recentResult = await pool.query(recentQuery, [id]);

    return res.status(200).json({
      success: true,
      data: {
        videoId: id,
        videoTitle: videoCheck.rows[0].title,
        totalShares: videoCheck.rows[0].shares_count,
        sharesByType: statsResult.rows.map(row => ({
          type: row.share_type,
          count: parseInt(row.count),
          lastShared: row.last_shared
        })),
        recentShares: recentResult.rows.map(row => ({
          id: row.id,
          type: row.share_type,
          sharedBy: row.username || 'Anonymous',
          displayName: row.display_name,
          sharedAt: row.created_at
        }))
      }
    });

  } catch (error) {
    console.error('Error getting video shares:', error);
    return next(new ApiError(500, 'Failed to get video shares'));
  }
}

/**
 * GET /api/v1/shares/my-shares
 * Get videos shared by current user
 * 
 * @route GET /api/v1/shares/my-shares
 * @access Private (requires authentication)
 * @query {number} page - Page number
 * @query {number} limit - Items per page
 */
export async function getMyShares(req, res, next) {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 50);
    const offset = (pageNum - 1) * limitNum;

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(DISTINCT video_id) as count FROM shares WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    // Get videos user has shared
    const query = `
      SELECT DISTINCT ON (v.id)
        v.*,
        u.username,
        u.display_name,
        u.avatar_url,
        s.share_type as last_share_type,
        s.created_at as last_shared_at,
        (SELECT COUNT(*) FROM shares WHERE video_id = v.id AND user_id = $1) as my_share_count,
        EXISTS(SELECT 1 FROM likes l WHERE l.video_id = v.id AND l.user_id = $1) as is_liked,
        EXISTS(
          SELECT 1 FROM playlist_videos pv
          JOIN playlists p ON pv.playlist_id = p.id
          WHERE pv.video_id = v.id AND p.user_id = $1 AND p.name = 'Đã lưu'
        ) as is_saved
      FROM videos v
      JOIN shares s ON v.id = s.video_id
      LEFT JOIN users u ON v.uploader_id = u.id
      WHERE s.user_id = $1 AND v.status = 'active' AND v.processing_status = 'ready'
      ORDER BY v.id, s.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limitNum, offset]);

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
      isLiked: row.is_liked,
      isSaved: row.is_saved,
      uploaderUsername: row.username,
      uploaderDisplayName: row.display_name,
      uploaderAvatarUrl: row.avatar_url,
      createdAt: row.created_at,
      lastSharedBy: row.last_share_type,
      lastSharedAt: row.last_shared_at,
      myShareCount: parseInt(row.my_share_count)
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
          hasMore: pageNum < pages
        }
      }
    });

  } catch (error) {
    console.error('Error getting my shares:', error);
    return next(new ApiError(500, 'Failed to get shared videos'));
  }
}

/**
 * GET /api/v1/shares/analytics
 * Get share analytics
 * 
 * @route GET /api/v1/shares/analytics
 * @access Private (Admin/Staff only - can be restricted with role middleware)
 * @query {string} period - Time period (24h, 7d, 30d, all)
 */
export async function getShareAnalytics(req, res, next) {
  try {
    const { period = '7d' } = req.query;

    // Determine time filter
    let timeFilter = '';
    switch (period) {
      case '24h':
        timeFilter = "WHERE created_at >= NOW() - INTERVAL '24 hours'";
        break;
      case '7d':
        timeFilter = "WHERE created_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        timeFilter = "WHERE created_at >= NOW() - INTERVAL '30 days'";
        break;
      case 'all':
      default:
        timeFilter = '';
    }

    // Get share statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_shares,
        COUNT(DISTINCT video_id) as videos_shared,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as users_who_shared,
        COUNT(*) FILTER (WHERE user_id IS NULL) as anonymous_shares
      FROM shares
      ${timeFilter}
    `;

    const statsResult = await pool.query(statsQuery);

    // Get shares by type
    const typeQuery = `
      SELECT 
        share_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM shares
      ${timeFilter}
      GROUP BY share_type
      ORDER BY count DESC
    `;

    const typeResult = await pool.query(typeQuery);

    // Get most shared videos
    const topVideosQuery = `
      SELECT 
        v.id,
        v.title,
        COUNT(*) as share_count,
        u.username as uploader
      FROM shares s
      JOIN videos v ON s.video_id = v.id
      LEFT JOIN users u ON v.uploader_id = u.id
      ${timeFilter}
      GROUP BY v.id, v.title, u.username
      ORDER BY share_count DESC
      LIMIT 10
    `;

    const topVideosResult = await pool.query(topVideosQuery);

    return res.status(200).json({
      success: true,
      data: {
        period,
        summary: {
          totalShares: parseInt(statsResult.rows[0].total_shares),
          videosShared: parseInt(statsResult.rows[0].videos_shared),
          usersWhoShared: parseInt(statsResult.rows[0].users_who_shared),
          anonymousShares: parseInt(statsResult.rows[0].anonymous_shares)
        },
        sharesByType: typeResult.rows.map(row => ({
          type: row.share_type,
          count: parseInt(row.count),
          percentage: parseFloat(row.percentage)
        })),
        topSharedVideos: topVideosResult.rows.map(row => ({
          videoId: row.id,
          title: row.title,
          shareCount: parseInt(row.share_count),
          uploader: row.uploader
        }))
      }
    });

  } catch (error) {
    console.error('Error getting share analytics:', error);
    return next(new ApiError(500, 'Failed to get share analytics'));
  }
}

export default {
  shareVideo,
  getVideoShares,
  getMyShares,
  getShareAnalytics,
  VALID_SHARE_TYPES
};
