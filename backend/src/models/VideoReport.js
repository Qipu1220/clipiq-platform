/**
 * VideoReport Model
 * Repository for video report data access operations
 */

import pool from '../config/database.js';

export class VideoReport {
  /**
   * Get pending video reports
   * @param {number} limit - Number of reports to return (default: 5)
   * @returns {Promise<Array>} Array of pending video reports
   */
  static async getPending(limit = 5) {
    const query = `
      SELECT 
        vr.id,
        vr.reason,
        vr.created_at,
        v.title as reported_video,
        u.username as reported_by
      FROM video_reports vr
      LEFT JOIN videos v ON vr.video_id = v.id
      LEFT JOIN users u ON vr.reported_by_id = u.id
      WHERE vr.status = 'pending'
      ORDER BY vr.created_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows.map(row => ({
      id: row.id,
      type: 'video',
      reason: row.reason,
      createdAt: row.created_at,
      reportedVideo: row.reported_video,
      reportedBy: row.reported_by
    }));
  }

  /**
   * Count pending video reports
   * @returns {Promise<number>} Number of pending video reports
   */
  static async countPending() {
    const query = `
      SELECT COUNT(*) as count
      FROM video_reports
      WHERE status = 'pending'
    `;
    const result = await pool.query(query);
    return parseInt(result.rows[0].count || 0);
  }
}
