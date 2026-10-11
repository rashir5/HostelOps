const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  let token;

  // 1. Check httpOnly cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Authorization: Bearer <token> header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    const err = new Error('Not authorized to access this route');
    err.statusCode = 401;
    return next(err);
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is missing in environment variables');
    }

    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user || !user.isActive) {
      const err = new Error('Not authorized, user account disabled or not found');
      err.statusCode = 401;
      return next(err);
    }

    req.user = user;
    next();
  } catch (error) {
    const err = new Error('Not authorized, token verification failed');
    err.statusCode = 401;
    return next(err);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const err = new Error(`User role '${req.user ? req.user.role : 'none'}' is not authorized to access this route`);
      err.statusCode = 403;
      return next(err);
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize
};
