const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  sendEmergencySos,
} = require('../controllers/announcement.controller');

router.use(authenticate);

router.get('/', getAnnouncements);
router.post('/', authorize('admin', 'warden'), createAnnouncement);
router.post('/sos', sendEmergencySos); // Available to all authenticated roles (student, mentor, warden, admin)
router.delete('/:id', authorize('admin'), deleteAnnouncement);

module.exports = router;
