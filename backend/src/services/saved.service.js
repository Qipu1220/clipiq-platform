// Saved (bookmark) business logic - Database queries and operations

import pool from '../config/database.js';
import crypto from 'crypto';

/**
 * Get or create "Đã lưu" playlist for user
 */
export async function getOrCreateSavedPlaylist(userId) {
  const playlistCheck = await pool.query(
    `SELECT id FROM playlists WHERE user_id = $1 AND name = 'Đã lưu'`,
    [userId]
  );

  if (playlistCheck.rows.length > 0) {
    return playlistCheck.rows[0].id;
  }

  // Create new playlist
  const newPlaylistId = crypto.randomUUID();
  const createPlaylist = await pool.query(
    `INSERT INTO playlists (id, user_id, name, visibility) VALUES ($1, $2, 'Đã lưu', 'private') RETURNING id`,
    [newPlaylistId, userId]
  );
  return createPlaylist.rows[0].id;
}

/**
 * Check if video is in saved playlist
 */
export async function isVideoInPlaylist(playlistId, videoId) {
  const result = await pool.query(
    `SELECT id FROM playlist_videos WHERE playlist_id = $1 AND video_id = $2`,
    [playlistId, videoId]
  );
  return result.rows.length > 0;
}

/**
 * Remove video from playlist
 */
export async function removeVideoFromPlaylist(playlistId, videoId) {
  await pool.query(
    `DELETE FROM playlist_videos WHERE playlist_id = $1 AND video_id = $2`,
    [playlistId, videoId]
  );
}

/**
 * Add video to playlist
 */
export async function addVideoToPlaylist(playlistId, videoId) {
  // Get max position
  const maxPosResult = await pool.query(
    `SELECT COALESCE(MAX(position), -1) as max_pos FROM playlist_videos WHERE playlist_id = $1`,
    [playlistId]
  );
  const nextPos = maxPosResult.rows[0].max_pos + 1;

  await pool.query(
    `INSERT INTO playlist_videos (id, playlist_id, video_id, position) VALUES ($1, $2, $3, $4)`,
    [crypto.randomUUID(), playlistId, videoId, nextPos]
  );
}

/**
 * Get saved playlist ID for user
 */
export async function getSavedPlaylistId(userId) {
  const result = await pool.query(
    `SELECT id FROM playlists WHERE user_id = $1 AND name = 'Đã lưu' LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.id || null;
}

/**
 * Get saved videos by user with pagination
 */
export async function getSavedVideosByUser(userId, playlistId, limitNum, offset) {
  const query = `
    SELECT v.*, u.username, u.display_name, u.avatar_url,
    EXISTS(SELECT 1 FROM likes l WHERE l.video_id = v.id AND l.user_id = $1) as is_liked,
    true as is_saved
    FROM videos v
    JOIN playlist_videos pv ON v.id = pv.video_id
    LEFT JOIN users u ON v.uploader_id = u.id
    WHERE pv.playlist_id = $2 AND v.status = 'active'
    ORDER BY pv.added_at DESC
    LIMIT $3 OFFSET $4
  `;

  const countQuery = `
    SELECT COUNT(*) as count
    FROM playlist_videos pv
    JOIN videos v ON pv.video_id = v.id
    WHERE pv.playlist_id = $1 AND v.status = 'active'
  `;

  const [result, countResult] = await Promise.all([
    pool.query(query, [userId, playlistId, limitNum, offset]),
    pool.query(countQuery, [playlistId])
  ]);

  return {
    rows: result.rows,
    total: parseInt(countResult.rows[0].count)
  };
}

