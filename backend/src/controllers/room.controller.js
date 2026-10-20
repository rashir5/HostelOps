const Room = require('../models/Room.model');

// ── GET /api/rooms ──────────────────────────────────────────────────────────
const getAllRooms = async (req, res, next) => {
  try {
    const { block, floor, status, type, search } = req.query;
    const filter = { isActive: true };

    if (block) filter.block = block.toUpperCase();
    if (floor !== undefined) filter.floor = Number(floor);
    if (type) filter.roomType = type;

    let rooms = await Room.find(filter).sort({ block: 1, roomNumber: 1 });

    // Filter by occupancy status (computed virtual)
    if (status) {
      rooms = rooms.filter((r) => r.occupancyStatus === status);
    }

    // Search by room number
    if (search) {
      const q = search.toLowerCase();
      rooms = rooms.filter((r) => r.roomNumber.toLowerCase().includes(q));
    }

    res.json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/rooms/:id ──────────────────────────────────────────────────────
const getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    res.json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/rooms ─────────────────────────────────────────────────────────
const createRoom = async (req, res, next) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json({ success: true, message: 'Room created', data: room });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Room number already exists' });
    }
    next(error);
  }
};

// ── PUT /api/rooms/:id ──────────────────────────────────────────────────────
const updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    res.json({ success: true, message: 'Room updated', data: room });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/rooms/:id ───────────────────────────────────────────────────
const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    res.json({ success: true, message: 'Room deactivated' });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/rooms/blocks ───────────────────────────────────────────────────
const getBlocks = async (req, res, next) => {
  try {
    const blocks = await Room.distinct('block', { isActive: true });
    res.json({ success: true, data: blocks.sort() });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllRooms, getRoomById, createRoom, updateRoom, deleteRoom, getBlocks };
