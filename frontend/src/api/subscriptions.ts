/**
 * Subscription API
 * Frontend API functions for follow/unfollow
 */

import apiClient from './client';

export interface FollowedUser {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    followed_at: string;
}

export interface FollowCounts {
    followingCount: number;
    followersCount: number;
}

/**
 * Follow a user
 */
export async function followUserApi(userId: string) {
    const response = await apiClient.post(`/subscriptions/follow/${userId}`);
    return response.data;
}

/**
 * Unfollow a user
 */
export async function unfollowUserApi(userId: string) {
    const response = await apiClient.delete(`/subscriptions/follow/${userId}`);
    return response.data;
}

/**
 * Check if following a user
 */
export async function checkFollowingApi(userId: string): Promise<{ isFollowing: boolean }> {
    const response = await apiClient.get(`/subscriptions/check/${userId}`);
    return response.data.data;
}

/**
 * Get users that current user is following
 */
export async function getFollowingApi(limit = 50, offset = 0): Promise<{ following: FollowedUser[] }> {
    const response = await apiClient.get('/subscriptions/following', {
        params: { limit, offset }
    });
    return response.data.data;
}

/**
 * Get followers of current user
 */
export async function getFollowersApi(limit = 50, offset = 0): Promise<{ followers: FollowedUser[] }> {
    const response = await apiClient.get('/subscriptions/followers', {
        params: { limit, offset }
    });
    return response.data.data;
}

/**
 * Get follow counts for current user
 */
export async function getFollowCountsApi(): Promise<FollowCounts> {
    const response = await apiClient.get('/subscriptions/counts');
    return response.data.data;
}

/**
 * Get list of user IDs that current user is following
 */
export async function getFollowingIdsApi(): Promise<{ followingIds: string[] }> {
    const response = await apiClient.get('/subscriptions/following-ids');
    return response.data.data;
}

/**
 * Check following status for multiple users
 */
export async function checkFollowingMultipleApi(userIds: string[]): Promise<{ followingStatus: Record<string, boolean> }> {
    const response = await apiClient.post('/subscriptions/check-multiple', { userIds });
    return response.data.data;
}

/**
 * Get followers of a specific user
 */
export async function getUserFollowersApi(userId: string, limit = 50, offset = 0) {
    const response = await apiClient.get(`/subscriptions/user/${userId}/followers`, {
        params: { limit, offset }
    });
    return response.data.data;
}

/**
 * Get following of a specific user
 */
export async function getUserFollowingApi(userId: string, limit = 50, offset = 0) {
    const response = await apiClient.get(`/subscriptions/user/${userId}/following`, {
        params: { limit, offset }
    });
    return response.data.data;
}
