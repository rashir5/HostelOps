const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required']
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room reference is required']
    },
    bedNo: {
      type: String,
      required: [true, 'Bed number is required'],
      trim: true
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'released'],
      default: 'active'
    }
  },
  { timestamps: true }
);

allocationSchema.index(
  { student: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

allocationSchema.index(
  { room: 1, bedNo: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

module.exports = mongoose.model('Allocation', allocationSchema);
