require('dotenv').config();

module.exports = {
  // Server config
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database config
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'demo_drupal',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },

  // CORS config
  corsOrigin: process.env.CORS_ORIGIN || '*'
};
