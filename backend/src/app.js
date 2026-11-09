const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const apiRouter = require('./routes');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorMiddleware, notFoundMiddleware } = require('./middleware/errorMiddleware');

const app = express();

// Security headers with Helmet
app.use(helmet());

// Cross-Origin Resource Sharing with strict origins
const configuredOrigins = (config.corsOrigin && config.corsOrigin !== '*')
  ? config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  ...configuredOrigins,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // In non-production or if wildcard explicitly configured outside production
      if (config.env !== 'production' && (config.corsOrigin === '*' || !config.corsOrigin)) {
        return callback(null, true);
      }

      // Production check against allowed origins
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-test-user-id'],
  })
);

// Logging
if (config.env !== 'test') {
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
}

// Global rate limiting
app.use(generalLimiter);

// Body parsers (allow up to 50mb for multimodal photo and PDF attachments)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount all API endpoints under /api
app.use('/api', apiRouter);

// Health checks on both /health and /api/health
const healthController = require('./controllers/healthController');
app.get('/health', healthController.getHealth);

// Root route
app.get('/', (req, res) => {
  res.json({
    app: 'Study Insights API',
    status: 'online',
    version: '1.0.0',
    health: '/api/health',
  });
});

// 404 handler
app.use(notFoundMiddleware);

// Centralized error handler
app.use(errorMiddleware);

module.exports = app;
