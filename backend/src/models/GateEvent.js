const mongoose = require('mongoose');

const gateEventSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true
    },
    type: {
      type: String,
      enum: {
        values: ['exit', 'entry'],
        message: 'Gate event type must be either exit or entry'
      },
      required: [true, 'Event type is required']
    },
    at: {
      type: Date,
      default: Date.now,
      required: [true, 'Timestamp is required']
    },
    gate: {
      type: String,
      enum: {
        values: ['main', 'east'],
        message: 'Gate must be either main or east'
      },
      required: [true, 'Gate is required']
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'RecordedBy user reference is required']
    },
    pass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pass'
    },
    note: {
      type: String,
      trim: true,
      maxlength: [200, 'Note must not exceed 200 characters']
    }
  },
  { timestamps: true }
);

// Compound index on student and at as specified
gateEventSchema.index({ student: 1, at: -1 });
gateEventSchema.index({ at: -1 });

module.exports = mongoose.model('GateEvent', gateEventSchema);
