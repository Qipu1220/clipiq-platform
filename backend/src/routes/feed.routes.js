import express from 'express';
import * as feedController from '../controllers/feed.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/v1/feed/personal
 * @desc    Get personalized feed (requires auth)
 * @access  Private
 * @query   session_id (required), limit (optional, default 20, max 50)
 */
router.get('/personal', authenticateToken, feedController.getPersonalFeed);

/**
 * @route   GET /api/v1/feed/trending
 * @desc    Get trending feed (auth optional)
 * @access  Public/Private
 * @query   session_id (optional), limit (optional, default 20, max 50)
 */
router.get('/trending', feedController.getTrendingFeed);

export default router;
