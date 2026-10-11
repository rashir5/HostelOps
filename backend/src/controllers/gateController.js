const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const GateEvent = require('../models/GateEvent');
const UsedToken = require('../models/UsedToken');
const Student = require('../models/Student');
const Allocation = require('../models/Allocation');
const Pass = require('../models/Pass');
const AuditLog = require('../models/AuditLog');

// Helper to resolve student doc from user
async function resolveStudentFromUser(user) {
  if (user.student) {
    return Student.findById(user.student).lean();
  }
  return Student.findOne({ email: user.email.toLowerCase().trim() }).lean();
}

// Helper to get active allocation and hostel/room
async function getStudentAllocation(studentId) {
  const alloc = await Allocation.findOne({ student: studentId, status: 'active' })
    .populate({ path: 'room', populate: { path: 'hostel', select: 'name' } })
    .lean();
  return {
    hostel: alloc?.room?.hostel?.name || '—',
    room: alloc?.room?.roomNo || '—',
    bed: alloc?.bedNo || '—'
  };
}

// Helper to get student's current movement state ('in' | 'out')
async function getStudentCurrentState(studentId) {
  const lastEvent = await GateEvent.findOne({ student: studentId })
    .sort({ at: -1, _id: -1 })
    .lean();
  if (!lastEvent) return 'in';
  return lastEvent.type === 'exit' ? 'out' : 'in';
}

