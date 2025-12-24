// Video business logic - Database queries and operations

import pool from '../config/database.js';
import crypto from 'crypto';

/**
 * Get videos count with conditions
 */
export async function getVideosCount(conditions, params) {
  const countQuery = `
    SELECT COUNT(*) as count 
    FROM videos v
    LEFT JOIN users u ON v.uploader_id = u.id
    WHERE ${conditions.join(' AND ')}
  `;
  const result = await pool.query(countQuery, params);
  return parseInt(result.rows[0].count);
}

/**
 * Get videos with pagination
 */
export async function getVideosList(conditions, params, limitNum, offset, userId) {
  const paramIndex = params.length + 1;
  const query = `
    SELECT v.*, u.username, u.display_name, u.avatar_url,
    EXISTS(SELECT 1 FROM likes l WHERE l.video_id = v.id AND l.user_id = $${paramIndex + 2}) as is_liked,
    EXISTS(
      SELECT 1 FROM playlist_videos pv
      JOIN playlists p ON pv.playlist_id = p.id
      WHERE pv.video_id = v.id AND p.user_id = $${paramIndex + 2} AND p.name = 'Đã lưu'
    ) as is_saved
    FROM videos v
    LEFT JOIN users u ON v.uploader_id = u.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY v.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const result = await pool.query(query, [...params, limitNum, offset, userId]);
  return result.rows;
}

/**
 * Get single video by ID
 */
export async function getVideoByIdFromDb(id) {
  const query = `
    SELECT v.*, u.username, u.display_name, u.avatar_url
    FROM videos v
    LEFT JOIN users u ON v.uploader_id = u.id
    WHERE v.id = $1 AND v.status = $2
  `;
  const result = await pool.query(query, [id, 'active']);
  return result.rows[0] || null;
}

/**
 * Check if user liked video
 */
export async function checkUserLikedVideo(videoId, userId) {
  const result = await pool.query(
    'SELECT 1 FROM likes WHERE video_id = $1 AND user_id = $2',
    [videoId, userId]
  );
  return result.rows.length > 0;
}

/**
 * Check if user saved video
 */
export async function checkUserSavedVideo(videoId, userId) {
  const result = await pool.query(
    `SELECT 1 FROM playlist_videos pv
     JOIN playlists p ON pv.playlist_id = p.id
     WHERE pv.video_id = $1 AND p.user_id = $2 AND p.name = 'Đã lưu'`,
    [videoId, userId]
  );
  return result.rows.length > 0;
}

/**
 * Increment video views
 */
export async function incrementVideoViews(id) {
  await pool.query(
    'UPDATE videos SET views = views + 1 WHERE id = $1',
    [id]
  );
}

/**
 * Create new video
 */
export async function createVideo(title, description, userId, videoUrl, thumbnailUrl, duration) {
  const videoId = crypto.randomUUID();
  const result = await pool.query(
    `INSERT INTO videos (id, title, description, uploader_id, video_url, thumbnail_url, duration, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id, title, video_url, thumbnail_url, status`,
    [videoId, title, description || '', userId, videoUrl, thumbnailUrl, duration, 'processing']
  );
  return result.rows[0];
}

/**
 * Get video uploader ID
 */
export async function getVideoUploaderId(id) {
  const result = await pool.query(
    'SELECT uploader_id FROM videos WHERE id = $1',
    [id]
  );
  return result.rows[0]?.uploader_id || null;
}

/**
 * Update video metadata
 */
export async function updateVideoMetadata(id, title, description) {
  const result = await pool.query(
    `UPDATE videos SET title = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
    [title, description || '', id]
  );
  return result.rows[0];
}

/**
 * Soft delete video
 */
export async function softDeleteVideo(id) {
  await pool.query(
    'UPDATE videos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    ['deleted', id]
  );
}

/**
 * Search videos
 */
export async function searchVideosFromDb(searchTerm, limitNum, offset, userId) {
  const countResult = await pool.query(
    `SELECT COUNT(*) as count FROM videos WHERE status = $1 AND (title ILIKE $2 OR description ILIKE $2)`,
    ['active', searchTerm]
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await pool.query(
    `SELECT v.*, u.username, u.display_name, u.avatar_url,
     EXISTS(
       SELECT 1 FROM playlist_videos pv 
       JOIN playlists p ON pv.playlist_id = p.id 
       WHERE pv.video_id = v.id AND p.user_id = $5 AND p.name = 'Đã lưu'
     ) as is_saved
     FROM videos v
     LEFT JOIN users u ON v.uploader_id = u.id
     WHERE v.status = $1 AND (v.title ILIKE $2 OR v.description ILIKE $2)
     ORDER BY v.created_at DESC
     LIMIT $3 OFFSET $4`,
    ['active', searchTerm, limitNum, offset, userId || -1]
  );

  return { rows: result.rows, total };
}

/**
 * Get trending videos
 */
export async function getTrendingVideosFromDb(userId) {
  const result = await pool.query(
    `SELECT v.*, u.username, u.display_name, u.avatar_url,
     EXISTS(
       SELECT 1 FROM playlist_videos pv 
       JOIN playlists p ON pv.playlist_id = p.id 
       WHERE pv.video_id = v.id AND p.user_id = $2 AND p.name = 'Đã lưu'
     ) as is_saved
     FROM videos v
     LEFT JOIN users u ON v.uploader_id = u.id
     WHERE v.status = $1 AND v.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
     ORDER BY v.views DESC
     LIMIT 20`,
    ['active', userId || -1]
  );
  return result.rows;
}

/**
 * Check if video exists
 */
export async function videoExists(videoId) {
  const result = await pool.query('SELECT 1 FROM videos WHERE id = $1', [videoId]);
  return result.rows.length > 0;
}

/**
 * Format video row to response object
 */
export function formatVideoResponse(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    videoUrl: `http://localhost:9000/clipiq-videos/${row.video_url}`,
    thumbnailUrl: (row.thumbnail_url && row.thumbnail_url.startsWith('http'))
      ? row.thumbnail_url
      : `https://images.unsplash.com/photo-${Math.abs(row.id.charCodeAt(0) * 1000 + row.id.charCodeAt(1) * 100)}?w=400&h=600&fit=crop`,
    duration: row.duration,
    views: row.views,
    likes: row.likes_count || 0,
    isLiked: row.is_liked || false,
    isSaved: row.is_saved || false,
    comments: row.comments_count || 0,
    uploaderUsername: row.username,
    uploaderDisplayName: row.display_name,
    uploaderAvatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}
