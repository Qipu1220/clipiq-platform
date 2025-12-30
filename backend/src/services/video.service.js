/**
 * Video Service
 * Business logic for video operations
 */

import pool from '../config/database.js';

/**
 * Get video by ID (basic query)
 * @param {string} videoId - Video ID
 * @returns {Promise<Object|null>} Video object or null if not found
 */
export async function getVideoByIdService(videoId) {
  const result = await pool.query(
    'SELECT * FROM videos WHERE id = $1',
    [videoId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get video by ID with user info (for API response)
 * @param {string} videoId - Video ID
 * @param {string|null} userId - Current user ID (for like/save status)
 * @returns {Promise<Object|null>} Video with user info or null
 */
export async function getVideoWithUserInfo(videoId, userId = null) {
  const query = `
    SELECT v.*, u.username, u.display_name, u.avatar_url
    FROM videos v
    LEFT JOIN users u ON v.uploader_id = u.id
    WHERE v.id = $1 AND v.status = $2
  `;

  const result = await pool.query(query, [videoId, 'active']);

  if (result.rows.length === 0) {
    return null;
  }

  const video = result.rows[0];

  // Check if current user liked this video or saved it
  let isLiked = false;
  let isSaved = false;

  if (userId) {
    const likeCheck = await pool.query(
      'SELECT 1 FROM likes WHERE video_id = $1 AND user_id = $2',
      [videoId, userId]
    );
    isLiked = likeCheck.rows.length > 0;

    const saveCheck = await pool.query(
      `SELECT 1 FROM playlist_videos pv
       JOIN playlists p ON pv.playlist_id = p.id
       WHERE pv.video_id = $1 AND p.user_id = $2 AND p.name = 'Đã lưu'`,
      [videoId, userId]
    );
    isSaved = saveCheck.rows.length > 0;
  }

  return { ...video, is_liked: isLiked, is_saved: isSaved };
}

/**
 * Get video feed with pagination
 * @param {Object} options - Query options
 * @param {string} options.feed - Feed type ('foryou' or 'following')
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @param {string} options.username - Filter by username (for profile view)
 * @param {string} options.userId - Current user ID
 * @returns {Promise<{videos: Array, pagination: Object}>}
 */
export async function getVideoFeed({ feed = 'foryou', page = 1, limit = 10, username = null, userId = null }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 10, 50);
  const offset = (pageNum - 1) * limitNum;

  // Build query conditions
  const conditions = ['v.status = $1'];
  const params = ['active'];
  let paramIndex = 2;

  if (username) {
    // Profile view: show processing and ready videos
    conditions.push(`v.processing_status IN ('processing', 'ready', 'failed')`);
    conditions.push(`u.username = $${paramIndex}`);
    params.push(username);
    paramIndex++;
  } else {
    // Feed/Home view: show only ready videos
    conditions.push(`v.processing_status = 'ready'`);
  }

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as count 
    FROM videos v
    LEFT JOIN users u ON v.uploader_id = u.id
    WHERE ${conditions.join(' AND ')}
  `;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);

  // Get videos with user info and like status
  const query = `
    SELECT v.*, u.username, u.display_name, u.avatar_url,
    EXISTS(SELECT 1 FROM likes l WHERE l.video_id = v.id AND l.user_id = $${paramIndex + 2}) as is_liked,
    EXISTS(
      SELECT 1 FROM playlist_videos pv
      JOIN playlists p ON pv.playlist_id = p.id
      WHERE pv.video_id = v.id AND p.user_id = $${paramIndex + 2} AND p.name = 'Đã lưu'
    ) as is_saved
    FROM videos v
    LEFT JOIN users u ON v.uploader_id = u.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY v.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const result = await pool.query(query, [...params, limitNum, offset, userId]);
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

/**
 * Get trending videos (most views in last 7 days)
 * @param {string|null} userId - Current user ID
 * @returns {Promise<Array>} Array of trending videos
 */
export async function getTrendingVideos(userId = null) {
  const result = await pool.query(
    `SELECT v.*, u.username, u.display_name, u.avatar_url,
     EXISTS(
       SELECT 1 FROM playlist_videos pv 
       JOIN playlists p ON pv.playlist_id = p.id 
       WHERE pv.video_id = v.id AND p.user_id = $2 AND p.name = 'Đã lưu'
     ) as is_saved,
     EXISTS(
       SELECT 1 FROM likes l 
       WHERE l.video_id = v.id AND l.user_id = $2
     ) as is_liked
     FROM videos v
     LEFT JOIN users u ON v.uploader_id = u.id
     WHERE v.status = $1 AND v.processing_status = 'ready' AND v.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
     ORDER BY v.views DESC
     LIMIT 20`,
    ['active', userId || null]
  );

  return result.rows;
}

/**
 * Search videos using multimodal search
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @param {string|null} options.userId - Current user ID
 * @returns {Promise<Object>} Search results with videos and classification
 */
export async function searchVideos(query, { page = 1, limit = 20, userId = null } = {}) {
  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  // 1. Get ranked video IDs from Multimodal Search Engine
  const searchService = await import('./search.service.js');
  const searchResult = await searchService.performMultimodalSearch(query);

  const rankedResults = searchResult.results || [];
  const totalHits = rankedResults.length;

  // Apply pagination to the IDs list
  const paginatedResults = rankedResults.slice(offset, offset + limitNum);

  if (paginatedResults.length === 0) {
    return {
      videos: [],
      total: totalHits,
      query,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalHits,
        pages: Math.ceil(totalHits / limitNum),
        hasMore: false,
      },
      classification: searchResult.classification
    };
  }

  // Filter out invalid UUIDs to prevent SQL errors
  const videoIds = paginatedResults
    .map(r => r.id)
    .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

  if (videoIds.length === 0) {
    return {
      videos: [],
      total: totalHits,
      query,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalHits,
        pages: Math.ceil(totalHits / limitNum),
        hasMore: false,
      },
      classification: searchResult.classification
    };
  }

  // 2. Fetch full video details from PostgreSQL
  const dbQuery = `
    SELECT v.*, u.username, u.display_name, u.avatar_url,
     EXISTS(
       SELECT 1 FROM playlist_videos pv 
       JOIN playlists p ON pv.playlist_id = p.id 
       WHERE pv.video_id = v.id AND p.user_id = $2 AND p.name = 'Đã lưu'
     ) as is_saved,
     EXISTS(
       SELECT 1 FROM likes 
       WHERE video_id = v.id AND user_id = $2
     ) as is_liked
     FROM videos v
     LEFT JOIN users u ON v.uploader_id = u.id
     WHERE v.id = ANY($1::uuid[]) AND v.status = 'active' AND v.processing_status = 'ready'
  `;

  const dbResult = await pool.query(dbQuery, [videoIds, userId]);
  const dbVideos = dbResult.rows;

  // 3. Re-order DB results to match the ranking from search engine
  const orderedVideos = videoIds
    .map(id => {
      const video = dbVideos.find(v => v.id === id);
      if (!video) return null;
      // Add search score
      video.searchScore = paginatedResults.find(r => r.id === video.id)?.score;
      return video;
    })
    .filter(v => v !== null);

  const pages = Math.ceil(totalHits / limitNum);

  return {
    videos: orderedVideos,
    total: totalHits,
    query,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalHits,
      pages,
      hasMore: pageNum < pages,
    },
    classification: searchResult.classification
  };
}

