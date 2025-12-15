/**
 * UserReport Model
 * Repository for user report data access operations
 */

import pool from '../config/database.js';

export class UserReport {
  /**
   * Get pending user reports
   * @param {number} limit - Number of reports to return (default: 5)
   * @returns {Promise<Array>} Array of pending user reports
   */
  static async getPending(limit = 5) {
    const query = `
      SELECT 
        ur.id,
        ur.reason,
        ur.created_at,
        u1.username as reported_user,
        u2.username as reported_by
      FROM user_reports ur
      LEFT JOIN users u1 ON ur.reported_user_id = u1.id
      LEFT JOIN users u2 ON ur.reported_by_id = u2.id
      WHERE ur.status = 'pending'
      ORDER BY ur.created_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows.map(row => ({
      id: row.id,
      type: 'user',
      reason: row.reason,
      createdAt: row.created_at,
      reportedUser: row.reported_user,
      reportedBy: row.reported_by
    }));
  }

  /**
   * Count pending user reports
   * @returns {Promise<number>} Number of pending user reports
   */
  static async countPending() {
    const query = `
      SELECT COUNT(*) as count
      FROM user_reports
      WHERE status = 'pending'
    `;
    const result = await pool.query(query);
    return parseInt(result.rows[0].count || 0);
  }
}
