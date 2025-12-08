const express = require('express');
const cors = require('cors');
const config = require('./config');
const { testConnection } = require('./config/database');

// Import routes
const categoryRoutes = require('./routes/categoryRoutes');
const documentRoutes = require('./routes/documentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const taskRoutes = require('./routes/taskRoutes');
const meetingRoutes = require('./routes/meetingRoutes');

const app = express();

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

// Start server
const startServer = async () => {
  // Test database connection
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('❌ Cannot start server without database connection');
    process.exit(1);
  }

  app.listen(config.port, () => {
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
    console.log('  GET    /api/reports         - List reports');
    console.log('  POST   /api/reports         - Create report');
    console.log('  PUT    /api/reports/:id     - Update report');
    console.log('  DELETE /api/reports/:id     - Delete report');
  });
};

startServer();
