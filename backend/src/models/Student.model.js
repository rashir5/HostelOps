const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, 'College Registration Number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    collegeRegistrationNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Student full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'College email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
    },
    course: {
      type: String,
      enum: ['B.Tech', 'M.Tech', 'MCA'],
      default: 'B.Tech',
      required: true,
    },
    branch: {
      type: String,
      enum: [
        'Computer Engineering',
        'Artificial Intelligence & Data Science',
        'Computer Science & Engineering',
        'Electronics & Telecommunication Engineering',
      ],
      default: 'Computer Engineering',
      required: true,
    },
    department: {
      type: String,
      default: 'Computer Engineering',
    },
    year: {
      type: Number,
      min: 1,
      max: 4,
      default: 1,
    },
    academicYear: {
      type: String,
      enum: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
      default: '1st Year',
    },
    admissionYear: {
      type: Number,
      default: 2024,
    },
    institution: {
      type: String,
      default: "Bharatiya Vidya Bhavan's Sardar Patel Institute of Technology (SPIT)",
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'male',
    },
    guardianName: {
      type: String,
      trim: true,
    },
    guardianPhone: {
      type: String,
      trim: true,
    },
    guardianRelation: {
      type: String,
      default: 'Parent / Guardian',
    },
    hostelRequired: {
      type: Boolean,
      default: true,
    },
    messPreference: {
      type: String,
      default: 'Mess options will be confirmed by the hostel administration.',
    },
    feeReceipt: {
      fileName: { type: String, default: null },
      fileData: { type: String, default: null }, // Storage reference or base64
      uploadDate: { type: Date, default: null },
      verificationStatus: {
        type: String,
        enum: ['Pending Review', 'Verified', 'Rejected', 'Not Uploaded'],
        default: 'Pending Review',
      },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: { type: Date, default: null },
      remarks: { type: String, default: '' },
    },
    registrationStatus: {
      type: String,
      enum: ['Pending Review', 'Approved', 'Rejected', 'Graduated'],
      default: 'Pending Review',
    },
    assignedMentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    allocatedRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    allocatedBed: {
      type: Number,
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Pre-save sync
studentSchema.pre('save', function (next) {
  if (!this.collegeRegistrationNumber && this.studentId) {
    this.collegeRegistrationNumber = this.studentId;
  }
  if (!this.department && this.branch) {
    this.department = this.branch;
  }
  next();
});

// Text index for search
studentSchema.index({ name: 'text', studentId: 'text', email: 'text', branch: 'text' });

module.exports = mongoose.model('Student', studentSchema);
