/**
 * Video Service
 * Business logic for video operations
 */

import pool from '../config/database.js';

/**
 * Get video by ID
 * @param {string} videoId - Video ID
 * @returns {Promise<Object|null>} Video object or null if not found
 */
export async function getVideoByIdService(videoId) {
  const result = await pool.query(
    'SELECT * FROM videos WHERE id = $1',
    [videoId]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Delete video (soft delete)
 * @param {string} videoId - Video ID to delete
 * @returns {Promise<Object>} Deleted video info
 */
export async function deleteVideoService(videoId) {
  const result = await pool.query(
    `UPDATE videos 
     SET status = 'deleted', updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1 
     RETURNING id, title, video_url, thumbnail_url`,
    [videoId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Video not found');
  }
  
  return result.rows[0];
}

export default {
  getVideoByIdService,
  deleteVideoService
};
