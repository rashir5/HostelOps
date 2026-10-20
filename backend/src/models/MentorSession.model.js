const mongoose = require('mongoose');

const mentorSessionSchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    topic: {
      type: String,
      required: [true, 'Session topic is required'],
      trim: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Requested', 'Scheduled', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
    mode: {
      type: String,
      enum: ['In-Person', 'Online'],
      default: 'In-Person',
    },
    location: {
      type: String,
      default: 'Faculty Cabin / Mentoring Room, SPIT',
    },
    notes: {
      type: String,
      default: '',
    },
    guidanceRecommendations: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

mentorSessionSchema.index({ mentorId: 1, scheduledDate: -1 });
mentorSessionSchema.index({ studentId: 1 });

module.exports = mongoose.model('MentorSession', mentorSessionSchema);
