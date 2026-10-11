const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes/api');

const app = express();

// Security HTTP headers
app.use(helmet());

// Enable CORS with client origin restriction
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: clientUrl,
  credentials: true
}));

// Cookie parser for reading httpOnly cookies
app.use(cookieParser());

// HTTP request logger (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser with 10kb limit
app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL query injection (safely sanitize body & params)
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    mongoSanitize.sanitize(req.body);
  }
  if (req.params && typeof req.params === 'object') {
    mongoSanitize.sanitize(req.params);
  }
  next();
});

// General Rate limiting for /api routes (100 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many requests from this IP, please try again after 15 minutes',
      status: 429
    }
  }
});

app.use('/api', apiLimiter);

// API Routes
app.use('/api', apiRoutes);

// Root route endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'HostelOps API Backend',
    docs: '/api/health'
  });
});

// 404 and Error handling middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;
