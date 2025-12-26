/**
 * Video Model
 * Repository for video data access operations
 */

import pool from '../config/database.js';

export class Video {
  /**
   * Get video statistics
   * Returns total videos, videos uploaded today, and total views
   */
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_videos,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as videos_today,
        SUM(views) as total_views
      FROM videos
      WHERE status = 'active'
    `;
    const result = await pool.query(query);
    return {
      total: parseInt(result.rows[0].total_videos || 0),
      uploadedToday: parseInt(result.rows[0].videos_today || 0),
      totalViews: parseInt(result.rows[0].total_views || 0)
    };
  }

  /**
   * Get top videos by views
   * @param {number} limit - Number of videos to return (default: 5)
   * @returns {Promise<Array>} Array of video objects with uploader info
   */
  static async getTopByViews(limit = 5) {
    const query = `
      SELECT 
        v.id,
        v.title,
        v.views,
        v.thumbnail_url,
        v.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM videos v
      LEFT JOIN users u ON v.uploader_id = u.id
      WHERE v.status = 'active'
      ORDER BY v.views DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      views: parseInt(row.views || 0),
      thumbnailUrl: row.thumbnail_url,
      createdAt: row.created_at,
      uploader: {
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url
      }
    }));
  }
}
