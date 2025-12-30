/**
 * Like Service
 * Business logic for video like operations
 */

import pool from '../config/database.js';

/**
 * Check if a video is liked by a user
 * @param {string} videoId - Video ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if liked
 */
export async function isVideoLiked(videoId, userId) {
    if (!userId) return false;

    const result = await pool.query(
        'SELECT 1 FROM likes WHERE video_id = $1 AND user_id = $2',
        [videoId, userId]
    );
    return result.rows.length > 0;
}

/**
 * Like a video
 * @param {string} videoId - Video ID
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function likeVideo(videoId, userId) {
    // Check if already liked
    const isLiked = await isVideoLiked(videoId, userId);

    if (isLiked) {
        return { success: false, message: 'Already liked' };
    }

    // Add like
    await pool.query(
        'INSERT INTO likes (video_id, user_id) VALUES ($1, $2)',
        [videoId, userId]
    );

    // Update video likes count
    await pool.query(
        'UPDATE videos SET likes_count = likes_count + 1 WHERE id = $1',
        [videoId]
    );

    return { success: true, message: 'Video liked' };
}

/**
 * Unlike a video
 * @param {string} videoId - Video ID
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function unlikeVideo(videoId, userId) {
    // Check if liked
    const isLiked = await isVideoLiked(videoId, userId);

    if (!isLiked) {
        return { success: false, message: 'Not liked yet' };
    }

    // Remove like
    await pool.query(
        'DELETE FROM likes WHERE video_id = $1 AND user_id = $2',
        [videoId, userId]
    );

    // Update video likes count
    await pool.query(
        'UPDATE videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1',
        [videoId]
    );

    return { success: true, message: 'Video unliked' };
}

/**
 * Get liked videos by user with pagination
 * @param {string} userId - User ID
 * @param {Object} pagination - Pagination options
 * @param {number} pagination.page - Page number (default 1)
 * @param {number} pagination.limit - Items per page (default 20)
 * @returns {Promise<{videos: Array, pagination: Object}>}
 */
export async function getLikedVideosByUser(userId, { page = 1, limit = 20 } = {}) {
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 50);
    const offset = (pageNum - 1) * limitNum;

    // Get liked videos
    const query = `
    SELECT v.*, u.username, u.display_name, u.avatar_url,
    true as is_liked,
    EXISTS(
      SELECT 1 FROM playlist_videos pv 
      JOIN playlists p ON pv.playlist_id = p.id 
      WHERE pv.video_id = v.id AND p.user_id = $1 AND p.name = 'Đã lưu'
    ) as is_saved
    FROM videos v
    JOIN likes l ON v.id = l.video_id
    LEFT JOIN users u ON v.uploader_id = u.id
    WHERE l.user_id = $1 AND v.status = 'active' AND v.processing_status = 'ready'
    ORDER BY l.created_at DESC
    LIMIT $2 OFFSET $3
  `;

    const countQuery = `
    SELECT COUNT(*) as count
    FROM videos v
    JOIN likes l ON v.id = l.video_id
    WHERE l.user_id = $1 AND v.status = 'active' AND v.processing_status = 'ready'
  `;

    const [result, countResult] = await Promise.all([
        pool.query(query, [userId, limitNum, offset]),
        pool.query(countQuery, [userId])
    ]);

    const total = parseInt(countResult.rows[0].count);
    const pages = Math.ceil(total / limitNum);

    return {
        videos: result.rows,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages,
            hasMore: pageNum < pages,
        }
    };
}

export default {
    isVideoLiked,
    likeVideo,
    unlikeVideo,
    getLikedVideosByUser
};
