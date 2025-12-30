/**
 * Impression Service
 * 
 * Handles database operations for impressions and watch events.
 * Supports the RCM (Recommendation) system by tracking:
 * - Video impressions (when shown to users >= 600ms)
 * - Watch events (when users leave videos)
 * - Seen video tracking for anti-repeat logic
 */

import pool from '../config/database.js';
import crypto from 'node:crypto';

/**
 * Create a new impression record
 * @param {Object} data - Impression data
 * @param {string} data.user_id - User UUID
 * @param {string} data.video_id - Video UUID
 * @param {string} data.session_id - Session UUID
 * @param {number} data.position - Position in feed (0-based)
 * @param {string} data.source - Source type (personal/trending/random)
 * @param {string} [data.model_version] - Model version (optional)
 * @returns {Promise<Object>} Created impression with id
 */
export async function createImpression(data) {
    const {
        user_id,
        video_id,
        session_id,
        position,
        source,
        model_version = null
    } = data;

    const impressionId = crypto.randomUUID();

    const result = await pool.query(
        `INSERT INTO impressions (
      id,
      user_id,
      video_id,
      session_id,
      position,
      source,
      model_version,
      shown_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    RETURNING id, user_id, video_id, session_id, position, source, model_version, shown_at`,
        [impressionId, user_id, video_id, session_id, position, source, model_version]
    );

    return result.rows[0];
}

/**
 * Get impression by ID
 * @param {string} impressionId - Impression UUID
 * @returns {Promise<Object|null>} Impression record or null
 */
export async function getImpressionById(impressionId) {
    const result = await pool.query(
        'SELECT * FROM impressions WHERE id = $1',
        [impressionId]
    );

    return result.rows[0] || null;
}

/**
 * Get video for impression validation
 * @param {string} videoId - Video UUID
 * @returns {Promise<Object|null>} Video record or null
 */
export async function getVideoForImpression(videoId) {
    const result = await pool.query(
        'SELECT id, status, processing_status FROM videos WHERE id = $1',
        [videoId]
    );
    return result.rows[0] || null;
}

/**
 * Check if video exists
 * @param {string} videoId - Video UUID
 * @returns {Promise<boolean>}
 */
export async function videoExists(videoId) {
    const result = await pool.query(
        'SELECT id FROM videos WHERE id = $1',
        [videoId]
    );
    return result.rows.length > 0;
}

/**
 * Get video IDs seen by user within a time window
 * Used for anti-repeat logic in feed generation
 * @param {string} userId - User UUID
 * @param {string} [sessionId] - Optional session UUID to filter by session
 * @param {number} [hours=6] - Time window in hours (default 6)
 * @returns {Promise<string[]>} Array of video UUIDs
 */
export async function getSeenVideoIds(userId, sessionId = null, hours = 6) {
    let query;
    let params;

    if (sessionId) {
        // Get videos seen in this session OR in the last N hours
        query = `
      SELECT DISTINCT video_id
      FROM impressions
      WHERE user_id = $1
        AND (
          session_id = $2
          OR shown_at >= NOW() - INTERVAL '1 hour' * $3
        )
    `;
        params = [userId, sessionId, hours];
    } else {
        // Get videos seen in the last N hours
        query = `
      SELECT DISTINCT video_id
      FROM impressions
      WHERE user_id = $1
        AND shown_at >= NOW() - INTERVAL '1 hour' * $2
    `;
        params = [userId, hours];
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => row.video_id);
}

/**
 * Get video IDs seen in a specific session
 * @param {string} sessionId - Session UUID
 * @returns {Promise<string[]>} Array of video UUIDs
 */
export async function getSessionSeenVideos(sessionId) {
    const result = await pool.query(
        'SELECT DISTINCT video_id FROM impressions WHERE session_id = $1',
        [sessionId]
    );
    return result.rows.map(row => row.video_id);
}

/**
 * Create a watch event in view_history
 * @param {Object} data - Watch event data
 * @param {string} data.user_id - User UUID
 * @param {string} data.video_id - Video UUID
 * @param {number} data.watch_duration - Watch duration in seconds
 * @param {boolean} data.completed - Whether video was completed
 * @param {string} [data.impression_id] - Optional impression UUID
 * @returns {Promise<Object>} Created view_history record
 */
export async function createWatchEvent(data) {
    const {
        user_id,
        video_id,
        watch_duration,
        completed,
        impression_id = null
    } = data;

    const watchId = crypto.randomUUID();

    const result = await pool.query(
        `INSERT INTO view_history (
      id,
      user_id,
      video_id,
      watch_duration,
      completed,
      impression_id,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    RETURNING id, user_id, video_id, watch_duration, completed, impression_id, created_at`,
        [watchId, user_id, video_id, watch_duration, completed, impression_id]
    );

    return result.rows[0];
}

/**
 * Increment video view counter
 * @param {string} videoId - Video UUID
 * @returns {Promise<void>}
 */
export async function incrementVideoViews(videoId) {
    await pool.query(
        'UPDATE videos SET views = views + 1 WHERE id = $1',
        [videoId]
    );
}

/**
 * Get user's impression history
 * @param {string} userId - User UUID
 * @param {number} [limit=50] - Number of impressions to retrieve
 * @param {number} [offset=0] - Offset for pagination
 * @returns {Promise<Object[]>} Array of impressions with video details
 */
export async function getUserImpressions(userId, limit = 50, offset = 0) {
    const result = await pool.query(
        `SELECT 
      i.id,
      i.video_id,
      i.session_id,
      i.position,
      i.source,
      i.model_version,
      i.shown_at,
      v.title,
      v.thumbnail_url,
      v.duration,
      vh.watch_duration,
      vh.completed
    FROM impressions i
    JOIN videos v ON v.id = i.video_id
    LEFT JOIN view_history vh ON vh.impression_id = i.id
    WHERE i.user_id = $1
    ORDER BY i.shown_at DESC
    LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );

    return result.rows;
}

/**
 * Batch create impressions for feed items
 * Used when generating feed to log all shown videos at once
 * @param {string} userId - User UUID
 * @param {string} sessionId - Session UUID
 * @param {Array<Object>} feedItems - Array of feed items
 * @param {string} feedItems[].video_id - Video UUID
 * @param {number} feedItems[].position - Position in feed
 * @param {string} feedItems[].source - Source type
 * @param {string} [modelVersion='v0'] - Model version
 * @returns {Promise<Object[]>} Array of created impressions
 */
export async function batchCreateImpressions(userId, sessionId, feedItems, modelVersion = 'v0') {
    if (!feedItems || feedItems.length === 0) {
        return [];
    }

    // Build values for batch insert
    const values = [];
    const params = [];
    let paramIndex = 1;

    for (const item of feedItems) {
        const impressionId = crypto.randomUUID();
        values.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`
        );
        params.push(
            impressionId,
            userId,
            item.video_id,
            sessionId,
            item.position,
            item.source,
            modelVersion
        );
        paramIndex += 7;
    }

    const query = `
    INSERT INTO impressions (
      id,
      user_id,
      video_id,
      session_id,
      position,
      source,
      model_version
    ) VALUES ${values.join(', ')}
    RETURNING id, video_id, position, source
  `;

    const result = await pool.query(query, params);
    return result.rows;
}

export default {
    createImpression,
    getImpressionById,
    getVideoForImpression,
    videoExists,
    getSeenVideoIds,
    getSessionSeenVideos,
    createWatchEvent,
    incrementVideoViews,
    getUserImpressions,
    batchCreateImpressions
};
