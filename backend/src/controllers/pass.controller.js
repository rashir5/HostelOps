const PassRequest = require('../models/PassRequest.model');
const GateEvent = require('../models/GateEvent.model');
const Student = require('../models/Student.model');
const AuditLog = require('../models/AuditLog.model');

// Student requests a pass
const requestPass = async (req, res, next) => {
  try {
    const { passType, requestedDeparture, expectedReturn, reason, destination } = req.body;

    // Find student associated with user
    let student = await Student.findOne({ userId: req.user._id });
    if (!student) {
      student = await Student.findOne({ email: req.user.email });
    }
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found for this account' });
    }

    const pass = await PassRequest.create({
      studentId: student._id,
      passType,
      requestedDeparture: new Date(requestedDeparture),
      expectedReturn: new Date(expectedReturn),
      reason,
      destination: destination || 'Mumbai',
      approvalStatus: 'Pending',
      currentStatus: 'Pending Approval',
    });

    res.status(201).json({
      success: true,
      message: 'Pass request submitted successfully. Awaiting warden approval.',
      data: pass,
    });
  } catch (error) {
    next(error);
  }
};

// Get my passes (Student)
const getMyPasses = async (req, res, next) => {
  try {
    let student = await Student.findOne({ userId: req.user._id });
    if (!student) student = await Student.findOne({ email: req.user.email });
    if (!student) return res.json({ success: true, data: [] });

    const passes = await PassRequest.find({ studentId: student._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: passes });
  } catch (error) {
    next(error);
  }
};

// Get all passes with filter (Warden / Admin)
const getAllPasses = async (req, res, next) => {
  try {
    const { status, type } = req.query;
    const filter = {};
    if (status) filter.approvalStatus = status;
    if (type) filter.passType = type;

    const passes = await PassRequest.find(filter)
      .populate({
        path: 'studentId',
        select: 'name studentId collegeRegistrationNumber branch academicYear allocatedRoom allocatedBed phone guardianName guardianPhone',
        populate: { path: 'allocatedRoom', select: 'roomNumber block' },
      })
      .populate('approvedBy', 'name role')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: passes.length, data: passes });
  } catch (error) {
    next(error);
  }
};

// Approve or Reject a Pass (Warden / Admin)
const reviewPass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // status: 'Approved' | 'Rejected'

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });
    }

    const pass = await PassRequest.findById(id);
    if (!pass) {
      return res.status(404).json({ success: false, message: 'Pass request not found' });
    }

    pass.approvalStatus = status;
    pass.currentStatus = status === 'Approved' ? 'Approved' : 'Rejected';
    pass.approvedBy = req.user._id;
    pass.actionDate = new Date();
    if (remarks) pass.remarks = remarks;

    await pass.save();

    await AuditLog.create({
      action: `Pass ${status}`,
      performedBy: req.user._id,
      performedByName: req.user.name,
      role: req.user.role,
      targetType: 'PassRequest',
      targetId: pass._id.toString(),
      details: `${req.user.name} (${req.user.role}) marked pass ${pass.qrCodeId} as ${status}`,
    });

    res.json({
      success: true,
      message: `Pass has been ${status.toLowerCase()}`,
      data: pass,
    });
  } catch (error) {
    next(error);
  }
};

// Record Gate Entry or Exit event (Warden / Gate)
const recordGateEvent = async (req, res, next) => {
  try {
    const { passId, eventType, notes } = req.body;

    const pass = await PassRequest.findById(passId).populate('studentId');
    if (!pass) {
      return res.status(404).json({ success: false, message: 'Valid pass not found' });
    }

    if (pass.approvalStatus !== 'Approved') {
      return res.status(400).json({ success: false, message: 'Cannot record gate movement for non-approved pass' });
    }

    const now = new Date();
    if (eventType === 'Exit') {
      pass.actualDeparture = now;
      pass.currentStatus = 'Out on Pass';
    } else if (eventType === 'Entry') {
      pass.actualReturn = now;
      const isOverdue = now > new Date(pass.expectedReturn);
      pass.currentStatus = isOverdue ? 'Overdue' : 'Returned';
    }
    await pass.save();

    const gateEvent = await GateEvent.create({
      studentId: pass.studentId._id,
      passId: pass._id,
      eventType,
      timestamp: now,
      recordedBy: req.user._id,
      recordedByName: req.user.name,
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      message: `Gate ${eventType} logged successfully`,
      data: { gateEvent, passStatus: pass.currentStatus },
    });
  } catch (error) {
    next(error);
  }
};

// Get students currently marked out or overdue
const getOutStudents = async (req, res, next) => {
  try {
    const outPasses = await PassRequest.find({
      currentStatus: { $in: ['Out on Pass', 'Overdue'] },
    }).populate('studentId', 'name studentId phone guardianPhone branch allocatedRoom');

    // Update any that have exceeded expectedReturn to 'Overdue'
    const now = new Date();
    for (const p of outPasses) {
      if (p.currentStatus === 'Out on Pass' && now > new Date(p.expectedReturn)) {
        p.currentStatus = 'Overdue';
        await p.save();
      }
    }

    res.json({ success: true, count: outPasses.length, data: outPasses });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestPass,
  getMyPasses,
  getAllPasses,
  reviewPass,
  recordGateEvent,
  getOutStudents,
};
