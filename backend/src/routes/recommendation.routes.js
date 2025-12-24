import express from 'express';
import * as recommendationController from '../controllers/recommendation.controller.js';
import { authenticateToken, optionalAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/v1/recommendations/feed
 * @desc    Get personalized video feed for authenticated user
 * @access  Private
 */
router.get('/feed', authenticateToken, recommendationController.getPersonalizedFeed);

/**
 * @route   GET /api/v1/recommendations/similar/:videoId
 * @desc    Get videos similar to specified video
 * @access  Private
 */
router.get('/similar/:videoId', authenticateToken, recommendationController.getSimilarVideos);

/**
 * @route   GET /api/v1/recommendations/explorer
 * @desc    Get explorer feed (all videos ranked by engagement)
 * @access  Private (optionalAuth for interaction status)
 */
router.get('/explorer', optionalAuth, recommendationController.getExplorerFeed);

/**
 * @route   GET /api/v1/recommendations/trending
 * @desc    Get trending videos (with optional auth for like/save status)
 * @access  Public (optionalAuth for interaction status)
 */
router.get('/trending', optionalAuth, recommendationController.getTrendingVideos);

/**
 * @route   GET /api/v1/recommendations/popular
 * @desc    Get popular videos (with optional auth for like/save status)
 * @access  Public (optionalAuth for interaction status)
 */
router.get('/popular', optionalAuth, recommendationController.getPopularVideos);

/**
 * @route   GET /api/v1/recommendations/category/:categoryId
 * @desc    Get videos by category (with optional auth for like/save status)
 * @access  Public (optionalAuth for interaction status)
 */
router.get('/category/:categoryId', optionalAuth, recommendationController.getVideosByCategory);

export default router;
