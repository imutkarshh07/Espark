const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/response');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      'Too many requests from this IP. Please try again in a few minutes.',
      'RATE_LIMIT_EXCEEDED',
      429
    );
  },
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased capacity for continuous practice and doubt solving
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      'Too many operations requested. Please wait before retrying.',
      'RATE_LIMIT_EXCEEDED',
      429
    );
  },
});

module.exports = {
  generalLimiter,
  strictLimiter,
};
