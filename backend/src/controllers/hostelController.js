const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Allocation = require('../models/Allocation');

// @desc    Get all hostels with occupancy statistics
// @route   GET /api/hostels
const getHostels = async (req, res, next) => {
  try {
    const hostels = await Hostel.find().sort({ name: 1 }).lean();

    const result = await Promise.all(
      hostels.map(async (h) => {
        const rooms = await Room.find({ hostel: h._id }).select('_id');
        const roomIds = rooms.map(r => r._id);

        const activeAllocationsCount = await Allocation.countDocuments({
          room: { $in: roomIds },
          status: 'active'
        });

        const occupied = h.otherOccupied + activeAllocationsCount;
        const available = Math.max(0, h.totalBeds - occupied - h.maintenanceBeds);

        return {
          _id: h._id,
          name: h.name,
          totalBeds: h.totalBeds,
          maintenanceBeds: h.maintenanceBeds,
          otherOccupied: h.otherOccupied,
          occupied,
          available,
          createdAt: h.createdAt,
          updatedAt: h.updatedAt
        };
      })
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHostels
};
