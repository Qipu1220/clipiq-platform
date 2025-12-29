/**
 * Video Model
 * Repository for video data access operations
 */

import pool from '../config/database.js';

// MinIO configuration for URL construction
const MINIO_PUBLIC_ENDPOINT = process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = process.env.MINIO_PORT || '9000';
const MINIO_PROTOCOL = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';

/**
 * Construct full thumbnail URL from filename
 * @param {string} thumbnailUrl - Thumbnail filename or full URL
 * @param {string} fallbackId - ID for fallback placeholder image
 * @returns {string} - Full MinIO URL or placeholder
 */
function getFullThumbnailUrl(thumbnailUrl, fallbackId = null) {
  if (!thumbnailUrl) {
    return fallbackId ? `https://picsum.photos/seed/${fallbackId}/400/600` : null;
  }
  if (thumbnailUrl.startsWith('http')) return thumbnailUrl;
  return `${MINIO_PROTOCOL}://${MINIO_PUBLIC_ENDPOINT}:${MINIO_PORT}/clipiq-thumbnails/${thumbnailUrl}`;
}

export class Video {
  /**
   * Get video statistics
   * Returns total videos, videos uploaded today, and total views
   */
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_videos,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as videos_today,
        SUM(views) as total_views
      FROM videos
      WHERE status = 'active'
    `;
    const result = await pool.query(query);
    return {
      total: parseInt(result.rows[0].total_videos || 0),
      uploadedToday: parseInt(result.rows[0].videos_today || 0),
      totalViews: parseInt(result.rows[0].total_views || 0)
    };
  }

  /**
   * Get top videos by views
   * @param {number} limit - Number of videos to return (default: 5)
   * @returns {Promise<Array>} Array of video objects with uploader info
   */
  static async getTopByViews(limit = 5) {
    console.log('[Video.getTopByViews] Called with limit:', limit);
    console.log('[Video.getTopByViews] MINIO_PUBLIC_ENDPOINT:', MINIO_PUBLIC_ENDPOINT);
    console.log('[Video.getTopByViews] MINIO_PORT:', MINIO_PORT);

    const query = `
      SELECT 
        v.id,
        v.title,
        v.views,
        v.thumbnail_url,
        v.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM videos v
      LEFT JOIN users u ON v.uploader_id = u.id
      WHERE v.status = 'active'
      ORDER BY v.views DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);

    const videos = result.rows.map(row => {
      const thumbUrl = getFullThumbnailUrl(row.thumbnail_url, row.id);
      console.log('[Video.getTopByViews] thumbnail_url:', row.thumbnail_url, '-> thumbnailUrl:', thumbUrl);
      return {
        id: row.id,
        title: row.title,
        views: parseInt(row.views || 0),
        thumbnailUrl: thumbUrl,
        createdAt: row.created_at,
        uploader: {
          username: row.username,
          displayName: row.display_name,
          avatarUrl: row.avatar_url
        }
      };
    });

    console.log('[Video.getTopByViews] Returning', videos.length, 'videos');
    return videos;
  }
}
