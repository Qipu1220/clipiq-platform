// Video Interaction routes: likes, comments, saved
// /api/v1/videos/*

import express from 'express';
import { likeVideo, unlikeVideo, getLikedVideos } from '../controllers/like.controller.js';
import { getComments, addComment, deleteComment } from '../controllers/comment.controller.js';
import { toggleSaveVideo, getSavedVideos } from '../controllers/saved.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Like routes
router.post('/:id/like', authenticateToken, likeVideo);
router.delete('/:id/like', authenticateToken, unlikeVideo);
router.get('/liked', authenticateToken, getLikedVideos);

// Save/Bookmark routes
router.post('/:id/save', authenticateToken, toggleSaveVideo);
router.get('/saved', authenticateToken, getSavedVideos);

// Comment routes
router.get('/:id/comments', getComments);
router.post('/:id/comments', authenticateToken, addComment);
router.delete('/:id/comments/:commentId', authenticateToken, deleteComment);

export default router;

