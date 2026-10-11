const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      return next(err);
    }

    const { email, password } = req.body;
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    const user = await User.findOne({ email: cleanEmail }).populate('student');

    let isValidPassword = false;
    if (user && user.isActive) {
      isValidPassword = await bcrypt.compare(password, user.passwordHash);
    }

    if (!user || !user.isActive || !isValidPassword) {
      await AuditLog.create({
        actor: cleanEmail || 'anonymous',
        action: 'LOGIN_FAILED',
        details: { ip: req.ip, userAgent: req.get('user-agent') }
      });

      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      return next(err);
    }

    // Sign JWT
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1d';
    const token = jwt.sign(
      { id: user._id, role: user.role },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    // Set httpOnly cookie
    const cookieOptions = {
      httpOnly: true,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    };

    res.cookie('token', token, cookieOptions);

    await AuditLog.create({
      actor: user.email,
      action: 'LOGIN_SUCCESS',
      details: { ip: req.ip }
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        student: user.student || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new user (Admin only)
// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation failed for user registration');
      err.statusCode = 400;
      err.details = errors.array();
      return next(err);
    }

    const { name, email, password, role, studentId } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      const err = new Error('User with this email already exists');
      err.statusCode = 400;
      return next(err);
    }

    let studentRef = null;
    if (role === 'student' && studentId) {
      const studentDoc = await Student.findOne({ studentId });
      if (studentDoc) {
        studentRef = studentDoc._id;
      }
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role,
      student: studentRef,
      isActive: true
    });

    await AuditLog.create({
      actor: req.user.email,
      action: 'USER_REGISTERED',
      details: { createdUser: newUser.email, role: newUser.role }
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        student: newUser.student || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user profile
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash')
      .populate('student')
      .lean();

    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        student: user.student || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log out user / clear cookie
// @route   POST /api/auth/logout
const logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  });
  res.json({ message: 'Logged out successfully' });
};

module.exports = {
  login,
  register,
  getMe,
  logout
};
