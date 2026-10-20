const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  getAssignedStudents,
  createSession,
  getSessions,
  updateSession,
  listMentors,
  assignMentorToStudent,
} = require('../controllers/mentor.controller');

router.use(authenticate);

// Mentor view
router.get('/my-students', authorize('mentor', 'admin'), getAssignedStudents);
router.get('/sessions', authorize('mentor', 'student', 'admin'), getSessions);
router.post('/sessions', authorize('mentor', 'student', 'admin'), createSession);
router.patch('/sessions/:id', authorize('mentor', 'admin'), updateSession);

// Mentors list (Public to authenticated)
router.get('/list', listMentors);

// Admin assignment
router.post('/assign', authorize('admin'), assignMentorToStudent);

module.exports = router;
