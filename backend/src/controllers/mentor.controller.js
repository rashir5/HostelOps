const Student = require('../models/Student.model');
const User = require('../models/User.model');
const MentorSession = require('../models/MentorSession.model');
const AuditLog = require('../models/AuditLog.model');

// Get assigned students for the logged-in mentor
const getAssignedStudents = async (req, res, next) => {
  try {
    const mentorId = req.user._id;
    const students = await Student.find({ assignedMentor: mentorId })
      .select('name studentId email phone course branch academicYear admissionYear guardianName guardianPhone allocatedRoom registrationStatus')
      .sort({ name: 1 });

    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    next(error);
  }
};

// Schedule or request a mentoring session
const createSession = async (req, res, next) => {
  try {
    const { studentId, topic, scheduledDate, mode, location, notes } = req.body;

    let mentorId = req.user._id;
    let actualStudentId = studentId;

    // If student requested it, find their assigned mentor
    if (req.user.role === 'student') {
      const student = await Student.findOne({ userId: req.user._id });
      if (!student || !student.assignedMentor) {
        return res.status(400).json({ success: false, message: 'You do not have an assigned mentor yet' });
      }
      mentorId = student.assignedMentor;
      actualStudentId = student._id;
    }

    const session = await MentorSession.create({
      mentorId,
      studentId: actualStudentId,
      topic,
      scheduledDate: new Date(scheduledDate),
      mode: mode || 'In-Person',
      location: location || 'Faculty Cabin / Mentoring Room, SPIT',
      notes: notes || '',
      status: req.user.role === 'student' ? 'Requested' : 'Scheduled',
    });

    res.status(201).json({
      success: true,
      message: 'Mentoring session scheduled successfully',
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

// Get sessions for logged-in mentor or student
const getSessions = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'mentor') {
      filter.mentorId = req.user._id;
    } else if (req.user.role === 'student') {
      const student = await Student.findOne({ userId: req.user._id });
      if (student) filter.studentId = student._id;
    }

    const sessions = await MentorSession.find(filter)
      .populate('studentId', 'name studentId branch phone')
      .populate('mentorId', 'name email')
      .sort({ scheduledDate: -1 });

    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (error) {
    next(error);
  }
};

// Update session (complete, cancel, add notes)
const updateSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes, guidanceRecommendations } = req.body;

    const session = await MentorSession.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (status) session.status = status;
    if (notes) session.notes = notes;
    if (guidanceRecommendations) session.guidanceRecommendations = guidanceRecommendations;

    await session.save();

    res.json({ success: true, message: 'Session updated successfully', data: session });
  } catch (error) {
    next(error);
  }
};

// List all mentors (Admin & Student)
const listMentors = async (_req, res, next) => {
  try {
    const mentors = await User.find({ role: 'mentor', isActive: true }).select('name email role');
    res.json({ success: true, data: mentors });
  } catch (error) {
    next(error);
  }
};

// Assign mentor to student (Admin)
const assignMentorToStudent = async (req, res, next) => {
  try {
    const { studentId, mentorId } = req.body;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (!mentorId || mentorId === 'unassign') {
      student.assignedMentor = null;
      await student.save();

      await AuditLog.create({
        action: 'Mentor Unassigned',
        performedBy: req.user._id,
        performedByName: req.user.name,
        role: req.user.role,
        targetType: 'Student',
        targetId: student._id.toString(),
        details: `Unassigned senior mentor for student ${student.name} (${student.studentId})`,
      });

      return res.json({ success: true, message: `Mentor unassigned for ${student.name}`, data: student });
    }

    const mentor = await User.findOne({ _id: mentorId, role: 'mentor' });
    if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found' });

    student.assignedMentor = mentor._id;
    await student.save();

    await AuditLog.create({
      action: 'Mentor Assigned',
      performedBy: req.user._id,
      performedByName: req.user.name,
      role: req.user.role,
      targetType: 'Student',
      targetId: student._id.toString(),
      details: `Assigned mentor ${mentor.name} to student ${student.name} (${student.studentId})`,
    });

    res.json({ success: true, message: `Mentor ${mentor.name} assigned to ${student.name}`, data: student });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssignedStudents,
  createSession,
  getSessions,
  updateSession,
  listMentors,
  assignMentorToStudent,
};
