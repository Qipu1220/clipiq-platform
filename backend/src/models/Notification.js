/**
 * Notification Model
 * Database operations for notifications
 */

import pool from '../config/database.js';

/**
 * Create a new notification
 */
export async function createNotification(data) {
  const { type, receiverId, actorId, videoId, commentId, message } = data;
  
  const query = `
    INSERT INTO notifications (type, receiver_id, actor_id, video_id, comment_id, message, read)
    VALUES ($1, $2, $3, $4, $5, $6, false)
    RETURNING *
  `;
  
  const values = [type, receiverId, actorId || null, videoId || null, commentId || null, message || null];
  const result = await pool.query(query, values);
  
  return result.rows[0];
}

/**
 * Get notifications for a user
 */
export async function getNotificationsByUserId(userId, filters = {}) {
  const { read, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT 
      n.*,
      u_actor.username as actor_username,
      u_actor.display_name as actor_display_name,
      u_actor.avatar_url as actor_avatar_url
    FROM notifications n
    LEFT JOIN users u_actor ON n.actor_id = u_actor.id
    WHERE n.receiver_id = $1
  `;
  
  const params = [userId];
  let paramIndex = 2;
  
  if (read !== undefined) {
    query += ` AND n.read = $${paramIndex}`;
    params.push(read);
    paramIndex++;
  }
  
  query += ` ORDER BY n.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId) {
  const query = `
    UPDATE notifications
    SET read = true
    WHERE id = $1
    RETURNING *
  `;
  
  const result = await pool.query(query, [notificationId]);
  return result.rows[0];
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId) {
  const query = `
    UPDATE notifications
    SET read = true
    WHERE receiver_id = $1 AND read = false
    RETURNING *
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows;
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId) {
  const query = 'DELETE FROM notifications WHERE id = $1';
  await pool.query(query, [notificationId]);
}

export default {
  createNotification,
  getNotificationsByUserId,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
};
