const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: [true, 'Hostel reference is required']
    },
    roomNo: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true
    },
    floor: {
      type: Number,
      required: [true, 'Floor number is required']
    },
    capacity: {
      type: Number,
      default: 2
    }
  },
  { timestamps: true }
);

roomSchema.index({ hostel: 1, roomNo: 1 }, { unique: true });

module.exports = mongoose.model('Room', roomSchema);
