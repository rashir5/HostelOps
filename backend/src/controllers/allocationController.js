const { validationResult } = require('express-validator');
const Student = require('../models/Student');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Allocation = require('../models/Allocation');
const AuditLog = require('../models/AuditLog');

// Helper to find student by studentId string or ObjectId string
const findStudent = async (identifier) => {
  if (!identifier) return null;
  let student = null;
  if (identifier.toString().match(/^[0-9a-fA-F]{24}$/)) {
    student = await Student.findById(identifier);
  }
  if (!student) {
    student = await Student.findOne({ studentId: identifier.trim() });
  }
  return student;
};

// Helper to find hostel by name or ObjectId string
const findHostel = async (identifier) => {
  if (!identifier) return null;
  if (identifier.toString().match(/^[0-9a-fA-F]{24}$/)) {
    const doc = await Hostel.findById(identifier);
    if (doc) return doc;
  }
  return await Hostel.findOne({ name: new RegExp(`^${identifier.trim()}$`, 'i') });
};

// @desc    Assign unallocated student to a vacant bed
// @route   POST /api/allocations
// @access  Admin, Warden
const createAllocation = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation error');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { studentId, hostel, roomNo, bedNo } = req.body;

    // 1. Find student
    const student = await findStudent(studentId);
    if (!student) {
      const err = new Error(`Student not found with ID ${studentId}`);
      err.statusCode = 404;
      return next(err);
    }

    // 2. Check if student already has an active allocation
    const existingStudentAlloc = await Allocation.findOne({
      student: student._id,
      status: 'active'
    });
    if (existingStudentAlloc) {
      const err = new Error('Student already has an active allocation');
      err.statusCode = 409;
      return next(err);
    }

    // 3. Find Hostel
    const hostelDoc = await findHostel(hostel);
    if (!hostelDoc) {
      const err = new Error(`Hostel not found: ${hostel}`);
      err.statusCode = 404;
      return next(err);
    }

    // 4. Find Room
    const roomDoc = await Room.findOne({
      hostel: hostelDoc._id,
      roomNo: roomNo.trim()
    });
    if (!roomDoc) {
      const err = new Error(`Room ${roomNo} not found in ${hostelDoc.name}`);
      err.statusCode = 404;
      return next(err);
    }

    // 5. Validate Bed Number
    const formattedBedNo = bedNo.toString().padStart(2, '0');
    if (!['01', '02'].includes(formattedBedNo)) {
      const err = new Error('Invalid bed number. Allowed beds are 01 or 02');
      err.statusCode = 400;
      return next(err);
    }

    // 6. Check if bed is already occupied
    const existingBedAlloc = await Allocation.findOne({
      room: roomDoc._id,
      bedNo: formattedBedNo,
      status: 'active'
    });
    if (existingBedAlloc) {
      const err = new Error(`Bed ${formattedBedNo} in room ${roomDoc.roomNo} is already occupied`);
      err.statusCode = 409;
      return next(err);
    }

    // 7. Check room capacity
    const activeRoomAllocations = await Allocation.countDocuments({
      room: roomDoc._id,
      status: 'active'
    });
    if (activeRoomAllocations >= roomDoc.capacity) {
      const err = new Error(`Room ${roomDoc.roomNo} is at full capacity (${roomDoc.capacity})`);
      err.statusCode = 409;
      return next(err);
    }

    // 8. Create new active allocation
    const allocation = await Allocation.create({
      student: student._id,
      room: roomDoc._id,
      bedNo: formattedBedNo,
      academicYear: student.academicYear || '2025-26',
      startDate: new Date(),
      status: 'active'
    });

    // 9. Create Audit Log
    const actorEmail = req.user ? req.user.email : 'system';
    await AuditLog.create({
      actor: actorEmail,
      action: 'ALLOCATE_BED',
      details: {
        studentId: student.studentId,
        studentName: student.name,
        hostel: hostelDoc.name,
        roomNo: roomDoc.roomNo,
        bedNo: formattedBedNo
      }
    });

    res.status(201).json({
      message: 'Bed allocated successfully',
      allocation: {
        _id: allocation._id,
        studentId: student.studentId,
        studentName: student.name,
        hostel: hostelDoc.name,
        roomNo: roomDoc.roomNo,
        bedNo: formattedBedNo,
        status: allocation.status,
        startDate: allocation.startDate
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Move a student to a new bed
// @route   PUT /api/allocations/:studentId/move
// @access  Admin, Warden
const moveAllocation = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation error');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { studentId } = req.params;
    const { hostel, roomNo, bedNo } = req.body;

    // 1. Find student
    const student = await findStudent(studentId);
    if (!student) {
      const err = new Error(`Student not found with ID ${studentId}`);
      err.statusCode = 404;
      return next(err);
    }

    // 2. Find current active allocation
    const currentAlloc = await Allocation.findOne({
      student: student._id,
      status: 'active'
    }).populate({
      path: 'room',
      populate: { path: 'hostel' }
    });

    if (!currentAlloc) {
      const err = new Error(`No active bed allocation found for student ${student.studentId}`);
      err.statusCode = 404;
      return next(err);
    }

    // 3. Find target Hostel
    const targetHostel = await findHostel(hostel);
    if (!targetHostel) {
      const err = new Error(`Hostel not found: ${hostel}`);
      err.statusCode = 404;
      return next(err);
    }

    // 4. Find target Room
    const targetRoom = await Room.findOne({
      hostel: targetHostel._id,
      roomNo: roomNo.trim()
    });
    if (!targetRoom) {
      const err = new Error(`Room ${roomNo} not found in ${targetHostel.name}`);
      err.statusCode = 404;
      return next(err);
    }

    // 5. Validate Bed Number
    const formattedBedNo = bedNo.toString().padStart(2, '0');
    if (!['01', '02'].includes(formattedBedNo)) {
      const err = new Error('Invalid bed number. Allowed beds are 01 or 02');
      err.statusCode = 400;
      return next(err);
    }

    // Check if user is attempting to move to the exact same bed
    if (
      currentAlloc.room._id.toString() === targetRoom._id.toString() &&
      currentAlloc.bedNo === formattedBedNo
    ) {
      const err = new Error('Student is already allocated to this exact bed');
      err.statusCode = 400;
      return next(err);
    }

    // 6. Check if target bed is occupied
    const targetBedOccupied = await Allocation.findOne({
      room: targetRoom._id,
      bedNo: formattedBedNo,
      status: 'active'
    });
    if (targetBedOccupied) {
      const err = new Error(`Bed ${formattedBedNo} in room ${targetRoom.roomNo} is already occupied`);
      err.statusCode = 409;
      return next(err);
    }

    // 7. Check target room capacity
    const activeTargetRoomAllocations = await Allocation.countDocuments({
      room: targetRoom._id,
      status: 'active'
    });
    if (activeTargetRoomAllocations >= targetRoom.capacity) {
      const err = new Error(`Target room ${targetRoom.roomNo} is at full capacity (${targetRoom.capacity})`);
      err.statusCode = 409;
      return next(err);
    }

    // Record source details for audit log
    const fromHostel = currentAlloc.room && currentAlloc.room.hostel ? currentAlloc.room.hostel.name : 'Unknown';
    const fromRoom = currentAlloc.room ? currentAlloc.room.roomNo : 'Unknown';
    const fromBed = currentAlloc.bedNo;

    // 8. Release current allocation
    currentAlloc.status = 'released';
    currentAlloc.endDate = new Date();
    await currentAlloc.save();

    // 9. Create new active allocation
    const newAllocation = await Allocation.create({
      student: student._id,
      room: targetRoom._id,
      bedNo: formattedBedNo,
      academicYear: student.academicYear || '2025-26',
      startDate: new Date(),
      status: 'active'
    });

    // 10. Audit Log
    const actorEmail = req.user ? req.user.email : 'system';
    await AuditLog.create({
      actor: actorEmail,
      action: 'MOVE_BED',
      details: {
        studentId: student.studentId,
        studentName: student.name,
        from: { hostel: fromHostel, roomNo: fromRoom, bedNo: fromBed },
        to: { hostel: targetHostel.name, roomNo: targetRoom.roomNo, bedNo: formattedBedNo }
      }
    });

    res.json({
      message: 'Student bed moved successfully',
      allocation: {
        _id: newAllocation._id,
        studentId: student.studentId,
        studentName: student.name,
        hostel: targetHostel.name,
        roomNo: targetRoom.roomNo,
        bedNo: formattedBedNo,
        status: newAllocation.status,
        startDate: newAllocation.startDate
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Release student bed allocation
// @route   DELETE /api/allocations/:studentId
// @access  Admin, Warden
const releaseAllocation = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation error');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { studentId } = req.params;

    // 1. Find student
    const student = await findStudent(studentId);
    if (!student) {
      const err = new Error(`Student not found with ID ${studentId}`);
      err.statusCode = 404;
      return next(err);
    }

    // 2. Find active allocation
    const alloc = await Allocation.findOne({
      student: student._id,
      status: 'active'
    }).populate({
      path: 'room',
      populate: { path: 'hostel' }
    });

    if (!alloc) {
      const err = new Error(`No active bed allocation found for student ${student.studentId}`);
      err.statusCode = 404;
      return next(err);
    }

    const hostelName = alloc.room && alloc.room.hostel ? alloc.room.hostel.name : 'Unknown';
    const roomNo = alloc.room ? alloc.room.roomNo : 'Unknown';
    const bedNo = alloc.bedNo;

    // 3. Update allocation to released
    alloc.status = 'released';
    alloc.endDate = new Date();
    await alloc.save();

    // 4. Audit Log
    const actorEmail = req.user ? req.user.email : 'system';
    await AuditLog.create({
      actor: actorEmail,
      action: 'RELEASE_BED',
      details: {
        studentId: student.studentId,
        studentName: student.name,
        releasedFrom: { hostel: hostelName, roomNo, bedNo }
      }
    });

    res.json({
      message: 'Bed allocation released successfully',
      releasedAllocation: {
        studentId: student.studentId,
        studentName: student.name,
        hostel: hostelName,
        roomNo,
        bedNo,
        endDate: alloc.endDate
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAllocation,
  moveAllocation,
  releaseAllocation
};
