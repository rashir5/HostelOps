const { validationResult } = require('express-validator');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Allocation = require('../models/Allocation');

// @desc    Get rooms by hostel with 2-bed occupancy details
// @route   GET /api/rooms?hostel=
const getRooms = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Invalid query parameters');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { hostel } = req.query;

    let hostelDoc;
    if (hostel) {
      if (hostel.match(/^[0-9a-fA-F]{24}$/)) {
        hostelDoc = await Hostel.findById(hostel);
      } else {
        hostelDoc = await Hostel.findOne({ name: new RegExp(`^${hostel.trim()}$`, 'i') });
      }
    } else {
      // Default to first hostel if none specified
      hostelDoc = await Hostel.findOne().sort({ name: 1 });
    }

    if (!hostelDoc) {
      const err = new Error('Hostel not found');
      err.statusCode = 404;
      return next(err);
    }

    const rooms = await Room.find({ hostel: hostelDoc._id })
      .sort({ floor: 1, roomNo: 1 })
      .lean();

    const roomIds = rooms.map(r => r._id);
    const activeAllocations = await Allocation.find({
      room: { $in: roomIds },
      status: 'active'
    })
      .populate({
        path: 'student',
        select: '-phone -guardian'
      })
      .lean();

    // Map allocations by "roomId|bedNo"
    const allocationMap = new Map(
      activeAllocations.map(a => [a.room.toString() + '|' + a.bedNo, a.student])
    );

    const roomsWithBeds = rooms.map(r => {
      const bed01Student = allocationMap.get(r._id.toString() + '|01') || null;
      const bed02Student = allocationMap.get(r._id.toString() + '|02') || null;

      return {
        _id: r._id,
        hostel: hostelDoc.name,
        roomNo: r.roomNo,
        floor: r.floor,
        capacity: r.capacity || 2,
        beds: [
          { bedNo: '01', student: bed01Student },
          { bedNo: '02', student: bed02Student }
        ]
      };
    });

    res.json(roomsWithBeds);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRooms
};
