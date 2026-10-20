const express = require('express');
const router = express.Router();
const { getStats, getRoomsGrid } = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/stats',      getStats);
router.get('/rooms-grid', getRoomsGrid);

module.exports = router;
