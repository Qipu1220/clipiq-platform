/**
 * Explorer Routes
 * Routes for discovery/explorer feed
 */

import express from 'express';
import { getExplorerFeed, getExplorerStats } from '../controllers/explorer.controller.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * GET /api/v1/explorer
 * Get explorer feed with weighted scoring
 * Query params: page, limit, sort (weighted|fresh|random)
 * Auth: Optional (works for both logged in and guest users)
 */
router.get('/', optionalAuth, getExplorerFeed);

/**
 * GET /api/v1/explorer/stats
 * Get explorer statistics
 * Auth: Public
 */
router.get('/stats', getExplorerStats);

export default router;
