const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  raiseComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaint,
} = require('../controllers/complaint.controller');

router.use(authenticate);

// Student actions
router.post('/', authorize('student', 'admin'), raiseComplaint);
router.get('/my-complaints', authorize('student', 'admin'), getMyComplaints);

// Warden & Admin actions
router.get('/all', authorize('warden', 'admin'), getAllComplaints);
router.patch('/:id', authorize('warden', 'admin'), updateComplaint);

module.exports = router;
