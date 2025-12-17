// Video routes: /api/v1/videos/*

import express from 'express';
import multer from 'multer';
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
  toggleSaveVideo,

  getLikedVideos,
  getSavedVideos,
  getComments,
  addComment,
  deleteComment,
} from '../controllers/video.controller.js';
import { authenticateToken, optionalAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Configure multer for video upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video' && !file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed for video field'));
    }
    if (file.fieldname === 'thumbnail' && !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed for thumbnail field'));
    }
    cb(null, true);
  }
});

// Upload fields configuration
const uploadFields = upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

// Public routes - MUST be before /:id
router.get('/search', searchVideos); // Search videos
router.get('/trending', getTrendingVideos); // Get trending videos
router.get('/', optionalAuth, getVideos); // Get video feed

// Protected routes
router.post('/', authenticateToken, uploadFields, uploadVideo);
router.put('/:id', authenticateToken, updateVideo);
router.delete('/:id', authenticateToken, deleteVideo);

// Like routes
router.post('/:id/like', authenticateToken, likeVideo);
router.delete('/:id/like', authenticateToken, unlikeVideo);
router.get('/liked', authenticateToken, getLikedVideos); // Get liked videos
router.get('/saved', authenticateToken, getSavedVideos); // Get saved videos
router.post('/:id/save', authenticateToken, toggleSaveVideo); // Toggle save video

// Comment routes
router.get('/:id/comments', getComments);
router.post('/:id/comments', authenticateToken, addComment);
router.delete('/:id/comments/:commentId', authenticateToken, deleteComment);

// This route must be last
router.get('/:id', getVideoById); // Get single video

export default router;
