const mongoose = require('mongoose');

const usedTokenSchema = new mongoose.Schema({
  jti: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index: automatically deletes document once expiresAt is reached
  },
  usedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UsedToken', usedTokenSchema);
