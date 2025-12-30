/**
 * Comment Service
 * Business logic for video comment operations
 */

import pool from '../config/database.js';
import crypto from 'crypto';

/**
 * Get comments for a video with pagination
 * @param {string} videoId - Video ID
 * @param {Object} pagination - Pagination options
 * @param {number} pagination.page - Page number (default 1)
 * @param {number} pagination.limit - Items per page (default 20)
 * @returns {Promise<Array>} - Array of comments
 */
export async function getCommentsByVideo(videoId, { page = 1, limit = 20 } = {}) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    const result = await pool.query(
        `SELECT c.*, u.username, u.display_name, u.avatar_url
     FROM comments c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.video_id = $1
     ORDER BY c.created_at DESC
     LIMIT $2 OFFSET $3`,
        [videoId, limitNum, offset]
    );

    return result.rows.map(row => ({
        id: row.id,
        text: row.text,
        userId: row.user_id,
        username: row.username,
        userDisplayName: row.display_name,
        userAvatarUrl: row.avatar_url,
        createdAt: row.created_at,
    }));
}

/**
 * Get a single comment by ID
 * @param {string} commentId - Comment ID
 * @returns {Promise<Object|null>} - Comment object or null
 */
export async function getCommentById(commentId) {
    const result = await pool.query(
        'SELECT * FROM comments WHERE id = $1',
        [commentId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create a new comment
 * @param {string} videoId - Video ID
 * @param {string} userId - User ID
 * @param {string} text - Comment text
 * @returns {Promise<Object>} - Created comment with user info
 */
export async function createComment(videoId, userId, text) {
    const commentId = crypto.randomUUID();

    // Insert comment
    const result = await pool.query(
        `INSERT INTO comments (id, video_id, user_id, text, created_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     RETURNING *`,
        [commentId, videoId, userId, text]
    );

    // Update video comments count
    await pool.query(
        'UPDATE videos SET comments_count = comments_count + 1 WHERE id = $1',
        [videoId]
    );

    // Get user info for response
    const userResult = await pool.query(
        'SELECT username, display_name, avatar_url FROM users WHERE id = $1',
        [userId]
    );
    const user = userResult.rows[0];

    return {
        id: result.rows[0].id,
        text: result.rows[0].text,
        userId: userId,
        username: user.username,
        userDisplayName: user.display_name,
        userAvatarUrl: user.avatar_url,
        createdAt: result.rows[0].created_at,
    };
}

/**
 * Delete a comment
 * @param {string} commentId - Comment ID
 * @param {string} videoId - Video ID (to update count)
 * @returns {Promise<boolean>} - True if deleted
 */
export async function deleteComment(commentId, videoId) {
    // Delete comment
    await pool.query(
        'DELETE FROM comments WHERE id = $1',
        [commentId]
    );

    // Update video comments count
    await pool.query(
        'UPDATE videos SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = $1',
        [videoId]
    );

    return true;
}

/**
 * Check if user owns a comment
 * @param {string} commentId - Comment ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if user owns the comment
 */
export async function isCommentOwner(commentId, userId) {
    const result = await pool.query(
        'SELECT user_id FROM comments WHERE id = $1',
        [commentId]
    );
    return result.rows.length > 0 && result.rows[0].user_id === userId;
}

/**
 * Check if a comment exists for a video
 * @param {string} commentId - Comment ID
 * @param {string} videoId - Video ID
 * @returns {Promise<Object|null>} - Comment data or null
 */
export async function getCommentForVideo(commentId, videoId) {
    const result = await pool.query(
        'SELECT * FROM comments WHERE id = $1 AND video_id = $2',
        [commentId, videoId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
}

export default {
    getCommentsByVideo,
    getCommentById,
    createComment,
    deleteComment,
    isCommentOwner,
    getCommentForVideo
};
