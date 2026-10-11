const express = require('express');
const { query, param, body } = require('express-validator');
const checkDbConnected = require('../middleware/checkDbConnected');
const { authenticate, authorize } = require('../middleware/auth');
const loginLimiter = require('../middleware/loginLimiter');
const { login, register, getMe, logout } = require('../controllers/authController');
const { getStudents, getStudentSelf, getStudentById } = require('../controllers/studentController');
const { getHostels } = require('../controllers/hostelController');
const { getRooms } = require('../controllers/roomController');
const { createAllocation, moveAllocation, releaseAllocation } = require('../controllers/allocationController');
const { getAuditLogs } = require('../controllers/auditLogController');
const {
  createPass,
  getMyPasses,
  cancelPass,
  listPasses,
  approvePass,
  rejectPass,
  markOut,
  markReturned,
  getOverduePasses
} = require('../controllers/passController');
const {
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
} = require('../controllers/complaintController');
const {
  createQuickPass,
  scanQuickPass,
  recordManualEvent,
  getGateEvents,
  getCurrentlyOut,
  studentLookup,
  getMyGateEvents
} = require('../controllers/gateController');
const {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementsManage,
  getAnnouncements
} = require('../controllers/announcementController');
const scanLimiter = require('../middleware/scanLimiter');

const router = express.Router();

// GET /api/health (Public health check, no DB required)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// ── Auth Routes (/api/auth) ──────────────────────────────────────────────────
router.post(
  '/auth/login',
  checkDbConnected,
  loginLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
  ],
  login
);

router.post(
  '/auth/register',
  checkDbConnected,
  authenticate,
  authorize('admin'),
  [
    body('name').isString().trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 10 }).withMessage('Password must be at least 10 characters long'),
    body('role').isIn(['student', 'warden', 'admin', 'mentor', 'guard']).withMessage('Invalid role'),
    body('studentId').optional().isString().trim()
  ],
  register
);

router.get('/auth/me', checkDbConnected, authenticate, getMe);
router.post('/auth/logout', logout);

// ── Student Routes (/api/students) ──────────────────────────────────────────

// GET /api/students/me (Student role only - fetch own profile)
router.get('/students/me', checkDbConnected, authenticate, authorize('student'), getStudentSelf);

// GET /api/students (Admin & Warden only)
router.get(
  '/students',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    query('search').optional().isString().trim(),
    query('hostel').optional().isString().trim(),
    query('course').optional().isString().trim(),
    query('year').optional().isInt({ min: 1, max: 10 }).toInt(),
    query('allocated').optional(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  getStudents
);

// GET /api/students/:studentId (Admin & Warden only)
router.get(
  '/students/:studentId',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    param('studentId').isString().trim().notEmpty().withMessage('Student ID is required')
  ],
  getStudentById
);

// ── Hostel Routes (/api/hostels) ─────────────────────────────────────────────

// GET /api/hostels (Admin & Warden only)
router.get('/hostels', checkDbConnected, authenticate, authorize('admin', 'warden'), getHostels);

// ── Room Routes (/api/rooms) ─────────────────────────────────────────────────

// GET /api/rooms (Admin & Warden only)
router.get(
  '/rooms',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    query('hostel').optional().isString().trim()
  ],
  getRooms
);

// ── Allocation Routes (/api/allocations) ──────────────────────────────────────

// POST /api/allocations (Admin & Warden only)
router.post(
  '/allocations',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    body('studentId').isString().trim().notEmpty().withMessage('Student ID is required'),
    body('hostel').isString().trim().notEmpty().withMessage('Hostel is required'),
    body('roomNo').isString().trim().notEmpty().withMessage('Room number is required'),
    body('bedNo').isString().trim().notEmpty().withMessage('Bed number is required')
  ],
  createAllocation
);

