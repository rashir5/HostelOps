const { validationResult } = require('express-validator');
const Pass = require('../models/Pass');
const Student = require('../models/Student');
const Allocation = require('../models/Allocation');
const Room = require('../models/Room');
const Hostel = require('../models/Hostel');
const AuditLog = require('../models/AuditLog');

// ─── Active statuses (counts as "ongoing" for overlap check) ─────────────────
const ACTIVE_STATUSES = ['pending', 'approved', 'out'];

// ─── Helper: resolve Student doc from req.user (student role) ────────────────
async function resolveStudentFromUser(user) {
  if (user.student) {
    // user.student is an ObjectId (not populated in authenticate)
    return Student.findById(user.student).lean();
  }
  return Student.findOne({ email: user.email.toLowerCase().trim() }).lean();
}

// ─── Helper: build pass detail response (no phone / guardian) ────────────────
function safeStudent(s) {
  if (!s) return null;
  const { phone: _p, guardian: _g, ...rest } = s;
  return rest;
}

// ─── Helper: get allocation+hostel info for a student ObjectId ───────────────
async function getAllocationInfo(studentId) {
  const alloc = await Allocation.findOne({ student: studentId, status: 'active' })
    .populate({ path: 'room', populate: { path: 'hostel', select: 'name' } })
    .lean();
  if (!alloc || !alloc.room || !alloc.room.hostel) return null;
  return { hostel: alloc.room.hostel.name, hostelId: alloc.room.hostel._id, room: alloc.room.roomNo };
}

// ─── Helper: format a pass for response ──────────────────────────────────────
function formatPass(pass) {
  const obj = pass.toObject ? pass.toObject() : { ...pass };
  // Remove phone/guardian if student populated
  if (obj.student && typeof obj.student === 'object') {
    delete obj.student.phone;
    delete obj.student.guardian;
  }
  return obj;
}

// =============================================================================
// POST /api/passes  (student only)
// =============================================================================
const createPass = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation error');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    // 1. Resolve student record
    const student = await resolveStudentFromUser(req.user);
    if (!student) {
      const err = new Error('No student record linked to this account');
      err.statusCode = 404;
      return next(err);
    }

    // 2. Student must have an active allocation
    const allocInfo = await getAllocationInfo(student._id);
    if (!allocInfo) {
      const err = new Error('You must have an active bed allocation to apply for a pass');
      err.statusCode = 403;
      return next(err);
    }

    const { reason, destination, leaveContact, departureAt, expectedReturnAt } = req.body;

    const depDate = new Date(departureAt);
    const retDate = new Date(expectedReturnAt);
    const now = new Date();

    // 3. Departure must be in the future
    if (depDate <= now) {
      const err = new Error('Departure date/time must be in the future');
      err.statusCode = 400;
      return next(err);
    }

    // 4. Return must be after departure
    if (retDate <= depDate) {
      const err = new Error('Expected return date/time must be after departure');
      err.statusCode = 400;
      return next(err);
    }

    // 5. Maximum stay 14 days
    const stayMs = retDate - depDate;
    if (stayMs > 14 * 24 * 60 * 60 * 1000) {
      const err = new Error('Maximum stay duration is 14 days');
      err.statusCode = 400;
      return next(err);
    }

    // 6. No overlapping active pass for the same student
    const overlap = await Pass.findOne({
      student: student._id,
      status: { $in: ACTIVE_STATUSES },
      departureAt: { $lt: retDate },
      expectedReturnAt: { $gt: depDate }
    });
    if (overlap) {
      const err = new Error(`You already have an active pass (${overlap.status}) that overlaps with these dates`);
      err.statusCode = 409;
      return next(err);
    }

    // 7. Create the pass
    const pass = await Pass.create({
      student: student._id,
      reason: reason.trim(),
      destination: destination.trim(),
      leaveContact: leaveContact ? leaveContact.trim() : undefined,
      departureAt: depDate,
      expectedReturnAt: retDate,
      status: 'pending'
    });

    // 8. Audit log
    await AuditLog.create({
      actor: req.user.email,
      action: 'PASS_CREATED',
      details: {
        passId: pass._id,
        studentId: student.studentId,
        destination: pass.destination,
        departureAt: pass.departureAt,
        expectedReturnAt: pass.expectedReturnAt
      }
    });

    const populated = await Pass.findById(pass._id)
      .populate('student', '-phone -guardian')
      .lean();

    res.status(201).json({ message: 'Pass application submitted successfully', pass: populated });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET /api/passes/mine  (student only)
