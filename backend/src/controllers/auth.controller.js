const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// ── Generate JWT ────────────────────────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ── POST /api/auth/register ─────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, role });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/login ────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/auth/me ────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/provision-staff (Super Admin Only) ───────────────────────
const provisionStaff = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields (Full Name, Email, Password, Role) are required.' });
    }

    const validRoles = ['admin', 'warden', 'mentor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Institutional role must be warden, mentor, or admin.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Temporary password must be at least 6 characters.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ success: false, message: `An account with email "${normalizedEmail}" is already registered.` });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
    });

    // Record institutional audit trail
    try {
      const AuditLog = require('../models/AuditLog.model');
      await AuditLog.create({
        action: 'Staff Account Provisioned',
        performedBy: req.user?._id || null,
        performedByName: req.user?.name || 'Super Admin',
        role: req.user?.role || 'admin',
        targetType: 'User',
        targetId: user._id.toString(),
        details: `Super Admin provisioned new ${role.toUpperCase()} account for ${user.name} (${user.email})`,
      });
    } catch (auditErr) {
      console.warn('AuditLog record warning:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Staff account (${role.toUpperCase()}) successfully created for ${user.name}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/auth/staff (Admin Only) ────────────────────────────────────────
const getStaff = async (req, res, next) => {
  try {
    const staff = await User.find({ role: { $in: ['admin', 'warden', 'mentor'] } })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: staff.length,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, provisionStaff, getStaff };

