/**
 * ViewHistory Model
 * Repository for view history data access operations
 */

import pool from '../config/database.js';

export class ViewHistory {
  /**
   * Get views count in last 24 hours
   * @returns {Promise<number>} Number of views in last 24 hours
   */
  static async getViews24h() {
    const query = `
      SELECT COUNT(*) as views_24h
      FROM view_history
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;
    const result = await pool.query(query);
    return parseInt(result.rows[0].views_24h || 0);
  }
}

