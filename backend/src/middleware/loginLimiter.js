const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many login attempts, please try again after 15 minutes',
      status: 429
    }
  }
});

module.exports = loginLimiter;
