/**
 * StaffProfile Model
 * Database operations for staff statistics
 */

import pool from '../config/database.js';

/**
 * Get count of resolved reports by staff member
 * @param {number} staffUserId - Staff user ID
 * @returns {Promise<number>} Count of resolved reports
 */
export async function getResolvedReportsCount(staffUserId) {
  const query = `
    SELECT 
      (
        SELECT COUNT(*) FROM video_reports 
        WHERE reviewed_by_id = $1 AND status = 'resolved'
      ) +
      (
        SELECT COUNT(*) FROM user_reports 
        WHERE reviewed_by_id = $1 AND status = 'resolved'
      ) as total_resolved
  `;
  
  const result = await pool.query(query, [staffUserId]);
  return parseInt(result.rows[0].total_resolved) || 0;
}

/**
 * Get count of users warned by staff member
 * @param {number} staffUserId - Staff user ID
 * @returns {Promise<number>} Count of warned users
 */
export async function getWarnedUsersCount(staffUserId) {
  const query = `
    SELECT COUNT(DISTINCT reported_user_id) as warned_count
    FROM user_reports
    WHERE reviewed_by_id = $1 
    AND status = 'resolved'
    AND resolution_note LIKE '%cảnh báo%'
  `;
  
  const result = await pool.query(query, [staffUserId]);
  return parseInt(result.rows[0].warned_count) || 0;
}

/**
 * Get count of users banned by staff member
 * @param {number} staffUserId - Staff user ID
 * @returns {Promise<number>} Count of banned users
 */
export async function getBannedUsersCount(staffUserId) {
  const query = `
    SELECT COUNT(DISTINCT reported_user_id) as banned_count
    FROM user_reports
    WHERE reviewed_by_id = $1 
    AND status = 'resolved'
    AND resolution_note LIKE '%cấm%'
  `;
  
  const result = await pool.query(query, [staffUserId]);
  return parseInt(result.rows[0].banned_count) || 0;
}

/**
 * Get work days since staff member joined
 * @param {number} staffUserId - Staff user ID
 * @returns {Promise<number>} Number of days since account creation
 */
export async function getWorkDays(staffUserId) {
  const query = `
    SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER as work_days
    FROM users
    WHERE id = $1
  `;
  
  const result = await pool.query(query, [staffUserId]);
  return result.rows[0]?.work_days || 0;
}

/**
 * Get last activity timestamp for staff member
 * @param {number} staffUserId - Staff user ID
 * @returns {Promise<Date|null>} Last activity timestamp
 */
export async function getLastActivity(staffUserId) {
  const query = `
    SELECT MAX(reviewed_at) as last_activity
    FROM (
      SELECT reviewed_at FROM video_reports WHERE reviewed_by_id = $1
      UNION ALL
      SELECT reviewed_at FROM user_reports WHERE reviewed_by_id = $1
    ) as all_reviews
  `;
  
  const result = await pool.query(query, [staffUserId]);
  return result.rows[0]?.last_activity || null;
}
