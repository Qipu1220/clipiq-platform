import express from 'express';
import { 
  getUserProfileByUsername, 
  getCurrentUserProfile,
  updateUserProfile,
  getStaffStats,
  searchUsers
} from '../controllers/user.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Search users (public)
router.get('/search', searchUsers);

// Get current user profile (requires auth)
router.get('/me', authenticateToken, getCurrentUserProfile);

// Get staff statistics (staff/admin only)
router.get('/me/stats', authenticateToken, getStaffStats);

// Get public user profile by username
router.get('/:username', getUserProfileByUsername);

// Update user profile (own profile only)
router.put('/:username', authenticateToken, updateUserProfile);

export default router;
