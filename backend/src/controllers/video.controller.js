/**
 * Video Controller
 * Handles HTTP requests for video operations
 * Delegates business logic to services
 */

import ApiError from '../utils/apiError.js';
import { getFullVideoUrl, getFullThumbnailUrl, formatVideoForResponse } from '../utils/url.util.js';

// Import services
import * as VideoService from '../services/video.service.js';
import * as LikeService from '../services/like.service.js';
import * as CommentService from '../services/comment.service.js';
import * as PlaylistService from '../services/playlist.service.js';

/**
 * GET /api/v1/videos - Get video feed (For You / Following)
 */
export async function getVideos(req, res, next) {
  try {
    const { feed = 'foryou', page = 1, limit = 10, username } = req.query;
    const userId = (req.user && req.user.userId) || null;

    const result = await VideoService.getVideoFeed({
      feed,
      page,
      limit,
      username,
      userId
    });

    const videos = result.videos.map(row => formatVideoForResponse(row));

    return res.status(200).json({
      success: true,
      data: {
        videos,
        pagination: result.pagination
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
    const userId = req.user?.id || null;

    const video = await VideoService.getVideoWithUserInfo(id, userId);

    if (!video) {
      throw new ApiError(404, 'Video not found');
    }

    return res.status(200).json({
      success: true,
      data: {
        id: video.id,
        title: video.title,
        description: video.description,
        videoUrl: getFullVideoUrl(video.video_url),
        thumbnailUrl: getFullThumbnailUrl(video.thumbnail_url, video.id),
        duration: video.duration,
        views: video.views,
        likes: video.likes_count || 0,
        comments: video.comments_count || 0,
        uploaderId: video.uploader_id,
        uploaderUsername: video.username,
        uploaderDisplayName: video.display_name,
        uploaderAvatarUrl: video.avatar_url,
        isLiked: video.is_liked,
        isSaved: video.is_saved,
        createdAt: video.created_at,
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
    const userId = req.user.userId;

    // Validate required fields
    if (!title) {
      throw new ApiError(400, 'Title is required');
    }

    // Check if video file is uploaded
    if (!req.files || !req.files.video || req.files.video.length === 0) {
      throw new ApiError(400, 'Video file is required');
    }

    const videoFile = req.files.video[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    // Import upload service dynamically
    const uploadService = await import('../services/upload.service.js');

    // Process video upload (includes MinIO upload, keyframe extraction, indexing)
    const result = await uploadService.processVideoUpload(videoFile.buffer, {
      title,
      description,
      uploaderId: userId,
      thumbnailBuffer: thumbnailFile ? thumbnailFile.buffer : null
    });

    return res.status(201).json({
      success: true,
      message: result.message || 'Video uploaded successfully',
      data: {
        video: result.video
      }
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
    const userId = req.user.userId;

    // Check if video exists and user is owner
    const uploaderId = await VideoService.getVideoUploaderId(id);

    if (!uploaderId) {
      throw new ApiError(404, 'Video not found');
    }

    // Compare as strings to handle UUID comparison
    if (String(uploaderId) !== String(userId) && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to update this video');
    }

    // Update video
    const updatedVideo = await VideoService.updateVideo(id, { title, description });

    return res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      data: updatedVideo
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
    const userId = req.user.userId;

    // Check if video exists
    const uploaderId = await VideoService.getVideoUploaderId(id);

    if (!uploaderId) {
      throw new ApiError(404, 'Video not found');
    }

    // Check authorization
    if (String(uploaderId) !== String(userId) && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to delete this video');
    }

    // Soft delete
    await VideoService.deleteVideoService(id);

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

    const userId = req.user?.userId || null;
    console.log('[Search] User ID for isLiked/isSaved check:', userId);

    const result = await VideoService.searchVideos(q, { page, limit, userId });

    // Format videos for response
    const videos = result.videos.map(video => ({
      id: video.id,
      title: video.title,
      description: video.description,
      videoUrl: getFullVideoUrl(video.video_url),
      thumbnailUrl: getFullThumbnailUrl(video.thumbnail_url, video.id),
      duration: video.duration,
      views: video.views,
      likes: video.likes_count || 0,
      comments: video.comments_count || 0,
      uploaderId: video.uploader_id,
      uploaderUsername: video.username,
      uploaderDisplayName: video.display_name,
      uploaderAvatarUrl: video.avatar_url,
      isSaved: video.is_saved,
      isLiked: video.is_liked,
      processingStatus: video.processing_status,
      createdAt: video.created_at,
      uploadedAt: video.created_at,
      searchScore: video.searchScore
    }));

    console.log('[Search] Sample video isLiked/isSaved:', videos[0]?.id, 'isLiked:', videos[0]?.isLiked, 'isSaved:', videos[0]?.isSaved);

    return res.status(200).json({
      success: true,
      data: {
        videos,
        total: result.total,
        query: q,
        pagination: result.pagination,
        classification: result.classification
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
    const userId = req.user?.userId || null;
    const videoRows = await VideoService.getTrendingVideos(userId);

    const videos = videoRows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      videoUrl: getFullVideoUrl(row.video_url),
      thumbnailUrl: getFullThumbnailUrl(row.thumbnail_url, row.id),
      duration: row.duration,
      views: row.views,
      likes: row.likes_count || 0,
      comments: row.comments_count || 0,
      uploaderId: row.uploader_id,
      uploaderUsername: row.username,
      uploaderDisplayName: row.display_name,
      uploaderAvatarUrl: row.avatar_url,
      isSaved: row.is_saved,
      isLiked: row.is_liked,
      createdAt: row.created_at,
    }));

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

/**
 * POST /api/v1/videos/:id/like - Like a video
 */
export async function likeVideo(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await LikeService.likeVideo(id, userId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(200).json({ success: true, message: result.message });
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

    const result = await LikeService.unlikeVideo(id, userId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(200).json({ success: true, message: result.message });
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

    const result = await LikeService.getLikedVideosByUser(userId, { page, limit });

    const videos = result.videos.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      videoUrl: getFullVideoUrl(row.video_url),
      thumbnailUrl: getFullThumbnailUrl(row.thumbnail_url, row.id),
      duration: row.duration,
      views: row.views,
      likes: row.likes_count || 0,
      isLiked: true,
      isSaved: row.is_saved,
      comments: row.comments_count || 0,
      uploaderId: row.uploader_id,
      uploaderUsername: row.username,
      uploaderDisplayName: row.display_name,
      uploaderAvatarUrl: row.avatar_url,
      createdAt: row.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: {
        videos,
        pagination: result.pagination
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/videos/saved - Get saved videos (from 'Đã lưu' playlist)
 */
export async function getSavedVideos(req, res, next) {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    const result = await PlaylistService.getSavedVideosByUser(userId, { page, limit });

    const videos = result.videos.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      videoUrl: getFullVideoUrl(row.video_url),
      thumbnailUrl: getFullThumbnailUrl(row.thumbnail_url, row.id),
      duration: row.duration,
      views: row.views,
      likes: row.likes_count || 0,
      isLiked: row.is_liked,
      isSaved: true,
      comments: row.comments_count || 0,
      uploaderId: row.uploader_id,
      uploaderUsername: row.username,
      uploaderDisplayName: row.display_name,
      uploaderAvatarUrl: row.avatar_url,
      createdAt: row.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: {
        videos,
        pagination: result.pagination
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/videos/:id/save - Toggle save video (bookmark)
 */
export async function toggleSaveVideo(req, res, next) {
  try {
    const { id: videoId } = req.params;
    const userId = req.user.userId;

    // Check if video exists
    const exists = await VideoService.videoExists(videoId);
    if (!exists) {
      throw new ApiError(404, 'Video not found');
    }

    const result = await PlaylistService.toggleVideoSave(videoId, userId);

    return res.status(200).json({
      success: true,
      data: { isSaved: result.isSaved },
      message: result.message
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/videos/:id/comments - Get video comments
 */
export async function getComments(req, res, next) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const comments = await CommentService.getCommentsByVideo(id, { page, limit });

    return res.status(200).json({
      success: true,
      data: comments
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/videos/:id/comments - Add a comment
 */
export async function addComment(req, res, next) {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = (req.user && req.user.userId) || null;

    if (!text) {
      throw new ApiError(400, 'Comment text is required');
    }

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    const newComment = await CommentService.createComment(id, userId, text);

    return res.status(201).json({
      success: true,
      data: newComment
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/videos/:id/comments/:commentId - Delete a comment
 */
export async function deleteComment(req, res, next) {
  try {
    const { id, commentId } = req.params;
    const userId = req.user.userId;

    // Check if comment exists for this video
    const comment = await CommentService.getCommentForVideo(commentId, id);

    if (!comment) {
      throw new ApiError(404, 'Comment not found');
    }

    // Check authorization
    if (comment.user_id !== userId && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to delete this comment');
    }

    // Delete comment
    await CommentService.deleteComment(commentId, id);

    return res.status(200).json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
}
