/**
 * Subscription Routes
 * API endpoints for follow/unfollow functionality
 */

import { Router } from 'express';
import subscriptionController from '../controllers/subscription.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware.authenticateToken);

// Follow/Unfollow a user
router.post('/follow/:userId', subscriptionController.follow);
router.delete('/follow/:userId', subscriptionController.unfollow);

// Check if following
router.get('/check/:userId', subscriptionController.checkFollowing);

// Get current user's following/followers
router.get('/following', subscriptionController.getFollowing);
router.get('/followers', subscriptionController.getFollowers);
router.get('/counts', subscriptionController.getCounts);
router.get('/following-ids', subscriptionController.getFollowingIds);

// Bulk check following status
router.post('/check-multiple', subscriptionController.checkFollowingMultiple);

// Get another user's followers/following (public view)
router.get('/user/:userId/followers', subscriptionController.getUserFollowers);
router.get('/user/:userId/following', subscriptionController.getUserFollowing);

export default router;
