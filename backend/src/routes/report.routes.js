const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { exportReport, getAuditLogs } = require('../controllers/report.controller');

router.use(authenticate);

// Export CSV for any category (Admin and Warden)
router.get('/export/:type', authorize('admin', 'warden'), exportReport);

// View audit logs (Admin only)
router.get('/audit-logs', authorize('admin'), getAuditLogs);

module.exports = router;
