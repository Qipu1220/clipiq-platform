/**
 * Impression Routes
 * 
 * Routes for logging impressions and watch events.
 * Part of the RCM (Recommendation) system.
 */

import express from 'express';
import {
    logImpression,
    logWatch,
    getImpressionHistory
} from '../controllers/impression.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All impression routes require authentication
router.use(authenticateToken);

/**
 * POST /api/v1/impressions
 * Log an impression when video is shown >= 600ms
 */
router.post('/', logImpression);

/**
 * POST /api/v1/watch
 * Log a watch event when user leaves video
 */
router.post('/watch', logWatch);

/**
 * GET /api/v1/impressions/history
 * Get user's impression history
 */
router.get('/history', getImpressionHistory);

export default router;
