/**
 * Like Controller
 * Handles like/unlike video operations
 */

import * as likeService from '../services/like.service.js';
import * as videoService from '../services/video.service.js';
import recommendationService from '../services/recommendation.service.js';
import ApiError from '../utils/apiError.js';

/**
 * POST /api/v1/videos/:id/like - Like a video
 */
export async function likeVideo(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if already liked
    const alreadyLiked = await likeService.checkLikeExists(id, userId);
    if (alreadyLiked) {
      return res.status(400).json({ success: false, message: 'Already liked' });
    }

    await likeService.addLike(id, userId);
    
    // Clear user's recommendation cache
    await recommendationService.clearUserCache(userId);

    return res.status(200).json({ success: true, message: 'Video liked' });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/videos/:id/like - Unlike a video
 */
export async function unlikeVideo(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if liked
    const isLiked = await likeService.checkLikeExists(id, userId);
    if (!isLiked) {
      return res.status(400).json({ success: false, message: 'Not liked yet' });
    }

    await likeService.removeLike(id, userId);
    
    // Clear user's recommendation cache
    await recommendationService.clearUserCache(userId);

    return res.status(200).json({ success: true, message: 'Video unliked' });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/videos/liked - Get videos liked by current user
 */
export async function getLikedVideos(req, res, next) {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 50);
    const offset = (pageNum - 1) * limitNum;

    const { rows, total } = await likeService.getLikedVideosByUser(userId, limitNum, offset);
    const pages = Math.ceil(total / limitNum);

    const videos = rows.map(row => ({
      ...videoService.formatVideoResponse(row),
      isLiked: true,
    }));

    return res.status(200).json({
      success: true,
      data: {
        videos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages,
          hasMore: pageNum < pages,
        }
      }
    });
  } catch (error) {
    next(error);
  }
}
