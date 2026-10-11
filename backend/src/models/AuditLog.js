const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: {
    type: String,
    required: [true, 'Actor is required'],
    trim: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
