const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  getDatabaseStats,
  getCollectionDocuments,
  updateDocument,
  deleteDocument,
} = require('../controllers/database.controller');

// All database explorer operations require admin authentication
router.use(authenticate, authorize('admin'));

router.get('/stats', getDatabaseStats);
router.get('/collection/:name', getCollectionDocuments);
router.put('/collection/:name/:id', updateDocument);
router.delete('/collection/:name/:id', deleteDocument);

module.exports = router;
