const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  requestPass,
  getMyPasses,
  getAllPasses,
  reviewPass,
  recordGateEvent,
  getOutStudents,
} = require('../controllers/pass.controller');

router.use(authenticate);

// Student routes
router.post('/request', authorize('student', 'admin'), requestPass);
router.get('/my-passes', authorize('student', 'admin'), getMyPasses);

// Warden & Admin routes
router.get('/all', authorize('warden', 'admin'), getAllPasses);
router.patch('/:id/review', authorize('warden', 'admin'), reviewPass);
router.post('/gate-event', authorize('warden', 'admin'), recordGateEvent);
router.get('/out-students', authorize('warden', 'admin'), getOutStudents);

module.exports = router;
