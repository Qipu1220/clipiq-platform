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
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes - MUST be before /:id
router.get('/search', searchVideos); // Search videos
router.get('/trending', getTrendingVideos); // Get trending videos
router.get('/', getVideos); // Get video feed

// Protected routes
router.post('/', authenticateToken, uploadVideo);
router.put('/:id', authenticateToken, updateVideo);
router.delete('/:id', authenticateToken, deleteVideo);

// This route must be last
router.get('/:id', getVideoById); // Get single video

export default router;
