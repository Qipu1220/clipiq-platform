/**
 * User Service
 * Business logic for user management
 */

import * as UserModel from '../models/User.js';
import * as NotificationModel from '../models/Notification.js';
import ApiError from '../utils/apiError.js';

/**
 * Get all users (Admin/Staff only)
 */
export async function getAllUsersService(filters) {
  const result = await UserModel.getAllUsers(filters);
  
  // Format response
  const formattedUsers = result.users.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.display_name,
    bio: user.bio,
    avatarUrl: user.avatar_url,
    banned: user.banned,
    banExpiry: user.ban_expiry,
    banReason: user.ban_reason,
    warnings: user.warnings,
    stats: {
      videos: parseInt(user.video_count) || 0,
      followers: parseInt(user.follower_count) || 0,
      following: parseInt(user.following_count) || 0
    },
    createdAt: user.created_at,
    updatedAt: user.updated_at
  }));
  
  return {
    users: formattedUsers,
    pagination: {
      total: result.total,
      page: result.page,
      pages: result.pages,
      limit: filters.limit || 100
    }
  };
}

/**
 * Get user by username
 */
export async function getUserByUsernameService(username) {
  const user = await UserModel.getUserByUsername(username);
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    banned: user.banned,
    banExpiry: user.banExpiry,
    banReason: user.banReason,
    warnings: user.warnings,
    stats: {
      videos: parseInt(user.videoCount) || 0,
      followers: parseInt(user.followerCount) || 0,
      following: parseInt(user.followingCount) || 0
    },
    createdAt: user.createdAt
  };
}

/**
 * Ban user (Staff/Admin only)
 */
export async function banUserService(username, reason, bannedById, durationDays = null) {
  console.log(`🚫 Starting ban for user: ${username}, reason: ${reason}, duration: ${durationDays}`);
  
  // Check if user exists
  console.log('Fetching user...');
  const user = await UserModel.getUserByUsername(username);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  console.log(`User found: ${user.id}`);
  
  // Calculate expiry date
  let expiryDate = null;
  if (durationDays) {
    expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(durationDays));
    console.log(`Ban expiry date: ${expiryDate}`);
  } else {
    console.log('Permanent ban (no expiry)');
  }
  
  // Ban user
  console.log('Executing ban update...');
  const bannedUser = await UserModel.banUser(username, reason, bannedById, expiryDate);
  console.log('Ban update completed:', bannedUser);
  
  // Create notification (skip if fails to avoid blocking)
  console.log('Creating notification...');
  try {
    const notificationPromise = NotificationModel.createNotification({
      type: 'ban_warning',
      receiverId: user.id,
      message: expiryDate 
        ? `You have been banned until ${expiryDate.toISOString()}. Reason: ${reason}`
        : `You have been permanently banned. Reason: ${reason}`
    });
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Notification timeout')), 5000)
    );
    
    await Promise.race([notificationPromise, timeoutPromise]);
    console.log('Notification created successfully');
  } catch (error) {
    console.error('Failed to create ban notification:', error.message);
  }
  
  return {
    id: bannedUser.id,
    username: bannedUser.username,
    displayName: bannedUser.display_name,
    banned: bannedUser.banned,
    banExpiry: bannedUser.ban_expiry,
    banReason: bannedUser.ban_reason,
    warnings: bannedUser.warnings
  };
}

/**
 * Unban user (Staff/Admin only)
 */
export async function unbanUserService(username) {
  const user = await UserModel.getUserByUsername(username);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  
  if (!user.banned) {
    throw new ApiError(400, 'User is not banned');
  }
  
  const unbannedUser = await UserModel.unbanUser(username);
  
  // Create notification
  try {
    await NotificationModel.createNotification({
      type: 'ban_appeal_resolved',
      receiverId: user.id,
      message: 'Your ban has been lifted. You can now access the platform again.'
    });
  } catch (error) {
    console.error('Failed to create unban notification:', error);
  }
  
  return {
    id: unbannedUser.id,
    username: unbannedUser.username,
    displayName: unbannedUser.display_name,
    banned: unbannedUser.banned,
    warnings: unbannedUser.warnings
  };
}

