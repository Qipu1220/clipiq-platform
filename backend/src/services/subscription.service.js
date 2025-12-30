/**
 * Subscription Service
 * Business logic for user follow/unfollow (subscriptions)
 */

import pool from '../config/database.js';

/**
 * Follow a user
 * @param {string} followerId - User who is following
 * @param {string} followingId - User being followed
 * @returns {Promise<object>} Created subscription
 */
export async function followUser(followerId, followingId) {
    // Check if already following
    const existingQuery = `
    SELECT id FROM subscriptions 
    WHERE follower_id = $1 AND following_id = $2
  `;
    const existing = await pool.query(existingQuery, [followerId, followingId]);

    if (existing.rows.length > 0) {
        return { alreadyFollowing: true };
    }

    // Create subscription
    const insertQuery = `
    INSERT INTO subscriptions (follower_id, following_id)
    VALUES ($1, $2)
    RETURNING id, follower_id, following_id, created_at
  `;
    const result = await pool.query(insertQuery, [followerId, followingId]);

    return result.rows[0];
}

/**
 * Unfollow a user
 * @param {string} followerId - User who is unfollowing
 * @param {string} followingId - User being unfollowed
 * @returns {Promise<boolean>} True if unfollowed
 */
export async function unfollowUser(followerId, followingId) {
    const deleteQuery = `
    DELETE FROM subscriptions 
    WHERE follower_id = $1 AND following_id = $2
    RETURNING id
  `;
    const result = await pool.query(deleteQuery, [followerId, followingId]);

    return result.rows.length > 0;
}

/**
 * Check if user is following another user
 * @param {string} followerId - User who might be following
 * @param {string} followingId - User who might be followed
 * @returns {Promise<boolean>} True if following
 */
export async function isFollowing(followerId, followingId) {
    const query = `
    SELECT id FROM subscriptions 
    WHERE follower_id = $1 AND following_id = $2
  `;
    const result = await pool.query(query, [followerId, followingId]);

    return result.rows.length > 0;
}

/**
 * Get users that a user is following
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of results
 * @param {number} offset - Offset for pagination
 * @returns {Promise<object[]>} List of followed users
 */
export async function getFollowing(userId, limit = 50, offset = 0) {
    const query = `
    SELECT 
      u.id,
      u.username,
      u.display_name,
      u.avatar_url,
      u.bio,
      s.created_at as followed_at
    FROM subscriptions s
    JOIN users u ON u.id = s.following_id
    WHERE s.follower_id = $1
    ORDER BY s.created_at DESC
    LIMIT $2 OFFSET $3
  `;
    const result = await pool.query(query, [userId, limit, offset]);

    return result.rows;
}

/**
 * Get followers of a user
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of results
 * @param {number} offset - Offset for pagination
 * @returns {Promise<object[]>} List of followers
 */
export async function getFollowers(userId, limit = 50, offset = 0) {
    const query = `
    SELECT 
      u.id,
      u.username,
      u.display_name,
      u.avatar_url,
      u.bio,
      s.created_at as followed_at
    FROM subscriptions s
    JOIN users u ON u.id = s.follower_id
    WHERE s.following_id = $1
    ORDER BY s.created_at DESC
    LIMIT $2 OFFSET $3
  `;
    const result = await pool.query(query, [userId, limit, offset]);

    return result.rows;
}

/**
 * Get follower and following counts for a user
 * @param {string} userId - User ID
 * @returns {Promise<object>} Counts
 */
export async function getFollowCounts(userId) {
    const query = `
    SELECT 
      (SELECT COUNT(*) FROM subscriptions WHERE follower_id = $1) as following_count,
      (SELECT COUNT(*) FROM subscriptions WHERE following_id = $1) as followers_count
  `;
    const result = await pool.query(query, [userId]);

    return {
        followingCount: parseInt(result.rows[0].following_count, 10),
        followersCount: parseInt(result.rows[0].followers_count, 10)
    };
}

/**
 * Get list of user IDs that a user is following (for bulk check)
 * @param {string} userId - User ID
 * @returns {Promise<string[]>} Array of followed user IDs
 */
export async function getFollowingIds(userId) {
    const query = `
    SELECT following_id FROM subscriptions WHERE follower_id = $1
  `;
    const result = await pool.query(query, [userId]);

    return result.rows.map(row => row.following_id);
}

/**
 * Check following status for multiple users
 * @param {string} followerId - User who might be following
 * @param {string[]} userIds - User IDs to check
 * @returns {Promise<object>} Map of userId -> isFollowing
 */
export async function checkFollowingMultiple(followerId, userIds) {
    if (!userIds || userIds.length === 0) {
        return {};
    }

    const query = `
    SELECT following_id FROM subscriptions 
    WHERE follower_id = $1 AND following_id = ANY($2)
  `;
    const result = await pool.query(query, [followerId, userIds]);

    const followingSet = new Set(result.rows.map(row => row.following_id));
    const statusMap = {};

    userIds.forEach(id => {
        statusMap[id] = followingSet.has(id);
    });

    return statusMap;
}

export default {
    followUser,
    unfollowUser,
    isFollowing,
    getFollowing,
    getFollowers,
    getFollowCounts,
    getFollowingIds,
    checkFollowingMultiple
};
