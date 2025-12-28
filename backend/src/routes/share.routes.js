/**
 * Share Routes
 * Routes for video sharing functionality
 */

import express from 'express';
import {
  shareVideo,
  getVideoShares,
  getMyShares,
  getShareAnalytics
} from '../controllers/share.controller.js';
import { authenticateToken, optionalAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * POST /api/v1/videos/:id/share
 * Record a video share
 * Auth: Optional (tracks both authenticated and anonymous shares)
 * Body: { share_type: 'link' | 'facebook' | 'twitter' | etc }
 */
router.post('/videos/:id/share', optionalAuth, shareVideo);

/**
 * GET /api/v1/videos/:id/shares
 * Get share statistics for a specific video
 * Auth: Public
 */
router.get('/videos/:id/shares', getVideoShares);

/**
 * GET /api/v1/shares/my-shares
 * Get videos shared by current user
 * Auth: Required
 */
router.get('/shares/my-shares', authenticateToken, getMyShares);

/**
 * GET /api/v1/shares/analytics
 * Get share analytics (admin feature)
 * Auth: Required (can add role middleware for admin/staff only)
 * Query: ?period=24h|7d|30d|all
 */
router.get('/shares/analytics', authenticateToken, getShareAnalytics);

export default router;