// PUT /api/allocations/:studentId/move (Admin & Warden only)
router.put(
  '/allocations/:studentId/move',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    param('studentId').isString().trim().notEmpty().withMessage('Student ID is required'),
    body('hostel').isString().trim().notEmpty().withMessage('Hostel is required'),
    body('roomNo').isString().trim().notEmpty().withMessage('Room number is required'),
    body('bedNo').isString().trim().notEmpty().withMessage('Bed number is required')
  ],
  moveAllocation
);

// DELETE /api/allocations/:studentId (Admin & Warden only)
router.delete(
  '/allocations/:studentId',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    param('studentId').isString().trim().notEmpty().withMessage('Student ID is required')
  ],
  releaseAllocation
);

// ── Audit Log Routes (/api/audit-logs) ───────────────────────────────────────

// GET /api/audit-logs (Admin only)
router.get(
  '/audit-logs',
  checkDbConnected,
  authenticate,
  authorize('admin'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  getAuditLogs
);

// ── Pass Routes (/api/passes) ─────────────────────────────────────────────────

// POST /api/passes (Student only — create a pending pass for self)
router.post(
  '/passes',
  checkDbConnected,
  authenticate,
  authorize('student'),
  [
    body('reason').isString().trim().notEmpty().withMessage('Reason is required')
      .isLength({ max: 200 }).withMessage('Reason must not exceed 200 characters'),
    body('destination').isString().trim().notEmpty().withMessage('Destination is required')
      .isLength({ max: 200 }).withMessage('Destination must not exceed 200 characters'),
    body('leaveContact').optional().isString().trim()
      .isLength({ max: 200 }).withMessage('Leave contact must not exceed 200 characters'),
    body('departureAt').isISO8601().withMessage('departureAt must be a valid ISO 8601 date/time'),
    body('expectedReturnAt').isISO8601().withMessage('expectedReturnAt must be a valid ISO 8601 date/time')
  ],
  createPass
);

// GET /api/passes/overdue  — MUST be before /passes/:id routes to avoid param collision
router.get(
  '/passes/overdue',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  getOverduePasses
);

// GET /api/passes/mine (Student only)
router.get(
  '/passes/mine',
  checkDbConnected,
  authenticate,
  authorize('student'),
  getMyPasses
);

// GET /api/passes (Admin & Warden)
router.get(
  '/passes',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    query('status').optional().isString().trim(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  listPasses
);

// PUT /api/passes/:id/cancel (Student only — their own pending pass)
router.put(
  '/passes/:id/cancel',
  checkDbConnected,
  authenticate,
  authorize('student'),
  [
    param('id').isMongoId().withMessage('Invalid pass ID')
  ],
  cancelPass
);

// PUT /api/passes/:id/approve (Admin & Warden)
router.put(
  '/passes/:id/approve',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    param('id').isMongoId().withMessage('Invalid pass ID'),
    body('decisionNote').optional().isString().trim()
  ],
  approvePass
);

// PUT /api/passes/:id/reject (Admin & Warden — decisionNote required)
router.put(
  '/passes/:id/reject',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    param('id').isMongoId().withMessage('Invalid pass ID'),
    body('decisionNote').optional().isString().trim()
  ],
  rejectPass
);

// PUT /api/passes/:id/mark-out (Admin & Warden)
router.put(
  '/passes/:id/mark-out',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    param('id').isMongoId().withMessage('Invalid pass ID')
  ],
  markOut
);

// PUT /api/passes/:id/mark-returned (Admin & Warden)
router.put(
  '/passes/:id/mark-returned',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    param('id').isMongoId().withMessage('Invalid pass ID')
  ],
  markReturned
);

// ── Complaint Routes (/api/complaints) ────────────────────────────────────────

// POST /api/complaints (Student only)
router.post(
  '/complaints',
  checkDbConnected,
  authenticate,
  authorize('student'),
  [
    body('category').isIn(['plumbing', 'electrical', 'wifi', 'housekeeping', 'furniture', 'other']).withMessage('Invalid category'),
    body('description').isString().trim().notEmpty().withMessage('Description is required')
      .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority')
  ],
  createComplaint
);

