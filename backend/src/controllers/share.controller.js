/**
 * Share Controller
 * Handles HTTP requests for video sharing operations
 * Delegates business logic to share.service.js
 */

import ApiError from '../utils/apiError.js';
import * as ShareService from '../services/share.service.js';
import { getFullVideoUrl, getFullThumbnailUrl } from '../utils/url.util.js';

/**
 * POST /api/v1/videos/:id/share
 * Record a video share
 * 
 * @route POST /api/v1/videos/:id/share
 * @access Public (optional auth - can track anonymous shares)
 * @param {string} id - Video ID
 * @body {string} share_type - Type of share (link, facebook, twitter, etc.)
 */
export async function shareVideo(req, res, next) {
  try {
    const { id } = req.params;
    const { share_type = 'link' } = req.body;
    const userId = req.user?.userId || null;

    // Validate share_type
    if (!ShareService.VALID_SHARE_TYPES.includes(share_type)) {
      return next(new ApiError(400, `Invalid share_type. Must be one of: ${ShareService.VALID_SHARE_TYPES.join(', ')}`));
    }

    // Check if video exists and is active
    const video = await ShareService.getVideoForSharing(id);

    if (!video) {
      return next(new ApiError(404, 'Video not found'));
    }

    if (video.status !== 'active') {
      return next(new ApiError(400, 'Video is not active'));
    }

    if (video.processing_status !== 'ready') {
      return next(new ApiError(400, 'Video is not ready for sharing'));
    }

    // Record the share
    const result = await ShareService.recordShare(id, userId, share_type);

    return res.status(201).json({
      success: true,
      message: 'Video shared successfully',
      data: result
    });

  } catch (error) {
    console.error('Error sharing video:', error);
    return next(new ApiError(500, 'Failed to record video share'));
  }
}

/**
 * GET /api/v1/videos/:id/shares
 * Get share statistics for a video
 * 
 * @route GET /api/v1/videos/:id/shares
 * @access Public
 * @param {string} id - Video ID
 */
export async function getVideoShares(req, res, next) {
  try {
    const { id } = req.params;

    // Check if video exists
    const video = await ShareService.getVideoForSharing(id);

    if (!video) {
      return next(new ApiError(404, 'Video not found'));
    }

    const stats = await ShareService.getVideoShareStats(id);

    return res.status(200).json({
      success: true,
      data: {
        videoId: id,
        videoTitle: video.title,
        totalShares: video.shares_count,
        ...stats
      }
    });

  } catch (error) {
    console.error('Error getting video shares:', error);
    return next(new ApiError(500, 'Failed to get video shares'));
  }
}

/**
 * GET /api/v1/shares/my-shares
 * Get videos shared by current user
 * 
 * @route GET /api/v1/shares/my-shares
 * @access Private (requires authentication)
 * @query {number} page - Page number
 * @query {number} limit - Items per page
 */
export async function getMyShares(req, res, next) {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    const result = await ShareService.getUserShares(userId, { page, limit });

    const videos = result.videos.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      videoUrl: getFullVideoUrl(row.video_url),
      thumbnailUrl: getFullThumbnailUrl(row.thumbnail_url, row.id),
      duration: row.duration,
      views: row.views,
      likes: row.likes_count || 0,
      comments: row.comments_count || 0,
      shares: row.shares_count || 0,
      isLiked: row.is_liked,
      isSaved: row.is_saved,
      uploaderUsername: row.username,
      uploaderDisplayName: row.display_name,
      uploaderAvatarUrl: row.avatar_url,
      createdAt: row.created_at,
      lastSharedBy: row.last_share_type,
      lastSharedAt: row.last_shared_at,
      myShareCount: parseInt(row.my_share_count)
    }));

    return res.status(200).json({
      success: true,
      data: {
        videos,
        pagination: result.pagination
      }
    });

  } catch (error) {
    console.error('Error getting my shares:', error);
    return next(new ApiError(500, 'Failed to get shared videos'));
  }
}

/**
 * GET /api/v1/shares/analytics
 * Get share analytics
 * 
 * @route GET /api/v1/shares/analytics
 * @access Private (Admin/Staff only)
 * @query {string} period - Time period (24h, 7d, 30d, all)
 */
export async function getShareAnalytics(req, res, next) {
  try {
    const { period = '7d' } = req.query;

    const analytics = await ShareService.getShareAnalytics(period);

    return res.status(200).json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error getting share analytics:', error);
    return next(new ApiError(500, 'Failed to get share analytics'));
  }
}

// Export VALID_SHARE_TYPES for backward compatibility
export const VALID_SHARE_TYPES = ShareService.VALID_SHARE_TYPES;

export default {
  shareVideo,
  getVideoShares,
  getMyShares,
  getShareAnalytics,
  VALID_SHARE_TYPES
};
