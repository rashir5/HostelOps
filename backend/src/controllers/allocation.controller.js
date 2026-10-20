const Allocation = require('../models/Allocation.model');
const Room = require('../models/Room.model');
const Student = require('../models/Student.model');

// Helper: update room occupancy count atomically
const syncRoomOccupancy = async (roomId) => {
  const count = await Allocation.countDocuments({ room: roomId, status: 'active' });
  await Room.findByIdAndUpdate(roomId, { occupiedBeds: count });
};

// ── GET /api/allocations ────────────────────────────────────────────────────
const getAllAllocations = async (req, res, next) => {
  try {
    const { status = 'active', room, student, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (room) filter.room = room;
    if (student) filter.student = student;

    const skip = (Number(page) - 1) * Number(limit);
    const [allocations, total] = await Promise.all([
      Allocation.find(filter)
        .populate('room', 'roomNumber block floor')
        .populate('student', 'name studentId course year')
        .populate('allocatedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Allocation.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: allocations,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/allocations/:id ────────────────────────────────────────────────
const getAllocationById = async (req, res, next) => {
  try {
    const allocation = await Allocation.findById(req.params.id)
      .populate('room')
      .populate('student')
      .populate('allocatedBy', 'name email');

    if (!allocation) return res.status(404).json({ success: false, message: 'Allocation not found' });

    res.json({ success: true, data: allocation });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/allocations ───────────────────────────────────────────────────
const createAllocation = async (req, res, next) => {
  try {
    const { room: roomId, student: studentId, bedNumber, checkInDate, academicYear, remarks } = req.body;

    // Check room exists and has capacity
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.occupiedBeds >= room.capacity) {
      return res.status(400).json({ success: false, message: 'Room is already at full capacity' });
    }

    // Check bed is not already taken
    const bedTaken = await Allocation.findOne({ room: roomId, bedNumber, status: 'active' });
    if (bedTaken) {
      return res.status(409).json({ success: false, message: `Bed ${bedNumber} is already occupied` });
    }

    // Check student doesn't already have an active allocation
    const existingAllocation = await Allocation.findOne({ student: studentId, status: 'active' });
    if (existingAllocation) {
      return res.status(409).json({ success: false, message: 'Student already has an active room allocation' });
    }

    const allocation = await Allocation.create({
      room: roomId,
      student: studentId,
      bedNumber,
      checkInDate,
      academicYear,
      remarks,
      allocatedBy: req.user?.id,
    });

    // Sync room occupancy count
    await syncRoomOccupancy(roomId);

    const populated = await allocation.populate(['room', 'student', 'allocatedBy']);
    res.status(201).json({ success: true, message: 'Room allocated successfully', data: populated });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/allocations/:id/vacate ────────────────────────────────────────
const vacateAllocation = async (req, res, next) => {
  try {
    const { checkOutDate, remarks } = req.body;

    const allocation = await Allocation.findById(req.params.id);
    if (!allocation) return res.status(404).json({ success: false, message: 'Allocation not found' });
    if (allocation.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Allocation is already inactive' });
    }

    allocation.status = 'vacated';
    allocation.checkOutDate = checkOutDate || new Date();
    if (remarks) allocation.remarks = remarks;
    await allocation.save();

    // Sync room occupancy count
    await syncRoomOccupancy(allocation.room);

    res.json({ success: true, message: 'Student vacated successfully', data: allocation });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/allocations/:id ─────────────────────────────────────────────
const deleteAllocation = async (req, res, next) => {
  try {
    const allocation = await Allocation.findById(req.params.id);
    if (!allocation) return res.status(404).json({ success: false, message: 'Allocation not found' });

    const roomId = allocation.room;
    await allocation.deleteOne();
    await syncRoomOccupancy(roomId);

    res.json({ success: true, message: 'Allocation deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAllocations,
  getAllocationById,
  createAllocation,
  vacateAllocation,
  deleteAllocation,
};
