const { validationResult } = require('express-validator');
const AuditLog = require('../models/AuditLog');

// @desc    Get paginated audit logs
// @route   GET /api/audit-logs
// @access  Admin only
const getAuditLogs = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Invalid query parameters');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const total = await AuditLog.countDocuments();
    const items = await AuditLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      items,
      page,
      limit,
      total
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs
};
