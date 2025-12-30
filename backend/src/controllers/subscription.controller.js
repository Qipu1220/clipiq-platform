/**
 * Subscription Controller
 * HTTP handlers for follow/unfollow endpoints
 */

import subscriptionService from '../services/subscription.service.js';
import pool from '../config/database.js';

/**
 * Follow a user
 * POST /api/v1/subscriptions/follow/:userId
 */
export async function follow(req, res, next) {
    try {
        const followerId = req.user.userId;
        const { userId } = req.params;

        console.log('[Subscription] Follow request:', { followerId, userId, equal: followerId === userId });

        // Check if trying to follow self
        if (followerId === userId) {
            return res.status(400).json({
                success: false,
                message: 'Bạn không thể tự follow chính mình'
            });
        }

        // Check if target user exists
        const userCheck = await pool.query('SELECT id, username FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        const result = await subscriptionService.followUser(followerId, userId);

        if (result.alreadyFollowing) {
            return res.status(200).json({
                success: true,
                message: 'Đã follow người dùng này',
                data: { alreadyFollowing: true }
            });
        }

        res.status(201).json({
            success: true,
            message: `Đã follow ${userCheck.rows[0].username}`,
            data: {
                subscription: result,
                followedUser: {
                    id: userCheck.rows[0].id,
                    username: userCheck.rows[0].username
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Unfollow a user
 * DELETE /api/v1/subscriptions/follow/:userId
 */
export async function unfollow(req, res, next) {
    try {
        const followerId = req.user.userId;
        const { userId } = req.params;

        const result = await subscriptionService.unfollowUser(followerId, userId);

        if (!result) {
            return res.status(200).json({
                success: true,
                message: 'Chưa follow người dùng này',
                data: { wasFollowing: false }
            });
        }

        res.json({
            success: true,
            message: 'Đã unfollow thành công',
            data: { wasFollowing: true }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Check if following a user
 * GET /api/v1/subscriptions/check/:userId
 */
export async function checkFollowing(req, res, next) {
    try {
        const followerId = req.user.userId;
        const { userId } = req.params;

        const isFollowing = await subscriptionService.isFollowing(followerId, userId);

        res.json({
            success: true,
            data: { isFollowing }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get users that current user is following
 * GET /api/v1/subscriptions/following
 */
export async function getFollowing(req, res, next) {
    try {
        const userId = req.user.userId;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const following = await subscriptionService.getFollowing(userId, limit, offset);

        res.json({
            success: true,
            data: {
                following,
                pagination: {
                    limit,
                    offset,
                    count: following.length
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get followers of current user
 * GET /api/v1/subscriptions/followers
 */
export async function getFollowers(req, res, next) {
    try {
        const userId = req.user.userId;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const followers = await subscriptionService.getFollowers(userId, limit, offset);

        res.json({
            success: true,
            data: {
                followers,
                pagination: {
                    limit,
                    offset,
                    count: followers.length
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get following/follower counts for current user
 * GET /api/v1/subscriptions/counts
 */
export async function getCounts(req, res, next) {
    try {
        const userId = req.user.userId;
        const counts = await subscriptionService.getFollowCounts(userId);

        res.json({
            success: true,
            data: counts
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get list of user IDs that current user is following
 * GET /api/v1/subscriptions/following-ids
 */
export async function getFollowingIds(req, res, next) {
    try {
        const userId = req.user.userId;
        const followingIds = await subscriptionService.getFollowingIds(userId);

        res.json({
            success: true,
            data: { followingIds }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Check following status for multiple users
 * POST /api/v1/subscriptions/check-multiple
 * Body: { userIds: string[] }
 */
export async function checkFollowingMultiple(req, res, next) {
    try {
        const followerId = req.user.userId;
        const { userIds } = req.body;

        if (!Array.isArray(userIds)) {
            return res.status(400).json({
                success: false,
                message: 'userIds must be an array'
            });
        }

        const statusMap = await subscriptionService.checkFollowingMultiple(followerId, userIds);

        res.json({
            success: true,
            data: { followingStatus: statusMap }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get followers of a specific user (public)
 * GET /api/v1/subscriptions/user/:userId/followers
 */
export async function getUserFollowers(req, res, next) {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const followers = await subscriptionService.getFollowers(userId, limit, offset);
        const counts = await subscriptionService.getFollowCounts(userId);

        res.json({
            success: true,
            data: {
                followers,
                totalCount: counts.followersCount,
                pagination: { limit, offset, count: followers.length }
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get following of a specific user (public)
 * GET /api/v1/subscriptions/user/:userId/following
 */
export async function getUserFollowing(req, res, next) {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const following = await subscriptionService.getFollowing(userId, limit, offset);
        const counts = await subscriptionService.getFollowCounts(userId);

        res.json({
            success: true,
            data: {
                following,
                totalCount: counts.followingCount,
                pagination: { limit, offset, count: following.length }
            }
        });
    } catch (error) {
        next(error);
    }
}

export default {
    follow,
    unfollow,
    checkFollowing,
    getFollowing,
    getFollowers,
    getCounts,
    getFollowingIds,
    checkFollowingMultiple,
    getUserFollowers,
    getUserFollowing
};
