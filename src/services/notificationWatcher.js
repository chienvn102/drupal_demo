/**
 * Notification Watcher Service
 * Theo dõi database và push notification real-time qua WebSocket
 */

const { pool } = require('../config/database');

class NotificationWatcher {
  constructor(io) {
    this.io = io;
    this.interval = null;
    this.lastCheckTime = new Date();
    this.checkInterval = 3000; // Check mỗi 3 giây
  }

  /**
   * Bắt đầu watching database
   */
  start() {
    console.log('🔄 Starting notification watcher...');

    // Check ngay lập tức
    this.checkNotifications();

    // Setup interval
    this.interval = setInterval(() => {
      this.checkNotifications();
    }, this.checkInterval);

    console.log(`✅ Notification watcher started (interval: ${this.checkInterval}ms)`);
  }

  /**
   * Dừng watching
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('🛑 Notification watcher stopped');
    }
  }

  /**
   * Kiểm tra notifications mới từ database
   */
  async checkNotifications() {
    try {
      const now = new Date();

      // Lấy notifications chưa gửi (scheduled_time <= now và is_sent = 0)
      // Không phụ thuộc vào created_at, vì notification có thể được tạo trước
      const [notifications] = await pool.query(`
        SELECT 
          n.*,
          nt.type_code,
          nt.type_name,
          u.fcm_token
        FROM notifications n
        JOIN notification_types nt ON n.type_id = nt.id
        JOIN users u ON n.user_id = u.id
        WHERE n.scheduled_time <= ?
          AND n.is_sent = 0
        ORDER BY FIELD(n.priority, 'urgent', 'high', 'medium', 'low') , n.scheduled_time ASC
      `, [now]);

      if (notifications.length > 0) {
        console.log(`📬 Found ${notifications.length} new notifications`);

        // Push notification cho từng user
        for (const notif of notifications) {
          // Đánh dấu đã gửi (set is_sent = 1 nếu chưa có ai set) - tránh duplicate
          const [updateResult] = await pool.query(`UPDATE notifications SET is_sent = 1, sent_at = NOW() WHERE id = ? AND is_sent = 0`, [notif.id]);
          if (!updateResult || updateResult.affectedRows === 0) {
            console.log(`⚠️ Notification ${notif.id} already sent by another worker, skipping push`);
            continue; // Skip push if another worker already handled it
          }
          await this.pushNotification(notif);
        }
      }

      // Update lastCheckTime
      this.lastCheckTime = now;

    } catch (error) {
      console.error('❌ Error checking notifications:', error);
    }
  }

