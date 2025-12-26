// Video routes: /api/v1/videos/*

import express from 'express';
import {
  getVideos,
  getVideoById,
  uploadVideo,
  updateVideo,
  deleteVideo,
  searchVideos,
  getTrendingVideos,
} from '../controllers/video.controller.js';
import { authenticateToken, optionalAuth, checkNotBanned } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes - MUST be before /:id
router.get('/search', searchVideos); // Search videos
router.get('/trending', getTrendingVideos); // Get trending videos
router.get('/', getVideos); // Get video feed

// Protected routes
router.post('/', authenticateToken, checkNotBanned, uploadVideo);
router.put('/:id', authenticateToken, checkNotBanned, updateVideo);
router.delete('/:id', authenticateToken, checkNotBanned, deleteVideo);

// Like routes
router.post('/:id/like', authenticateToken, checkNotBanned, likeVideo);
router.delete('/:id/like', authenticateToken, checkNotBanned, unlikeVideo);
router.get('/liked', authenticateToken, checkNotBanned, getLikedVideos); // Get liked videos
router.get('/saved', authenticateToken, checkNotBanned, getSavedVideos); // Get saved videos
router.post('/:id/save', authenticateToken, checkNotBanned, toggleSaveVideo); // Toggle save video

// Comment routes
router.get('/:id/comments', getComments);
router.post('/:id/comments', authenticateToken, checkNotBanned, addComment);
router.delete('/:id/comments/:commentId', authenticateToken, checkNotBanned, deleteComment);

// This route must be last
router.get('/:id', getVideoById); // Get single video

export default router;
