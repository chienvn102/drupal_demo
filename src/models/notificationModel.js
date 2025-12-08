const { pool } = require('../config/database');

// Get all notifications for a user
const getNotificationsByUserId = async (userId, filters = {}) => {
  const { is_read, priority, limit = 50, offset = 0 } = filters;
  
  let query = `
    SELECT 
      n.id,
      n.user_id,
      n.title,
      n.message,
      n.scheduled_time,
      n.sent_at,
      n.is_read,
      n.is_sent,
      n.priority,
      n.action_url,
      n.metadata,
      n.created_at,
      n.updated_at,
      nt.type_code,
      nt.type_name,
      nt.icon,
      nt.color
    FROM notifications n
    JOIN notification_types nt ON n.type_id = nt.id
    WHERE n.user_id = ?
  `;
  const params = [userId];

  if (is_read !== undefined) {
    query += ' AND n.is_read = ?';
    params.push(is_read === 'true' || is_read === true ? 1 : 0);
  }

  if (priority) {
    query += ' AND n.priority = ?';
    params.push(priority);
  }

  query += ' ORDER BY n.scheduled_time DESC, n.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const [rows] = await pool.query(query, params);
  
  // Get total count
  let countQuery = `SELECT COUNT(*) as total FROM notifications n WHERE n.user_id = ?`;
  const countParams = [userId];
  
  if (is_read !== undefined) {
    countQuery += ' AND n.is_read = ?';
    countParams.push(is_read === 'true' || is_read === true ? 1 : 0);
  }
  if (priority) {
    countQuery += ' AND n.priority = ?';
    countParams.push(priority);
  }

  const [countResult] = await pool.query(countQuery, countParams);

  return {
    data: rows,
    total: countResult[0].total,
    limit: parseInt(limit),
    offset: parseInt(offset)
  };
};

// Get notification by ID
const getNotificationById = async (id) => {
  const query = `
    SELECT 
      n.id,
      n.user_id,
      n.title,
      n.message,
      n.scheduled_time,
      n.sent_at,
      n.is_read,
      n.is_sent,
      n.priority,
      n.action_url,
      n.metadata,
      n.created_at,
      n.updated_at,
      nt.type_code,
      nt.type_name,
      nt.icon,
      nt.color
    FROM notifications n
    JOIN notification_types nt ON n.type_id = nt.id
    WHERE n.id = ?
  `;
  const [rows] = await pool.query(query, [id]);
  return rows[0] || null;
};

// Create notification
const createNotification = async (data) => {
  const { 
    user_id, 
    type_id, 
    title, 
    message, 
    scheduled_time, 
    priority = 'medium',
    action_url,
    metadata
  } = data;

  const query = `
    INSERT INTO notifications 
    (user_id, type_id, title, message, scheduled_time, priority, action_url, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const metadataJson = metadata ? JSON.stringify(metadata) : null;
  
  const [result] = await pool.query(query, [
    user_id,
    type_id,
    title,
    message,
    scheduled_time,
    priority,
    action_url,
    metadataJson
  ]);

  return getNotificationById(result.insertId);
};

// Mark notification as read
const markAsRead = async (id, userId) => {
  const query = `
    UPDATE notifications 
    SET is_read = TRUE, updated_at = NOW()
    WHERE id = ? AND user_id = ?
  `;
  const [result] = await pool.query(query, [id, userId]);
  return result.affectedRows > 0;
};

// Mark all notifications as read for a user
const markAllAsRead = async (userId) => {
  const query = `
    UPDATE notifications 
    SET is_read = TRUE, updated_at = NOW()
    WHERE user_id = ? AND is_read = FALSE
  `;
  const [result] = await pool.query(query, [userId]);
  return result.affectedRows;
};

// Delete notification
const deleteNotification = async (id, userId) => {
  const query = 'DELETE FROM notifications WHERE id = ? AND user_id = ?';
  const [result] = await pool.query(query, [id, userId]);
  return result.affectedRows > 0;
};

// Get pending notifications (for scheduled sending)
const getPendingNotifications = async () => {
  const query = `
    SELECT 
      n.id,
      n.user_id,
      u.username,
      u.email,
      u.fcm_token,
      n.title,
      n.message,
      n.scheduled_time,
      n.priority,
      n.action_url,
      n.metadata,
      nt.type_code,
      nt.type_name,
      nt.icon,
      nt.color
    FROM notifications n
    JOIN users u ON n.user_id = u.id
    JOIN notification_types nt ON n.type_id = nt.id
    WHERE n.is_sent = FALSE 
    AND n.scheduled_time <= NOW()
    ORDER BY n.priority DESC, n.scheduled_time ASC
  `;
  const [rows] = await pool.query(query);
  return rows;
};

// Mark notification as sent
const markAsSent = async (id) => {
  const query = `
    UPDATE notifications 
    SET is_sent = TRUE, sent_at = NOW(), updated_at = NOW()
    WHERE id = ?
  `;
  const [result] = await pool.query(query, [id]);
  return result.affectedRows > 0;
};

// Get unread count for a user
const getUnreadCount = async (userId) => {
  const query = `
    SELECT COUNT(*) as count 
    FROM notifications 
    WHERE user_id = ? AND is_read = FALSE
  `;
  const [rows] = await pool.query(query, [userId]);
  return rows[0].count;
};

// Get notification types
const getNotificationTypes = async () => {
  const query = 'SELECT * FROM notification_types ORDER BY type_name';
  const [rows] = await pool.query(query);
  return rows;
};

module.exports = {
  getNotificationsByUserId,
  getNotificationById,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPendingNotifications,
  markAsSent,
  getUnreadCount,
  getNotificationTypes
};
