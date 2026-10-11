const { validationResult } = require('express-validator');
const Student = require('../models/Student');
const Allocation = require('../models/Allocation');
const Room = require('../models/Room');
const Hostel = require('../models/Hostel');

// @desc    Get paginated list of students with filters (Admin & Warden only)
// @route   GET /api/students
const getStudents = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Invalid query parameters');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { search, hostel, course, year, allocated } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { studentId: searchRegex },
        { course: searchRegex }
      ];
    }

    if (course) {
      query.course = new RegExp(course.trim(), 'i');
    }

    if (year) {
      query.studyYear = parseInt(year, 10);
    }

    // Filter by allocation status if requested
    if (allocated === 'false' || allocated === false) {
      const activeStudentIds = await Allocation.find({ status: 'active' }).distinct('student');
      query._id = { $nin: activeStudentIds };
    } else if (allocated === 'true' || allocated === true) {
      const activeStudentIds = await Allocation.find({ status: 'active' }).distinct('student');
      query._id = { $in: activeStudentIds };
    }

    // Filter by hostel if provided
    if (hostel) {
      let hostelDoc;
      if (hostel.match(/^[0-9a-fA-F]{24}$/)) {
        hostelDoc = await Hostel.findById(hostel);
      } else {
        hostelDoc = await Hostel.findOne({ name: new RegExp(`^${hostel.trim()}$`, 'i') });
      }

      if (hostelDoc) {
        const rooms = await Room.find({ hostel: hostelDoc._id }).select('_id');
        const roomIds = rooms.map(r => r._id);
        const activeAllocations = await Allocation.find({
          room: { $in: roomIds },
          status: 'active'
        }).select('student');

        const studentIdsInHostel = activeAllocations.map(a => a.student.toString());
        if (query._id) {
          // Combine existing _id filter with hostel student filter
          if (query._id.$nin) {
            const ninSet = new Set(query._id.$nin.map(id => id.toString()));
            const filteredIds = studentIdsInHostel.filter(id => !ninSet.has(id));
            query._id = { $in: filteredIds };
          } else if (query._id.$in) {
            const existingSet = new Set(query._id.$in.map(id => id.toString()));
            const filteredIds = studentIdsInHostel.filter(id => existingSet.has(id));
            query._id = { $in: filteredIds };
          }
        } else {
          query._id = { $in: studentIdsInHostel };
        }
      } else {
        return res.json({ items: [], page, limit, total: 0 });
      }
    }

    const total = await Student.countDocuments(query);

    // Admin and Warden get full fields (including phone & guardian)
    const selectFields = (req.user && (req.user.role === 'admin' || req.user.role === 'warden'))
      ? ''
      : '-phone -guardian';

    const students = await Student.find(query)
      .select(selectFields)
      .sort({ studentId: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Populate active allocation for each student
    const studentObjectIds = students.map(s => s._id);
    const allocations = await Allocation.find({
      student: { $in: studentObjectIds },
      status: 'active'
    })
      .populate({
        path: 'room',
        populate: { path: 'hostel', select: 'name' }
      })
      .lean();

    const allocationMap = new Map(
      allocations.map(a => [a.student.toString(), a])
    );

    const items = students.map(s => {
      const alloc = allocationMap.get(s._id.toString());
      return {
        ...s,
        allocation: alloc && alloc.room && alloc.room.hostel ? {
          hostel: alloc.room.hostel.name,
          room: alloc.room.roomNo,
          bed: alloc.bedNo
        } : null
      };
    });

    res.json({
      items,
      page,
      limit,
      total
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student's own record (Student role only)
// @route   GET /api/students/me
const getStudentSelf = async (req, res, next) => {
  try {
    let student;
    if (req.user.student) {
      student = await Student.findById(req.user.student).lean();
    } else {
      student = await Student.findOne({ email: req.user.email.toLowerCase().trim() }).lean();
    }

    if (!student) {
      const err = new Error('Student record not found for this user account');
      err.statusCode = 404;
      return next(err);
    }

    // Lookup active allocation
    const alloc = await Allocation.findOne({ student: student._id, status: 'active' })
      .populate({
        path: 'room',
        populate: { path: 'hostel', select: 'name' }
      })
      .lean();

    const allocation = alloc && alloc.room && alloc.room.hostel ? {
      hostel: alloc.room.hostel.name,
      room: alloc.room.roomNo,
      bed: alloc.bedNo
    } : null;

    res.json({
      ...student,
      allocation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single student details by studentId
// @route   GET /api/students/:studentId
const getStudentById = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Invalid student ID parameter');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { studentId } = req.params;

    // Phone and guardian fields returned ONLY to admin and warden
    const selectFields = (req.user && (req.user.role === 'admin' || req.user.role === 'warden'))
      ? ''
      : '-phone -guardian';

    const student = await Student.findOne({ studentId })
      .select(selectFields)
      .lean();

    if (!student) {
      const err = new Error(`Student not found with ID ${studentId}`);
      err.statusCode = 404;
      return next(err);
    }

    // Lookup active allocation
    const alloc = await Allocation.findOne({ student: student._id, status: 'active' })
      .populate({
        path: 'room',
        populate: { path: 'hostel', select: 'name' }
      })
      .lean();

    const allocation = alloc && alloc.room && alloc.room.hostel ? {
      hostel: alloc.room.hostel.name,
      room: alloc.room.roomNo,
      bed: alloc.bedNo
    } : null;

    res.json({
      ...student,
      allocation
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudents,
  getStudentSelf,
  getStudentById
};
