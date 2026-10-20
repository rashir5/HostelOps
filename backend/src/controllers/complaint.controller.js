const Complaint = require('../models/Complaint.model');
const Student = require('../models/Student.model');
const AuditLog = require('../models/AuditLog.model');

// Student raises complaint
const raiseComplaint = async (req, res, next) => {
  try {
    const { category, title, description, roomNumber } = req.body;

    let student = await Student.findOne({ userId: req.user._id });
    if (!student) student = await Student.findOne({ email: req.user.email });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }

    const complaint = await Complaint.create({
      studentId: student._id,
      category,
      title,
      description,
      roomNumber: roomNumber || student.allocatedRoom || '',
      status: 'Open',
    });

    res.status(201).json({
      success: true,
      message: 'Complaint reported successfully. Maintenance team notified.',
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

// Get my complaints (Student)
const getMyComplaints = async (req, res, next) => {
  try {
    let student = await Student.findOne({ userId: req.user._id });
    if (!student) student = await Student.findOne({ email: req.user.email });
    if (!student) return res.json({ success: true, data: [] });

    const complaints = await Complaint.find({ studentId: student._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: complaints });
  } catch (error) {
    next(error);
  }
};

// Get all complaints (Warden / Admin)
const getAllComplaints = async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const complaints = await Complaint.find(filter)
      .populate('studentId', 'name studentId phone branch')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: complaints.length, data: complaints });
  } catch (error) {
    next(error);
  }
};

// Update complaint status & resolution (Warden / Admin)
const updateComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, expectedResolution, resolutionRemarks } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (status) complaint.status = status;
    if (assignedTo) complaint.assignedTo = assignedTo;
    if (expectedResolution) complaint.expectedResolution = new Date(expectedResolution);
    if (resolutionRemarks) complaint.resolutionRemarks = resolutionRemarks;

    if (status === 'Resolved') {
      complaint.resolvedAt = new Date();
    }

    await complaint.save();

    await AuditLog.create({
      action: 'Complaint Updated',
      performedBy: req.user._id,
      performedByName: req.user.name,
      role: req.user.role,
      targetType: 'Complaint',
      targetId: complaint._id.toString(),
      details: `Complaint #${complaint._id.toString().slice(-6)} marked as ${complaint.status} by ${req.user.name}`,
    });

    res.json({
      success: true,
      message: 'Complaint updated successfully',
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  raiseComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaint,
};
