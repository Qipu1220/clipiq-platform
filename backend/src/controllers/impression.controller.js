/**
 * Impression Controller
 * 
 * Handles HTTP requests for impression logging and watch events.
 * Part of the RCM (Recommendation) system.
 */

import * as impressionService from '../services/impression.service.js';
import ApiError from '../utils/apiError.js';

/**
 * POST /api/v1/impressions
 * Log an impression when a video is shown to user (>= 600ms visibility)
 * 
 * @route POST /api/v1/impressions
 * @access Private (requires authentication)
 * @body {string} user_id - User UUID
 * @body {string} video_id - Video UUID
 * @body {string} session_id - Session UUID
 * @body {number} position - Position in feed (0-based)
 * @body {string} source - Source type (personal/trending/random)
 * @body {string} [model_version] - Model version (optional)
 */
export async function logImpression(req, res, next) {
    try {
        const {
            user_id,
            video_id,
            session_id,
            position,
            source,
            model_version
        } = req.body;

        // Validate required fields
        if (!user_id || !video_id || !session_id || position === undefined || !source) {
            return next(new ApiError(400, 'Missing required fields: user_id, video_id, session_id, position, source'));
        }

        // Validate source
        const validSources = ['personal', 'trending', 'random'];
        if (!validSources.includes(source)) {
            return next(new ApiError(400, `Invalid source. Must be one of: ${validSources.join(', ')}`));
        }

        // Validate position is a non-negative integer
        if (!Number.isInteger(position) || position < 0) {
            return next(new ApiError(400, 'Position must be a non-negative integer'));
        }

        // Verify user_id matches authenticated user (req.user.userId comes from JWT)
        if (req.user && req.user.userId !== user_id) {
            return next(new ApiError(403, 'User ID mismatch'));
        }

        // Verify video exists and is active (using service)
        const video = await impressionService.getVideoForImpression(video_id);

        if (!video) {
            return next(new ApiError(404, 'Video not found'));
        }

        if (video.status !== 'active') {
            return next(new ApiError(400, 'Video is not active'));
        }

        // Create impression
        const impression = await impressionService.createImpression({
            user_id,
            video_id,
            session_id,
            position,
            source,
            model_version
        });

        console.log(`[Impression] Logged impression: user=${user_id}, video=${video_id}, session=${session_id}, position=${position}, source=${source}`);

        res.status(201).json({
            success: true,
            impression_id: impression.id,
            data: impression
        });
    } catch (error) {
        console.error('Error logging impression:', error);
        next(error);
    }
}

/**
 * POST /api/v1/watch
 * Log a watch event when user leaves a video
 * 
 * @route POST /api/v1/watch
 * @access Private (requires authentication)
 * @body {string} impression_id - Impression UUID (optional)
 * @body {string} user_id - User UUID
 * @body {string} video_id - Video UUID
 * @body {number} watch_duration - Watch duration in seconds
 * @body {boolean} completed - Whether video was completed
 */
export async function logWatch(req, res, next) {
    try {
        const {
            impression_id,
            user_id,
            video_id,
            watch_duration,
            completed
        } = req.body;

        // Validate required fields
        if (!user_id || !video_id || watch_duration === undefined || completed === undefined) {
            return next(new ApiError(400, 'Missing required fields: user_id, video_id, watch_duration, completed'));
        }

        // Validate watch_duration is a non-negative number
        if (typeof watch_duration !== 'number' || watch_duration < 0) {
            return next(new ApiError(400, 'Watch duration must be a non-negative number'));
        }

        // Validate completed is boolean
        if (typeof completed !== 'boolean') {
            return next(new ApiError(400, 'Completed must be a boolean'));
        }

        // Verify user_id matches authenticated user (req.user.userId comes from JWT)
        if (req.user && req.user.userId !== user_id) {
            return next(new ApiError(403, 'User ID mismatch'));
        }

        // Verify video exists (using service)
        const videoExists = await impressionService.videoExists(video_id);

        if (!videoExists) {
            return next(new ApiError(404, 'Video not found'));
        }

        // If impression_id provided, verify it exists
        if (impression_id) {
            const impression = await impressionService.getImpressionById(impression_id);
            if (!impression) {
                return next(new ApiError(404, 'Impression not found'));
            }

            // Verify impression belongs to this user and video
            if (impression.user_id !== user_id || impression.video_id !== video_id) {
                return next(new ApiError(400, 'Impression does not match user or video'));
            }
        }

        // Create watch event
        const watchEvent = await impressionService.createWatchEvent({
            user_id,
            video_id,
            watch_duration,
            completed,
            impression_id
        });

        console.log(`[Watch] Logged watch event: user=${user_id}, video=${video_id}, duration=${watch_duration}s, completed=${completed}, impression=${impression_id || 'none'}`);

        // Increment video view counter
        await impressionService.incrementVideoViews(video_id);

        res.status(200).json({
            success: true,
            data: watchEvent
        });
    } catch (error) {
        console.error('Error logging watch event:', error);
        next(error);
    }
}

/**
 * GET /api/v1/impressions/history
 * Get user's impression history
 * 
 * @route GET /api/v1/impressions/history
 * @access Private (requires authentication)
 * @query {number} [limit=50] - Number of impressions to retrieve
 * @query {number} [offset=0] - Offset for pagination
 */
export async function getImpressionHistory(req, res, next) {
    try {
        const userId = req.user.userId; // Fixed: use userId from JWT payload
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        // Validate limit and offset
        if (limit < 1 || limit > 100) {
            return next(new ApiError(400, 'Limit must be between 1 and 100'));
        }

        if (offset < 0) {
            return next(new ApiError(400, 'Offset must be non-negative'));
        }

        const impressions = await impressionService.getUserImpressions(userId, limit, offset);

        res.json({
            success: true,
            count: impressions.length,
            limit,
            offset,
            data: impressions
        });
    } catch (error) {
        console.error('Error getting impression history:', error);
        next(error);
    }
}

export default {
    logImpression,
    logWatch,
    getImpressionHistory
};
