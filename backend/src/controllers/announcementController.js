const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Student = require('../models/Student');
const Allocation = require('../models/Allocation');
const AuditLog = require('../models/AuditLog');

// Strip HTML tags and return plain text
function stripHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
}

// Remove sensitive fields (email, phone, guardian, passwordHash)
function formatAnnouncement(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (obj.createdBy && typeof obj.createdBy === 'object') {
    delete obj.createdBy.email;
    delete obj.createdBy.phone;
    delete obj.createdBy.guardian;
    delete obj.createdBy.passwordHash;
  }
  return obj;
}

// Helper to resolve student from user
async function resolveStudentFromUser(user) {
  if (!user) return null;
  if (user.student) {
    return Student.findById(user.student).lean();
  }
  if (user.email) {
    return Student.findOne({ email: user.email.toLowerCase().trim() }).lean();
  }
  return null;
}

// ─── 1. POST /api/announcements (Admin & Warden) ──────────────────────────────
const createAnnouncement = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation error');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { title, body, audience, hostel, pinned, publishAt, expiresAt } = req.body;

    const cleanTitle = stripHtml(title);
    const cleanBody = stripHtml(body);

    if (!cleanTitle) {
      const err = new Error('Title is required and must not be empty');
      err.statusCode = 400;
      return next(err);
    }
    if (cleanTitle.length > 120) {
      const err = new Error('Title must not exceed 120 characters');
      err.statusCode = 400;
      return next(err);
    }
    if (!cleanBody) {
      const err = new Error('Body is required and must not be empty');
      err.statusCode = 400;
      return next(err);
    }
    if (cleanBody.length > 2000) {
      const err = new Error('Body must not exceed 2000 characters');
      err.statusCode = 400;
      return next(err);
    }

    const publishDate = publishAt ? new Date(publishAt) : new Date();
    if (isNaN(publishDate.getTime())) {
      const err = new Error('Invalid publishAt date');
      err.statusCode = 400;
      return next(err);
    }

    let expiresDate = null;
    if (expiresAt) {
      expiresDate = new Date(expiresAt);
      if (isNaN(expiresDate.getTime())) {
        const err = new Error('Invalid expiresAt date');
        err.statusCode = 400;
        return next(err);
      }
      if (expiresDate <= publishDate) {
        const err = new Error('Expiration date must be after publish date');
        err.statusCode = 400;
        return next(err);
      }
    }

    const announcement = await Announcement.create({
      title: cleanTitle,
      body: cleanBody,
      audience: audience || 'all',
      hostel: hostel ? hostel.trim() : null,
      pinned: Boolean(pinned),
      createdBy: req.user._id,
      publishAt: publishDate,
      expiresAt: expiresDate
    });

    await AuditLog.create({
      actor: req.user.email,
      action: 'ANNOUNCEMENT_CREATED',
      details: {
        announcementId: announcement._id,
        title: announcement.title,
        audience: announcement.audience,
        hostel: announcement.hostel
      }
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('createdBy', 'name role')
      .lean();

    res.status(201).json({
      message: 'Announcement created successfully',
      announcement: formatAnnouncement(populated),
      ...formatAnnouncement(populated)
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. PUT /api/announcements/:id (Admin or Creator Warden) ───────────────────
const updateAnnouncement = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation error');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      const err = new Error('Invalid announcement ID');
      err.statusCode = 404;
      return next(err);
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      const err = new Error('Announcement not found');
      err.statusCode = 404;
      return next(err);
    }

    // Role check: Admin can edit any, Warden can only edit their own
    if (req.user.role === 'warden' && announcement.createdBy.toString() !== req.user._id.toString()) {
      const err = new Error('Forbidden: You can only edit announcements you created');
      err.statusCode = 403;
      return next(err);
    }

    const { title, body, audience, hostel, pinned, publishAt, expiresAt } = req.body;

    if (title !== undefined) {
      const cleanTitle = stripHtml(title);
      if (!cleanTitle) {
        const err = new Error('Title cannot be empty');
        err.statusCode = 400;
        return next(err);
      }
      if (cleanTitle.length > 120) {
        const err = new Error('Title must not exceed 120 characters');
        err.statusCode = 400;
        return next(err);
      }
      announcement.title = cleanTitle;
    }

    if (body !== undefined) {
      const cleanBody = stripHtml(body);
      if (!cleanBody) {
        const err = new Error('Body cannot be empty');
        err.statusCode = 400;
        return next(err);
      }
      if (cleanBody.length > 2000) {
        const err = new Error('Body must not exceed 2000 characters');
        err.statusCode = 400;
        return next(err);
      }
      announcement.body = cleanBody;
    }

    if (audience !== undefined) {
      announcement.audience = audience;
    }

    if (hostel !== undefined) {
      announcement.hostel = hostel ? hostel.trim() : null;
    }

    if (pinned !== undefined) {
      announcement.pinned = Boolean(pinned);
    }

    if (publishAt !== undefined) {
      const pubDate = new Date(publishAt);
      if (isNaN(pubDate.getTime())) {
        const err = new Error('Invalid publishAt date');
        err.statusCode = 400;
        return next(err);
      }
      announcement.publishAt = pubDate;
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null || expiresAt === '') {
        announcement.expiresAt = null;
      } else {
        const expDate = new Date(expiresAt);
        if (isNaN(expDate.getTime())) {
          const err = new Error('Invalid expiresAt date');
          err.statusCode = 400;
          return next(err);
        }
        if (expDate <= announcement.publishAt) {
          const err = new Error('Expiration date must be after publish date');
          err.statusCode = 400;
          return next(err);
        }
        announcement.expiresAt = expDate;
      }
    }

    await announcement.save();

    await AuditLog.create({
      actor: req.user.email,
      action: 'ANNOUNCEMENT_UPDATED',
      details: {
        announcementId: announcement._id,
        title: announcement.title,
        audience: announcement.audience,
        hostel: announcement.hostel
      }
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('createdBy', 'name role')
      .lean();

    res.status(200).json({
      message: 'Announcement updated successfully',
      announcement: formatAnnouncement(populated),
      ...formatAnnouncement(populated)
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3. DELETE /api/announcements/:id (Admin or Creator Warden) ────────────────
const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      const err = new Error('Invalid announcement ID');
      err.statusCode = 404;
      return next(err);
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      const err = new Error('Announcement not found');
      err.statusCode = 404;
      return next(err);
    }

    // Role check: Admin can delete any, Warden can only delete their own
    if (req.user.role === 'warden' && announcement.createdBy.toString() !== req.user._id.toString()) {
      const err = new Error('Forbidden: You can only delete announcements you created');
      err.statusCode = 403;
      return next(err);
    }

    await Announcement.findByIdAndDelete(id);

    await AuditLog.create({
      actor: req.user.email,
      action: 'ANNOUNCEMENT_DELETED',
      details: {
        announcementId: announcement._id,
        title: announcement.title
      }
    });

    res.status(200).json({
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ─── 4. GET /api/announcements/manage (Admin & Warden) ─────────────────────────
const getAnnouncementsManage = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const total = await Announcement.countDocuments({});
    const items = await Announcement.find({})
      .populate('createdBy', 'name role')
      .sort({ pinned: -1, publishAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      items: items.map(formatAnnouncement),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    });
  } catch (error) {
    next(error);
  }
};

// ─── 5. GET /api/announcements (Any logged-in user) ────────────────────────────
const getAnnouncements = async (req, res, next) => {
  try {
    const now = new Date();
    const queryConditions = [
      // 1. Must be published
      { publishAt: { $lte: now } },
      // 2. Must not be expired
      {
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: now } }
        ]
      }
    ];

    if (req.user.role === 'student') {
      // Students see audience 'all' and 'students'
      queryConditions.push({ audience: { $in: ['all', 'students'] } });

      // Check student's hostel
      const student = await resolveStudentFromUser(req.user);
      let studentHostel = null;
      if (student) {
        const alloc = await Allocation.findOne({ student: student._id, status: 'active' })
          .populate({ path: 'room', populate: { path: 'hostel', select: 'name' } })
          .lean();
        if (alloc?.room?.hostel?.name) {
          studentHostel = alloc.room.hostel.name;
        }
      }

      if (studentHostel) {
        // Can see announcements for all hostels OR for their specific hostel
        queryConditions.push({
          $or: [
            { hostel: { $exists: false } },
            { hostel: null },
            { hostel: '' },
            { hostel: studentHostel }
          ]
        });
      } else {
        // Unallocated students can only see campus-wide (no hostel restriction)
        queryConditions.push({
          $or: [
            { hostel: { $exists: false } },
            { hostel: null },
            { hostel: '' }
          ]
        });
      }
    } else {
      // Staff (admin, warden, guard, mentor) sees audience 'all' and 'staff'
      queryConditions.push({ audience: { $in: ['all', 'staff'] } });
    }

    const filter = { $and: queryConditions };
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const items = await Announcement.find(filter)
      .populate('createdBy', 'name role')
      .sort({ pinned: -1, publishAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      items: items.map(formatAnnouncement),
      total: items.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementsManage,
  getAnnouncements
};
