const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Hostel name is required'],
      unique: true,
      trim: true
    },
    totalBeds: {
      type: Number,
      required: [true, 'Total beds count is required']
    },
    maintenanceBeds: {
      type: Number,
      default: 0
    },
    otherOccupied: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Hostel', hostelSchema);
