const express = require('express');
const router = express.Router();
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getBlocks,
} = require('../controllers/room.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/blocks', getBlocks);
router.get('/',       getAllRooms);
router.get('/:id',    getRoomById);
router.post('/',      authorize('admin', 'warden'), createRoom);
router.put('/:id',    authorize('admin', 'warden'), updateRoom);
router.delete('/:id', authorize('admin'),            deleteRoom);

module.exports = router;
