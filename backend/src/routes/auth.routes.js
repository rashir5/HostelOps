const express = require('express');
const router = express.Router();
const { register, login, getMe, provisionStaff, getStaff } = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login',    login);
router.get('/me',        authenticate, getMe);

// Super Admin staff management
router.post('/provision-staff', authenticate, authorize('admin'), provisionStaff);
router.get('/staff',            authenticate, authorize('admin'), getStaff);

module.exports = router;

