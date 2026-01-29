const express = require('express');
const http = require('http');
// const { Server } = require('socket.io'); // REMOVED: Pure FCM Architecture
const cors = require('cors');
const config = require('./config');
const { testConnection } = require('./config/database');
const NotificationWatcher = require('./services/notificationWatcher');
const DrupalWatcher = require('./services/drupalWatcher');

// Import routes
const categoryRoutes = require('./routes/categoryRoutes');
const documentRoutes = require('./routes/documentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const taskRoutes = require('./routes/taskRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const drupalRoutes = require('./routes/drupalRoutes');

const app = express();
const server = http.createServer(app);

// REMOVED: WebSocket (socket.io) setup

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Demo Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/drupal', drupalRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: config.nodeEnv === 'development' ? err.message : undefined
  });
});

// Start server
const startServer = async () => {
  // Test database connection
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('❌ Cannot start server without database connection');
    process.exit(1);
  }

  server.listen(config.port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║           DEMO BACKEND API SERVER                      ║
╠═══════════════════════════════════════════════════════╣
║  Status: Running                                       ║
║  Port: ${config.port}                                          ║
║  Environment: ${config.nodeEnv.padEnd(39)}║
║  API Base: http://localhost:${config.port}/api                 ║
╚═══════════════════════════════════════════════════════╝
    `);
    console.log('Available endpoints:');
    console.log('  GET    /health              - Health check');
    console.log('  GET    /api/categories      - List categories');
    console.log('  GET    /api/documents       - List documents');
    console.log('  POST   /api/documents       - Create document');
    console.log('  PUT    /api/documents/:id   - Update document');
    console.log('  DELETE /api/documents/:id   - Delete document');
    console.log('  GET    /api/users/me        - Get current user info'); // Add this if you implement it

    // Khởi động notification watcher (Pure FCM Mode)
    // No 'io' passed - it will use Firebase Admin directly
    const notificationWatcher = new NotificationWatcher();
    notificationWatcher.start();

    // Khởi động Drupal API watcher
    const drupalWatcher = new DrupalWatcher();
    drupalRoutes.setWatcher(drupalWatcher);
    drupalWatcher.start();

    // Check meetings và tasks định kỳ (mỗi 5 phút)
    setInterval(() => {
      notificationWatcher.checkUpcomingMeetings();
      notificationWatcher.checkOverdueTasks();
    }, 5 * 60 * 1000);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    // if (notificationWatcher) notificationWatcher.stop(); // Variable scope issue fixed by inline instantiation or global var if needed
    // For simplicity, we just exit, process.on events are fine.
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
};

startServer();
