const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    course: {
      type: String,
      required: [true, 'Course is required'],
      trim: true
    },
    studyYear: {
      type: Number,
      required: [true, 'Study year is required']
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required']
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    guardian: {
      type: String,
      trim: true
    },
    mess: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      default: 'active',
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
