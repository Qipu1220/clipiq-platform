import * as feedService from '../services/feed.service.js';
import ApiError from '../utils/apiError.js';

/**
 * Feed Controller
 * Handles feed generation endpoints
 */

/**
 * GET /api/v1/feed/personal
 * Generate personalized feed for authenticated user
 */
export const getPersonalFeed = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const sessionId = req.query.session_id || req.headers['x-session-id'];
    const limit = parseInt(req.query.limit) || 20;
    
    if (!sessionId) {
      throw new ApiError(400, 'session_id is required (query param or X-Session-Id header)');
    }
    
    if (limit < 1 || limit > 50) {
      throw new ApiError(400, 'limit must be between 1 and 50');
    }
    
    const feed = await feedService.generatePersonalFeed(userId, sessionId, limit);
    
    res.status(200).json({
      success: true,
      data: feed
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/feed/trending
 * Get trending videos (no personalization)
 */
export const getTrendingFeed = async (req, res, next) => {
  try {
    const userId = req.user?.userId; // Optional auth
    const sessionId = req.query.session_id || req.headers['x-session-id'];
    const limit = parseInt(req.query.limit) || 20;
    
    if (limit < 1 || limit > 50) {
      throw new ApiError(400, 'limit must be between 1 and 50');
    }
    
    // Get seen videos if user is authenticated
    let seenVideoIds = new Set();
    if (userId && sessionId) {
      seenVideoIds = await feedService.getSeenVideoIds(userId, sessionId, 6);
    }
    
    // Generate trending candidates
    const candidates = await feedService.generateTrendingCandidates(seenVideoIds, limit * 2);
    
    // Take top N
    const topCandidates = candidates.slice(0, limit);
    
    // Fetch video details
    const videos = await feedService.fetchVideoDetails(topCandidates.map(c => c.video_id));
    
    // If authenticated, insert impressions
    const feedItems = [];
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const item = {
        ...video,
        position: i,
        source: 'trending',
        popularity_score: topCandidates[i].popularity_score
      };
      
      // Insert impression only if authenticated
      if (userId && sessionId) {
        const impressionService = await import('../services/impression.service.js');
        const impression = await impressionService.createImpression({
          user_id: userId,
          video_id: video.id,
          session_id: sessionId,
          position: i,
          source: 'trending',
          model_version: 'v1_trending'
        });
        item.impression_id = impression.id;
      }
      
      feedItems.push(item);
    }
    
    res.status(200).json({
      success: true,
      data: {
        items: feedItems,
        total: feedItems.length,
        session_id: sessionId
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getPersonalFeed,
  getTrendingFeed
};
