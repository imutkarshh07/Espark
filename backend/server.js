const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');

const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info(`=========================================`);
  logger.info(`Study Insights Backend running on 0.0.0.0:${config.port}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`Health Check: http://localhost:${config.port}/api/health`);
  logger.info(`=========================================`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Gracefully shutting down server...');
  server.close(() => {
    logger.info('HTTP server closed successfully.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Gracefully shutting down server...');
  server.close(() => {
    logger.info('HTTP server closed successfully.');
    process.exit(0);
  });
});
