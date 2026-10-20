const mongoose = require('mongoose');

const gateEventSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    passId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PassRequest',
      default: null,
    },
    eventType: {
      type: String,
      enum: ['Exit', 'Entry'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    recordedByName: {
      type: String,
      default: 'Main Gate Security / Warden',
    },
    gateLocation: {
      type: String,
      default: 'SPIT Campus Main Gate',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

gateEventSchema.index({ studentId: 1, timestamp: -1 });

module.exports = mongoose.model('GateEvent', gateEventSchema);
