/**
 * StaffProfile Service
 * Business logic for staff profile statistics
 */

import {
  getResolvedReportsCount,
  getWarnedUsersCount,
  getBannedUsersCount,
  getWorkDays,
  getLastActivity
} from '../models/StaffProfile.js';

/**
 * Get comprehensive stats for a staff member
 * @param {number} staffUserId - Staff user ID
 * @returns {Promise<Object>} Staff statistics
 */
export async function getStaffStatsService(staffUserId) {
  // Fetch all stats in parallel for performance
  const [
    reportsProcessed,
    usersWarned,
    usersBanned,
    daysActive,
    lastActivity
  ] = await Promise.all([
    getResolvedReportsCount(staffUserId),
    getWarnedUsersCount(staffUserId),
    getBannedUsersCount(staffUserId),
    getWorkDays(staffUserId),
    getLastActivity(staffUserId)
  ]);

  return {
    reportsProcessed,
    usersWarned,
    usersBanned,
    daysActive,
    lastActivity
  };
}