// ─── 1. POST /api/gate/quick-pass (Student only) ──────────────────────────────
const createQuickPass = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation error');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { type } = req.body;
    const now = new Date();

    // 1. Check time window in Asia/Kolkata timezone: 05:00 to 22:00 IST
    const istParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).formatToParts(now).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});

    let istHour = parseInt(istParts.hour, 10);

    // Support mock IST hour for deterministic testing in dev/test
    if (process.env.NODE_ENV !== 'production' && req.headers['x-mock-ist-hour'] !== undefined) {
      istHour = parseInt(req.headers['x-mock-ist-hour'], 10);
    }

    if (istHour < 5 || istHour >= 22) {
      const err = new Error('Quick pass generation is allowed only between 05:00 and 22:00 IST');
      err.statusCode = 400;
      return next(err);
    }

    // 2. Student must have an active allocation
    const student = await resolveStudentFromUser(req.user);
    if (!student) {
      const err = new Error('No student record linked to this account');
      err.statusCode = 404;
      return next(err);
    }

    const hasAlloc = await Allocation.exists({ student: student._id, status: 'active' });
    if (!hasAlloc) {
      const err = new Error('You must have an active bed allocation to generate a quick pass');
      err.statusCode = 403;
      return next(err);
    }

    // 3. Expiry: 10 minutes or 22:00 IST today, whichever comes first
    const ist2200Today = new Date(`${istParts.year}-${istParts.month}-${istParts.day}T22:00:00+05:30`);
    const tenMinFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    const expiresAt = tenMinFromNow < ist2200Today ? tenMinFromNow : ist2200Today;

    const secondsLeft = Math.max(1, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
    const jti = crypto.randomUUID();

    // Sign JWT containing ONLY student's id and the type
    const token = jwt.sign(
      {
        studentId: student._id.toString(),
        type
      },
      process.env.JWT_SECRET,
      {
        audience: 'quick-pass',
        expiresIn: secondsLeft,
        jwtid: jti
      }
    );

    await AuditLog.create({
      actor: req.user.email,
      action: 'QUICK_PASS_CREATED',
      details: {
        studentId: student.studentId,
        type,
        expiresAt
      }
    });

    res.json({
      token,
      expiresAt: expiresAt.toISOString(),
      type
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. POST /api/gate/scan (Guard, Admin, Warden) ─────────────────────────────
const scanQuickPass = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation error');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { token, gate } = req.body;

    // 1. Verify token signature, audience, and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { audience: 'quick-pass' });
    } catch (jwtErr) {
      const isExpired = jwtErr.name === 'TokenExpiredError';
      const reason = isExpired ? 'Token expired' : 'Tampered or invalid token';

      await AuditLog.create({
        actor: req.user.email,
        action: 'GATE_SCAN_FAILED',
        details: { reason, gate }
      });

      const err = new Error(reason);
      err.statusCode = isExpired ? 400 : 401;
      return next(err);
    }

    const { studentId, type, jti, exp } = decoded;

    // 2. Check token reuse via UsedToken collection with TTL
    const isUsed = await UsedToken.findOne({ jti });
    if (isUsed) {
      await AuditLog.create({
        actor: req.user.email,
        action: 'GATE_SCAN_FAILED',
        details: { reason: 'Token already used', gate }
      });

      const err = new Error('Quick pass token has already been scanned and used');
      err.statusCode = 409;
      return next(err);
    }

    // Mark token as used immediately
    await UsedToken.create({
      jti,
      expiresAt: new Date(exp * 1000)
    });

    // 3. Resolve student
    const student = await Student.findById(studentId).lean();
    if (!student) {
      const err = new Error('Student not found');
      err.statusCode = 404;
      return next(err);
    }

    // 4. Enforce state rules (cannot exit if currently out, cannot enter if currently in)
    const currentState = await getStudentCurrentState(student._id);
    if (type === 'exit' && currentState === 'out') {
      await AuditLog.create({
        actor: req.user.email,
        action: 'GATE_SCAN_FAILED',
        details: { reason: 'Student already out', studentId: student.studentId, gate }
      });
      const err = new Error(`Student ${student.name} is currently checked OUT and cannot exit again`);
      err.statusCode = 409;
      return next(err);
    }

    if (type === 'entry' && currentState === 'in') {
      await AuditLog.create({
        actor: req.user.email,
        action: 'GATE_SCAN_FAILED',
        details: { reason: 'Student already in', studentId: student.studentId, gate }
      });
      const err = new Error(`Student ${student.name} is currently checked IN and cannot enter again`);
      err.statusCode = 409;
      return next(err);
    }

    // 5. Long pass integration
    let attachedPass = null;
    const now = new Date();

    if (type === 'exit') {
      // Look for approved pass whose departure window includes now
      const pass = await Pass.findOne({
        student: student._id,
        status: 'approved',
        departureAt: { $lte: new Date(now.getTime() + 12 * 60 * 60 * 1000) },
        expectedReturnAt: { $gte: now }
      });
      if (pass) {
        pass.status = 'out';
        await pass.save();
        attachedPass = pass;
        await AuditLog.create({
          actor: req.user.email,
          action: 'PASS_MARKED_OUT',
          details: { passId: pass._id, studentId: student.studentId, gate }
        });
      }
    } else if (type === 'entry') {
      // Look for active pass currently 'out'
      const pass = await Pass.findOne({
        student: student._id,
        status: 'out'
      });
      if (pass) {
        pass.status = 'returned';
        pass.actualReturnAt = now;
        await pass.save();
        attachedPass = pass;
        await AuditLog.create({
          actor: req.user.email,
          action: 'PASS_MARKED_RETURNED',
          details: { passId: pass._id, studentId: student.studentId, gate, actualReturnAt: now }
        });
      }
    }

    // 6. Record GateEvent
    const event = await GateEvent.create({
      student: student._id,
      type,
      gate,
      recordedBy: req.user._id,
      pass: attachedPass ? attachedPass._id : undefined,
      at: now
    });

    await AuditLog.create({
      actor: req.user.email,
      action: 'GATE_EVENT_RECORDED',
      details: {
        eventId: event._id,
        studentId: student.studentId,
        type,
        gate,
        mode: 'scan'
      }
    });

    const allocInfo = await getStudentAllocation(student._id);

    res.status(201).json({
      message: `${type === 'exit' ? 'Exit' : 'Entry'} recorded successfully`,
      result: 'allowed',
      student: {
        id: student._id,
        studentId: student.studentId,
        name: student.name,
        hostel: allocInfo.hostel,
        room: allocInfo.room
      },
      event: {
        id: event._id,
        type: event.type,
        gate: event.gate,
        at: event.at,
        pass: attachedPass ? attachedPass._id : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3. POST /api/gate/manual (Guard, Admin, Warden) ───────────────────────────
const recordManualEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation error');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { studentId, type, gate, note } = req.body;

    // Resolve student by institutional studentId or ObjectId
    let student;
    if (mongoose.isValidObjectId(studentId)) {
      student = await Student.findById(studentId).lean();
    }
    if (!student) {
      student = await Student.findOne({ studentId: studentId.trim() }).lean();
    }
    if (!student) {
      const err = new Error(`Student with ID "${studentId}" not found`);
      err.statusCode = 404;
      return next(err);
    }

    // Enforce state rules
    const currentState = await getStudentCurrentState(student._id);
    if (type === 'exit' && currentState === 'out') {
      const err = new Error(`Student ${student.name} is currently checked OUT and cannot exit again`);
      err.statusCode = 409;
      return next(err);
    }

    if (type === 'entry' && currentState === 'in') {
      const err = new Error(`Student ${student.name} is currently checked IN and cannot enter again`);
      err.statusCode = 409;
      return next(err);
    }

    // Long pass update
    let attachedPass = null;
    const now = new Date();

    if (type === 'exit') {
      const pass = await Pass.findOne({
        student: student._id,
        status: 'approved',
        departureAt: { $lte: new Date(now.getTime() + 12 * 60 * 60 * 1000) },
        expectedReturnAt: { $gte: now }
      });
      if (pass) {
        pass.status = 'out';
        await pass.save();
        attachedPass = pass;
        await AuditLog.create({
          actor: req.user.email,
          action: 'PASS_MARKED_OUT',
          details: { passId: pass._id, studentId: student.studentId, gate, mode: 'manual' }
        });
      }
    } else if (type === 'entry') {
      const pass = await Pass.findOne({
        student: student._id,
        status: 'out'
      });
      if (pass) {
        pass.status = 'returned';
        pass.actualReturnAt = now;
        await pass.save();
        attachedPass = pass;
        await AuditLog.create({
          actor: req.user.email,
          action: 'PASS_MARKED_RETURNED',
          details: { passId: pass._id, studentId: student.studentId, gate, actualReturnAt: now, mode: 'manual' }
        });
      }
    }

    const event = await GateEvent.create({
      student: student._id,
      type,
      gate,
      recordedBy: req.user._id,
      pass: attachedPass ? attachedPass._id : undefined,
      note: note ? note.trim() : undefined,
      at: now
    });

    await AuditLog.create({
      actor: req.user.email,
      action: 'GATE_EVENT_RECORDED',
      details: {
        eventId: event._id,
        studentId: student.studentId,
        type,
        gate,
        mode: 'manual',
        note: event.note
      }
    });

    const allocInfo = await getStudentAllocation(student._id);

    res.status(201).json({
      message: `Manual ${type === 'exit' ? 'exit' : 'entry'} recorded successfully`,
      result: 'allowed',
      student: {
        id: student._id,
        studentId: student.studentId,
        name: student.name,
        hostel: allocInfo.hostel,
        room: allocInfo.room
      },
      event: {
        id: event._id,
        type: event.type,
        gate: event.gate,
        at: event.at,
        pass: attachedPass ? attachedPass._id : null,
        note: event.note
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── 4. GET /api/gate/events (Guard, Admin, Warden) ───────────────────────────
const getGateEvents = async (req, res, next) => {
  try {
    const { date, studentId, type, gate } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (type && type !== 'all') filter.type = type;
    if (gate && gate !== 'all') filter.gate = gate;

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      filter.at = { $gte: startOfDay, $lte: endOfDay };
    }

    if (studentId) {
      let sDoc;
      if (mongoose.isValidObjectId(studentId)) {
        sDoc = await Student.findById(studentId).select('_id').lean();
      }
      if (!sDoc) {
        sDoc = await Student.findOne({ studentId: studentId.trim() }).select('_id').lean();
      }
      if (sDoc) {
        filter.student = sDoc._id;
      } else {
        return res.json({ items: [], total: 0, page, limit });
      }
    }

    const total = await GateEvent.countDocuments(filter);
    const events = await GateEvent.find(filter)
      .populate('student', '-phone -guardian -email')
      .populate('recordedBy', 'name role')
      .populate('pass', 'reason destination status departureAt expectedReturnAt')
      .sort({ at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Attach hostel & room info
    const studentIds = [...new Set(events.map(e => e.student?._id?.toString()).filter(Boolean))];
    const allocations = await Allocation.find({
      student: { $in: studentIds },
      status: 'active'
    })
      .populate({ path: 'room', populate: { path: 'hostel', select: 'name' } })
      .lean();

    const allocMap = new Map(allocations.map(a => [a.student.toString(), a]));

    const enriched = events.map(e => {
      const sid = e.student?._id?.toString();
      const a = sid ? allocMap.get(sid) : null;
      return {
        ...e,
        hostel: a?.room?.hostel?.name || '—',
        room: a?.room?.roomNo || '—'
      };
    });

    res.json({
      items: enriched,
      total,
      page,
      limit
    });
  } catch (error) {
    next(error);
  }
};

// ─── 5. GET /api/gate/currently-out (Admin, Warden only) ───────────────────────
const getCurrentlyOut = async (req, res, next) => {
  try {
    // Find students whose most recent event is 'exit'
    const latestEvents = await GateEvent.aggregate([
      { $sort: { at: -1, _id: -1 } },
      {
        $group: {
          _id: '$student',
          latestEvent: { $first: '$$ROOT' }
        }
      },
      {
        $match: {
          'latestEvent.type': 'exit'
        }
      }
    ]);

    const studentIds = latestEvents.map(e => e._id);
    const students = await Student.find({ _id: { $in: studentIds } })
      .select('studentId name course studyYear')
      .lean();
    const studentMap = new Map(students.map(s => [s._id.toString(), s]));

    const allocations = await Allocation.find({
      student: { $in: studentIds },
      status: 'active'
    })
      .populate({ path: 'room', populate: { path: 'hostel', select: 'name' } })
      .lean();
    const allocMap = new Map(allocations.map(a => [a.student.toString(), a]));

    const passes = await Pass.find({
      student: { $in: studentIds },
      status: { $in: ['approved', 'out'] }
    }).lean();
    const passMap = new Map(passes.map(p => [p.student.toString(), p]));

    const items = latestEvents.map(entry => {
      const sid = entry._id.toString();
      const s = studentMap.get(sid);
      const a = allocMap.get(sid);
      const p = passMap.get(sid);
      return {
        student: {
          id: sid,
          name: s?.name || 'Unknown',
          studentId: s?.studentId || '—',
          course: s?.course,
          studyYear: s?.studyYear
        },
        hostel: a?.room?.hostel?.name || '—',
        room: a?.room?.roomNo || '—',
        leftAt: entry.latestEvent.at,
        gate: entry.latestEvent.gate,
        eventId: entry.latestEvent._id,
        pass: p ? {
          id: p._id,
          status: p.status,
          reason: p.reason,
          destination: p.destination,
          departureAt: p.departureAt,
          expectedReturnAt: p.expectedReturnAt
        } : null,
        hasApprovedPass: !!p
      };
    }).sort((a, b) => new Date(b.leftAt) - new Date(a.leftAt));

    res.json({
      items,
      total: items.length
    });
  } catch (error) {
    next(error);
  }
};

// ─── 6. GET /api/gate/student-lookup?q= (Guard, Admin, Warden) ────────────────
const studentLookup = async (req, res, next) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    if (!q) {
      return res.json({ items: [] });
    }

    const regex = new RegExp(q, 'i');
    const students = await Student.find({
      $or: [{ name: regex }, { studentId: regex }]
    })
      .select('name studentId')
      .limit(10)
      .lean();

    const studentIds = students.map(s => s._id);

    // Allocations
    const allocations = await Allocation.find({
      student: { $in: studentIds },
      status: 'active'
    })
      .populate({ path: 'room', populate: { path: 'hostel', select: 'name' } })
      .lean();
    const allocMap = new Map(allocations.map(a => [a.student.toString(), a]));

    // Current movement states
    const items = await Promise.all(
      students.map(async s => {
        const sid = s._id.toString();
        const a = allocMap.get(sid);
        const currentState = await getStudentCurrentState(s._id);
        return {
          id: s._id,
          studentId: s.studentId,
          name: s.name,
          hostel: a?.room?.hostel?.name || '—',
          room: a?.room?.roomNo || '—',
          currentState // 'in' | 'out'
        };
      })
    );

    res.json({ items });
  } catch (error) {
    next(error);
  }
};

// ─── 7. GET /api/gate/mine (Student only) ──────────────────────────────────────
const getMyGateEvents = async (req, res, next) => {
  try {
    const student = await resolveStudentFromUser(req.user);
    if (!student) {
      const err = new Error('No student record linked to this user');
      err.statusCode = 404;
      return next(err);
    }

    const events = await GateEvent.find({ student: student._id })
      .sort({ at: -1 })
      .limit(50)
      .lean();

    const currentState = await getStudentCurrentState(student._id);

    res.json({
      items: events,
      currentState,
      currentStatus: currentState,
      lastEvent: events[0] || null,
      total: events.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuickPass,
  scanQuickPass,
  recordManualEvent,
  getGateEvents,
  getCurrentlyOut,
  studentLookup,
  getMyGateEvents
};
