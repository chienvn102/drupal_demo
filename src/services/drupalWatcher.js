/**
 * Drupal API Watcher Service
 * Poll Drupal API for new tasks and send FCM push notifications
 */

const admin = require('../config/firebase');

const DRUPAL_API_URL = 'https://trungtamcntt.bn1.vn/api/nhacviec';
const POLL_INTERVAL = 60 * 1000; // Poll every 60 seconds
const API_TIMEOUT = 15000; // 15 second timeout

class DrupalWatcher {
    constructor() {
        this.interval = null;
        this.knownTaskIds = new Set(); // Track already processed tasks
        this.fcmTokens = new Set(); // Store registered FCM tokens
        this.lastCheckTime = null;
        this.checkCount = 0;
    }

    /**
     * Start watching Drupal API
     */
    start() {
        console.log('🔄 Starting Drupal API watcher...');

        // Initial check
        this.checkDrupalApi();

        // Setup interval
        this.interval = setInterval(() => {
            this.checkDrupalApi();
        }, POLL_INTERVAL);

        console.log(`✅ Drupal watcher started (interval: ${POLL_INTERVAL / 1000}s)`);
    }

    /**
     * Stop watching
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('🛑 Drupal watcher stopped');
        }
    }

    /**
     * Register FCM token for push notifications
     */
    registerToken(token) {
        if (token && typeof token === 'string') {
            this.fcmTokens.add(token);
            console.log(`📱 Registered FCM token: ${token.substring(0, 20)}...`);
            return true;
        }
        return false;
    }

    /**
     * Unregister FCM token
     */
    unregisterToken(token) {
        return this.fcmTokens.delete(token);
    }

    /**
     * Get registered tokens count
     */
    getTokenCount() {
        return this.fcmTokens.size;
    }

    /**
     * Get watcher stats
     */
    getStats() {
        return {
            isRunning: !!this.interval,
            checkCount: this.checkCount,
            lastCheckTime: this.lastCheckTime,
            knownTasksCount: this.knownTaskIds.size,
            registeredTokens: this.fcmTokens.size
        };
    }

    /**
     * Parse Drupal API response to extract task data
     */
    parseApiResponse(items) {
        return items.map(item => {
            // Extract node ID from title href
            const hrefMatch = item.title.match(/href="([^"]+)"/);
            const textMatch = item.title.match(/>([^<]+)</);
            const nodeUrl = hrefMatch ? `https://trungtamcntt.bn1.vn${hrefMatch[1]}` : '';
            const title = textMatch ? textMatch[1] : item.title;

            // Extract datetime
            const deadlineMatch = item.field_han_hoan_thanh?.match(/datetime="([^"]+)"/);
            const reminderMatch = item.field_thoi_gian_nhac_viec?.match(/datetime="([^"]+)"/);

            // Use node ID as unique identifier
            const nodeIdMatch = nodeUrl.match(/\/node\/(\d+)/);
            const taskId = nodeIdMatch ? nodeIdMatch[1] : item.counter;

            return {
                id: taskId,
                title: title,
                nodeUrl: nodeUrl,
                deadline: deadlineMatch ? new Date(deadlineMatch[1]) : new Date(),
                reminderTime: reminderMatch ? new Date(reminderMatch[1]) : new Date()
            };
        });
    }

    /**
     * Check Drupal API for new tasks
     */
    async checkDrupalApi() {
        try {
            this.checkCount++;
            this.lastCheckTime = new Date();

            console.log(`[DrupalWatcher] Check #${this.checkCount} at ${this.lastCheckTime.toLocaleTimeString()}`);

            // Fetch with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

            const response = await fetch(DRUPAL_API_URL, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();
            const tasks = this.parseApiResponse(data);

            console.log(`[DrupalWatcher] Fetched ${tasks.length} tasks from API`);

            // Find new tasks (not in known set)
            const newTasks = tasks.filter(task => !this.knownTaskIds.has(task.id));

            if (newTasks.length > 0) {
                console.log(`[DrupalWatcher] 📬 Found ${newTasks.length} NEW tasks!`);

                // Send FCM for each new task
                for (const task of newTasks) {
                    await this.sendFcmNotification(task);
                    this.knownTaskIds.add(task.id);
                }
            }

            // Update known tasks (in case tasks were removed from API)
            // Keep only tasks that are still in API
            const currentIds = new Set(tasks.map(t => t.id));
            // Optional: clean up old IDs to prevent memory leak
            // For now, we keep all known IDs

        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('[DrupalWatcher] ❌ API request timed out');
            } else {
                console.error('[DrupalWatcher] ❌ Error:', error.message);
            }
        }
    }

    /**
     * Send FCM push notification to all registered tokens
     */
    async sendFcmNotification(task) {
        if (this.fcmTokens.size === 0) {
            console.log('[DrupalWatcher] ⚠️ No FCM tokens registered, skipping push');
            return;
        }

        const deadlineStr = task.deadline.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
        });

        const message = {
            notification: {
                title: '📋 Nhắc việc mới',
                body: `${task.title}\nHạn: ${deadlineStr}`
            },
            data: {
                type: 'drupal_task',
                task_id: task.id,
                title: task.title,
                node_url: task.nodeUrl,
                deadline: task.deadline.toISOString(),
                reminder_time: task.reminderTime.toISOString()
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'immediate-notifications',
                    sound: 'noti_sound'
                }
            }
        };

        // Send to each registered token
        const tokens = Array.from(this.fcmTokens);
        let successCount = 0;
        let failCount = 0;

        for (const token of tokens) {
            try {
                await admin.messaging().send({
                    ...message,
                    token: token
                });
                successCount++;
            } catch (error) {
                failCount++;
                // Remove invalid tokens
                if (error.code === 'messaging/registration-token-not-registered' ||
                    error.code === 'messaging/invalid-registration-token') {
                    this.fcmTokens.delete(token);
                    console.log(`[DrupalWatcher] Removed invalid token: ${token.substring(0, 20)}...`);
                }
            }
        }

        console.log(`[DrupalWatcher] 🚀 FCM sent: ${successCount} success, ${failCount} failed`);
    }

    /**
     * Force check all tasks (for initialization or manual refresh)
     */
    async forceCheckAll() {
        // Clear known tasks to re-process everything
        this.knownTaskIds.clear();
        await this.checkDrupalApi();
    }
}

module.exports = DrupalWatcher;
