const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      maxlength: [120, 'Title must not exceed 120 characters']
    },
    body: {
      type: String,
      required: [true, 'Announcement body is required'],
      trim: true,
      maxlength: [2000, 'Body must not exceed 2000 characters']
    },
    audience: {
      type: String,
      enum: {
        values: ['all', 'students', 'staff'],
        message: 'Audience must be all, students, or staff'
      },
      default: 'all',
      index: true
    },
    hostel: {
      type: String,
      trim: true,
      default: null,
      index: true
    },
    pinned: {
      type: Boolean,
      default: false,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user reference is required'],
      index: true
    },
    publishAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true
    }
  },
  { timestamps: true }
);

// Indexes for fast feed ordering and filtering
announcementSchema.index({ pinned: -1, publishAt: -1, createdAt: -1 });
announcementSchema.index({ audience: 1, hostel: 1, publishAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
