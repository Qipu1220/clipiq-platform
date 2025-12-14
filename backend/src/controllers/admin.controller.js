/**
 * Admin Controller
 * Handles admin and staff operations for user management
 */

import * as UserService from '../services/user.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';

/**
 * GET /admin/users
 * Get all users with optional filters
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const { role, banned, search, page, limit } = req.query;
  
  const filters = {
    role,
    banned: banned !== undefined ? banned === 'true' : undefined,
    search,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 100
  };
  
  const result = await UserService.getAllUsersService(filters);
  
  return successResponse(res, result, 'Users retrieved successfully');
});

/**
 * PUT /admin/users/:username/ban
 * Ban a user (temporary or permanent)
 */
export const banUser = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { reason, duration } = req.body;
  const bannedById = req.user.id;
  
  console.log(`👮 Admin ban request: ${username}, by: ${bannedById}, duration: ${duration}`);
  console.log('Request body:', req.body);
  
  const result = await UserService.banUserService(username, reason, bannedById, duration);
  
  console.log('✅ Ban completed successfully');
  return successResponse(res, result, 'User banned successfully');
});

/**
 * PUT /admin/users/:username/unban
 * Unban a user
 */
export const unbanUser = asyncHandler(async (req, res) => {
  const { username } = req.params;
  
  const result = await UserService.unbanUserService(username);
  
  return successResponse(res, result, 'User unbanned successfully');
});

/**
 * PUT /admin/users/:username/warn
 * Warn a user
 */
export const warnUser = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { reason, duration } = req.body;
  const warnedById = req.user.id;
  
  const result = await UserService.warnUserService(username, reason, warnedById, duration);
  
  return successResponse(res, result, 'User warned successfully');
});

/**
 * PUT /admin/users/:username/clear-warnings
 * Clear all warnings for a user
 */
export const clearWarnings = asyncHandler(async (req, res) => {
  const { username } = req.params;
  
  const result = await UserService.clearWarningsService(username);
  
  return successResponse(res, result, 'Warnings cleared successfully');
});

export default {
  getAllUsers,
  banUser,
  unbanUser,
  warnUser,
  clearWarnings
};
