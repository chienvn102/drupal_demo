const express = require('express');
const router = express.Router();
const notificationModel = require('../models/notificationModel');

// GET /api/notifications/user/:userId - Get all notifications for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_read, priority, limit, offset } = req.query;

    const result = await notificationModel.getNotificationsByUserId(userId, {
      is_read,
      priority,
      limit: limit || 50,
      offset: offset || 0
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// GET /api/notifications/user/:userId/unread-count - Get unread count
router.get('/user/:userId/unread-count', async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await notificationModel.getUnreadCount(userId);

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message
    });
  }
});

// GET /api/notifications/types - Get notification types
router.get('/types', async (req, res) => {
  try {
    const types = await notificationModel.getNotificationTypes();

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error('Error fetching notification types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification types',
      error: error.message
    });
  }
});

// GET /api/notifications/:id - Get notification by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await notificationModel.getNotificationById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification',
      error: error.message
    });
  }
});

// POST /api/notifications - Create a notification
router.post('/', async (req, res) => {
  try {
    const { user_id, type_id, title, message, scheduled_time, priority, action_url, metadata } = req.body;

    // Validation
    if (!user_id || !type_id || !title || !message || !scheduled_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: user_id, type_id, title, message, scheduled_time'
      });
    }

    const notification = await notificationModel.createNotification({
      user_id,
      type_id,
      title,
      message,
      scheduled_time,
      priority,
      action_url,
      metadata
    });

    // 🔥 PUSH REAL-TIME QUA WEBSOCKET
    const io = req.app.get('io');
    if (io) {
      const userRoom = `user_${user_id}`;
      io.to(userRoom).emit('notification', {
        id: notification.id,
        type_id,
        title,
        message,
        priority: priority || 'medium',
        scheduled_time,
        action_url,
        metadata,
        created_at: new Date().toISOString()
      });
      console.log(`🚀 Pushed notification to user ${user_id} via WebSocket`);
    }

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully'
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }

    const success = await notificationModel.markAsRead(id, user_id);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or unauthorized'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// PATCH /api/notifications/user/:userId/read-all - Mark all as read
router.patch('/user/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await notificationModel.markAllAsRead(userId);

    res.json({
      success: true,
      message: `${count} notifications marked as read`,
      count
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }

    const success = await notificationModel.deleteNotification(id, user_id);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or unauthorized'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
});

// GET /api/notifications/pending/all - Get pending notifications (for scheduled sending)
router.get('/pending/all', async (req, res) => {
  try {
    const notifications = await notificationModel.getPendingNotifications();

    res.json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error fetching pending notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending notifications',
      error: error.message
    });
  }
  // POST /api/notifications/fcm-token - Update FCM Token
  router.post('/fcm-token', async (req, res) => {
    try {
      const { user_id, fcm_token } = req.body;

      if (!user_id || !fcm_token) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: user_id, fcm_token'
        });
      }

      const success = await notificationModel.updateFcmToken(user_id, fcm_token);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'FCM Token updated successfully'
      });
    } catch (error) {
      console.error('Error updating FCM Token:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update FCM Token',
        error: error.message
      });
    }
  });

});

module.exports = router;