/**
 * Check if video exists
 * @param {string} videoId - Video ID
 * @returns {Promise<boolean>}
 */
export async function videoExists(videoId) {
  const result = await pool.query(
    'SELECT 1 FROM videos WHERE id = $1',
    [videoId]
  );
  return result.rows.length > 0;
}

/**
 * Get video uploader ID
 * @param {string} videoId - Video ID
 * @returns {Promise<string|null>} Uploader ID or null
 */
export async function getVideoUploaderId(videoId) {
  const result = await pool.query(
    'SELECT uploader_id FROM videos WHERE id = $1',
    [videoId]
  );
  return result.rows.length > 0 ? result.rows[0].uploader_id : null;
}

/**
 * Update video metadata
 * @param {string} videoId - Video ID
 * @param {Object} updates - Fields to update
 * @param {string} updates.title - New title
 * @param {string} updates.description - New description
 * @returns {Promise<Object>} Updated video
 */
export async function updateVideo(videoId, { title, description }) {
  const result = await pool.query(
    `UPDATE videos SET title = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
    [title, description || '', videoId]
  );
  return result.rows[0];
}

/**
 * Delete video (soft delete)
 * @param {string} videoId - Video ID to delete
 * @returns {Promise<Object>} Deleted video info
 */
export async function deleteVideoService(videoId) {
  const result = await pool.query(
    `UPDATE videos 
     SET status = 'deleted', updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1 
     RETURNING id, title, video_url, thumbnail_url`,
    [videoId]
  );

  if (result.rows.length === 0) {
    throw new Error('Video not found');
  }

  return result.rows[0];
}

export default {
  getVideoByIdService,
  getVideoWithUserInfo,
  getVideoFeed,
  getTrendingVideos,
  searchVideos,
  videoExists,
  getVideoUploaderId,
  updateVideo,
  deleteVideoService
};
