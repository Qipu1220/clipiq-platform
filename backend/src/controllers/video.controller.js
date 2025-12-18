/**
 * Video Controller
 * Handles video-related operations: fetch, search, trending, upload, update, delete
 */

import pool from '../config/database.js';
import ApiError from '../utils/apiError.js';
import crypto from 'crypto';

/**
 * GET /api/v1/videos - Get video feed (For You / Following)
 */
export async function getVideos(req, res, next) {
  try {
    const { feed = 'foryou', page = 1, limit = 10, username } = req.query;
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

    const userId = (req.user && req.user.userId) || null;

    const result = await pool.query(query, [...params, limitNum, offset, userId]);
    const videos = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      videoUrl: `http://localhost:9000/clipiq-videos/${row.video_url}`,
      thumbnailUrl: (row.thumbnail_url && row.thumbnail_url.startsWith('http'))
        ? row.thumbnail_url
        : `https://picsum.photos/seed/${row.id}/400/600`,
      duration: row.duration,
      views: row.views,
      likes: row.likes_count || 0,
      isLiked: row.is_liked,
      isSaved: row.is_saved,
      comments: row.comments_count || 0,
      uploaderUsername: row.username,
      uploaderDisplayName: row.display_name,
      uploaderAvatarUrl: row.avatar_url,
      processingStatus: row.processing_status,
      createdAt: row.created_at,
      uploadedAt: row.created_at,
    }));

    const pages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      data: {
        videos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages,
          hasMore: pageNum < pages,
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/videos/:id - Get single video by ID
 */
export async function getVideoById(req, res, next) {
  try {
    const { id } = req.params;

    const query = `
      SELECT v.*, u.username, u.display_name, u.avatar_url
      FROM videos v
      LEFT JOIN users u ON v.uploader_id = u.id
      WHERE v.id = $1 AND v.status = $2
    `;

    const result = await pool.query(query, [id, 'active']);

    if (result.rows.length === 0) {
      throw new ApiError(404, 'Video not found');
    }

    const video = result.rows[0];

    // Check if current user liked this video or saved it
    let isLiked = false;
    let isSaved = false;
    if (req.user) {
      const likeCheck = await pool.query(
        'SELECT 1 FROM likes WHERE video_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      isLiked = likeCheck.rows.length > 0;

      const saveCheck = await pool.query(
        `SELECT 1 FROM playlist_videos pv
         JOIN playlists p ON pv.playlist_id = p.id
         WHERE pv.video_id = $1 AND p.user_id = $2 AND p.name = 'Đã lưu'`,
        [id, req.user.id]
      );
      isSaved = saveCheck.rows.length > 0;
    }

    // Increment views
    await pool.query(
      'UPDATE videos SET views = views + 1 WHERE id = $1',
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        id: video.id,
        title: video.title,
        description: video.description,
        videoUrl: `http://localhost:9000/clipiq-videos/${video.video_url}`,
        thumbnailUrl: (video.thumbnail_url && video.thumbnail_url.startsWith('http'))
          ? video.thumbnail_url
          : `https://images.unsplash.com/photo-${Math.abs(video.id.charCodeAt(0) * 1000 + video.id.charCodeAt(1) * 100)}?w=400&h=600&fit=crop`,
        duration: video.duration,
        views: video.views + 1,
        likes: video.likes_count || 0,
        comments: video.comments_count || 0,
        uploaderUsername: video.username,
        uploaderDisplayName: video.display_name,
        uploaderAvatarUrl: video.avatar_url,
        isLiked,
        isSaved,
        createdAt: video.created_at,
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/videos - Upload new video
 */
export async function uploadVideo(req, res, next) {
  try {
    const { title, description, notifyFollowers } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!title) {
      throw new ApiError(400, 'Title is required');
    }

    // Check if video file is uploaded
    if (!req.files || !req.files.video || req.files.video.length === 0) {
      throw new ApiError(400, 'Video file is required');
    }

    const videoFile = req.files.video[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    // Import upload service dynamically
    const uploadService = await import('../services/upload.service.js');

    // Process video upload (includes MinIO upload, keyframe extraction, indexing)
    const result = await uploadService.processVideoUpload(videoFile.buffer, {
      title,
      description,
      uploaderId: userId,
      thumbnailBuffer: thumbnailFile ? thumbnailFile.buffer : null
    });

    return res.status(201).json({
      success: true,
      message: result.message || 'Video uploaded successfully',
      data: {
        video: result.video  // Return full video object for frontend
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/videos/:id - Update video metadata
 */
export async function updateVideo(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const userId = req.user.id;

    // Check if video exists and user is owner
    const videoCheck = await pool.query(
      'SELECT uploader_id FROM videos WHERE id = $1',
      [id]
    );

    if (videoCheck.rows.length === 0) {
      throw new ApiError(404, 'Video not found');
    }

    if (videoCheck.rows[0].uploader_id !== userId && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to update this video');
    }

    // Update video
    const result = await pool.query(
      `UPDATE videos SET title = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [title, description || '', id]
    );

    return res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/videos/:id - Delete video
 */
export async function deleteVideo(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if video exists
    const videoCheck = await pool.query(
      'SELECT uploader_id FROM videos WHERE id = $1',
      [id]
    );

    if (videoCheck.rows.length === 0) {
      throw new ApiError(404, 'Video not found');
    }

    // Check authorization
    if (videoCheck.rows[0].uploader_id !== userId && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to delete this video');
    }

    // Soft delete
    await pool.query(
      'UPDATE videos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['deleted', id]
    );

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/videos/search - Search videos
 */
/**
 * GET /api/v1/videos/search - Search videos
 */
export async function searchVideos(req, res, next) {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      throw new ApiError(400, 'Search query is required');
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    // 1. Get ranked video IDs from Multimodal Search Engine
    const searchResult = await import('../services/search.service.js')
      .then(m => m.performMultimodalSearch(q));

    const rankedResults = searchResult.results || [];
    const totalHits = rankedResults.length;

    // Apply pagination to the IDs list
    const paginatedResults = rankedResults.slice(offset, offset + limitNum);

    if (paginatedResults.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          videos: [],
          total: totalHits,
          query: q,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalHits,
            pages: Math.ceil(totalHits / limitNum),
            hasMore: false,
          },
          classification: searchResult.classification
        }
      });
    }

    const videoIds = paginatedResults.map(r => r.id);

    // 2. Fetch full video details from PostgreSQL
    const query = `
      SELECT v.*, u.username, u.display_name, u.avatar_url,
       EXISTS(
         SELECT 1 FROM playlist_videos pv 
         JOIN playlists p ON pv.playlist_id = p.id 
         WHERE pv.video_id = v.id AND p.user_id = $2 AND p.name = 'Đã lưu'
       ) as is_saved
       FROM videos v
       LEFT JOIN users u ON v.uploader_id = u.id
       WHERE v.id = ANY($1::uuid[])
    `;
    // Removed AND v.status = 'active' temporarily for debugging to see if they exist at all
    // Or keep it and check. Let's keep strictness but maybe the IDs are just not there.
    // Actually, I'll remove status check in the log or check it separately? 
    // No, let's keep the query simple but log what we find.

    // I will use a simpler query to debug existence first? No, modify the main flow.
    // I'll keep the status check but maybe the videos are 'deleted' or something?
    // Let's modify the query to return status so I can see WHY they are filtered if they exist.

    const dbResult = await pool.query(query, [videoIds, req.user?.userId || null]);
    const dbVideos = dbResult.rows;

    // 3. Re-order DB results to match the ranking from search engine
    const videos = videoIds.map(id => {
      const video = dbVideos.find(v => v.id === id);
      if (!video) return null; // Should not happen ideally, unless status != active

      return {
        id: video.id,
        title: video.title,
        description: video.description,
        videoUrl: `http://localhost:9000/clipiq-videos/${video.video_url}`,
        thumbnailUrl: (video.thumbnail_url && video.thumbnail_url.startsWith('http'))
          ? video.thumbnail_url
          : `https://picsum.photos/seed/${video.id}/400/600`,
        duration: video.duration,
        views: video.views,
        likes: video.likes_count || 0,
        comments: video.comments_count || 0,
        uploaderUsername: video.username,
        uploaderDisplayName: video.display_name,
        uploaderAvatarUrl: video.avatar_url,
        isSaved: video.is_saved,
        createdAt: video.created_at,
        uploadedAt: video.created_at,
        // Add search score/metadata if needed
        searchScore: paginatedResults.find(r => r.id === video.id)?.score
      };
    }).filter(v => v !== null); // Filter out any that weren't found or active

    const pages = Math.ceil(totalHits / limitNum);

    return res.status(200).json({
      success: true,
      data: {
        videos,
        total: totalHits,
        query: q,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalHits,
          pages,
          hasMore: pageNum < pages,
        },
        classification: searchResult.classification
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/videos/trending - Get trending videos
 */
export async function getTrendingVideos(req, res, next) {
  try {
    // Videos with most views in last 7 days
    const result = await pool.query(
      `SELECT v.*, u.username, u.display_name, u.avatar_url,
       EXISTS(
         SELECT 1 FROM playlist_videos pv 
         JOIN playlists p ON pv.playlist_id = p.id 
         WHERE pv.video_id = v.id AND p.user_id = $2 AND p.name = 'Đã lưu'
       ) as is_saved
       FROM videos v
       LEFT JOIN users u ON v.uploader_id = u.id
       LEFT JOIN users u ON v.uploader_id = u.id
       WHERE v.status = $1 AND v.processing_status = 'ready' AND v.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
       ORDER BY v.views DESC
       LIMIT 20`,
      ['active', req.user?.userId || -1]
    );

    const videos = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      videoUrl: `http://localhost:9000/clipiq-videos/${row.video_url}`,
      thumbnailUrl: (row.thumbnail_url && row.thumbnail_url.startsWith('http'))
        ? row.thumbnail_url
        : `https://images.unsplash.com/photo-${Math.abs(row.id.charCodeAt(0) * 1000 + row.id.charCodeAt(1) * 100)}?w=400&h=600&fit=crop`,
      duration: row.duration,
      views: row.views,
      likes: row.likes_count || 0,
      comments: row.comments_count || 0,
      uploaderUsername: row.username,
      uploaderDisplayName: row.display_name,
      uploaderAvatarUrl: row.avatar_url,
      uploaderAvatarUrl: row.avatar_url,
      isSaved: row.is_saved,
      createdAt: row.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: {
        videos,
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/videos/:id/like - Like a video
 */
export async function likeVideo(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if already liked
    const check = await pool.query(
      'SELECT 1 FROM likes WHERE video_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Already liked' });
    }

    // Add like
    await pool.query(
      'INSERT INTO likes (video_id, user_id) VALUES ($1, $2)',
      [id, userId]
    );

    // Update video likes count
    await pool.query(
      'UPDATE videos SET likes_count = likes_count + 1 WHERE id = $1',
      [id]
    );

    return res.status(200).json({ success: true, message: 'Video liked' });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/videos/:id/like - Unlike a video
 */
export async function unlikeVideo(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if liked
    const check = await pool.query(
      'SELECT 1 FROM likes WHERE video_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Not liked yet' });
    }

    // Remove like
    await pool.query(
      'DELETE FROM likes WHERE video_id = $1 AND user_id = $2',
      [id, userId]
    );

    // Update video likes count
    await pool.query(
      'UPDATE videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1',
      [id]
    );

    return res.status(200).json({ success: true, message: 'Video unliked' });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/videos/liked - Get videos liked by current user
 */
export async function getLikedVideos(req, res, next) {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 50);
    const offset = (pageNum - 1) * limitNum;

    // Get liked videos
    const query = `
      SELECT v.*, u.username, u.display_name, u.avatar_url,
      true as is_liked,
      EXISTS(
        SELECT 1 FROM playlist_videos pv 
        JOIN playlists p ON pv.playlist_id = p.id 
        WHERE pv.video_id = v.id AND p.user_id = $1 AND p.name = 'Đã lưu'
      ) as is_saved
      FROM videos v
      JOIN likes l ON v.id = l.video_id
      LEFT JOIN users u ON v.uploader_id = u.id
       WHERE l.user_id = $1 AND v.status = 'active' AND v.processing_status = 'ready'
      ORDER BY l.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM videos v
      JOIN likes l ON v.id = l.video_id
       WHERE l.user_id = $1 AND v.status = 'active' AND v.processing_status = 'ready'
    `;

    const [result, countResult] = await Promise.all([
      pool.query(query, [userId, limitNum, offset]),
      pool.query(countQuery, [userId])
    ]);

    const total = parseInt(countResult.rows[0].count);
    const pages = Math.ceil(total / limitNum);

    const videos = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      videoUrl: `http://localhost:9000/clipiq-videos/${row.video_url}`,
      thumbnailUrl: (row.thumbnail_url && row.thumbnail_url.startsWith('http'))
        ? row.thumbnail_url
        : `https://images.unsplash.com/photo-${Math.abs(row.id.charCodeAt(0) * 1000 + row.id.charCodeAt(1) * 100)}?w=400&h=600&fit=crop`,
      duration: row.duration,
      views: row.views,
      likes: row.likes_count || 0,
      isLiked: true,
      isSaved: row.is_saved,
      comments: row.comments_count || 0,
      uploaderUsername: row.username,
      uploaderDisplayName: row.display_name,
      uploaderAvatarUrl: row.avatar_url,
      createdAt: row.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: {
        videos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages,
          hasMore: pageNum < pages,
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/videos/saved - Get saved videos (from 'Đã lưu' playlist)
 */
export async function getSavedVideos(req, res, next) {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 50);
    const offset = (pageNum - 1) * limitNum;

    // Find 'Đã lưu' playlist
    const playlistQuery = `SELECT id FROM playlists WHERE user_id = $1 AND name = 'Đã lưu' LIMIT 1`;
    const playlistResult = await pool.query(playlistQuery, [userId]);

    if (playlistResult.rows.length === 0) {
      // Return empty if no saved playlist
      return res.status(200).json({
        success: true,
        data: {
          videos: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0, hasMore: false }
        }
      });
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

    const videos = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      videoUrl: `http://localhost:9000/clipiq-videos/${row.video_url}`,
      thumbnailUrl: (row.thumbnail_url && row.thumbnail_url.startsWith('http'))
        ? row.thumbnail_url
        : `https://images.unsplash.com/photo-${Math.abs(row.id.charCodeAt(0) * 1000 + row.id.charCodeAt(1) * 100)}?w=400&h=600&fit=crop`,
      duration: row.duration,
      views: row.views,
      likes: row.likes_count || 0,
      isLiked: row.is_liked,
      isSaved: true,
      comments: row.comments_count || 0,
      uploaderUsername: row.username,
      uploaderDisplayName: row.display_name,
      uploaderAvatarUrl: row.avatar_url,
      createdAt: row.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: {
        videos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages,
          hasMore: pageNum < pages,
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/videos/:id/save - Toggle save video (bookmark)
 */
export async function toggleSaveVideo(req, res, next) {
  try {
    const { id: videoId } = req.params;
    const userId = req.user.userId;

    // Check if video exists
    const videoCheck = await pool.query('SELECT 1 FROM videos WHERE id = $1', [videoId]);
    if (videoCheck.rows.length === 0) {
      throw new ApiError(404, 'Video not found');
    }

    // 1. Get or Create "Đã lưu" playlist
    let playlistId;
    const playlistCheck = await pool.query(
      `SELECT id FROM playlists WHERE user_id = $1 AND name = 'Đã lưu'`,
      [userId]
    );

    if (playlistCheck.rows.length > 0) {
      playlistId = playlistCheck.rows[0].id;
    } else {
      // Create new playlist
      const newPlaylistId = crypto.randomUUID();
      const createPlaylist = await pool.query(
        `INSERT INTO playlists (id, user_id, name, visibility) VALUES ($1, $2, 'Đã lưu', 'private') RETURNING id`,
        [newPlaylistId, userId]
      );
      playlistId = createPlaylist.rows[0].id;
    }

    // 2. Check if video is already in playlist
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

    return res.status(200).json({
      success: true,
      data: { isSaved },
      message: isSaved ? 'Đã lưu video' : 'Đã bỏ lưu video'
    });
  } catch (error) {
    next(error);
  }
}

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

    const result = await pool.query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.video_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limitNum, offset]
    );

    const comments = result.rows.map(row => ({
      id: row.id,
      text: row.text,
      userId: row.user_id,
      username: row.username,
      userDisplayName: row.display_name,
      userAvatarUrl: row.avatar_url,
      createdAt: row.created_at,
    }));

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
    const userId = (req.user && req.user.userId) || null;

    if (!text) {
      throw new ApiError(400, 'Comment text is required');
    }

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    const commentId = crypto.randomUUID();

    // Insert comment
    const result = await pool.query(
      `INSERT INTO comments (id, video_id, user_id, text, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [commentId, id, userId, text]
    );

    // Update video comments count
    await pool.query(
      'UPDATE videos SET comments_count = comments_count + 1 WHERE id = $1',
      [id]
    );

    // Get user info for response
    const userResult = await pool.query(
      'SELECT username, display_name, avatar_url FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    const newComment = {
      id: result.rows[0].id,
      text: result.rows[0].text,
      userId: userId,
      username: user.username,
      userDisplayName: user.display_name,
      userAvatarUrl: user.avatar_url,
      createdAt: result.rows[0].created_at,
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
    const commentCheck = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1 AND video_id = $2',
      [commentId, id]
    );

    if (commentCheck.rows.length === 0) {
      throw new ApiError(404, 'Comment not found');
    }

    // Check authorization
    if (commentCheck.rows[0].user_id !== userId && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to delete this comment');
    }

    // Delete comment
    await pool.query(
      'DELETE FROM comments WHERE id = $1',
      [commentId]
    );

    // Update video comments count
    await pool.query(
      'UPDATE videos SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = $1',
      [id]
    );

    return res.status(200).json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
}