// =============================================================================
const getMyPasses = async (req, res, next) => {
  try {
    const student = await resolveStudentFromUser(req.user);
    if (!student) {
      const err = new Error('No student record linked to this account');
      err.statusCode = 404;
      return next(err);
    }

    const passes = await Pass.find({ student: student._id })
      .populate('student', '-phone -guardian')
      .populate('decidedBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ items: passes, total: passes.length });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// PUT /api/passes/:id/cancel  (student only — their own pending pass)
// =============================================================================
const cancelPass = async (req, res, next) => {
  try {
    const student = await resolveStudentFromUser(req.user);
    if (!student) {
      const err = new Error('No student record linked to this account');
      err.statusCode = 404;
      return next(err);
    }

    const pass = await Pass.findById(req.params.id);
    if (!pass) {
      const err = new Error('Pass not found');
      err.statusCode = 404;
      return next(err);
    }

    // Must belong to this student
    if (pass.student.toString() !== student._id.toString()) {
      const err = new Error('You are not authorised to cancel this pass');
      err.statusCode = 403;
      return next(err);
    }

    // Can only cancel a pending pass
    if (pass.status !== 'pending') {
      const err = new Error(`Cannot cancel a pass with status '${pass.status}'`);
      err.statusCode = 409;
      return next(err);
    }

    pass.status = 'cancelled';
    await pass.save();

    await AuditLog.create({
      actor: req.user.email,
      action: 'PASS_CANCELLED',
      details: { passId: pass._id, studentId: student.studentId }
    });

    res.json({ message: 'Pass cancelled successfully', pass: formatPass(pass) });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET /api/passes  (admin and warden)
// =============================================================================
const listPasses = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Invalid query parameters');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { status } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) {
      const validStatuses = ['pending', 'approved', 'rejected', 'cancelled', 'out', 'returned'];
      if (!validStatuses.includes(status)) {
        const err = new Error(`Invalid status '${status}'`);
        err.statusCode = 400;
        return next(err);
      }
      filter.status = status;
    }

    // Warden scope: if warden user has a hostel field, restrict to that hostel's students
    let hostelStudentIds = null;
    if (req.user.role === 'warden' && req.user.hostel) {
      const rooms = await Room.find({ hostel: req.user.hostel }).select('_id').lean();
      const roomIds = rooms.map(r => r._id);
      const allocs = await Allocation.find({ room: { $in: roomIds }, status: 'active' }).select('student').lean();
      hostelStudentIds = allocs.map(a => a.student);
      filter.student = { $in: hostelStudentIds };
    }

    const total = await Pass.countDocuments(filter);
    const passes = await Pass.find(filter)
      .populate('student', '-phone -guardian')
      .populate('decidedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Attach hostel/room info for each pass
    const studentIds = [...new Set(passes.map(p => p.student?._id?.toString()).filter(Boolean))];
    const allocations = await Allocation.find({
      student: { $in: studentIds },
      status: 'active'
    })
      .populate({ path: 'room', populate: { path: 'hostel', select: 'name' } })
      .lean();

    const allocMap = new Map(allocations.map(a => [a.student.toString(), a]));

    const enriched = passes.map(p => {
      const sid = p.student?._id?.toString();
      const alloc = sid ? allocMap.get(sid) : null;
      return {
        ...p,
        hostel: alloc?.room?.hostel?.name || null,
        roomNo: alloc?.room?.roomNo || null
      };
    });

    res.json({ items: enriched, page, limit, total });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// PUT /api/passes/:id/approve  (admin and warden)
// =============================================================================
const approvePass = async (req, res, next) => {
  try {
    const pass = await Pass.findById(req.params.id).populate('student', '-phone -guardian');
    if (!pass) {
      const err = new Error('Pass not found');
      err.statusCode = 404;
      return next(err);
    }

    // Only from pending
    if (pass.status !== 'pending') {
      const err = new Error(`Cannot approve a pass with status '${pass.status}'`);
      err.statusCode = 409;
      return next(err);
    }

    // A student can never approve their own pass (guard against student ref match)
    if (req.user.student && pass.student &&
        req.user.student.toString() === pass.student._id.toString()) {
      const err = new Error('You cannot approve your own pass');
      err.statusCode = 403;
      return next(err);
    }

    pass.status = 'approved';
    pass.decidedBy = req.user._id;
    pass.decidedAt = new Date();
    if (req.body.decisionNote) pass.decisionNote = req.body.decisionNote.trim();
    await pass.save();

    await AuditLog.create({
      actor: req.user.email,
      action: 'PASS_APPROVED',
      details: {
        passId: pass._id,
        studentId: pass.student?.studentId
      }
    });

    res.json({ message: 'Pass approved', pass: formatPass(pass) });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// PUT /api/passes/:id/reject  (admin and warden)
// =============================================================================
const rejectPass = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation error');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const pass = await Pass.findById(req.params.id).populate('student', '-phone -guardian');
    if (!pass) {
      const err = new Error('Pass not found');
      err.statusCode = 404;
      return next(err);
    }

    if (pass.status !== 'pending') {
      const err = new Error(`Cannot reject a pass with status '${pass.status}'`);
      err.statusCode = 409;
      return next(err);
    }

    // A student can never reject their own pass
    if (req.user.student && pass.student &&
        req.user.student.toString() === pass.student._id.toString()) {
      const err = new Error('You cannot reject your own pass');
      err.statusCode = 403;
      return next(err);
    }

    const { decisionNote } = req.body;
    if (!decisionNote || !decisionNote.trim()) {
      const err = new Error('A decisionNote is required when rejecting a pass');
      err.statusCode = 400;
      return next(err);
    }

    pass.status = 'rejected';
    pass.decidedBy = req.user._id;
    pass.decidedAt = new Date();
    pass.decisionNote = decisionNote.trim();
    await pass.save();

    await AuditLog.create({
      actor: req.user.email,
      action: 'PASS_REJECTED',
      details: {
        passId: pass._id,
        studentId: pass.student?.studentId,
        note: pass.decisionNote
      }
    });

    res.json({ message: 'Pass rejected', pass: formatPass(pass) });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// PUT /api/passes/:id/mark-out  (admin and warden)
// =============================================================================
const markOut = async (req, res, next) => {
  try {
    const pass = await Pass.findById(req.params.id).populate('student', '-phone -guardian');
    if (!pass) {
      const err = new Error('Pass not found');
      err.statusCode = 404;
      return next(err);
    }

    if (pass.status !== 'approved') {
      const err = new Error(`Cannot mark-out a pass with status '${pass.status}'. Pass must be approved first.`);
      err.statusCode = 409;
      return next(err);
    }

    pass.status = 'out';
    await pass.save();

    await AuditLog.create({
      actor: req.user.email,
      action: 'PASS_MARKED_OUT',
      details: { passId: pass._id, studentId: pass.student?.studentId }
    });

    res.json({ message: 'Student marked as out', pass: formatPass(pass) });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// PUT /api/passes/:id/mark-returned  (admin and warden)
// =============================================================================
const markReturned = async (req, res, next) => {
  try {
    const pass = await Pass.findById(req.params.id).populate('student', '-phone -guardian');
    if (!pass) {
      const err = new Error('Pass not found');
      err.statusCode = 404;
      return next(err);
    }

    if (pass.status !== 'out') {
      const err = new Error(`Cannot mark-returned a pass with status '${pass.status}'. Student must be marked as 'out' first.`);
      err.statusCode = 409;
      return next(err);
    }

    pass.actualReturnAt = new Date();
    pass.status = 'returned';
    await pass.save();

    await AuditLog.create({
      actor: req.user.email,
      action: 'PASS_MARKED_RETURNED',
      details: {
        passId: pass._id,
        studentId: pass.student?.studentId,
        actualReturnAt: pass.actualReturnAt
      }
    });

    res.json({ message: 'Student marked as returned', pass: formatPass(pass) });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET /api/passes/overdue  (admin and warden)
// =============================================================================
const getOverduePasses = async (req, res, next) => {
  try {
    const now = new Date();

    // Overdue = (status 'out') OR (status 'approved' and departureAt is in the past)
    // AND expectedReturnAt is in the past
    const passes = await Pass.find({
      $or: [
        { status: 'out', expectedReturnAt: { $lt: now } },
        { status: 'approved', departureAt: { $lt: now }, expectedReturnAt: { $lt: now } }
      ]
    })
      .populate('student', '-phone -guardian')
      .sort({ expectedReturnAt: 1 })
      .lean();

    // Attach hostel/room info + hours late
    const studentIds = [...new Set(passes.map(p => p.student?._id?.toString()).filter(Boolean))];
    const allocations = await Allocation.find({
      student: { $in: studentIds },
      status: 'active'
    })
      .populate({ path: 'room', populate: { path: 'hostel', select: 'name' } })
      .lean();

    const allocMap = new Map(allocations.map(a => [a.student.toString(), a]));

    const enriched = passes.map(p => {
      const sid = p.student?._id?.toString();
      const alloc = sid ? allocMap.get(sid) : null;
      const hoursLate = parseFloat(((now - new Date(p.expectedReturnAt)) / (1000 * 60 * 60)).toFixed(1));
      return {
        ...p,
        hostel: alloc?.room?.hostel?.name || null,
        roomNo: alloc?.room?.roomNo || null,
        hoursLate
      };
    });

    res.json({ items: enriched, total: enriched.length });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPass,
  getMyPasses,
  cancelPass,
  listPasses,
  approvePass,
  rejectPass,
  markOut,
  markReturned,
  getOverduePasses
};
