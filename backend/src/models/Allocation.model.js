const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room reference is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    bedNumber: {
      type: Number,
      required: [true, 'Bed number is required'],
      min: 1,
    },
    checkInDate: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },
    checkOutDate: {
      type: Date,
      default: null,
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'vacated', 'transferred'],
      default: 'active',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    allocatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// A student can only have one active allocation at a time
allocationSchema.index({ student: 1, status: 1 });

// A bed in a room can only be occupied once (active)
allocationSchema.index({ room: 1, bedNumber: 1, status: 1 });

module.exports = mongoose.model('Allocation', allocationSchema);
