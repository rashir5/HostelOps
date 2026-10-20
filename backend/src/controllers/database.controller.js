const mongoose = require('mongoose');
const Student = require('../models/Student.model');
const User = require('../models/User.model');
const Room = require('../models/Room.model');
const PassRequest = require('../models/PassRequest.model');
const Complaint = require('../models/Complaint.model');
const InstitutionSetting = require('../models/InstitutionSetting.model');
const Announcement = require('../models/Announcement.model');
const AuditLog = require('../models/AuditLog.model');
const GateEvent = require('../models/GateEvent.model');
const MentorSession = require('../models/MentorSession.model');

// Map collection name strings to Mongoose models
const models = {
  students: Student,
  users: User,
  rooms: Room,
  passrequests: PassRequest,
  complaints: Complaint,
  institutionsettings: InstitutionSetting,
  announcements: Announcement,
  auditlogs: AuditLog,
  gateevents: GateEvent,
  mentorsessions: MentorSession,
};

// 1. Get database summary and document counts for all collections
const getDatabaseStats = async (req, res, next) => {
  try {
    const stats = {};
    for (const [name, model] of Object.entries(models)) {
      stats[name] = await model.countDocuments();
    }

    res.json({
      success: true,
      data: {
        databaseName: mongoose.connection.name || 'hostel_db',
        host: mongoose.connection.host || 'localhost',
        port: mongoose.connection.port || 27017,
        readyState: mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting',
        collections: stats,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 2. Get documents for a specific collection with search and pagination
const getCollectionDocuments = async (req, res, next) => {
  try {
    const { name } = req.params;
    const model = models[name.toLowerCase()];
    if (!model) {
      return res.status(404).json({ success: false, message: `Collection '${name}' not found` });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const search = (req.query.search || '').trim();

    const query = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      if (name === 'students') {
        query.$or = [{ name: regex }, { studentId: regex }, { email: regex }, { branch: regex }, { phone: regex }, { guardianPhone: regex }];
      } else if (name === 'users') {
        query.$or = [{ name: regex }, { email: regex }, { role: regex }];
      } else if (name === 'rooms') {
        query.$or = [{ roomNumber: regex }, { block: regex }];
      } else if (name === 'passrequests') {
        query.$or = [{ qrCodeId: regex }, { reason: regex }, { passType: regex }, { destination: regex }];
      } else if (name === 'complaints') {
        query.$or = [{ title: regex }, { category: regex }, { description: regex }];
      }
    }

    const total = await model.countDocuments(query);
    let docQuery = model.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit);
    if (name.toLowerCase() === 'users') {
      docQuery = docQuery.select('-password'); // Never serialize password hashes
    }

    const docs = await docQuery;

    res.json({
      success: true,
      collection: name,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: docs,
    });
  } catch (err) {
    next(err);
  }
};

// 3. Update a document (with strict security validation)
const updateDocument = async (req, res, next) => {
  try {
    const { name, id } = req.params;
    const model = models[name.toLowerCase()];
    if (!model) {
      return res.status(404).json({ success: false, message: `Collection '${name}' not found` });
    }

    // Security guard: Audit logs are immutable records
    if (name.toLowerCase() === 'auditlogs') {
      return res.status(403).json({ success: false, message: 'Security Policy: Audit Logs are tamper-evident records and cannot be edited.' });
    }

    // Sanitize user updates
    const updatePayload = { ...req.body };
    delete updatePayload.password; // Prevent modifying hashed passwords via raw explorer
    delete updatePayload.__v;

    const updated = await model.findByIdAndUpdate(id, { $set: updatePayload }, { new: true, runValidators: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    await AuditLog.create({
      action: 'Database Document Updated',
      performedBy: req.user._id,
      performedByName: req.user.name,
      role: req.user.role,
      targetType: name,
      targetId: id,
      details: `Admin updated document in collection '${name}'`,
    });

    res.json({ success: true, message: 'Document updated successfully', data: updated });
  } catch (err) {
    next(err);
  }
};

// 4. Delete a document (with safety guards)
const deleteDocument = async (req, res, next) => {
  try {
    const { name, id } = req.params;
    const model = models[name.toLowerCase()];
    if (!model) {
      return res.status(404).json({ success: false, message: `Collection '${name}' not found` });
    }

    // Security guard: Audit logs cannot be deleted
    if (name.toLowerCase() === 'auditlogs') {
      return res.status(403).json({ success: false, message: 'Security Policy: Audit Logs are permanently preserved and cannot be deleted.' });
    }

    // Safeguard root admin account
    if (name.toLowerCase() === 'users') {
      const user = await model.findById(id);
      if (user && (user.email === 'admin@spit.ac.in' || user.role === 'admin')) {
        const adminCount = await model.countDocuments({ role: 'admin' });
        if (adminCount <= 1 || user.email === 'admin@spit.ac.in') {
          return res.status(403).json({ success: false, message: 'Security Policy: Primary institutional administrator account cannot be deleted.' });
        }
      }
    }

    const deleted = await model.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    await AuditLog.create({
      action: 'Database Document Deleted',
      performedBy: req.user._id,
      performedByName: req.user.name,
      role: req.user.role,
      targetType: name,
      targetId: id,
      details: `Admin deleted document from collection '${name}'`,
    });

    res.json({ success: true, message: 'Document deleted successfully', id });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDatabaseStats,
  getCollectionDocuments,
  updateDocument,
  deleteDocument,
};
