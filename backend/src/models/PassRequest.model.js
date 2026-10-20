const mongoose = require('mongoose');

const passRequestSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    passType: {
      type: String,
      enum: ['Day Outing', 'Night Out', 'Home Visit', 'Emergency'],
      required: true,
    },
    requestedDeparture: {
      type: Date,
      required: true,
    },
    expectedReturn: {
      type: Date,
      required: true,
    },
    actualDeparture: {
      type: Date,
      default: null,
    },
    actualReturn: {
      type: Date,
      default: null,
    },
    reason: {
      type: String,
      required: [true, 'Reason for pass is required'],
      trim: true,
    },
    destination: {
      type: String,
      trim: true,
      default: 'Mumbai City',
    },
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    currentStatus: {
      type: String,
      enum: ['Pending Approval', 'Approved', 'Out on Pass', 'Returned', 'Overdue', 'Rejected'],
      default: 'Pending Approval',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actionDate: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      default: '',
    },
    qrCodeId: {
      type: String,
      default: () => 'PASS-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    },
  },
  { timestamps: true }
);

passRequestSchema.index({ studentId: 1, approvalStatus: 1 });
passRequestSchema.index({ currentStatus: 1 });

module.exports = mongoose.model('PassRequest', passRequestSchema);
