const mongoose = require('mongoose');

const passSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [200, 'Reason must not exceed 200 characters']
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
      maxlength: [200, 'Destination must not exceed 200 characters']
    },
    leaveContact: {
      type: String,
      trim: true,
      maxlength: [200, 'Leave contact must not exceed 200 characters']
    },
    departureAt: {
      type: Date,
      required: [true, 'Departure date/time is required']
    },
    expectedReturnAt: {
      type: Date,
      required: [true, 'Expected return date/time is required']
    },
    actualReturnAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled', 'out', 'returned'],
      default: 'pending',
      index: true
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    decidedAt: {
      type: Date
    },
    decisionNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Decision note must not exceed 500 characters']
    }
  },
  { timestamps: true }
);

// Compound index for overlap checks — only active passes (pending/approved/out)
passSchema.index({ student: 1, status: 1, departureAt: 1, expectedReturnAt: 1 });

module.exports = mongoose.model('Pass', passSchema);
