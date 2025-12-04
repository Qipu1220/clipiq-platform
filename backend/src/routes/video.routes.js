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
  likeVideo,
  unlikeVideo,
  getComments,
  addComment,
} from '../controllers/video.controller.js';
import { authenticateToken, optionalAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes - MUST be before /:id
router.get('/search', searchVideos); // Search videos
router.get('/trending', getTrendingVideos); // Get trending videos
router.get('/', optionalAuth, getVideos); // Get video feed

// Protected routes
router.post('/', authenticateToken, uploadVideo);
router.put('/:id', authenticateToken, updateVideo);
router.delete('/:id', authenticateToken, deleteVideo);

// Like routes
router.post('/:id/like', authenticateToken, likeVideo);
router.delete('/:id/like', authenticateToken, unlikeVideo);

// Comment routes
router.get('/:id/comments', getComments);
router.post('/:id/comments', authenticateToken, addComment);

// This route must be last
router.get('/:id', getVideoById); // Get single video

export default router;
