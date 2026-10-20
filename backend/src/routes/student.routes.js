const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/student.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Public routes (Registration & Status check)
router.post('/public-register', registerPublicStudent);
router.get('/check-status/:regNo', checkRegistrationStatus);

// Authenticated routes
router.use(authenticate);

// Student profile & mess change
router.get('/me', getMyProfile);
router.put('/me/mess', authorize('student'), changeMyMessPreference);

// Admin review, promotion & graduation
router.patch('/:id/review-registration', authorize('admin'), reviewRegistration);
router.patch('/:id/verify-receipt', authorize('admin'), verifyFeeReceipt);
router.post('/promote', authorize('admin'), promoteStudents);
router.post('/:id/graduate', authorize('admin'), graduateStudent);

// CRUD
router.get('/', getAllStudents);
router.get('/:id', getStudentById);
router.post('/', authorize('admin'), createStudent);
router.put('/:id', authorize('admin', 'warden'), updateStudent);
router.delete('/:id', authorize('admin'), deleteStudent);

module.exports = router;
