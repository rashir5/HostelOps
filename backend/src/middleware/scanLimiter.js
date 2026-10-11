const rateLimit = require('express-rate-limit');

const scanLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 per minute per user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    error: {
      message: 'Too many scan requests, please slow down',
      status: 429
    }
  }
});

module.exports = scanLimiter;
