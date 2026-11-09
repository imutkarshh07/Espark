const logger = require('../utils/logger');
const { errorResponse } = require('../utils/response');

/**
 * Centralized Error Handling Middleware
 */
const errorMiddleware = (err, req, res, next) => {
  logger.error(`[ErrorMiddleware] ${req.method} ${req.originalUrl}:`, err);

  // Handle Joi validation errors
  if (err.isJoi) {
    return errorResponse(
      res,
      err.details ? err.details.map((d) => d.message).join(', ') : 'Validation error',
      'VALIDATION_ERROR',
      400,
      err.details
    );
  }

  // Handle custom AppError
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred on the server.';

  // Do not leak stack traces or raw database error dumps to clients
  const safeMessage = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again later.'
    : message;

  return errorResponse(res, safeMessage, code, statusCode);
};

// 404 Route Not Found Middleware
const notFoundMiddleware = (req, res) => {
  return errorResponse(
    res,
    `Route ${req.method} ${req.originalUrl} not found.`,
    'ROUTE_NOT_FOUND',
    404
  );
};

module.exports = {
  errorMiddleware,
  notFoundMiddleware,
};
