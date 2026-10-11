const mongoose = require('mongoose');

const checkDbConnected = (req, res, next) => {
  const readyState = mongoose.connection ? mongoose.connection.readyState : 0;
  if (readyState !== 1) {
    const err = new Error(`Database connection not established (readyState=${readyState}). Please start MongoDB or set MONGODB_URI in server/.env`);
    err.statusCode = 503;
    return next(err);
  }
  next();
};

module.exports = checkDbConnected;
