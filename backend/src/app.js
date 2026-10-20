const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const studentRoutes = require('./routes/student.routes');
const allocationRoutes = require('./routes/allocation.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const passRoutes = require('./routes/pass.routes');
const complaintRoutes = require('./routes/complaint.routes');
const mentorRoutes = require('./routes/mentor.routes');
const announcementRoutes = require('./routes/announcement.routes');
const settingRoutes = require('./routes/setting.routes');
const reportRoutes = require('./routes/report.routes');
const databaseRoutes = require('./routes/database.routes');

// Member 2 Core Security & Communication Modules
const leaveRoutes = require('./routes/leaveRoutes');
const gateRoutes = require('./routes/gateRoutes');
const visitorRoutes = require('./routes/visitorRoutes');

const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// ── Static frontend ─────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../../frontend')));

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/rooms',         roomRoutes);
app.use('/api/students',      studentRoutes);
app.use('/api/allocations',   allocationRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/passes',        passRoutes);
app.use('/api/complaints',    complaintRoutes);
app.use('/api/mentors',       mentorRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/settings',      settingRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/database',      databaseRoutes);

// Member 2 Security & Communication Endpoints
app.use('/api/leaves',        leaveRoutes);
app.use('/api/gatelogs',      gateRoutes);
app.use('/api/visitors',      visitorRoutes);

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    institution: "Bharatiya Vidya Bhavan's Sardar Patel Institute of Technology (SPIT)",
    timestamp: new Date().toISOString(),
  });
});

// ── Global error handler ───────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
