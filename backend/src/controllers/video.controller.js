/**
 * Video Controller
 * Handles video-related operations: fetch, search, trending, upload, update, delete
 */

import * as videoService from '../services/video.service.js';
import ApiError from '../utils/apiError.js';

/**
 * GET /api/v1/videos - Get video feed (For You / Following)
 */
export async function getVideos(req, res, next) {
  try {
    const { feed = 'foryou', page = 1, limit = 10, username } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 10, 50);
    const offset = (pageNum - 1) * limitNum;

    // Build query conditions
    const conditions = ['v.status = $1'];
    const params = ['active'];

    if (username) {
      conditions.push(`u.username = $2`);
      params.push(username);
    }

    const userId = req.user?.userId || null;

    // Get total count and videos
    const total = await videoService.getVideosCount(conditions, params);
    const rows = await videoService.getVideosList(conditions, params, limitNum, offset, userId);

    const videos = rows.map(videoService.formatVideoResponse);
    const pages = Math.ceil(total / limitNum);

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

/**
 * GET /api/v1/videos/:id - Get single video by ID
 */
export async function getVideoById(req, res, next) {
  try {
    const { id } = req.params;

    const video = await videoService.getVideoByIdFromDb(id);
    if (!video) {
      throw new ApiError(404, 'Video not found');
    }

    // Check if current user liked this video or saved it
    let isLiked = false;
    let isSaved = false;
    if (req.user) {
      isLiked = await videoService.checkUserLikedVideo(id, req.user.id);
      isSaved = await videoService.checkUserSavedVideo(id, req.user.id);
    }

    // Increment views
    await videoService.incrementVideoViews(id);

    return res.status(200).json({
      success: true,
      data: {
        ...videoService.formatVideoResponse(video),
        views: video.views + 1,
        isLiked,
        isSaved,
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/videos - Upload new video
 */
export async function uploadVideo(req, res, next) {
  try {
    const { title, description, notifyFollowers } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!title) {
      throw new ApiError(400, 'Title is required');
    }

    // TODO: Upload to MinIO and get URLs
    const videoUrl = 'video.mp4';
    const thumbnailUrl = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop';
    const duration = 0;

    const result = await videoService.createVideo(title, description, userId, videoUrl, thumbnailUrl, duration);

    return res.status(201).json({
      success: true,
      message: 'Video uploaded successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/videos/:id - Update video metadata
 */
export async function updateVideo(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const userId = req.user.id;

    // Check if video exists and user is owner
    const uploaderId = await videoService.getVideoUploaderId(id);

    if (!uploaderId) {
      throw new ApiError(404, 'Video not found');
    }

    if (uploaderId !== userId && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to update this video');
    }

    const result = await videoService.updateVideoMetadata(id, title, description);

    return res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/videos/:id - Delete video
 */
export async function deleteVideo(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if video exists
    const uploaderId = await videoService.getVideoUploaderId(id);

    if (!uploaderId) {
      throw new ApiError(404, 'Video not found');
    }

    // Check authorization
    if (uploaderId !== userId && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to delete this video');
    }

    await videoService.softDeleteVideo(id);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/videos/search - Search videos
 */
export async function searchVideos(req, res, next) {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      throw new ApiError(400, 'Search query is required');
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offset = (pageNum - 1) * limitNum;
    const searchTerm = `%${q}%`;

    const { rows, total } = await videoService.searchVideosFromDb(searchTerm, limitNum, offset, req.user?.userId);

    const videos = rows.map(videoService.formatVideoResponse);
    const pages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      data: {
        videos,
        total,
        query: q,
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

/**
 * GET /api/v1/videos/trending - Get trending videos
 */
export async function getTrendingVideos(req, res, next) {
  try {
    const rows = await videoService.getTrendingVideosFromDb(req.user?.userId);
    const videos = rows.map(videoService.formatVideoResponse);

    return res.status(200).json({
      success: true,
      data: {
        videos,
      }
    });
  } catch (error) {
    next(error);
  }
}
