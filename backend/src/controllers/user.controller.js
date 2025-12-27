import * as UserService from '../services/user.service.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/v1/users/me
 * Get current user profile
 */
export const getCurrentUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  
  const profile = await UserService.getUserByIdService(userId);
  
  return res.status(200).json({
    success: true,
    data: profile
  });
});

/**
 * GET /api/v1/users/me/stats
 * Get staff statistics (for staff/admin only)
 */
export const getStaffStats = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const userRole = req.user.role;
  
  if (userRole !== 'staff' && userRole !== 'admin') {
    throw new ApiError(403, 'Only staff and admin can access statistics');
  }
  
  const stats = await UserService.getStaffStatsService(userId);
  
  return res.status(200).json({
    success: true,
    data: stats
  });
});

/**
 * GET /api/v1/users/:username
 * Get user public profile by username
 */
export const getUserProfileByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;
  
  const profile = await UserService.getUserByUsernameService(username);
  
  return res.status(200).json({
    success: true,
    data: profile
  });
});

/**
 * PUT /api/v1/users/:username
 * Update user profile (own profile only)
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const userId = req.user.userId;
  const currentUsername = req.user.username;
  
  // Check if user is updating their own profile
  if (username !== currentUsername) {
    throw new ApiError(403, 'Cannot edit other user\'s profile');
  }
  
  const { displayName, bio, avatarUrl, email } = req.body;
  
  const updatedProfile = await UserService.updateUserProfileService(userId, {
    displayName,
    bio,
    avatarUrl,
    email
  });
  
  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: updatedProfile
  });
});

/**
 * GET /api/v1/users/search
 * Search users by query
 */
export const searchUsers = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  if (!q) {
    return res.status(200).json({
      success: true,
      data: {
        users: [],
        pagination: { total: 0, page: parseInt(page), pages: 0 }
      }
    });
  }

  const users = await UserService.searchUsersService(q, parseInt(limit), parseInt(offset));
  const total = await UserService.countSearchUsersService(q);
  const pages = Math.ceil(total / limit);

  return res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages
      }
    }
  });
});
