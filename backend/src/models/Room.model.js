const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    block: {
      type: String,
      required: [true, 'Block/Wing is required'],
      trim: true,
      uppercase: true,
    },
    floor: {
      type: Number,
      required: [true, 'Floor number is required'],
      min: 0,
    },
    capacity: {
      type: Number,
      required: [true, 'Room capacity is required'],
      min: 1,
      max: 10,
    },
    roomType: {
      type: String,
      enum: ['single', 'double', 'triple', 'dormitory'],
      required: true,
    },
    amenities: {
      type: [String],
      default: [],
    },
    monthlyRent: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Virtual occupancy — computed from allocations, stored for quick access
    occupiedBeds: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: occupancy status derived from occupiedBeds vs capacity
roomSchema.virtual('occupancyStatus').get(function () {
  if (this.occupiedBeds === 0) return 'empty';
  if (this.occupiedBeds >= this.capacity) return 'full';
  return 'partial';
});

// Virtual: available beds
roomSchema.virtual('availableBeds').get(function () {
  return Math.max(0, this.capacity - this.occupiedBeds);
});

// Index for fast filtering by block and floor
roomSchema.index({ block: 1, floor: 1 });
roomSchema.index({ occupancyStatus: 1 });

module.exports = mongoose.model('Room', roomSchema);
