// Like business logic - Database queries and operations

import pool from '../config/database.js';

/**
 * Check if user already liked a video
 */
export async function checkLikeExists(videoId, userId) {
  const result = await pool.query(
    'SELECT 1 FROM likes WHERE video_id = $1 AND user_id = $2',
    [videoId, userId]
  );
  return result.rows.length > 0;
}

/**
 * Add like to video
 */
export async function addLike(videoId, userId) {
  await pool.query(
    'INSERT INTO likes (video_id, user_id) VALUES ($1, $2)',
    [videoId, userId]
  );
  
  // Update video likes count
  await pool.query(
    'UPDATE videos SET likes_count = likes_count + 1 WHERE id = $1',
    [videoId]
  );
}

/**
 * Remove like from video
 */
export async function removeLike(videoId, userId) {
  await pool.query(
    'DELETE FROM likes WHERE video_id = $1 AND user_id = $2',
    [videoId, userId]
  );
  
  // Update video likes count
  await pool.query(
    'UPDATE videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1',
    [videoId]
  );
}

/**
 * Get liked videos by user with pagination
 */
export async function getLikedVideosByUser(userId, limitNum, offset) {
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
    WHERE l.user_id = $1 AND v.status = 'active'
    ORDER BY l.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const countQuery = `
    SELECT COUNT(*) as count
    FROM videos v
    JOIN likes l ON v.id = l.video_id
    WHERE l.user_id = $1 AND v.status = 'active'
  `;

  const [result, countResult] = await Promise.all([
    pool.query(query, [userId, limitNum, offset]),
    pool.query(countQuery, [userId])
  ]);

  return {
    rows: result.rows,
    total: parseInt(countResult.rows[0].count)
  };
}

