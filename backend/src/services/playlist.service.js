/**
 * Playlist Service
 * Business logic for playlist and video save/bookmark operations
 */

import pool from '../config/database.js';
import crypto from 'crypto';

/**
 * Get or create the "Đã lưu" (Saved) playlist for a user
 * @param {string} userId - User ID
 * @returns {Promise<string>} - Playlist ID
 */
export async function getOrCreateSavedPlaylist(userId) {
    // Check if playlist exists
    const playlistCheck = await pool.query(
        `SELECT id FROM playlists WHERE user_id = $1 AND name = 'Đã lưu'`,
        [userId]
    );

    if (playlistCheck.rows.length > 0) {
        return playlistCheck.rows[0].id;
    }

    // Create new playlist
    const newPlaylistId = crypto.randomUUID();
    const createPlaylist = await pool.query(
        `INSERT INTO playlists (id, user_id, name, visibility) VALUES ($1, $2, 'Đã lưu', 'private') RETURNING id`,
        [newPlaylistId, userId]
    );

    return createPlaylist.rows[0].id;
}

/**
 * Check if a video is saved by a user
 * @param {string} videoId - Video ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if saved
 */
export async function isVideoSaved(videoId, userId) {
    if (!userId) return false;

    const result = await pool.query(
        `SELECT 1 FROM playlist_videos pv
     JOIN playlists p ON pv.playlist_id = p.id
     WHERE pv.video_id = $1 AND p.user_id = $2 AND p.name = 'Đã lưu'`,
        [videoId, userId]
    );
    return result.rows.length > 0;
}

/**
 * Toggle video save status (bookmark)
 * @param {string} videoId - Video ID
 * @param {string} userId - User ID
 * @returns {Promise<{isSaved: boolean, message: string}>}
 */
export async function toggleVideoSave(videoId, userId) {
    // Get or create saved playlist
    const playlistId = await getOrCreateSavedPlaylist(userId);

    // Check if video is already in playlist
    const existingEntry = await pool.query(
        `SELECT id FROM playlist_videos WHERE playlist_id = $1 AND video_id = $2`,
        [playlistId, videoId]
    );

    let isSaved = false;

    if (existingEntry.rows.length > 0) {
        // Remove from playlist
        await pool.query(
            `DELETE FROM playlist_videos WHERE playlist_id = $1 AND video_id = $2`,
            [playlistId, videoId]
        );
        isSaved = false;
    } else {
        // Add to playlist (at the end)
        // Get max position
        const maxPosResult = await pool.query(
            `SELECT COALESCE(MAX(position), -1) as max_pos FROM playlist_videos WHERE playlist_id = $1`,
            [playlistId]
        );
        const nextPos = maxPosResult.rows[0].max_pos + 1;

        await pool.query(
            `INSERT INTO playlist_videos (id, playlist_id, video_id, position) VALUES ($1, $2, $3, $4)`,
            [crypto.randomUUID(), playlistId, videoId, nextPos]
        );
        isSaved = true;
    }

    return {
        isSaved,
        message: isSaved ? 'Đã lưu video' : 'Đã bỏ lưu video'
    };
}

/**
 * Get saved videos by user with pagination
 * @param {string} userId - User ID
 * @param {Object} pagination - Pagination options
 * @param {number} pagination.page - Page number (default 1)
 * @param {number} pagination.limit - Items per page (default 20)
 * @returns {Promise<{videos: Array, pagination: Object}|null>} - Videos and pagination or null if no playlist
 */
export async function getSavedVideosByUser(userId, { page = 1, limit = 20 } = {}) {
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 50);
    const offset = (pageNum - 1) * limitNum;

    // Find 'Đã lưu' playlist
    const playlistQuery = `SELECT id FROM playlists WHERE user_id = $1 AND name = 'Đã lưu' LIMIT 1`;
    const playlistResult = await pool.query(playlistQuery, [userId]);

    if (playlistResult.rows.length === 0) {
        // Return empty if no saved playlist
        return {
            videos: [],
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: 0,
                pages: 0,
                hasMore: false
            }
        };
    }

    const playlistId = playlistResult.rows[0].id;

    // Get videos from playlist
    const query = `
    SELECT v.*, u.username, u.display_name, u.avatar_url,
    EXISTS(SELECT 1 FROM likes l WHERE l.video_id = v.id AND l.user_id = $1) as is_liked,
    true as is_saved
    FROM videos v
    JOIN playlist_videos pv ON v.id = pv.video_id
    LEFT JOIN users u ON v.uploader_id = u.id
    WHERE pv.playlist_id = $2 AND v.status = 'active' AND v.processing_status = 'ready'
    ORDER BY pv.added_at DESC
    LIMIT $3 OFFSET $4
  `;

    const countQuery = `
    SELECT COUNT(*) as count
    FROM playlist_videos pv
    JOIN videos v ON pv.video_id = v.id
    WHERE pv.playlist_id = $1 AND v.status = 'active' AND v.processing_status = 'ready'
  `;

    const [result, countResult] = await Promise.all([
        pool.query(query, [userId, playlistId, limitNum, offset]),
        pool.query(countQuery, [playlistId])
    ]);

    const total = parseInt(countResult.rows[0].count);
    const pages = Math.ceil(total / limitNum);

    return {
        videos: result.rows,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages,
            hasMore: pageNum < pages,
        }
    };
}

export default {
    getOrCreateSavedPlaylist,
    isVideoSaved,
    toggleVideoSave,
    getSavedVideosByUser
};
