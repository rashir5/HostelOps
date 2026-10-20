const Room = require('../models/Room.model');
const Student = require('../models/Student.model');
const Allocation = require('../models/Allocation.model');
const PassRequest = require('../models/PassRequest.model');
const Complaint = require('../models/Complaint.model');

// ── GET /api/dashboard/stats ────────────────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const [
      rooms,
      students,
      allocations,
      pendingPasses,
      openComplaints,
      pendingRegistrations,
      overdueStudents,
    ] = await Promise.all([
      Room.find({ isActive: true }),
      Student.countDocuments({ isActive: true }),
      Allocation.countDocuments({ status: 'active' }),
      PassRequest.countDocuments({ approvalStatus: 'Pending' }),
      Complaint.countDocuments({ status: { $in: ['Open', 'In Progress'] } }),
      Student.countDocuments({ registrationStatus: 'Pending Review' }),
      PassRequest.countDocuments({ currentStatus: 'Overdue' }),
    ]);

    const totalRooms    = rooms.length;
    const totalBeds     = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const occupiedBeds  = rooms.reduce((sum, r) => sum + r.occupiedBeds, 0);
    const emptyRooms    = rooms.filter((r) => r.occupancyStatus === 'empty').length;
    const fullRooms     = rooms.filter((r) => r.occupancyStatus === 'full').length;
    const partialRooms  = rooms.filter((r) => r.occupancyStatus === 'partial').length;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // Recent allocations (last 5)
    const recentAllocations = await Allocation.find({ status: 'active' })
      .populate('room', 'roomNumber block')
      .populate('student', 'name studentId')
      .sort({ createdAt: -1 })
      .limit(5);

    // Block-wise breakdown
    const blockStats = await Room.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$block',
          totalRooms: { $sum: 1 },
          totalBeds: { $sum: '$capacity' },
          occupiedBeds: { $sum: '$occupiedBeds' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalRooms,
        totalBeds,
        occupiedBeds,
        availableBeds: Math.max(0, totalBeds - occupiedBeds),
        totalStudents: students,
        activeAllocations: allocations,
        emptyRooms,
        fullRooms,
        partialRooms,
        occupancyRate,
        pendingPasses,
        openComplaints,
        pendingRegistrations,
        overdueStudents,
        recentAllocations,
        blockStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/dashboard/rooms-grid ──────────────────────────────────────────
const getRoomsGrid = async (req, res, next) => {
  try {
    const rooms = await Room.find({ isActive: true }).sort({ block: 1, floor: 1, roomNumber: 1 });
    res.json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats, getRoomsGrid };
