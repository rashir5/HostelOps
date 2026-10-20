const Student = require('../models/Student.model');
const Room = require('../models/Room.model');
const PassRequest = require('../models/PassRequest.model');
const GateEvent = require('../models/GateEvent.model');
const Complaint = require('../models/Complaint.model');
const AuditLog = require('../models/AuditLog.model');

// Helper to escape CSV cell values
const escapeCsv = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

// Export CSV controller
const exportReport = async (req, res, next) => {
  try {
    const { type } = req.params; // 'students', 'rooms', 'beds', 'receipts', 'passes', 'gate', 'complaints'

    let csvData = '';
    let filename = `spit_hostel_${type}_${new Date().toISOString().slice(0, 10)}.csv`;

    switch (type) {
      case 'students': {
        const students = await Student.find().populate('assignedMentor', 'name email').sort({ name: 1 });
        const headers = ['Registration No', 'Name', 'Email', 'Phone', 'Course', 'Branch', 'Year', 'Academic Year', 'Guardian Name', 'Guardian Phone', 'Registration Status', 'Assigned Mentor', 'Allocated Room', 'Allocated Bed'];
        const rows = students.map((s) => [
          s.studentId,
          s.name,
          s.email,
          s.phone,
          s.course,
          s.branch,
          s.year,
          s.academicYear,
          s.guardianName || '',
          s.guardianPhone || '',
          s.registrationStatus,
          s.assignedMentor?.name || 'Unassigned',
          s.allocatedRoom || 'Pending',
          s.allocatedBed || 'Pending',
        ]);
        csvData = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
        break;
      }

      case 'rooms': {
        const rooms = await Room.find().sort({ block: 1, roomNumber: 1 });
        const headers = ['Room Number', 'Block', 'Floor', 'Capacity', 'Occupied Beds', 'Available Beds', 'Status', 'Room Type', 'Monthly Rent (INR)'];
        const rows = rooms.map((r) => [
          r.roomNumber,
          r.block,
          r.floor,
          r.capacity,
          r.occupiedBeds,
          Math.max(0, r.capacity - r.occupiedBeds),
          r.occupiedBeds === 0 ? 'Empty (Red)' : r.occupiedBeds >= r.capacity ? 'Full (Green)' : 'Partially Filled (Yellow)',
          r.roomType,
          r.monthlyRent,
        ]);
        csvData = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
        break;
      }

      case 'receipts': {
        const studentsWithReceipts = await Student.find({ 'feeReceipt.fileName': { $ne: null } })
          .populate('feeReceipt.verifiedBy', 'name role')
          .sort({ 'feeReceipt.uploadDate': -1 });
        const headers = ['Registration No', 'Student Name', 'Branch', 'Receipt File', 'Upload Date', 'Verification Status', 'Verified By', 'Verified At', 'Remarks'];
        const rows = studentsWithReceipts.map((s) => [
          s.studentId,
          s.name,
          s.branch,
          s.feeReceipt?.fileName || '',
          s.feeReceipt?.uploadDate ? new Date(s.feeReceipt.uploadDate).toLocaleString() : '',
          s.feeReceipt?.verificationStatus || 'Pending Review',
          s.feeReceipt?.verifiedBy?.name || 'Pending',
          s.feeReceipt?.verifiedAt ? new Date(s.feeReceipt.verifiedAt).toLocaleString() : '',
          s.feeReceipt?.remarks || '',
        ]);
        csvData = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
        break;
      }

      case 'passes': {
        const passes = await PassRequest.find().populate('studentId', 'name studentId branch phone').populate('approvedBy', 'name role').sort({ createdAt: -1 });
        const headers = ['Pass ID', 'Student Name', 'Registration No', 'Pass Type', 'Departure Date', 'Expected Return', 'Reason', 'Approval Status', 'Current Status', 'Approved By', 'Remarks'];
        const rows = passes.map((p) => [
          p.qrCodeId,
          p.studentId?.name || '',
          p.studentId?.studentId || '',
          p.passType,
          new Date(p.requestedDeparture).toLocaleString(),
          new Date(p.expectedReturn).toLocaleString(),
          p.reason,
          p.approvalStatus,
          p.currentStatus,
          p.approvedBy?.name || 'Pending',
          p.remarks || '',
        ]);
        csvData = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
        break;
      }

      case 'gate': {
        const events = await GateEvent.find().populate('studentId', 'name studentId branch').sort({ timestamp: -1 });
        const headers = ['Event Time', 'Event Type', 'Student Name', 'Registration No', 'Location', 'Recorded By', 'Notes'];
        const rows = events.map((e) => [
          new Date(e.timestamp).toLocaleString(),
          e.eventType,
          e.studentId?.name || '',
          e.studentId?.studentId || '',
          e.gateLocation,
          e.recordedByName,
          e.notes || '',
        ]);
        csvData = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
        break;
      }

      case 'complaints': {
        const complaints = await Complaint.find().populate('studentId', 'name studentId branch phone').sort({ createdAt: -1 });
        const headers = ['Complaint ID', 'Category', 'Title', 'Description', 'Room', 'Student Name', 'Status', 'Assigned To', 'Expected Resolution', 'Resolution Remarks', 'Reported At'];
        const rows = complaints.map((c) => [
          c._id.toString().slice(-6),
          c.category,
          c.title,
          c.description,
          c.roomNumber,
          c.studentId?.name || '',
          c.status,
          c.assignedTo,
          c.expectedResolution ? new Date(c.expectedResolution).toLocaleDateString() : 'Pending',
          c.resolutionRemarks || '',
          new Date(c.createdAt).toLocaleString(),
        ]);
        csvData = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
        break;
      }

      default:
        return res.status(400).json({ success: false, message: `Unknown report type: ${type}` });
    }

    // Record in Audit Log
    await AuditLog.create({
      action: 'Report Exported',
      performedBy: req.user._id,
      performedByName: req.user.name,
      role: req.user.role,
      targetType: 'Report',
      details: `Exported CSV report for '${type}'`,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};

// Get audit logs (Admin only)
const getAuditLogs = async (_req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  exportReport,
  getAuditLogs,
};
