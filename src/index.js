const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const config = require('./config');
const { testConnection } = require('./config/database');
const NotificationWatcher = require('./services/notificationWatcher');

// Import routes
const categoryRoutes = require('./routes/categoryRoutes');
const documentRoutes = require('./routes/documentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const taskRoutes = require('./routes/taskRoutes');
const meetingRoutes = require('./routes/meetingRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Trong production nên giới hạn origin cụ thể
    methods: ['GET', 'POST']
  }
});

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

// ===== WebSocket Setup =====
let notificationWatcher = null;
const connectedClients = new Map(); // Track connected users

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Client đăng ký với userId
  socket.on('register', (userId) => {
    const userRoom = `user_${userId}`;
    socket.join(userRoom);
    connectedClients.set(socket.id, userId);
    
    console.log(`✅ User ${userId} registered (socket: ${socket.id})`);
    
    // Gửi confirmation
    socket.emit('registered', {
      success: true,
      userId,
      message: 'Successfully registered for notifications'
    });
  });

  // Client disconnect
  socket.on('disconnect', () => {
    const userId = connectedClients.get(socket.id);
    if (userId) {
      console.log(`👋 User ${userId} disconnected (socket: ${socket.id})`);
      connectedClients.delete(socket.id);
    } else {
      console.log(`👋 Client disconnected: ${socket.id}`);
    }
  });

  // Ping/pong để keep alive
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Export io để các routes có thể dùng
app.set('io', io);

// ===== End WebSocket Setup =====

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
║  WebSocket: ws://localhost:${config.port}                      ║
╚═══════════════════════════════════════════════════════╝
    `);
    console.log('Available endpoints:');
    console.log('  GET    /health              - Health check');
    console.log('  GET    /api/categories      - List categories');
    console.log('  GET    /api/documents       - List documents');
    console.log('  POST   /api/documents       - Create document');
    console.log('  PUT    /api/documents/:id   - Update document');
    console.log('  DELETE /api/documents/:id   - Delete document');
    console.log('  GET    /api/reports         - List reports');
    console.log('  POST   /api/reports         - Create report');
    console.log('  PUT    /api/reports/:id     - Update report');
    console.log('  DELETE /api/reports/:id     - Delete report');
    console.log('\nWebSocket events:');
    console.log('  Client → Server:');
    console.log('    register(userId)          - Register for notifications');
    console.log('    ping                      - Keep connection alive');
    console.log('  Server → Client:');
    console.log('    registered                - Registration confirmed');
    console.log('    notification              - New notification pushed');
    console.log('    pong                      - Response to ping');
    
    // Khởi động notification watcher
    notificationWatcher = new NotificationWatcher(io);
    notificationWatcher.start();
    
    // Check meetings và tasks định kỳ (mỗi 5 phút)
    setInterval(() => {
      notificationWatcher.checkUpcomingMeetings();
      notificationWatcher.checkOverdueTasks();
    }, 5 * 60 * 1000);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (notificationWatcher) {
      notificationWatcher.stop();
    }
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
};

startServer();
