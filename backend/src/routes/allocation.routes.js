const express = require('express');
const router = express.Router();
const {
  getAllAllocations,
  getAllocationById,
  createAllocation,
  vacateAllocation,
  deleteAllocation,
} = require('../controllers/allocation.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/',               getAllAllocations);
router.get('/:id',            getAllocationById);
router.post('/',              createAllocation);
router.patch('/:id/vacate',   vacateAllocation);
router.delete('/:id',         authorize('admin', 'warden'), deleteAllocation);

module.exports = router;
