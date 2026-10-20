const mongoose = require('mongoose');
const Student = require('../models/Student.model');
const User = require('../models/User.model');
const AuditLog = require('../models/AuditLog.model');
const Allocation = require('../models/Allocation.model');
const Room = require('../models/Room.model');

// ── GET /api/students ───────────────────────────────────────────────────────
const getAllStudents = async (req, res, next) => {
  try {
    const { search, branch, academicYear, status, page = 1, limit = 25 } = req.query;
    const filter = { isActive: true };

    if (branch) filter.branch = branch;
    if (academicYear) filter.academicYear = academicYear;
    if (status) filter.registrationStatus = status;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { collegeRegistrationNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('assignedMentor', 'name email')
        .populate('allocatedRoom', 'roomNumber block')
        .sort({ name: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Student.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: students,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/students/:id ───────────────────────────────────────────────────
const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('assignedMentor', 'name email')
      .populate('allocatedRoom', 'roomNumber block capacity');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    res.json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/students/me (Logged-in Student Profile) ─────────────────────────
const getMyProfile = async (req, res, next) => {
  try {
    let student = await Student.findOne({ userId: req.user._id })
      .populate('assignedMentor', 'name email')
      .populate('allocatedRoom', 'roomNumber block floor capacity monthlyRent amenities');

    if (!student) {
      student = await Student.findOne({ email: req.user.email })
        .populate('assignedMentor', 'name email')
        .populate('allocatedRoom', 'roomNumber block floor capacity monthlyRent amenities');
    }

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    let roommates = [];
    let neighbors = [];

    if (student.allocatedRoom) {
      const roomId = student.allocatedRoom._id || student.allocatedRoom;

      // 1. Direct Roommates (Sharing the exact same room, excluding self)
      const roomAllocations = await Allocation.find({
        room: roomId,
        status: 'active',
        student: { $ne: student._id },
      }).populate('student', 'name academicYear branch course allocatedBed');

      roommates = roomAllocations
        .filter(a => a.student)
        .map(a => ({
          name: a.student.name,
          bedNumber: a.bedNumber || a.student.allocatedBed || 'Bed 2',
          academicYear: a.student.academicYear || '—',
          branch: a.student.branch || '—',
          course: a.student.course || 'B.Tech',
        }));

      // 2. Floor Neighbors (Students in nearby rooms on the same floor & block)
      const currentRoom = await Room.findById(roomId);
      if (currentRoom) {
        const nearbyRooms = await Room.find({
          block: currentRoom.block,
          floor: currentRoom.floor,
          _id: { $ne: currentRoom._id },
        }).select('_id roomNumber block floor');

        const nearbyRoomIds = nearbyRooms.map(r => r._id);
        const neighborAllocations = await Allocation.find({
          room: { $in: nearbyRoomIds },
          status: 'active',
        })
          .populate('room', 'roomNumber block')
          .populate('student', 'name academicYear branch course')
          .limit(12);

        neighbors = neighborAllocations
          .filter(a => a.student && a.room)
          .map(a => ({
            roomNumber: a.room.roomNumber,
            block: a.room.block,
            name: a.student.name,
            academicYear: a.student.academicYear || '—',
            branch: a.student.branch || '—',
            course: a.student.course || 'B.Tech',
          }));
      }
    }

    const studentData = student.toObject();
    studentData.roommates = roommates;
    studentData.neighbors = neighbors;

    res.json({ success: true, data: studentData });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/students/public-register (Public Student Registration) ─────────
const registerPublicStudent = async (req, res, next) => {
  try {
    const {
      name,
      collegeRegistrationNumber,
      email,
      phone,
      course,
      branch,
      academicYear,
      admissionYear,
      guardianName,
      guardianPhone,
      guardianRelation,
      hostelRequired,
      messPreference,
      feeReceiptFile, // filename or base64 data
      password,
    } = req.body;

    const regNo = (collegeRegistrationNumber || '').trim().toUpperCase();
    if (!regNo) {
      return res.status(400).json({ success: false, message: 'College registration number is required' });
    }

    // Check duplicate
    const existing = await Student.findOne({
      $or: [{ studentId: regNo }, { collegeRegistrationNumber: regNo }, { email: email.trim().toLowerCase() }],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A student registration with this Registration Number or Email already exists.',
      });
    }

    // Map year number from academicYear
    const yearMap = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4 };

    // Create user account for login tracking
    let user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      user = await User.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password || 'Spit@2024',
        role: 'student',
      });
    }

    // Prepare fee receipt object if provided
    let receiptName = null;
    let receiptData = null;
    if (feeReceiptFile) {
      if (typeof feeReceiptFile === 'object') {
        receiptName = feeReceiptFile.name || null;
        receiptData = feeReceiptFile.data || null;
      } else if (typeof feeReceiptFile === 'string') {
        if (feeReceiptFile.startsWith('data:')) {
          receiptData = feeReceiptFile;
          receiptName = req.body.feeReceiptName || `receipt_${regNo}.png`;
        } else {
          receiptName = feeReceiptFile;
        }
      }
    }
    if (req.body.feeReceiptData) {
      receiptData = req.body.feeReceiptData;
    }

    const feeReceipt = {
      fileName: receiptName,
      fileData: receiptData,
      uploadDate: (receiptName || receiptData) ? new Date() : null,
      verificationStatus: (receiptName || receiptData) ? 'Pending Review' : 'Not Uploaded',
      remarks: '',
    };

    const student = await Student.create({
      studentId: regNo,
      collegeRegistrationNumber: regNo,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      course: course || 'B.Tech',
      branch: branch || 'Computer Engineering',
      department: branch || 'Computer Engineering',
      year: yearMap[academicYear] || 1,
      academicYear: academicYear || '1st Year',
      admissionYear: admissionYear ? Number(admissionYear) : 2024,
      guardianName: guardianName ? guardianName.trim() : '',
      guardianPhone: guardianPhone ? guardianPhone.trim() : '',
      guardianRelation: guardianRelation || 'Parent / Guardian',
      hostelRequired: hostelRequired !== undefined ? Boolean(hostelRequired) : true,
      messPreference: messPreference || 'Mess options will be confirmed by the hostel administration.',
      feeReceipt,
      registrationStatus: 'Pending Review',
      userId: user._id,
    });

    user.studentRef = student._id;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Your registration has been submitted. The administration will review your details and fee receipt.',
      data: {
        registrationNumber: student.studentId,
        status: student.registrationStatus,
        name: student.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/students/check-status/:regNo (Public Status Check) ──────────────
const checkRegistrationStatus = async (req, res, next) => {
  try {
    const regNo = req.params.regNo.trim().toUpperCase();
    const student = await Student.findOne({
      $or: [{ studentId: regNo }, { collegeRegistrationNumber: regNo }, { email: req.params.regNo.trim().toLowerCase() }],
    }).select('name studentId collegeRegistrationNumber branch academicYear registrationStatus feeReceipt allocatedRoom createdAt');

    if (!student) {
      return res.status(404).json({ success: false, message: 'No registration found for the provided identifier' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/students/:id/review-registration (Admin Review + Room Allocation) ──
const reviewRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      status,          // 'Approved' | 'Rejected' | 'Pending Review'
      remarks,
      roomId,          // Optional: allocate room on approval
      bedNumber,       // Optional: specific bed number
      messPreference,  // Optional: confirm/override mess preference
      password,        // Optional: set login password for the student
    } = req.body;

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    student.registrationStatus = status;
    if (remarks && student.feeReceipt) student.feeReceipt.remarks = remarks;
    if (messPreference) student.messPreference = messPreference;

    // Mark fee receipt as verified when approving
    if (status === 'Approved' && student.feeReceipt) {
      student.feeReceipt.verificationStatus = 'Verified';
      student.feeReceipt.verifiedBy = req.user._id;
      student.feeReceipt.verifiedAt = new Date();
    }

    // ── Create / link User login account ────────────────────────────
    let userAccount = await User.findOne({ email: student.email });
    if (!userAccount) {
      // Create new login account for the student
      const loginPassword = password || student.phone || 'Spit@2024';
      userAccount = await User.create({
        name: student.name,
        email: student.email,
        password: loginPassword,
        role: 'student',
        studentRef: student._id,
      });
    } else if (!userAccount.studentRef) {
      userAccount.studentRef = student._id;
      await userAccount.save();
    }

    if (!student.userId) {
      student.userId = userAccount._id;
    }

    // ── Allocate Room if requested ───────────────────────────────────
    let roomAllocInfo = null;
    if (status === 'Approved' && roomId) {
      const room = await Room.findById(roomId);
      if (!room) return res.status(404).json({ success: false, message: 'Selected room not found' });
      if (room.occupiedBeds >= room.capacity) {
        return res.status(400).json({ success: false, message: `Room ${room.roomNumber} is already full (${room.capacity}/${room.capacity} beds occupied)` });
      }

      // Auto-assign bed number if not provided
      const existingAllocs = await Allocation.find({ room: room._id, status: 'active' });
      const occupiedBeds = existingAllocs.map(a => a.bedNumber);
      const assignedBed = bedNumber ? Number(bedNumber) : (() => {
        for (let b = 1; b <= room.capacity; b++) if (!occupiedBeds.includes(b)) return b;
        return 1;
      })();

      // Vacate any existing allocations for this student first
      await Allocation.updateMany({ student: student._id, status: 'active' }, { status: 'vacated', checkOutDate: new Date() });

      const allocation = await Allocation.create({
        room: room._id,
        student: student._id,
        bedNumber: assignedBed,
        academicYear: '2024-25',
        checkInDate: new Date(),
        status: 'active',
        allocatedBy: req.user._id,
      });

      student.allocatedRoom = room._id;
      student.allocatedBed = assignedBed;

      room.occupiedBeds = await Allocation.countDocuments({ room: room._id, status: 'active' });
      await room.save();

      roomAllocInfo = `Room ${room.roomNumber} (Block ${room.block}), Bed ${assignedBed}`;
    }

    await student.save();

    await AuditLog.create({
      action: `Registration ${status}`,
      performedBy: req.user._id,
      performedByName: req.user.name,
      role: req.user.role,
      targetType: 'Student',
      targetId: student._id.toString(),
      details: `${req.user.name} reviewed registration for ${student.name} (${student.studentId}): Status → ${status}.${roomAllocInfo ? ` Allocated: ${roomAllocInfo}.` : ''} Mess: ${student.messPreference || 'Not set'}. Login account ${userAccount ? 'linked' : 'created'}.`,
    });

    res.json({
      success: true,
      message: `Registration ${status}.${roomAllocInfo ? ` Room allocated: ${roomAllocInfo}.` : ''} Student login account is active.`,
      data: student,
      roomAllocated: roomAllocInfo,
      loginEmail: userAccount?.email,
    });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/students/:id/verify-receipt (Admin Fee Verification) ──────────
const verifyFeeReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // status: 'Verified' | 'Rejected'

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    student.feeReceipt.verificationStatus = status;
    student.feeReceipt.verifiedBy = req.user._id;
    student.feeReceipt.verifiedAt = new Date();
    if (remarks) student.feeReceipt.remarks = remarks;

    await student.save();

    await AuditLog.create({
      action: `Fee Receipt ${status}`,
      performedBy: req.user._id,
      performedByName: req.user.name,
      role: req.user.role,
      targetType: 'FeeReceipt',
      targetId: student._id.toString(),
      details: `${req.user.name} verified fee receipt for ${student.name} (${student.studentId}): ${status}`,
    });

    res.json({
      success: true,
      message: `Fee receipt verification updated to ${status}`,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/students/promote (Admin Year Promotion: Individual or Batch) ──
const promoteStudents = async (req, res, next) => {
  try {
    const { fromYear, toYear, studentId, vacateRoom = true } = req.body;
    const yearLabelMap = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };

    // Case 1: Individual Student Promotion
    if (studentId) {
      const student = await Student.findOne({
        $or: [
          ...(mongoose.isValidObjectId(studentId) ? [{ _id: studentId }] : []),
          { studentId: studentId.toString().toUpperCase() },
          { collegeRegistrationNumber: studentId.toString().toUpperCase() },
        ],
      });

      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found for promotion' });
      }

      const currentYear = student.year || 1;
      const targetYear = toYear ? Number(toYear) : currentYear + 1;

      if (targetYear > 4) {
        return res.status(400).json({
          success: false,
          message: `${student.name} is currently in 4th Year (Final Year). Graduation/Alumni transition required.`,
        });
      }

      const prevYearLabel = student.academicYear || `${currentYear}th Year`;
      student.year = targetYear;
      student.academicYear = yearLabelMap[targetYear] || `${targetYear}th Year`;

      let vacatedRoomInfo = null;
      if (vacateRoom) {
        // Find any active room allocations for this student
        const activeAllocations = await Allocation.find({ student: student._id, status: 'active' });
        for (const alloc of activeAllocations) {
          alloc.status = 'vacated';
          alloc.checkOutDate = new Date();
          alloc.remarks = `Auto-vacated upon academic promotion from ${prevYearLabel} to ${student.academicYear}`;
          await alloc.save();

          if (alloc.room) {
            const roomDoc = await Room.findById(alloc.room);
            if (roomDoc) {
              vacatedRoomInfo = `Room ${roomDoc.roomNumber} (Block ${roomDoc.block})`;
            }
            // Recalculate occupied beds atomically
            const activeCount = await Allocation.countDocuments({ room: alloc.room, status: 'active' });
            await Room.findByIdAndUpdate(alloc.room, { occupiedBeds: activeCount });
          }
        }
        student.allocatedRoom = null;
        student.allocatedBed = null;
      }

      await student.save();

      await AuditLog.create({
        action: 'Student Promoted Individually',
        performedBy: req.user._id,
        performedByName: req.user.name,
        role: req.user.role,
        targetType: 'Student',
        targetId: student._id.toString(),
        details: `Promoted ${student.name} (${student.studentId}) from ${prevYearLabel} to ${student.academicYear}.${vacatedRoomInfo ? ` ${vacatedRoomInfo} was automatically vacated & freed.` : ''}`,
      });

      return res.json({
        success: true,
        message: `Successfully promoted ${student.name} to ${student.academicYear}.${vacatedRoomInfo ? ` ${vacatedRoomInfo} bed was vacated and is now free on the dashboard.` : ''}`,
        data: student,
        vacatedRoom: vacatedRoomInfo,
      });
    }

    // Case 2: Batch Promotion by Year
    const result = await Student.updateMany(
      { year: Number(fromYear), isActive: true, registrationStatus: 'Approved' },
      { $set: { year: Number(toYear), academicYear: yearLabelMap[toYear] || `${toYear}th Year` } }
    );

    // If requested, vacate rooms for all promoted students
    if (vacateRoom) {
      const promotedStudents = await Student.find({ year: Number(toYear), isActive: true });
      const studentIds = promotedStudents.map(s => s._id);
      const activeAllocations = await Allocation.find({ student: { $in: studentIds }, status: 'active' });
      const affectedRooms = new Set();

      for (const alloc of activeAllocations) {
        alloc.status = 'vacated';
        alloc.checkOutDate = new Date();
        alloc.remarks = `Auto-vacated in batch promotion to Year ${toYear}`;
        await alloc.save();
        if (alloc.room) affectedRooms.add(alloc.room.toString());
      }

      for (const roomId of affectedRooms) {
        const activeCount = await Allocation.countDocuments({ room: roomId, status: 'active' });
        await Room.findByIdAndUpdate(roomId, { occupiedBeds: activeCount });
      }

      await Student.updateMany({ _id: { $in: studentIds } }, { $set: { allocatedRoom: null, allocatedBed: null } });
    }

    await AuditLog.create({
      action: 'Students Promoted',
      performedBy: req.user._id,
      performedByName: req.user.name,
      role: req.user.role,
      targetType: 'Student',
      details: `Batch promoted students from Year ${fromYear} to Year ${toYear}. Updated count: ${result.modifiedCount}.${vacateRoom ? ' Associated room beds were vacated.' : ''}`,
    });

    res.json({
      success: true,
      message: `Successfully promoted ${result.modifiedCount} students to Year ${toYear}.${vacateRoom ? ' Beds were auto-vacated and freed.' : ''}`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/students (Admin manual create) ────────────────────────────────
const createStudent = async (req, res, next) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json({ success: true, message: 'Student registered', data: student });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ success: false, message: `${field} already exists` });
    }
    next(error);
  }
};

// ── PUT /api/students/:id ───────────────────────────────────────────────────
const updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    res.json({ success: true, message: 'Student updated', data: student });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/students/:id ────────────────────────────────────────────────
const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    res.json({ success: true, message: 'Student marked inactive' });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/students/me/mess (Student Change Mess Plan) ───────────────────
const changeMyMessPreference = async (req, res, next) => {
  try {
    const { messPreference } = req.body;
    if (!messPreference) {
      return res.status(400).json({ success: false, message: 'Please select a valid mess option' });
    }

    let student = await Student.findOne({ userId: req.user._id });
    if (!student) {
      student = await Student.findOne({ email: req.user.email });
    }
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const previousMess = student.messPreference || 'None';
    student.messPreference = messPreference;
    await student.save();

    await AuditLog.create({
      action: 'UPDATE',
      performedBy: req.user._id,
      entityType: 'Student',
      entityId: student._id,
      details: `Student ${student.name} changed mess plan from "${previousMess}" to "${messPreference}"`,
    });

    res.json({
      success: true,
      message: 'Mess plan updated successfully',
      data: {
        messPreference: student.messPreference,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/students/:id/graduate (4th Year Graduation & Room Vacate) ──────
const graduateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (student.year < 4) {
      return res.status(400).json({
        success: false,
        message: `${student.name} is in Year ${student.year}, not yet eligible for graduation. Only 4th-year students can be graduated.`,
      });
    }

    // Vacate all active room allocations
    const activeAllocs = await Allocation.find({ student: student._id, status: 'active' });
    const vacatedRooms = [];
    for (const alloc of activeAllocs) {
      alloc.status = 'vacated';
      alloc.checkOutDate = new Date();
      alloc.remarks = remarks || `Graduated. Room vacated on ${new Date().toLocaleDateString('en-IN')}.`;
      await alloc.save();

      if (alloc.room) {
        const room = await Room.findById(alloc.room);
        if (room) {
          const activeCount = await Allocation.countDocuments({ room: room._id, status: 'active' });
          room.occupiedBeds = activeCount;
          await room.save();
          vacatedRooms.push(`Room ${room.roomNumber} Bed ${alloc.bedNumber}`);
        }
      }
    }

    student.allocatedRoom = null;
    student.allocatedBed = null;
    student.registrationStatus = 'Graduated';
    student.isActive = false;
    await student.save();

    await AuditLog.create({
      action: 'Student Graduated',
      performedBy: req.user._id,
      performedByName: req.user.name,
      role: req.user.role,
      targetType: 'Student',
      targetId: student._id.toString(),
      details: `${req.user.name} marked ${student.name} (${student.studentId}) as Graduated. ${vacatedRooms.length > 0 ? `Vacated: ${vacatedRooms.join(', ')}.` : 'No active room allocations.'} ${remarks || ''}`,
    });

    res.json({
      success: true,
      message: `${student.name} has been graduated. ${vacatedRooms.length > 0 ? `Vacated: ${vacatedRooms.join(', ')}.` : 'No rooms were assigned.'}`,
      data: student,
      vacatedRooms,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  getMyProfile,
  changeMyMessPreference,
  registerPublicStudent,
  checkRegistrationStatus,
  reviewRegistration,
  verifyFeeReceipt,
  promoteStudents,
  graduateStudent,
  createStudent,
  updateStudent,
  deleteStudent,
};