// GET /api/complaints/summary (Admin & Warden) - Must precede :id route
router.get(
  '/complaints/summary',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  getComplaintsSummary
);

// GET /api/complaints/mine (Student only)
router.get(
  '/complaints/mine',
  checkDbConnected,
  authenticate,
  authorize('student'),
  getMyComplaints
);

// GET /api/complaints/mine/:id (Student only)
router.get(
  '/complaints/mine/:id',
  checkDbConnected,
  authenticate,
  authorize('student'),
  [
    param('id').isString().trim().notEmpty().withMessage('Complaint ID is required')
  ],
  getMyComplaintById
);

// POST /api/complaints/:id/comments (Student on own complaint, Admin/Warden on any)
router.post(
  '/complaints/:id/comments',
  checkDbConnected,
  authenticate,
  authorize('student', 'admin', 'warden'),
  [
    param('id').isString().trim().notEmpty().withMessage('Complaint ID is required'),
    body('text').isString().trim().notEmpty().withMessage('Comment text is required')
      .isLength({ max: 500 }).withMessage('Comment text must not exceed 500 characters')
  ],
  addComment
);

// PUT /api/complaints/:id/reopen (Student only, own complaint)
router.put(
  '/complaints/:id/reopen',
  checkDbConnected,
  authenticate,
  authorize('student'),
  [
    param('id').isString().trim().notEmpty().withMessage('Complaint ID is required'),
    body('text').optional().isString().trim().isLength({ max: 500 }).withMessage('Note must not exceed 500 characters')
  ],
  reopenComplaint
);

// GET /api/complaints (Admin & Warden)
router.get(
  '/complaints',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    query('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed', 'reopened']).withMessage('Invalid status'),
    query('category').optional().isIn(['plumbing', 'electrical', 'wifi', 'housekeeping', 'furniture', 'other']).withMessage('Invalid category'),
    query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
    query('hostel').optional().isString().trim(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  listComplaints
);

// GET /api/complaints/:id (Admin & Warden)
router.get(
  '/complaints/:id',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    param('id').isString().trim().notEmpty().withMessage('Complaint ID is required')
  ],
  getComplaintById
);

// PUT /api/complaints/:id/status (Admin & Warden)
router.put(
  '/complaints/:id/status',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    param('id').isString().trim().notEmpty().withMessage('Complaint ID is required'),
    body('status').isIn(['open', 'in_progress', 'resolved', 'closed', 'reopened']).withMessage('Invalid status'),
    body('note').optional().isString().trim().isLength({ max: 500 }).withMessage('Note must not exceed 500 characters')
  ],
  updateComplaintStatus
);

// PUT /api/complaints/:id/priority (Admin & Warden)
router.put(
  '/complaints/:id/priority',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    param('id').isString().trim().notEmpty().withMessage('Complaint ID is required'),
    body('priority').isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority')
  ],
  updateComplaintPriority
);

// ── Gate Routes (/api/gate) ───────────────────────────────────────────────────

// POST /api/gate/quick-pass (Student only)
router.post(
  '/gate/quick-pass',
  checkDbConnected,
  authenticate,
  authorize('student'),
  [
    body('type').isIn(['exit', 'entry']).withMessage('Type must be either exit or entry')
  ],
  createQuickPass
);

// POST /api/gate/scan (Guard, Admin, Warden — Rate limited to 60/min)
router.post(
  '/gate/scan',
  checkDbConnected,
  authenticate,
  authorize('guard', 'admin', 'warden'),
  scanLimiter,
  [
    body('token').isString().trim().notEmpty().withMessage('Token is required'),
    body('gate').isIn(['main', 'east']).withMessage('Gate must be main or east')
  ],
  scanQuickPass
);

