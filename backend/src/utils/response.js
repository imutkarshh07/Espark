/**
 * Standardized API Response Helpers
 */

const successResponse = (res, data, statusCode = 200, message = null) => {
  const payload = {
    success: true,
    data: data !== undefined ? data : null,
  };
  if (message) {
    payload.message = message;
  }
  return res.status(statusCode).json(payload);
};

const errorResponse = (res, message, code = 'INTERNAL_ERROR', statusCode = 500, details = null) => {
  const payload = {
    success: false,
    error: {
      code,
      message,
    },
  };
  if (details) {
    payload.error.details = details;
  }
  return res.status(statusCode).json(payload);
};

module.exports = {
  successResponse,
  errorResponse,
};
