const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Student = require('../models/Student');
const Allocation = require('../models/Allocation');
const Room = require('../models/Room');
const Hostel = require('../models/Hostel');
const AuditLog = require('../models/AuditLog');

// Helper to resolve student from req.user
async function resolveStudentFromUser(user) {
  if (user.student) {
    return Student.findById(user.student).lean();
  }
  return Student.findOne({ email: user.email.toLowerCase().trim() }).lean();
}

// Helper to sanitize student fields from output
function formatComplaint(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (obj.student && typeof obj.student === 'object') {
    delete obj.student.phone;
    delete obj.student.guardian;
  }
  return obj;
}

// Generate unique sequential Complaint ID like 'CMP-0001'
async function generateComplaintId() {
  const lastComplaint = await Complaint.findOne()
    .sort({ createdAt: -1, _id: -1 })
    .select('complaintId')
    .lean();

  let nextSeq = 1;
  if (lastComplaint && lastComplaint.complaintId) {
    const match = lastComplaint.complaintId.match(/CMP-(\d+)/);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }

  let candidateId = `CMP-${String(nextSeq).padStart(4, '0')}`;
  // Ensure uniqueness in case of race/deletion
  while (await Complaint.exists({ complaintId: candidateId })) {
    nextSeq += 1;
    candidateId = `CMP-${String(nextSeq).padStart(4, '0')}`;
  }
  return candidateId;
}

// Allowed status transition map
const ALLOWED_STATUS_TRANSITIONS = {
  open: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed', 'reopened'],
  closed: [],
  reopened: ['in_progress', 'resolved']
};

