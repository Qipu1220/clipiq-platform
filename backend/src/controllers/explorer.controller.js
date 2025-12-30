/**
 * Explorer Controller
 * Handles HTTP requests for explorer/discovery feed
 * Delegates business logic to explorer.service.js
 */

import ApiError from '../utils/apiError.js';
import * as ExplorerService from '../services/explorer.service.js';
import { getFullVideoUrl, getFullThumbnailUrl } from '../utils/url.util.js';

/**
 * GET /api/v1/explorer
 * Get explorer feed with weighted scoring
 * 
 * @route GET /api/v1/explorer
 * @access Public
 * @query {number} [page=1] - Page number
 * @query {number} [limit=20] - Items per page (max 50)
 * @query {string} [sort=weighted] - Sort type: 'weighted', 'fresh', 'random'
 * @query {boolean} [excludeWatched=false] - Exclude videos user has watched (requires auth)
 * @query {number} [seed] - Random seed for consistent pagination (optional)
 */
export async function getExplorerFeed(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'weighted',
      excludeWatched = 'false',
      seed
    } = req.query;

    const userId = (req.user && req.user.userId) || null;

    const result = await ExplorerService.getExplorerFeed({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sort,
      excludeWatched: excludeWatched === 'true',
      seed: seed ? parseFloat(seed) : null,
      userId
    });

    // Format response
    const videos = result.videos.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      videoUrl: getFullVideoUrl(row.video_url),
      thumbnailUrl: getFullThumbnailUrl(row.thumbnail_url, row.id),
      duration: row.duration,
      views: parseInt(row.views) || 0,
      likes: parseInt(row.likes_count) || 0,
      comments: parseInt(row.comments_count) || 0,
      shares: parseInt(row.shares_count) || 0,
      impressions: parseInt(row.impressions_count) || 0,
      isLiked: row.is_liked || false,
      isSaved: row.is_saved || false,
      uploaderUsername: row.username,
      uploaderDisplayName: row.display_name,
      uploaderAvatarUrl: row.avatar_url,
      createdAt: row.created_at,
      uploadedAt: row.created_at,
      // Include score for debugging (can be removed in production)
      ...(sort === 'weighted' && { score: row.final_score ? parseFloat(Number(row.final_score).toFixed(2)) : 0 })
    }));

    return res.status(200).json({
      success: true,
      data: {
        videos,
        pagination: result.pagination
      }
    });

  } catch (error) {
    console.error('Error fetching explorer feed:', error);
    return next(new ApiError(500, 'Failed to fetch explorer feed'));
  }
}

/**
 * GET /api/v1/explorer/stats
 * Get statistics about explorer feed
 * 
 * @route GET /api/v1/explorer/stats
 * @access Public
 */
export async function getExplorerStats(req, res, next) {
  try {
    const stats = await ExplorerService.getExplorerStats();

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching explorer stats:', error);
    return next(new ApiError(500, 'Failed to fetch explorer stats'));
  }
}
