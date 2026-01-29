/**
 * Drupal Task Routes
 * Endpoints for FCM token registration and manual task refresh
 */

const express = require('express');
const router = express.Router();

// DrupalWatcher instance will be set from index.js
let drupalWatcher = null;

// Set DrupalWatcher instance
router.setWatcher = (watcher) => {
    drupalWatcher = watcher;
};

/**
 * POST /api/drupal/register-token
 * Register FCM token for push notifications
 */
router.post('/register-token', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'FCM token is required'
        });
    }

    if (!drupalWatcher) {
        return res.status(500).json({
            success: false,
            message: 'DrupalWatcher not initialized'
        });
    }

    const registered = drupalWatcher.registerToken(token);

    res.json({
        success: registered,
        message: registered ? 'Token registered successfully' : 'Failed to register token',
        tokenCount: drupalWatcher.getTokenCount()
    });
});

/**
 * POST /api/drupal/unregister-token
 * Unregister FCM token
 */
router.post('/unregister-token', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'FCM token is required'
        });
    }

    if (!drupalWatcher) {
        return res.status(500).json({
            success: false,
            message: 'DrupalWatcher not initialized'
        });
    }

    const unregistered = drupalWatcher.unregisterToken(token);

    res.json({
        success: unregistered,
        message: unregistered ? 'Token unregistered' : 'Token not found'
    });
});

/**
 * GET /api/drupal/status
 * Get DrupalWatcher status and stats
 */
router.get('/status', (req, res) => {
    if (!drupalWatcher) {
        return res.status(500).json({
            success: false,
            message: 'DrupalWatcher not initialized'
        });
    }

    res.json({
        success: true,
        data: drupalWatcher.getStats()
    });
});

/**
 * POST /api/drupal/refresh
 * Force check Drupal API for new tasks
 */
router.post('/refresh', async (req, res) => {
    if (!drupalWatcher) {
        return res.status(500).json({
            success: false,
            message: 'DrupalWatcher not initialized'
        });
    }

    try {
        await drupalWatcher.forceCheckAll();
        res.json({
            success: true,
            message: 'Force refresh completed',
            stats: drupalWatcher.getStats()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Refresh failed',
            error: error.message
        });
    }
});

module.exports = router;
