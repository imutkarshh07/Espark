const dotenv = require('dotenv');
dotenv.config();

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

// In production, require deliberate origins (or comma-separated list); only default to * in dev/test
const defaultCorsOrigin = isProduction ? (process.env.FRONTEND_URL || '') : '*';

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5001', 10),
  supabase: {
    url: process.env.SUPABASE_URL || '',
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  ragServerUrl: process.env.RAG_SERVER_URL || 'http://127.0.0.1:8000',
  // Shared secret sent by Node on every request to the Python RAG service.
  // Set only in Render environment variables – never expose to mobile/web clients.
  ragServiceToken: process.env.RAG_SERVICE_TOKEN || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  corsOrigin: process.env.CORS_ORIGIN || defaultCorsOrigin,
  jwtSecret: process.env.JWT_SECRET || '',
};

module.exports = config;
