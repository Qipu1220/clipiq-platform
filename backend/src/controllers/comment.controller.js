/**
 * Comment Controller
 * Handles comment operations: get, create, delete
 */

import * as commentService from '../services/comment.service.js';
import recommendationService from '../services/recommendation.service.js';
import ApiError from '../utils/apiError.js';

/**
 * GET /api/v1/videos/:id/comments - Get video comments
 */
export async function getComments(req, res, next) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    const rows = await commentService.getCommentsByVideoId(id, limitNum, offset);
    const comments = rows.map(commentService.formatCommentResponse);

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
    const userId = req.user?.userId || null;

    if (!text) {
      throw new ApiError(400, 'Comment text is required');
    }

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    const comment = await commentService.createComment(id, userId, text);
    const user = await commentService.getUserById(userId);
    
    // Clear user's recommendation cache
    await recommendationService.clearUserCache(userId);

    const newComment = {
      id: comment.id,
      text: comment.text,
      userId: userId,
      username: user?.username,
      userDisplayName: user?.display_name,
      userAvatarUrl: user?.avatar_url,
      createdAt: comment.created_at,
    };

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

    // Check if comment exists
    const comment = await commentService.getCommentById(commentId, id);
    if (!comment) {
      throw new ApiError(404, 'Comment not found');
    }

    // Check authorization
    if (comment.user_id !== userId && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to delete this comment');
    }

    await commentService.deleteCommentById(commentId, id);

    return res.status(200).json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
}