/**
 * Warn user (Staff/Admin only)
 */
export async function warnUserService(username, reason, warnedById, durationDays = 7) {
  const user = await UserModel.getUserByUsername(username);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  
  const warnedUser = await UserModel.warnUser(username, reason, warnedById);
  
  // Create notification
  try {
    await NotificationModel.createNotification({
      type: 'ban_warning',
      receiverId: user.id,
      message: `Warning: ${reason}. You now have ${warnedUser.warnings} warning(s). This warning expires in ${durationDays} days.`
    });
  } catch (error) {
    console.error('Failed to create warning notification:', error);
  }
  
  return {
    id: warnedUser.id,
    username: warnedUser.username,
    displayName: warnedUser.display_name,
    warnings: warnedUser.warnings,
    banned: warnedUser.banned
  };
}

/**
 * Clear user warnings (Staff/Admin only)
 */
export async function clearWarningsService(username) {
  const user = await UserModel.getUserByUsername(username);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  
  if (user.warnings === 0) {
    throw new ApiError(400, 'User has no warnings to clear');
  }
  
  const clearedUser = await UserModel.clearWarnings(username);
  
  // Create notification
  try {
    await NotificationModel.createNotification({
      type: 'ban_appeal_resolved',
      receiverId: user.id,
      message: 'Your warnings have been cleared.'
    });
  } catch (error) {
    console.error('Failed to create clear warning notification:', error);
  }
  
  return {
    id: clearedUser.id,
    username: clearedUser.username,
    displayName: clearedUser.display_name,
    warnings: clearedUser.warnings
  };
}

/**
 * Get user by ID
 */
export async function getUserByIdService(userId) {
  const user = await UserModel.getUserById(userId);
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.display_name,
    bio: user.bio,
    avatarUrl: user.avatar_url,
    banned: user.banned,
    banExpiry: user.ban_expiry,
    banReason: user.ban_reason,
    warnings: user.warnings,
    stats: {
      videos: parseInt(user.video_count) || 0,
      followers: parseInt(user.follower_count) || 0,
      following: parseInt(user.following_count) || 0
    },
    createdAt: user.created_at
  };
}

/**
 * Update user profile
 */
export async function updateUserProfileService(userId, updates) {
  const { displayName, bio, avatarUrl, email } = updates;
  
  const updatedUser = await UserModel.updateUserProfile(userId, {
    displayName,
    bio,
    avatarUrl,
    email
  });
  
  if (!updatedUser) {
    throw new ApiError(404, 'User not found');
  }
  
  return {
    id: updatedUser.id,
    username: updatedUser.username,
    email: updatedUser.email,
    role: updatedUser.role,
    displayName: updatedUser.display_name,
    bio: updatedUser.bio,
    avatarUrl: updatedUser.avatar_url,
    banned: updatedUser.banned,
    warnings: updatedUser.warnings,
    createdAt: updatedUser.created_at
  };
}

/**
 * Get staff statistics
 */
export async function getStaffStatsService(userId) {
  const stats = await UserModel.getStaffStats(userId);
  
  return {
    reportsProcessed: parseInt(stats.reports_processed) || 0,
    usersWarned: parseInt(stats.users_warned) || 0,
    usersBanned: parseInt(stats.users_banned) || 0,
    daysActive: parseInt(stats.days_active) || 0,
    lastActivity: stats.last_activity
  };
}

/**
 * Search users by query
 */
export async function searchUsersService(query, limit = 10, offset = 0) {
  const users = await UserModel.searchUsers(query, limit, offset);
  
  return users.map(user => ({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    bio: user.bio,
    avatarUrl: user.avatar_url,
    role: user.role,
    followersCount: parseInt(user.followers_count) || 0,
    createdAt: user.created_at
  }));
}

/**
 * Count search users results
 */
export async function countSearchUsersService(query) {
  return await UserModel.countSearchUsers(query);
}

export default {
  getAllUsersService,
  getUserByUsernameService,
  getUserByIdService,
  updateUserProfileService,
  getStaffStatsService,
  banUserService,
  unbanUserService,
  warnUserService,
  clearWarningsService,
  searchUsersService,
  countSearchUsersService
};
