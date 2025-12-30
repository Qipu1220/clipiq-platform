/**
 * Share Service
 * Business logic for video sharing operations
 */

import pool from '../config/database.js';

// Valid share types
export const VALID_SHARE_TYPES = [
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
 * Check if video exists and is active
 * @param {string} videoId - Video ID
 * @returns {Promise<Object|null>} Video data or null
 */
export async function getVideoForSharing(videoId) {
    const result = await pool.query(
        'SELECT id, status, processing_status, title, shares_count FROM videos WHERE id = $1',
        [videoId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Record a video share
 * @param {string} videoId - Video ID
 * @param {string|null} userId - User ID (optional for anonymous shares)
 * @param {string} shareType - Type of share
 * @returns {Promise<Object>} Share result
 */
export async function recordShare(videoId, userId, shareType) {
    // Record the share
    const shareResult = await pool.query(
        `INSERT INTO shares (video_id, user_id, share_type)
     VALUES ($1, $2, $3)
     RETURNING id, created_at`,
        [videoId, userId, shareType]
    );

    // Get updated share count
    const countResult = await pool.query(
        'SELECT shares_count FROM videos WHERE id = $1',
        [videoId]
    );

    return {
        shareId: shareResult.rows[0].id,
        shareType,
        sharesCount: countResult.rows[0].shares_count,
        sharedAt: shareResult.rows[0].created_at
    };
}

/**
 * Get share statistics for a video
 * @param {string} videoId - Video ID
 * @returns {Promise<Object>} Share statistics
 */
export async function getVideoShareStats(videoId) {
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

    const statsResult = await pool.query(statsQuery, [videoId]);

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

    const recentResult = await pool.query(recentQuery, [videoId]);

    return {
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
    };
}

/**
 * Get videos shared by a user
 * @param {string} userId - User ID
 * @param {Object} pagination - Pagination options
 * @returns {Promise<{videos: Array, pagination: Object}>}
 */
export async function getUserShares(userId, { page = 1, limit = 20 } = {}) {
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
    const pages = Math.ceil(total / limitNum);

    return {
        videos: result.rows,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages,
            hasMore: pageNum < pages
        }
    };
}

/**
 * Get share analytics
 * @param {string} period - Time period ('24h', '7d', '30d', 'all')
 * @returns {Promise<Object>} Analytics data
 */
export async function getShareAnalytics(period = '7d') {
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

    return {
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
    };
}

export default {
    VALID_SHARE_TYPES,
    getVideoForSharing,
    recordShare,
    getVideoShareStats,
    getUserShares,
    getShareAnalytics
};