  /**
   * Kiểm tra meetings sắp diễn ra
   */
  async checkUpcomingMeetings() {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      // Lấy meetings sắp diễn ra trong 1 giờ tới
      const [meetings] = await pool.query(`
        SELECT 
          m.*,
          u.id as user_id,
          u.fcm_token
        FROM meetings m
        JOIN users u ON m.organizer_id = u.id
        WHERE m.meeting_time BETWEEN ? AND ?
          AND m.status = 'scheduled'
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE JSON_UNQUOTE(JSON_EXTRACT(n.metadata, '$.meeting_id')) = CAST(m.id AS CHAR)
              AND n.type_id = 1
              AND n.created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
          )
      `, [now, oneHourLater]);

      if (meetings.length > 0) {
        console.log(`📅 Found ${meetings.length} upcoming meetings`);

        for (const meeting of meetings) {
          // Tạo notification cho meeting
          const [result] = await pool.query(`
            INSERT INTO notifications (
              user_id, type_id, title, message, 
              scheduled_time, priority, metadata
            ) VALUES (?, 1, ?, ?, ?, 'high', ?)
          `, [
            meeting.user_id,
            '🕐 Cuộc họp sắp diễn ra',
            `"${meeting.title}" sẽ bắt đầu trong vòng 1 giờ tới`,
            now,
            JSON.stringify({
              meeting_id: meeting.id,
              meeting_time: meeting.meeting_time,
              location: meeting.location
            })
          ]);

          // Push ngay
          await this.pushNotification({
            id: result.insertId,
            user_id: meeting.user_id,
            type_code: 'meeting',
            title: '🕐 Cuộc họp sắp diễn ra',
            message: `"${meeting.title}" sẽ bắt đầu trong vòng 1 giờ tới`,
            priority: 'high',
            metadata: {
              meeting_id: meeting.id,
              meeting_time: meeting.meeting_time
            }
          });
        }
      }

    } catch (error) {
      console.error('❌ Error checking upcoming meetings:', error);
    }
  }

  /**
   * Push notification qua WebSocket
   */
  async pushNotification(notification) {
    try {
      const userId = notification.user_id.toString();
      const room = `user_${userId}`;

      // 1. Emit qua WebSocket (Real-time in-app)
      this.io.to(room).emit('notification', {
        id: notification.id,
        type: notification.type_code || 'system',
        type_id: notification.type_id || null,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        action_url: notification.action_url || null,
        metadata: typeof notification.metadata === 'string' ? notification.metadata : JSON.stringify(notification.metadata || {}),
        scheduled_time: notification.scheduled_time,
        created_at: notification.created_at,
      });

      console.log(`✅ Pushed WebSocket notification ${notification.id} to user ${userId}`);

      // 2. Push qua FCM (Background)
      const fcmToken = notification.fcm_token;
      if (fcmToken) {
        try {
          const admin = require('../config/firebase');
          await admin.messaging().send({
            token: fcmToken,
            notification: {
              title: notification.title,
              body: notification.message,
            },
            data: {
              id: notification.id.toString(),
              type: notification.type_code || 'system',
              action_url: notification.action_url || '',
              // FCM data values must be strings
              metadata: typeof notification.metadata === 'string' ? notification.metadata : JSON.stringify(notification.metadata || {})
            },
            android: {
              priority: notification.priority === 'urgent' || notification.priority === 'high' ? 'high' : 'normal',
              notification: {
                channelId: notification.type_code === 'meeting' ? 'meetings' :
                  notification.type_code === 'task_deadline' ? 'tasks' : 'default',
              }
            }
          });
          console.log(`🚀 Pushed FCM notification to user ${userId}`);
        } catch (fcmError) {
          console.error(`⚠️ Error pushing FCM to user ${userId}:`, fcmError.message);
        }
      }

    } catch (error) {
      console.error('❌ Error pushing notification:', error);
    }
  }

  /**
   * Kiểm tra tasks quá hạn
   */
  async checkOverdueTasks() {
    try {
      const now = new Date();

      const [tasks] = await pool.query(`
        SELECT 
          t.*,
          u.id as user_id,
          u.fcm_token
        FROM tasks t
        JOIN users u ON t.user_id = u.id
        WHERE t.due_date < ?
          AND t.status NOT IN ('completed', 'cancelled')
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE JSON_UNQUOTE(JSON_EXTRACT(n.metadata, '$.task_id')) = CAST(t.id AS CHAR)
              AND n.type_id = 2
              AND DATE(n.created_at) = CURDATE()
          )
      `, [now]);

      if (tasks.length > 0) {
        console.log(`⚠️ Found ${tasks.length} overdue tasks`);

        for (const task of tasks) {
          const [result] = await pool.query(`
            INSERT INTO notifications (
              user_id, type_id, title, message, 
              scheduled_time, priority, metadata
            ) VALUES (?, 2, ?, ?, ?, 'urgent', ?)
          `, [
            task.user_id,
            '⚠️ Công việc quá hạn',
            `"${task.title}" đã quá hạn`,
            now,
            JSON.stringify({
              task_id: task.id,
              due_date: task.due_date
            })
          ]);

          await this.pushNotification({
            id: result.insertId,
            user_id: task.user_id,
            type_code: 'task_deadline',
            title: '⚠️ Công việc quá hạn',
            message: `"${task.title}" đã quá hạn`,
            priority: 'urgent',
            metadata: {
              task_id: task.id,
              due_date: task.due_date
            }
          });
        }
      }

    } catch (error) {
      console.error('❌ Error checking overdue tasks:', error);
    }
  }
}

module.exports = NotificationWatcher;
