const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Announcement content is required'],
      trim: true,
    },
    targetRole: {
      type: String,
      enum: ['All', 'student', 'warden', 'mentor'],
      default: 'All',
    },
    category: {
      type: String,
      enum: ['General', 'Pass / Gate', 'Maintenance', 'Academic / Mentoring', 'Urgent Notice'],
      default: 'General',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    postedByName: {
      type: String,
      default: 'Hostel Administration',
    },
  },
  { timestamps: true }
);

announcementSchema.index({ targetRole: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
