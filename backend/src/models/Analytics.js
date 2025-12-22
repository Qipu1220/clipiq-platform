/**
 * Analytics Model
 * Repository for analytics and statistics data access operations
 */

import pool from '../config/database.js';

export class Analytics {
  /**
   * Get total views for a specific month
   * @param {boolean} currentMonth - If true, get current month; if false, get previous month
   * @returns {Promise<number>} Total views
   */
  static async getTotalViews(currentMonth = true) {
    const dateCondition = currentMonth
      ? `upload_date >= date_trunc('month', CURRENT_DATE)`
      : `upload_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
         AND upload_date < date_trunc('month', CURRENT_DATE)`;

    const query = `
      SELECT COALESCE(SUM(views), 0) as total_views
      FROM videos
      WHERE status = 'active'
      AND ${dateCondition}
    `;
    const result = await pool.query(query);
    return parseInt(result.rows[0].total_views || 0);
  }

  /**
   * Get total videos uploaded for a specific month
   * @param {boolean} currentMonth - If true, get current month; if false, get previous month
   * @returns {Promise<number>} Total videos uploaded
   */
  static async getTotalVideosUploaded(currentMonth = true) {
    const dateCondition = currentMonth
      ? `upload_date >= date_trunc('month', CURRENT_DATE)`
      : `upload_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
         AND upload_date < date_trunc('month', CURRENT_DATE)`;

    const query = `
      SELECT COUNT(*) as total_videos
      FROM videos
      WHERE ${dateCondition}
    `;
    const result = await pool.query(query);
    return parseInt(result.rows[0].total_videos || 0);
  }

  /**
   * Get active users (users with view history) for a specific month
   * @param {boolean} currentMonth - If true, get current month; if false, get previous month
   * @returns {Promise<number>} Number of active users
   */
  static async getActiveUsers(currentMonth = true) {
    const dateCondition = currentMonth
      ? `created_at >= date_trunc('month', CURRENT_DATE)`
      : `created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
         AND created_at < date_trunc('month', CURRENT_DATE)`;

    const query = `
      SELECT COUNT(DISTINCT user_id) as active_users
      FROM view_history
      WHERE ${dateCondition}
    `;
    const result = await pool.query(query);
    return parseInt(result.rows[0].active_users || 0);
  }

  /**
   * Get average watch time in seconds for a specific month
   * @param {boolean} currentMonth - If true, get current month; if false, get previous month
   * @returns {Promise<number>} Average watch time in seconds
   */
  static async getAverageWatchTime(currentMonth = true) {
    const dateCondition = currentMonth
      ? `created_at >= date_trunc('month', CURRENT_DATE)`
      : `created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
         AND created_at < date_trunc('month', CURRENT_DATE)`;

    const query = `
      SELECT COALESCE(AVG(watch_duration), 0) as avg_watch_time
      FROM view_history
      WHERE ${dateCondition}
      AND watch_duration IS NOT NULL
    `;
    const result = await pool.query(query);
    return Math.round(parseFloat(result.rows[0].avg_watch_time || 0));
  }

  /**
   * Get engagement rate for a specific month
   * Engagement Rate = (Total Likes + Total Comments) / Total Views * 100
   * @param {boolean} currentMonth - If true, get current month; if false, get previous month
   * @returns {Promise<number>} Engagement rate percentage
   */
  static async getEngagementRate(currentMonth = true) {
    // Date condition for videos table without alias (for views query)
    const videoDateCondition = currentMonth
      ? `upload_date >= date_trunc('month', CURRENT_DATE)`
      : `upload_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
         AND upload_date < date_trunc('month', CURRENT_DATE)`;

    // Date condition for videos table with alias (for JOIN queries)
    const videoDateConditionWithAlias = currentMonth
      ? `v.upload_date >= date_trunc('month', CURRENT_DATE)`
      : `v.upload_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
         AND v.upload_date < date_trunc('month', CURRENT_DATE)`;

    const likeDateCondition = currentMonth
      ? `l.created_at >= date_trunc('month', CURRENT_DATE)`
      : `l.created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
         AND l.created_at < date_trunc('month', CURRENT_DATE)`;

    const commentDateCondition = currentMonth
      ? `c.created_at >= date_trunc('month', CURRENT_DATE)`
      : `c.created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
         AND c.created_at < date_trunc('month', CURRENT_DATE)`;

    // Get total views (no alias needed)
    const viewsQuery = `
      SELECT COALESCE(SUM(views), 0) as total_views
      FROM videos
      WHERE ${videoDateCondition}
      AND status = 'active'
    `;
    const viewsResult = await pool.query(viewsQuery);
    const totalViews = parseInt(viewsResult.rows[0].total_views || 0);

    // Get total likes (uses alias v)
    const likesQuery = `
      SELECT COUNT(DISTINCT l.id) as total_likes
      FROM likes l
      INNER JOIN videos v ON l.video_id = v.id
      WHERE ${videoDateConditionWithAlias}
      AND v.status = 'active'
      AND ${likeDateCondition}
    `;
    const likesResult = await pool.query(likesQuery);
    const totalLikes = parseInt(likesResult.rows[0].total_likes || 0);

    // Get total comments (only top-level comments, uses alias v)
    const commentsQuery = `
      SELECT COUNT(DISTINCT c.id) as total_comments
      FROM comments c
      INNER JOIN videos v ON c.video_id = v.id
      WHERE ${videoDateConditionWithAlias}
      AND v.status = 'active'
      AND c.parent_id IS NULL
      AND ${commentDateCondition}
    `;
    const commentsResult = await pool.query(commentsQuery);
    const totalComments = parseInt(commentsResult.rows[0].total_comments || 0);

    if (totalViews === 0) {
      return 0;
    }

    const engagementRate = ((totalLikes + totalComments) / totalViews) * 100;
    return Math.round(engagementRate * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Get top videos by views
   * @param {number} limit - Number of videos to return (default: 5)
   * @returns {Promise<Array>} Array of video objects with uploader info
   */
  static async getTopVideos(limit = 5) {
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
    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      views: parseInt(row.views || 0),
      thumbnailUrl: row.thumbnail_url,
      createdAt: row.created_at,
      uploader: {
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url
      }
    }));
  }

  /**
   * Calculate percentage change between two values
   * @param {number} current - Current value
   * @param {number} previous - Previous value
   * @returns {number} Percentage change (rounded to 1 decimal place)
   */
  static calculatePercentageChange(current, previous) {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    const change = ((current - previous) / previous) * 100;
    return Math.round(change * 10) / 10; // Round to 1 decimal place
  }
}

