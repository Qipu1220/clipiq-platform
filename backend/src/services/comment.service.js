// Comment business logic - Database queries and operations

import pool from '../config/database.js';
import crypto from 'crypto';

/**
 * Get comments for a video with pagination
 */
export async function getCommentsByVideoId(videoId, limitNum, offset) {
  const result = await pool.query(
    `SELECT c.*, u.username, u.display_name, u.avatar_url
     FROM comments c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.video_id = $1
     ORDER BY c.created_at DESC
     LIMIT $2 OFFSET $3`,
    [videoId, limitNum, offset]
  );
  return result.rows;
}

/**
 * Create a new comment
 */
export async function createComment(videoId, userId, text) {
  const commentId = crypto.randomUUID();
  
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

  return result.rows[0];
}

/**
 * Get comment by ID
 */
export async function getCommentById(commentId, videoId) {
  const result = await pool.query(
    'SELECT user_id FROM comments WHERE id = $1 AND video_id = $2',
    [commentId, videoId]
  );
  return result.rows[0] || null;
}

/**
 * Delete comment
 */
export async function deleteCommentById(commentId, videoId) {
  await pool.query(
    'DELETE FROM comments WHERE id = $1',
    [commentId]
  );

  // Update video comments count
  await pool.query(
    'UPDATE videos SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = $1',
    [videoId]
  );
}

/**
 * Get user info by ID
 */
export async function getUserById(userId) {
  const result = await pool.query(
    'SELECT username, display_name, avatar_url FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Format comment to response object
 */
export function formatCommentResponse(row) {
  return {
    id: row.id,
    text: row.text,
    userId: row.user_id,
    username: row.username,
    userDisplayName: row.display_name,
    userAvatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}
