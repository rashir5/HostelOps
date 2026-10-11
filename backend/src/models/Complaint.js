const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment author is required']
    },
    role: {
      type: String,
      required: [true, 'Author role is required'],
      trim: true
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      maxlength: [500, 'Comment text must not exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: [true, 'Complaint ID is required'],
      unique: true,
      trim: true,
      index: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['plumbing', 'electrical', 'wifi', 'housekeeping', 'furniture', 'other'],
        message: 'Invalid complaint category'
      },
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description must not exceed 1000 characters']
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'normal', 'high', 'urgent'],
        message: 'Invalid priority level'
      },
      default: 'normal',
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ['open', 'in_progress', 'resolved', 'closed', 'reopened'],
        message: 'Invalid complaint status'
      },
      default: 'open',
      index: true
    },
    hostel: {
      type: String,
      required: [true, 'Hostel is required'],
      trim: true
    },
    room: {
      type: String,
      required: [true, 'Room is required'],
      trim: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comments: [commentSchema],
    resolvedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

complaintSchema.index({ student: 1, status: 1 });
complaintSchema.index({ status: 1, priority: 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
