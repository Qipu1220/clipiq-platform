/**
 * Appeal Model
 * Repository for appeal data access operations
 */

import pool from '../config/database.js';

export class Appeal {
  /**
   * Get pending appeals
   * @param {number} limit - Number of appeals to return (default: 5)
   * @returns {Promise<Array>} Array of pending appeals
   */
  static async getPending(limit = 5) {
    const query = `
      SELECT 
        a.id,
        a.reason,
        a.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM appeals a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.status = 'pending'
      ORDER BY a.created_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows.map(row => ({
      id: row.id,
      reason: row.reason,
      createdAt: row.created_at,
      user: {
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url
      }
    }));
  }

  /**
   * Count pending appeals
   * @returns {Promise<number>} Number of pending appeals
   */
  static async countPending() {
    const query = `
      SELECT COUNT(*) as count
      FROM appeals
      WHERE status = 'pending'
    `;
    const result = await pool.query(query);
    return parseInt(result.rows[0].count || 0);
  }
}
