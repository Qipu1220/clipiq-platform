/**
 * Saved Controller
 * Handles save/bookmark video operations
 */

import * as savedService from '../services/saved.service.js';
import * as videoService from '../services/video.service.js';
import ApiError from '../utils/apiError.js';

/**
 * POST /api/v1/videos/:id/save - Toggle save video (bookmark)
 */
export async function toggleSaveVideo(req, res, next) {
  try {
    const { id: videoId } = req.params;
    const userId = req.user.userId;

    // Check if video exists
    const exists = await videoService.videoExists(videoId);
    if (!exists) {
      throw new ApiError(404, 'Video not found');
    }

    // Get or create "Đã lưu" playlist
    const playlistId = await savedService.getOrCreateSavedPlaylist(userId);

    // Check if video is already in playlist
    const isInPlaylist = await savedService.isVideoInPlaylist(playlistId, videoId);

    let isSaved = false;

    if (isInPlaylist) {
      // Remove from playlist
      await savedService.removeVideoFromPlaylist(playlistId, videoId);
      isSaved = false;
    } else {
      // Add to playlist
      await savedService.addVideoToPlaylist(playlistId, videoId);
      isSaved = true;
    }

    return res.status(200).json({
      success: true,
      data: { isSaved },
      message: isSaved ? 'Đã lưu video' : 'Đã bỏ lưu video'
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
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 50);
    const offset = (pageNum - 1) * limitNum;

    // Find 'Đã lưu' playlist
    const playlistId = await savedService.getSavedPlaylistId(userId);

    if (!playlistId) {
      // Return empty if no saved playlist
      return res.status(200).json({
        success: true,
        data: {
          videos: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0, hasMore: false }
        }
      });
    }

    const { rows, total } = await savedService.getSavedVideosByUser(userId, playlistId, limitNum, offset);
    const pages = Math.ceil(total / limitNum);

    const videos = rows.map(row => ({
      ...videoService.formatVideoResponse(row),
      isSaved: true,
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

