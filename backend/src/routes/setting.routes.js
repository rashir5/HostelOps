const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { getSettings, updateSettings } = require('../controllers/setting.controller');

// Public route to view settings
router.get('/', getSettings);

// Admin-only route to update settings
router.put('/', authenticate, authorize('admin'), updateSettings);

module.exports = router;