// POST /api/gate/manual (Guard, Admin, Warden)
router.post(
  '/gate/manual',
  checkDbConnected,
  authenticate,
  authorize('guard', 'admin', 'warden'),
  [
    body('studentId').isString().trim().notEmpty().withMessage('Student ID is required'),
    body('type').isIn(['exit', 'entry']).withMessage('Type must be either exit or entry'),
    body('gate').isIn(['main', 'east']).withMessage('Gate must be main or east'),
    body('note').optional().isString().trim().isLength({ max: 200 }).withMessage('Note must not exceed 200 characters')
  ],
  recordManualEvent
);

// GET /api/gate/currently-out (Admin & Warden only) — Guards get 403
router.get(
  '/gate/currently-out',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  getCurrentlyOut
);

// GET /api/gate/student-lookup (Guard, Admin, Warden)
router.get(
  '/gate/student-lookup',
  checkDbConnected,
  authenticate,
  authorize('guard', 'admin', 'warden'),
  [
    query('q').optional().isString().trim()
  ],
  studentLookup
);

// GET /api/gate/events (Guard, Admin, Warden)
router.get(
  '/gate/events',
  checkDbConnected,
  authenticate,
  authorize('guard', 'admin', 'warden'),
  [
    query('date').optional().isString().trim(),
    query('studentId').optional().isString().trim(),
    query('type').optional().isIn(['exit', 'entry']).withMessage('Invalid type'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  getGateEvents
);

// GET /api/gate/mine (Student only)
router.get(
  '/gate/mine',
  checkDbConnected,
  authenticate,
  authorize('student'),
  getMyGateEvents
);

// ── Announcements Routes (/api/announcements) ─────────────────────────────────

// POST /api/announcements (Admin & Warden only)
router.post(
  '/announcements',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    body('title').isString().trim().notEmpty().withMessage('Title is required and must not be empty').isLength({ max: 120 }).withMessage('Title must not exceed 120 characters'),
    body('body').isString().trim().notEmpty().withMessage('Body is required and must not be empty').isLength({ max: 2000 }).withMessage('Body must not exceed 2000 characters'),
    body('audience').optional().isIn(['all', 'students', 'staff']).withMessage('Audience must be all, students, or staff'),
    body('hostel').optional({ nullable: true }).isString().trim(),
    body('pinned').optional().isBoolean().withMessage('Pinned must be a boolean'),
    body('publishAt').optional().isISO8601().withMessage('Invalid publishAt date'),
    body('expiresAt').optional({ nullable: true }).isISO8601().withMessage('Invalid expiresAt date')
  ],
  createAnnouncement
);

// GET /api/announcements/manage (Admin & Warden only)
router.get(
  '/announcements/manage',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  getAnnouncementsManage
);

// GET /api/announcements (Any authenticated user)
router.get(
  '/announcements',
  checkDbConnected,
  authenticate,
  getAnnouncements
);

// PUT /api/announcements/:id (Admin or Creator Warden)
router.put(
  '/announcements/:id',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    param('id').isMongoId().withMessage('Invalid announcement ID'),
    body('title').optional().isString().trim().notEmpty().withMessage('Title cannot be empty').isLength({ max: 120 }).withMessage('Title must not exceed 120 characters'),
    body('body').optional().isString().trim().notEmpty().withMessage('Body cannot be empty').isLength({ max: 2000 }).withMessage('Body must not exceed 2000 characters'),
    body('audience').optional().isIn(['all', 'students', 'staff']).withMessage('Audience must be all, students, or staff'),
    body('hostel').optional({ nullable: true }).isString().trim(),
    body('pinned').optional().isBoolean().withMessage('Pinned must be a boolean'),
    body('publishAt').optional().isISO8601().withMessage('Invalid publishAt date'),
    body('expiresAt').optional({ nullable: true })
  ],
  updateAnnouncement
);

// DELETE /api/announcements/:id (Admin or Creator Warden)
router.delete(
  '/announcements/:id',
  checkDbConnected,
  authenticate,
  authorize('admin', 'warden'),
  [
    param('id').isMongoId().withMessage('Invalid announcement ID')
  ],
  deleteAnnouncement
);

module.exports = router;