// ─── POST /api/complaints (student only) ──────────────────────────────────────
const createComplaint = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation error');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const student = await resolveStudentFromUser(req.user);
    if (!student) {
      const err = new Error('No student record linked to this user account');
      err.statusCode = 404;
      return next(err);
    }

    // Must have active allocation
    const alloc = await Allocation.findOne({ student: student._id, status: 'active' })
      .populate({ path: 'room', populate: { path: 'hostel', select: 'name' } })
      .lean();

    if (!alloc || !alloc.room || !alloc.room.hostel) {
      const err = new Error('You must have an active bed allocation to file a complaint');
      err.statusCode = 403;
      return next(err);
    }

    // Max 5 open/active complaints per student
    const activeComplaintsCount = await Complaint.countDocuments({
      student: student._id,
      status: { $in: ['open', 'in_progress', 'reopened'] }
    });

    if (activeComplaintsCount >= 5) {
      const err = new Error('Maximum limit of 5 open complaints reached. Please wait for existing complaints to be resolved.');
      err.statusCode = 400;
      return next(err);
    }

    const { category, description, priority } = req.body;
    const complaintId = await generateComplaintId();

    const complaint = await Complaint.create({
      complaintId,
      student: student._id,
      category,
      description: description.trim(),
      priority: priority || 'normal',
      status: 'open',
      hostel: alloc.room.hostel.name,
      room: alloc.room.roomNo,
      comments: []
    });

    await AuditLog.create({
      actor: req.user.email,
      action: 'COMPLAINT_CREATED',
      details: {
        complaintId: complaint.complaintId,
        studentId: student.studentId,
        category: complaint.category,
        priority: complaint.priority,
        hostel: complaint.hostel,
        room: complaint.room
      }
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('student', '-phone -guardian')
      .populate('comments.author', 'name email role')
      .lean();

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint: formatComplaint(populated)
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/complaints/mine (student only) ──────────────────────────────────
const getMyComplaints = async (req, res, next) => {
  try {
    const student = await resolveStudentFromUser(req.user);
    if (!student) {
      const err = new Error('No student record linked to this user account');
      err.statusCode = 404;
      return next(err);
    }

    const complaints = await Complaint.find({ student: student._id })
      .populate('student', '-phone -guardian')
      .populate('assignedTo', 'name email role')
      .populate('comments.author', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = complaints.map(formatComplaint);

    res.json({
      items: formatted,
      total: formatted.length
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/complaints/mine/:id (student only) ──────────────────────────────
const getMyComplaintById = async (req, res, next) => {
  try {
    const student = await resolveStudentFromUser(req.user);
    if (!student) {
      const err = new Error('No student record linked to this user account');
      err.statusCode = 404;
      return next(err);
    }

    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { complaintId: id };
    const complaint = await Complaint.findOne(query)
      .populate('student', '-phone -guardian')
      .populate('assignedTo', 'name email role')
      .populate('comments.author', 'name email role')
      .lean();

    if (!complaint) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      return next(err);
    }

    // Must be own complaint
    if (complaint.student._id.toString() !== student._id.toString()) {
      const err = new Error('You are not authorized to view this complaint');
      err.statusCode = 403;
      return next(err);
    }

    res.json(formatComplaint(complaint));
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/complaints/:id/comments ────────────────────────────────────────
const addComment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation error');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { id } = req.params;
    const { text } = req.body;

    const query = mongoose.isValidObjectId(id) ? { _id: id } : { complaintId: id };
    const complaint = await Complaint.findOne(query);

    if (!complaint) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      return next(err);
    }

    // Student can only comment on their own complaint
    if (req.user.role === 'student') {
      const student = await resolveStudentFromUser(req.user);
      if (!student || complaint.student.toString() !== student._id.toString()) {
        const err = new Error('You are not authorized to comment on this complaint');
        err.statusCode = 403;
        return next(err);
      }
    }

    const newComment = {
      author: req.user._id,
      role: req.user.role,
      text: text.trim(),
      createdAt: new Date()
    };

    complaint.comments.push(newComment);
    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate('student', '-phone -guardian')
      .populate('assignedTo', 'name email role')
      .populate('comments.author', 'name email role')
      .lean();

    res.status(201).json({
      message: 'Comment added successfully',
      complaint: formatComplaint(populated)
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/complaints/:id/reopen (student only, only from resolved) ────────
const reopenComplaint = async (req, res, next) => {
  try {
    const student = await resolveStudentFromUser(req.user);
    if (!student) {
      const err = new Error('No student record linked to this user account');
      err.statusCode = 404;
      return next(err);
    }

    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { complaintId: id };
    const complaint = await Complaint.findOne(query);

    if (!complaint) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      return next(err);
    }

    // Must be own complaint
    if (complaint.student.toString() !== student._id.toString()) {
      const err = new Error('You are not authorized to reopen this complaint');
      err.statusCode = 403;
      return next(err);
    }

    // Only from 'resolved'
    if (complaint.status !== 'resolved') {
      const err = new Error(`Cannot reopen complaint with status '${complaint.status}'. Only resolved complaints can be reopened.`);
      err.statusCode = 409;
      return next(err);
    }

    complaint.status = 'reopened';
    if (req.body.text && req.body.text.trim()) {
      complaint.comments.push({
        author: req.user._id,
        role: req.user.role,
        text: req.body.text.trim(),
        createdAt: new Date()
      });
    }

    await complaint.save();

    await AuditLog.create({
      actor: req.user.email,
      action: 'COMPLAINT_REOPENED',
      details: {
        complaintId: complaint.complaintId,
        studentId: student.studentId
      }
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('student', '-phone -guardian')
      .populate('assignedTo', 'name email role')
      .populate('comments.author', 'name email role')
      .lean();

    res.json({
      message: 'Complaint reopened successfully',
      complaint: formatComplaint(populated)
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/complaints (admin and warden) ───────────────────────────────────
const listComplaints = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Invalid query parameters');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { status, category, priority, hostel } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (hostel) filter.hostel = new RegExp(`^${hostel.trim()}$`, 'i');

    // Warden scoping if warden has hostel assigned
    if (req.user.role === 'warden' && req.user.hostel) {
      const hostelDoc = await Hostel.findById(req.user.hostel).select('name').lean();
      if (hostelDoc) {
        filter.hostel = hostelDoc.name;
      }
    }

    const total = await Complaint.countDocuments(filter);
    const complaints = await Complaint.find(filter)
      .populate('student', '-phone -guardian')
      .populate('assignedTo', 'name email role')
      .populate('comments.author', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      items: complaints.map(formatComplaint),
      page,
      limit,
      total
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/complaints/summary (admin and warden) ───────────────────────────
const getComplaintsSummary = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'warden' && req.user.hostel) {
      const hostelDoc = await Hostel.findById(req.user.hostel).select('name').lean();
      if (hostelDoc) {
        filter.hostel = hostelDoc.name;
      }
    }

    const [open, in_progress, resolved, closed, reopened, urgent] = await Promise.all([
      Complaint.countDocuments({ ...filter, status: 'open' }),
      Complaint.countDocuments({ ...filter, status: 'in_progress' }),
      Complaint.countDocuments({ ...filter, status: 'resolved' }),
      Complaint.countDocuments({ ...filter, status: 'closed' }),
      Complaint.countDocuments({ ...filter, status: 'reopened' }),
      Complaint.countDocuments({ ...filter, priority: 'urgent', status: { $in: ['open', 'in_progress', 'reopened'] } })
    ]);

    const total = open + in_progress + resolved + closed + reopened;

    res.json({
      open,
      in_progress,
      resolved,
      closed,
      reopened,
      total,
      urgent
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/complaints/:id (admin and warden) ───────────────────────────────
const getComplaintById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { complaintId: id };
    const complaint = await Complaint.findOne(query)
      .populate('student', '-phone -guardian')
      .populate('assignedTo', 'name email role')
      .populate('comments.author', 'name email role')
      .lean();

    if (!complaint) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json(formatComplaint(complaint));
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/complaints/:id/status (admin and warden) ─────────────────────────
const updateComplaintStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation error');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { id } = req.params;
    const { status: newStatus, note } = req.body;

    const query = mongoose.isValidObjectId(id) ? { _id: id } : { complaintId: id };
    const complaint = await Complaint.findOne(query);

    if (!complaint) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      return next(err);
    }

    const currentStatus = complaint.status;
    const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedNextStatuses.includes(newStatus)) {
      const err = new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedNextStatuses.join(', ') || 'none'}.`);
      err.statusCode = 409;
      return next(err);
    }

    complaint.status = newStatus;
    if (newStatus === 'resolved') {
      complaint.resolvedAt = new Date();
    }

    if (note && note.trim()) {
      complaint.comments.push({
        author: req.user._id,
        role: req.user.role,
        text: note.trim(),
        createdAt: new Date()
      });
    }

    await complaint.save();

    await AuditLog.create({
      actor: req.user.email,
      action: 'COMPLAINT_STATUS_CHANGED',
      details: {
        complaintId: complaint.complaintId,
        from: currentStatus,
        to: newStatus,
        note: note || undefined
      }
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('student', '-phone -guardian')
      .populate('assignedTo', 'name email role')
      .populate('comments.author', 'name email role')
      .lean();

    res.json({
      message: `Complaint status updated to ${newStatus}`,
      complaint: formatComplaint(populated)
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/complaints/:id/priority (admin and warden) ───────────────────────
const updateComplaintPriority = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation error');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { id } = req.params;
    const { priority: newPriority } = req.body;

    const query = mongoose.isValidObjectId(id) ? { _id: id } : { complaintId: id };
    const complaint = await Complaint.findOne(query);

    if (!complaint) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      return next(err);
    }

    const oldPriority = complaint.priority;
    complaint.priority = newPriority;
    await complaint.save();

    await AuditLog.create({
      actor: req.user.email,
      action: 'COMPLAINT_PRIORITY_CHANGED',
      details: {
        complaintId: complaint.complaintId,
        oldPriority,
        newPriority
      }
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('student', '-phone -guardian')
      .populate('assignedTo', 'name email role')
      .populate('comments.author', 'name email role')
      .lean();

    res.json({
      message: `Complaint priority updated to ${newPriority}`,
      complaint: formatComplaint(populated)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getMyComplaintById,
  addComment,
  reopenComplaint,
  listComplaints,
  getComplaintsSummary,
  getComplaintById,
  updateComplaintStatus,
  updateComplaintPriority
};
