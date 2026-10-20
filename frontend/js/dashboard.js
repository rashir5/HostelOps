/**
 * dashboard.js — Universal Controller for SPIT Hostel Ops
 * Supports 4 Roles: Admin, Warden, Mentor, Student
 */

// ─── Theme Management ────────────────────────────────────────────────────────
const THEME_KEY = 'spit_theme';
const applyTheme = (theme) => {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('light', !isDark);
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
};
applyTheme(localStorage.getItem(THEME_KEY) || 'light');

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  user: null,
  currentPage: 'dashboard',
  stats: null,
  rooms: [],
  students: [],
  passes: [],
  complaints: [],
  sessions: [],
  announcements: [],
  settings: null,
  auditLogs: [],
};

// ─── Toast Notifications ─────────────────────────────────────────────────────
const showToast = (message, type = 'info') => {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-dot"></span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// ─── Modal Helpers ───────────────────────────────────────────────────────────
const openModal = (htmlContent) => {
  const container = document.getElementById('modalContainer');
  container.innerHTML = `
    <div class="modal-overlay open" id="activeModalOverlay" onclick="if(event.target===this) closeModal()">
      <div class="modal" style="max-height:90vh;overflow-y:auto;">
        ${htmlContent}
      </div>
    </div>
  `;
};
const closeModal = () => {
  const container = document.getElementById('modalContainer');
  container.innerHTML = '';
};

// ─── Number Easing Animation ─────────────────────────────────────────────────
const animateValue = (id, target) => {
  const el = document.getElementById(id);
  if (!el) return;
  const from = parseInt(el.textContent) || 0;
  const duration = 500;
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const val = Math.round(from + (target - from) * (1 - Math.pow(1 - progress, 3)));
    el.textContent = val.toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

// ─── Init Navigation based on Role ───────────────────────────────────────────
const initRoleNavigation = () => {
  const role = state.user.role;
  const nav = document.getElementById('sidebarNav');

  let navItems = `
    <div class="nav-section-label">Operations</div>
    <a href="#" class="nav-item active" data-page="dashboard" id="nav-dashboard">
      <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
      Overview
    </a>
  `;

  if (role === 'admin') {
    navItems += `
      <a href="#" class="nav-item" data-page="registrations" id="nav-registrations">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>
        Registrations
      </a>
      <a href="#" class="nav-item" data-page="rooms" id="nav-rooms">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762z"/></svg>
        Room Allocations
      </a>
      <a href="#" class="nav-item" data-page="students" id="nav-students">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
        Students Directory
      </a>
      <a href="#" class="nav-item" data-page="passes" id="nav-passes">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
        Digital Passes
      </a>
      <a href="#" class="nav-item" data-page="complaints" id="nav-complaints">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
        Complaints
      </a>
      <a href="#" class="nav-item" data-page="mentoring" id="nav-mentoring">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/></svg>
        Mentor Allocation
      </a>
      <a href="#" class="nav-item" data-page="settings" id="nav-settings">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>
        Mess &amp; Settings
      </a>
      <a href="#" class="nav-item" data-page="reports" id="nav-reports">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
        Export Reports
      </a>
      <a href="#" class="nav-item" data-page="database" id="nav-database">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"/><path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"/><path d="M17 4c0 1.657-3.134 3-7 3S3 5.657 3 4s3.134-3 7-3 7 1.343 7 3z"/></svg>
        Database Explorer
      </a>
    `;
  } else if (role === 'warden') {
    navItems += `
      <a href="#" class="nav-item" data-page="passes" id="nav-passes">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
        Gate Passes &amp; Curfew
      </a>
      <a href="#" class="nav-item" data-page="rooms" id="nav-rooms">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/></svg>
        Room Occupancy
      </a>
      <a href="#" class="nav-item" data-page="complaints" id="nav-complaints">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
        Open Complaints
      </a>
    `;
  } else if (role === 'mentor') {
    navItems += `
      <a href="#" class="nav-item" data-page="mentoring" id="nav-mentoring">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/></svg>
        My Assigned Students
      </a>
    `;
  } else if (role === 'student') {
    navItems += `
      <a href="#" class="nav-item" data-page="my-room" id="nav-my-room">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/></svg>
        My Room &amp; Status
      </a>
      <a href="#" class="nav-item" data-page="passes" id="nav-passes">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
        Digital Passes &amp; QR Code
      </a>
      <a href="#" class="nav-item" data-page="complaints" id="nav-complaints">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
        Raise Complaint
      </a>
      <a href="#" class="nav-item" data-page="mentoring" id="nav-mentoring">
        <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/></svg>
        Senior Student Mentor
      </a>
    `;
  }

  navItems += `
    <a href="#" class="nav-item" data-page="announcements" id="nav-announcements">
      <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
      Announcements
    </a>
  `;

  nav.innerHTML = navItems;

  // Re-bind click events
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
    });
  });
};

// ─── View Routing ────────────────────────────────────────────────────────────
const navigateTo = (pageName) => {
  document.querySelectorAll('.nav-item').forEach((i) => i.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${pageName}`);
  if (activeNav) activeNav.classList.add('active');

  state.currentPage = pageName;
  closeSidebar();

  const titleMap = {
    dashboard:     'Hostel Operations Overview',
    rooms:         'Room Allocations (Color Status)',
    registrations: 'Student Registration Reviews',
    students:      'Student Institutional Directory',
    passes:        'Digital Passes & Curfew Tracking',
    complaints:    'Hostel Maintenance Complaints',
    mentoring:     'Faculty Mentoring Support',
    announcements: 'Official Institutional Announcements',
    settings:      'Hostel Mess, Staff & Operations Settings',
    reports:       'Administrative Reports & Audit Logs',
    'my-room':     'My Room & Resident Profile',
    database:      'MongoDB Live Database Explorer',
  };
  document.getElementById('pageTitle').textContent = titleMap[pageName] || 'SPIT Hostel Ops';

  switch (pageName) {
    case 'dashboard':     renderOverview(); break;
    case 'rooms':         renderRoomsView(); break;
    case 'registrations': renderRegistrationsView(); break;
    case 'students':      renderStudentsView(); break;
    case 'passes':        renderPassesView(); break;
    case 'complaints':    renderComplaintsView(); break;
    case 'mentoring':     renderMentoringView(); break;
    case 'announcements': renderAnnouncementsView(); break;
    case 'settings':      renderSettingsView(); break;
    case 'reports':       renderReportsView(); break;
    case 'my-room':       renderStudentMyRoomView(); break;
    case 'database':      renderDatabaseView(); break;
    default:              renderOverview();
  }
};

// ─── VIEW 1: Role-Based Overview Dashboard ──────────────────────────────────
const renderOverview = async () => {
  const role = state.user?.role || 'admin';
  if (role === 'warden') {
    return renderWardenOverview();
  } else if (role === 'student') {
    return renderStudentOverview();
  } else if (role === 'mentor') {
    return renderMentorOverview();
  } else {
    return renderAdminOverview();
  }
};

// ─── WARDEN OVERVIEW (Pass Reasons, Approvals & Curfew Station) ─────────────
const renderWardenOverview = async () => {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading Warden Operations Station…</div>';

  try {
    const [statsRes, passesRes, complaintsRes, outRes] = await Promise.all([
      API.dashboard.getStats(),
      API.passes.getAll(),
      API.complaints.getAll(),
      API.passes.getOutStudents(),
    ]);

    const stats = statsRes.data || {};
    const allPasses = passesRes.data || [];
    const pendingPasses = allPasses.filter(p => p.approvalStatus === 'Pending');
    const allComplaints = complaintsRes.data || [];
    const openComplaints = allComplaints.filter(c => c.status !== 'Resolved');
    const outStudents = outRes.data || [];

    const complaintsPending = allComplaints.filter(c => c.status === 'Open').length;
    const complaintsInProgress = allComplaints.filter(c => c.status === 'In Progress').length;
    const complaintsResolved = allComplaints.filter(c => c.status === 'Resolved').length;

    container.innerHTML = `
      <!-- Warden Operational Banner -->
      <div class="card" style="margin-bottom:1.5rem;border-left:4px solid var(--spit-maroon);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
        <div>
          <span class="role-badge-pill role-warden" style="margin-bottom:0.25rem;">Warden Operational Station</span>
          <h2 style="font-size:1.25rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem;">Welcome, ${state.user.name}</h2>
          <p style="font-size:0.8125rem;color:var(--text-muted);">S.P.I.T. Hostel Operations · Curfew: 10:00 PM (Mon–Fri) / 10:30 PM (Sat–Sun)</p>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="navigateTo('passes')">View All Passes</button>
          <button class="btn btn-secondary btn-sm" onclick="navigateTo('complaints')">View Complaints</button>
          <button class="btn btn-secondary btn-sm" onclick="navigateTo('rooms')">Room Occupancy</button>
        </div>
      </div>

      <!-- Warden KPI Metric Grid -->
      <div class="kpi-grid" style="margin-bottom:1.5rem;">
        <div class="kpi-card" style="border-top:3px solid var(--status-amber);">
          <div class="kpi-icon yellow">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Pending Pass Requests</p>
            <p class="kpi-value" style="color:var(--status-amber);">${pendingPasses.length}</p>
            <p class="kpi-sub">Awaiting verification &amp; approval</p>
          </div>
        </div>

        <div class="kpi-card" style="border-top:3px solid var(--indigo);">
          <div class="kpi-icon indigo">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Students Out on Pass</p>
            <p class="kpi-value">${outStudents.length}</p>
            <p class="kpi-sub">Currently off-campus</p>
          </div>
        </div>

        <div class="kpi-card" style="border-top:3px solid var(--status-red);">
          <div class="kpi-icon red">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Curfew Overdue</p>
            <p class="kpi-value" style="color:var(--status-red);">${stats.overdueStudents || 0}</p>
            <p class="kpi-sub">Curfew check alert</p>
          </div>
        </div>

        <div class="kpi-card" style="border-top:3px solid var(--cyan);">
          <div class="kpi-icon cyan">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Open Complaints</p>
            <p class="kpi-value">${openComplaints.length}</p>
            <p class="kpi-sub">${complaintsPending} Pending · ${complaintsInProgress} Active</p>
          </div>
        </div>
      </div>

      <!-- Action Section 1: Pending Student Gate Pass Requests (With Reason & Student Profile) -->
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <h3 style="font-size:1.05rem;font-weight:700;color:var(--text-primary);">
              Pending Gate Pass Requests (${pendingPasses.length})
            </h3>
            <p style="font-size:0.75rem;color:var(--text-muted);">
              Inspect student reasons for leave, verify guardian contact details, and approve/reject requests.
            </p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="navigateTo('passes')">View All Pass Records</button>
        </div>

        ${pendingPasses.length === 0 ? `
          <div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:0.875rem;">
            ✅ All student gate pass requests have been reviewed and resolved.
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:1rem;">
            ${pendingPasses.map(p => {
              window._activePassesMap = window._activePassesMap || {};
              window._activePassesMap[p._id] = p;
              const student = p.studentId || {};
              const roomInfo = student.allocatedRoom ? `Room ${student.allocatedRoom.roomNumber} (Block ${student.allocatedRoom.block})` : 'Room unassigned';
              return `
                <div style="background:var(--bg-card-hover);border:1px solid var(--border);border-radius:var(--radius-md);padding:1.15rem;display:flex;flex-direction:column;gap:0.75rem;">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;">
                    <div>
                      <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                        <strong style="font-size:0.95rem;color:var(--text-primary);">${student.name || 'Resident Student'}</strong>
                        <span class="badge badge-teal">${p.passType}</span>
                        <code style="font-size:0.75rem;background:var(--bg-input);padding:0.15rem 0.4rem;border-radius:3px;">${p.qrCodeId}</code>
                      </div>
                      <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.2rem;">
                        Reg No: <strong>${student.studentId || student.collegeRegistrationNumber || '—'}</strong> · ${student.branch || ''} · ${roomInfo}
                      </p>
                    </div>
                    <div style="font-size:0.8125rem;text-align:right;">
                      <div style="color:var(--text-secondary);"><strong>Departure:</strong> ${new Date(p.requestedDeparture).toLocaleString()}</div>
                      <div style="color:var(--text-secondary);"><strong>Expected Return:</strong> ${new Date(p.expectedReturn).toLocaleString()}</div>
                      <div style="color:var(--text-muted);font-size:0.75rem;">Destination: ${p.destination || 'Not specified'}</div>
                    </div>
                  </div>

                  <!-- Reason Box (Emphasized per user audio feedback!) -->
                  <div style="background:var(--bg-card);border-left:3px solid var(--spit-teal);padding:0.65rem 0.85rem;border-radius:var(--radius-sm);font-size:0.8125rem;">
                    <strong style="color:var(--spit-teal);display:inline-block;margin-right:0.35rem;">Student's Reason for Leave:</strong>
                    <span style="color:var(--text-primary);font-weight:700;">"${p.reason || 'No specific reason provided'}"</span>
                  </div>

                  <!-- Parent Contact & Action Buttons -->
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;padding-top:0.5rem;border-top:1px dashed var(--border);">
                    <div style="font-size:0.8125rem;">
                      <span style="color:var(--text-muted);">Emergency Parent / Guardian:</span>
                      <strong>${student.guardianName || 'Guardian'}</strong> 
                      ${student.guardianPhone ? `<a href="tel:${student.guardianPhone}" style="color:var(--spit-teal);margin-left:0.5rem;font-weight:700;">📞 ${student.guardianPhone}</a>` : '—'}
                    </div>
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                      <button class="btn btn-secondary btn-sm" onclick="openPassDetailsModal('${p._id}')" title="Inspect full leave reason &amp; timing">
                        📋 View Reason
                      </button>
                      <button class="btn btn-secondary btn-sm" onclick="openStudentFullDetailsModal('${student._id}', '${p._id}')" title="Inspect complete student record">
                        👤 Student Profile
                      </button>
                      <button class="btn btn-primary btn-sm" onclick="reviewPassAction('${p._id}', 'Approved')" style="background:var(--status-green);border-color:var(--status-green);">
                        ✓ Approve Pass
                      </button>
                      <button class="btn btn-secondary btn-sm" onclick="openRejectPassModal('${p._id}')" style="color:var(--status-red);border-color:var(--status-red-border);">
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Action Section 2: Complaints & Curfew Overview -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
        
        <!-- Complaints Summary Card -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <h3 style="font-size:1rem;font-weight:700;color:var(--text-primary);">Hostel Complaints Status</h3>
            <span class="badge badge-teal">${allComplaints.length} Total</span>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;margin-bottom:1rem;text-align:center;">
            <div style="background:var(--status-red-bg);border:1px solid var(--status-red-border);padding:0.75rem;border-radius:var(--radius-sm);">
              <span style="font-size:1.25rem;font-weight:800;color:var(--status-red);">${complaintsPending}</span>
              <p style="font-size:0.6875rem;color:var(--status-red);font-weight:600;margin-top:0.15rem;">Pending</p>
            </div>
            <div style="background:var(--status-amber-bg);border:1px solid var(--status-amber-border);padding:0.75rem;border-radius:var(--radius-sm);">
              <span style="font-size:1.25rem;font-weight:800;color:var(--status-amber);">${complaintsInProgress}</span>
              <p style="font-size:0.6875rem;color:var(--status-amber);font-weight:600;margin-top:0.15rem;">In Progress</p>
            </div>
            <div style="background:var(--status-green-bg);border:1px solid var(--status-green-border);padding:0.75rem;border-radius:var(--radius-sm);">
              <span style="font-size:1.25rem;font-weight:800;color:var(--status-green);">${complaintsResolved}</span>
              <p style="font-size:0.6875rem;color:var(--status-green);font-weight:600;margin-top:0.15rem;">Resolved</p>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:0.5rem;max-height:260px;overflow-y:auto;">
            ${openComplaints.slice(0, 4).map(c => `
              <div style="background:var(--bg-card-hover);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.65rem 0.85rem;display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="display:flex;align-items:center;gap:0.4rem;">
                    <strong style="font-size:0.8125rem;color:var(--text-primary);">${c.title}</strong>
                    <span class="badge ${c.status === 'Open' ? 'badge-red' : 'badge-amber'}" style="font-size:0.6875rem;">${c.status}</span>
                  </div>
                  <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.15rem;">
                    Room: <strong>${c.roomNumber || '—'}</strong> · ${c.category} · By ${c.studentId?.name || 'Student'}
                  </p>
                </div>
                <button class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:0.25rem 0.5rem;" onclick="openUpdateComplaintModal('${c._id}', '${c.status}', '${c.assignedTo}')">Update</button>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:0.75rem;text-align:right;">
            <a href="#" onclick="event.preventDefault();navigateTo('complaints');" style="font-size:0.8125rem;color:var(--spit-teal);font-weight:600;">View All Maintenance Records →</a>
          </div>
        </div>

        <!-- Students Currently Out on Pass -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <h3 style="font-size:1rem;font-weight:700;color:var(--text-primary);">Students Currently Out</h3>
            <span class="badge ${outStudents.length > 0 ? 'badge-amber' : 'badge-green'}">${outStudents.length} Active</span>
          </div>

          ${outStudents.length === 0 ? `
            <div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:0.875rem;">
              No students currently logged out of campus.
            </div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:0.65rem;max-height:300px;overflow-y:auto;">
              ${outStudents.map(p => {
                window._activePassesMap = window._activePassesMap || {};
                window._activePassesMap[p._id] = p;
                return `
                <div style="background:var(--bg-card-hover);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.75rem;font-size:0.8125rem;">
                  <div style="display:flex;justify-content:space-between;">
                    <strong>${p.studentId?.name || 'Student'}</strong>
                    <span class="badge ${p.currentStatus === 'Overdue' ? 'badge-red' : 'badge-amber'}">${p.currentStatus}</span>
                  </div>
                  <div style="font-size:0.75rem;color:var(--text-muted);margin:0.25rem 0;">
                    Expected Return: <strong>${new Date(p.expectedReturn).toLocaleString()}</strong>
                  </div>
                  <div style="font-size:0.75rem;color:var(--text-primary);margin:0.25rem 0;font-style:italic;">
                    "${p.reason || 'General Outing'}"
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.35rem;">
                    <span style="font-size:0.75rem;color:var(--text-secondary);">Guardian: ${p.studentId?.guardianPhone ? `<a href="tel:${p.studentId.guardianPhone}">📞 ${p.studentId.guardianPhone}</a>` : '—'}</span>
                    <div style="display:flex;gap:0.35rem;">
                      <button class="btn btn-secondary btn-sm" style="font-size:0.6875rem;padding:0.2rem 0.4rem;" onclick="openPassDetailsModal('${p._id}')">Reason</button>
                      <button class="btn btn-secondary btn-sm" style="font-size:0.6875rem;padding:0.2rem 0.4rem;" onclick="openStudentFullDetailsModal('${p.studentId?._id || p.studentId}', '${p._id}')">Profile</button>
                    </div>
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    document.getElementById('updatedTime').textContent = new Date().toLocaleTimeString();
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--status-red)">Error loading warden overview: ${err.message}</div>`;
  }
};

// ─── STUDENT OVERVIEW (My Room, Change Mess, Digital Passes & Mentor) ────────
const renderStudentOverview = async () => {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading your resident dashboard…</div>';

  try {
    const [profileRes, passesRes, complaintsRes, sessionsRes, settingsRes] = await Promise.all([
      API.students.getMyProfile(),
      API.passes.getMyPasses(),
      API.complaints.getMyComplaints(),
      API.mentors.getSessions(),
      API.settings.get(),
    ]);

    const s = profileRes.data;
    const passes = passesRes.data || [];
    const complaints = complaintsRes.data || [];
    const sessions = sessionsRes.data || [];
    const settings = settingsRes.data || {};

    const isAllocated = Boolean(s.allocatedRoom);
    const activePass = passes.find(p => ['Approved', 'Out on Pass'].includes(p.currentStatus) || p.approvalStatus === 'Approved');

    container.innerHTML = `
      <!-- Student Welcome Station Banner -->
      <div class="card" style="margin-bottom:1.5rem;border-left:4px solid var(--spit-teal);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
        <div>
          <span class="role-badge-pill role-student" style="margin-bottom:0.25rem;">Resident Student Station</span>
          <h2 style="font-size:1.25rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem;">Welcome, ${s.name}</h2>
          <p style="font-size:0.8125rem;color:var(--text-muted);">${s.studentId} · ${s.course} (${s.branch}) · ${s.academicYear}</p>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="openPassRequestModal()">+ Request Gate Pass</button>
          <button class="btn btn-secondary btn-sm" onclick="openRaiseComplaintModal()">Report Problem</button>
        </div>
      </div>

      ${activePass ? `
        <!-- Prominent Active QR Gate Pass Banner for Student -->
        <div class="card" style="margin-bottom:1.5rem;background:linear-gradient(135deg, rgba(13, 122, 114, 0.12) 0%, rgba(21, 50, 108, 0.12) 100%);border:2px solid var(--spit-teal);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
          <div style="display:flex;align-items:center;gap:1.15rem;flex-wrap:wrap;">
            <div style="background:#ffffff;padding:0.45rem;border-radius:10px;border:1px solid var(--border);box-shadow:0 2px 8px rgba(0,0,0,0.06);flex-shrink:0;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(activePass.qrCodeId)}&format=svg" alt="Active Pass QR" style="width:72px;height:72px;display:block;" />
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;flex-wrap:wrap;">
                <span class="badge badge-green" style="font-weight:700;">✓ APPROVED FOR GATE</span>
                <span class="badge badge-teal">${activePass.passType}</span>
                <code style="font-size:0.85rem;font-weight:700;background:var(--bg-card);padding:0.15rem 0.4rem;border-radius:4px;">${activePass.qrCodeId}</code>
              </div>
              <div style="font-size:0.95rem;font-weight:800;color:var(--text-primary);margin-top:0.15rem;">
                Return Curfew: <span style="color:var(--spit-maroon);">${new Date(activePass.expectedReturn).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.2rem;">
                Destination: <strong>${activePass.destination || 'Outside Campus'}</strong> · Status: <strong>${activePass.currentStatus}</strong>
              </div>
            </div>
          </div>
          <button class="btn btn-primary" style="background:var(--spit-teal);border-color:var(--spit-teal);font-size:0.875rem;padding:0.65rem 1.25rem;display:inline-flex;align-items:center;gap:0.5rem;box-shadow:0 4px 14px rgba(13,122,114,0.35);" onclick="openStudentPassQrModal('${activePass._id}')">
            <span style="font-size:1.15rem;">📱</span> Show Full QR Code for Gate
          </button>
        </div>
      ` : ''}

      <!-- Student Personal KPIs -->
      <div class="kpi-grid" style="margin-bottom:1.5rem;">
        <div class="kpi-card">
          <div class="kpi-icon ${isAllocated ? 'green' : 'yellow'}">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Hostel Room</p>
            <p class="kpi-value" style="font-size:1.15rem;">${isAllocated ? `Room ${s.allocatedRoom.roomNumber}` : 'Pending'}</p>
            <p class="kpi-sub">${isAllocated ? `Bed ${s.allocatedBed || 1} · Block ${s.allocatedRoom.block}` : 'Allocation in review'}</p>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon cyan">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Active Mess Plan</p>
            <p class="kpi-value" style="font-size:0.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${s.messPreference?.split('(')[0] || 'Vegetarian Mess'}
            </p>
            <p class="kpi-sub">
              <a href="#" onclick="event.preventDefault();openChangeMessModal('${s.messPreference}');" style="color:var(--spit-teal);font-weight:700;">Change Mess Plan ↻</a>
            </p>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon indigo">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Digital Pass Status</p>
            <p class="kpi-value" style="font-size:1.15rem;">${activePass ? activePass.currentStatus : 'On Campus'}</p>
            <p class="kpi-sub">${passes.length} Total passes logged</p>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon purple">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Senior Student Mentor</p>
            <p class="kpi-value" style="font-size:0.95rem;">${s.assignedMentor?.name?.split('(')[0] || 'Aryan Shah'}</p>
            <p class="kpi-sub">Final Year B.Tech CSE</p>
          </div>
        </div>
      </div>

      <!-- Room & Dining Combined Grid -->
      <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
        
        <!-- Room Status -->
        <div class="card">
          <h3 style="font-size:1rem;font-weight:700;color:var(--text-primary);margin-bottom:0.75rem;">
            Room &amp; Bed Allocation Status
          </h3>
          ${isAllocated ? `
            <div style="background:var(--spit-surface-hover);border:1px solid var(--border);border-radius:var(--radius-sm);padding:1rem;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong style="font-size:1.1rem;color:var(--spit-navy);">Room ${s.allocatedRoom.roomNumber} · Bed ${s.allocatedBed || 1}</strong>
                <span class="badge badge-green">Allocated</span>
              </div>
              <p style="font-size:0.8125rem;color:var(--text-muted);margin-top:0.35rem;">
                Block ${s.allocatedRoom.block} · Capacity: ${s.allocatedRoom.capacity} Beds · ₹${s.allocatedRoom.monthlyRent?.toLocaleString()}/mo
              </p>
              <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px dashed var(--border);font-size:0.75rem;color:var(--text-secondary);">
                Campus Curfew: <strong>${settings.gateTimings?.curfewWeekday || '10:00 PM'}</strong> · RO Water on Floor · WiFi Enabled
              </div>
            </div>
          ` : `
            <div style="background:var(--status-amber-bg);border:1px solid var(--status-amber-border);border-radius:var(--radius-sm);padding:1rem;">
              <strong style="color:var(--status-amber);font-size:0.95rem;">Pending Room Confirmation</strong>
              <p style="font-size:0.8125rem;color:var(--text-primary);margin-top:0.35rem;line-height:1.5;">
                Your hostel registration has been received. The hostel administration will confirm your room allocation upon verifying your records and fee receipt.
              </p>
            </div>
          `}
        </div>

        <!-- Dining & Mess Option Card (With Change Mess Button!) -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
            <h3 style="font-size:1rem;font-weight:700;color:var(--text-primary);">Mess &amp; Dining Plan</h3>
            <button class="btn btn-secondary btn-sm" onclick="openChangeMessModal('${s.messPreference}')">
              Change Plan
            </button>
          </div>
          <div style="background:var(--spit-surface-hover);border:1px solid var(--border);border-radius:var(--radius-sm);padding:1rem;">
            <strong style="font-size:0.95rem;color:var(--spit-teal);">${s.messPreference || 'Regular Vegetarian Mess'}</strong>
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.35rem;">
              Campus Dining Hall · Verified under SPIT hygiene standards.
            </p>
            <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px dashed var(--border);display:flex;justify-content:space-between;font-size:0.75rem;">
              <span>Status: <strong style="color:var(--status-green);">Active</strong></span>
              <a href="#" onclick="event.preventDefault();openChangeMessModal('${s.messPreference}');" style="color:var(--spit-teal);font-weight:600;">Switch Mess Option →</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Passes & Senior Student Mentor Grid -->
      <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
        
        <!-- Recent Passes -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
            <h3 style="font-size:1rem;font-weight:700;color:var(--text-primary);">My Gate Passes &amp; QR Codes</h3>
            <button class="btn btn-primary btn-sm" onclick="openPassRequestModal()">+ New Request</button>
          </div>

          ${passes.length === 0 ? `
            <p style="font-size:0.8125rem;color:var(--text-muted);padding:1rem 0;">No gate passes requested yet.</p>
          ` : `
            <div style="display:flex;flex-direction:column;gap:0.65rem;">
              ${passes.slice(0, 4).map(p => {
                window._activePassesMap = window._activePassesMap || {};
                window._activePassesMap[p._id] = p;
                const isApproved = p.approvalStatus === 'Approved';
                return `
                <div style="background:var(--bg-card-hover);border:1px solid ${isApproved ? 'var(--status-green-border, #10b981)' : 'var(--border)'};border-radius:var(--radius-sm);padding:0.75rem;">
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.35rem;">
                    <div>
                      <strong style="font-size:0.875rem;color:var(--text-primary);">${p.passType}</strong>
                      <code style="font-size:0.75rem;background:var(--bg-input);padding:0.15rem 0.35rem;border-radius:3px;margin-left:0.25rem;">${p.qrCodeId}</code>
                    </div>
                    <span class="badge ${p.approvalStatus === 'Approved' ? 'badge-green' : p.approvalStatus === 'Rejected' ? 'badge-red' : 'badge-amber'}">${p.approvalStatus}</span>
                  </div>
                  <p style="font-size:0.75rem;color:var(--text-muted);margin:0.35rem 0;">
                    Departure: ${new Date(p.requestedDeparture).toLocaleDateString()} · Return: <strong>${new Date(p.expectedReturn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> · "${p.reason || 'General'}"
                  </p>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.4rem;padding-top:0.4rem;border-top:1px dashed var(--border);">
                    <span style="font-size:0.75rem;color:var(--text-secondary);">Curfew: <strong>${p.currentStatus}</strong></span>
                    <button class="btn btn-primary btn-sm" style="font-size:0.725rem;padding:0.25rem 0.55rem;background:var(--spit-teal);display:inline-flex;align-items:center;gap:0.3rem;" onclick="openStudentPassQrModal('${p._id}')">
                      <span>📱</span> Show QR Pass
                    </button>
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Senior Student Mentor Card -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
            <h3 style="font-size:1rem;font-weight:700;color:var(--text-primary);">Senior Student Mentor</h3>
            <button class="btn btn-secondary btn-sm" onclick="openStudentSessionRequestModal()">Request Session</button>
          </div>

          <div style="background:var(--bg-card-hover);border:1px solid var(--border);border-radius:var(--radius-sm);padding:1rem;">
            <strong style="font-size:0.95rem;color:var(--spit-navy);">${s.assignedMentor?.name || 'Aryan Shah (Senior Student Mentor)'}</strong>
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.2rem;">
              Final Year B.Tech Computer Engineering · Room B-302, SPIT Hostel
            </p>
            <p style="font-size:0.8125rem;color:var(--text-secondary);margin-top:0.5rem;line-height:1.4;">
              Your senior student mentor provides peer guidance on academic subjects, engineering labs, exam preparation, and hostel routine.
            </p>
            <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px dashed var(--border);font-size:0.75rem;">
              <span>Email: <a href="mailto:${s.assignedMentor?.email || 'mentor@spit.ac.in'}">${s.assignedMentor?.email || 'mentor@spit.ac.in'}</a></span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('updatedTime').textContent = new Date().toLocaleTimeString();
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--status-red)">Error loading student dashboard: ${err.message}</div>`;
  }
};

// ─── SENIOR STUDENT MENTOR OVERVIEW ─────────────────────────────────────────
const renderMentorOverview = async () => {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading Senior Student Mentor Portal…</div>';

  try {
    const [studentsRes, sessionsRes] = await Promise.all([
      API.mentors.getMyStudents(),
      API.mentors.getSessions(),
    ]);

    const mentees = studentsRes.data || [];
    const sessions = sessionsRes.data || [];

    container.innerHTML = `
      <!-- Senior Student Mentor Station Banner -->
      <div class="card" style="margin-bottom:1.5rem;border-left:4px solid var(--spit-teal);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
        <div>
          <span class="role-badge-pill role-mentor" style="margin-bottom:0.25rem;">Senior Student Mentor Station</span>
          <h2 style="font-size:1.25rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem;">Welcome, ${state.user.name}</h2>
          <p style="font-size:0.8125rem;color:var(--text-muted);">S.P.I.T. Peer Mentoring &amp; Junior Guidance System</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('mentoring')">View All Mentees</button>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid" style="margin-bottom:1.5rem;">
        <div class="kpi-card">
          <div class="kpi-icon indigo">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Assigned Junior Mentees</p>
            <p class="kpi-value">${mentees.length}</p>
            <p class="kpi-sub">Hostel students under guidance</p>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon green">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Scheduled Sessions</p>
            <p class="kpi-value">${sessions.filter(s => s.status !== 'Completed').length}</p>
            <p class="kpi-sub">Upcoming peer counseling</p>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon cyan">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Completed Sessions</p>
            <p class="kpi-value">${sessions.filter(s => s.status === 'Completed').length}</p>
            <p class="kpi-sub">Guidance notes recorded</p>
          </div>
        </div>
      </div>

      <!-- Assigned Mentees Table -->
      <div class="card" style="margin-bottom:1.5rem;">
        <h3 style="font-size:1.05rem;font-weight:700;color:var(--text-primary);margin-bottom:1rem;">My Assigned Junior Mentees</h3>
        <div style="overflow-x:auto;">
          <table class="data-table" style="width:100%;font-size:0.8125rem;">
            <thead>
              <tr>
                <th>Reg No</th>
                <th>Student Name</th>
                <th>Branch &amp; Year</th>
                <th>Room</th>
                <th>Guardian Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${mentees.length === 0 ? `
                <tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No junior students assigned yet.</td></tr>
              ` : mentees.map(m => `
                <tr>
                  <td><strong>${m.studentId}</strong></td>
                  <td>${m.name}</td>
                  <td>${m.branch} (${m.academicYear})</td>
                  <td>${m.allocatedRoom ? `Room ${m.allocatedRoom.roomNumber || ''}` : 'Pending'}</td>
                  <td>${m.guardianPhone ? `<a href="tel:${m.guardianPhone}">📞 ${m.guardianPhone}</a>` : '—'}</td>
                  <td style="display:flex;gap:0.35rem;">
                    <button class="btn btn-primary btn-sm" onclick="openScheduleSessionModal('${m._id}', '${m.name}')">Schedule Session</button>
                    <button class="btn btn-secondary btn-sm" onclick="openStudentFullDetailsModal('${m._id}')">View Details</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('updatedTime').textContent = new Date().toLocaleTimeString();
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--status-red)">Error loading mentor overview: ${err.message}</div>`;
  }
};

// ─── ADMIN OVERVIEW (Full Institution Metrics & Quick Actions) ──────────────
const renderAdminOverview = async () => {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading real-time overview…</div>';

  try {
    const res = await API.dashboard.getStats();
    state.stats = res.data;
    const d = state.stats;

    container.innerHTML = `
      <!-- KPI Metric Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon indigo">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Hostel Rooms</p>
            <p class="kpi-value" id="kpiRooms">${d.totalRooms}</p>
            <p class="kpi-sub">${d.totalBeds} total beds capacity</p>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon green">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Occupied Beds</p>
            <p class="kpi-value" id="kpiOccupied">${d.occupiedBeds}</p>
            <p class="kpi-sub">${d.availableBeds} beds available</p>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon purple">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Digital Passes</p>
            <p class="kpi-value" id="kpiPasses">${d.pendingPasses}</p>
            <p class="kpi-sub">${d.overdueStudents} overdue returns</p>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon cyan">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Maintenance Issues</p>
            <p class="kpi-value" id="kpiComplaints">${d.openComplaints}</p>
            <p class="kpi-sub">${d.pendingRegistrations} registrations pending</p>
          </div>
        </div>
      </div>

      <!-- Occupancy Visualization & Recent Activity -->
      <div class="dashboard-two-col" style="display:grid;grid-template-columns:1fr 1.25fr;gap:1.5rem;margin-bottom:1.5rem;width:100%;box-sizing:border-box;">
        
        <!-- Donut Occupancy Breakdown -->
        <div class="card" style="box-sizing:border-box;width:100%;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <h3 style="font-size:1rem;font-weight:700;color:var(--text-primary);">Hostel Bed Occupancy</h3>
            <span class="badge badge-teal">${d.occupancyRate}% Full</span>
          </div>

          <div style="display:flex;align-items:center;justify-content:center;position:relative;height:180px;">
            <svg viewBox="0 0 180 180" width="180" height="180" style="max-width:160px;height:auto;">
              <circle cx="90" cy="90" r="70" fill="none" stroke="var(--border-light)" stroke-width="18" />
              <!-- Green: Full -->
              <circle id="donutFull" cx="90" cy="90" r="70" fill="none" stroke="var(--status-green)" stroke-width="18" stroke-dasharray="0 440" transform="rotate(-90 90 90)" />
              <!-- Yellow: Partial -->
              <circle id="donutPartial" cx="90" cy="90" r="70" fill="none" stroke="var(--status-amber)" stroke-width="18" stroke-dasharray="0 440" transform="rotate(-90 90 90)" />
              <!-- Red: Empty -->
              <circle id="donutEmpty" cx="90" cy="90" r="70" fill="none" stroke="var(--status-red)" stroke-width="18" stroke-dasharray="0 440" transform="rotate(-90 90 90)" />
            </svg>
            <div style="position:absolute;text-align:center;">
              <span style="font-size:1.75rem;font-weight:800;color:var(--text-primary);display:block;line-height:1;">${d.occupancyRate}%</span>
              <span style="font-size:0.6875rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Occupancy</span>
            </div>
          </div>

          <div class="donut-legend-row" style="display:flex;justify-content:space-around;margin-top:1rem;border-top:1px solid var(--border-light);padding-top:0.75rem;font-size:0.75rem;flex-wrap:wrap;gap:0.4rem;">
            <div style="text-align:center;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--status-green);margin-right:4px;"></span>
              <strong>${d.fullRooms}</strong> Full (🟢)
            </div>
            <div style="text-align:center;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--status-amber);margin-right:4px;"></span>
              <strong>${d.partialRooms}</strong> Partial (🟡)
            </div>
            <div style="text-align:center;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--status-red);margin-right:4px;"></span>
              <strong>${d.emptyRooms}</strong> Empty (🔴)
            </div>
          </div>
        </div>

        <!-- Block-wise Occupancy Breakdown -->
        <div class="card" style="box-sizing:border-box;width:100%;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <h3 style="font-size:1rem;font-weight:700;color:var(--text-primary);">Residential Blocks</h3>
            <span style="font-size:0.75rem;color:var(--text-muted);">S.P.I.T. Campus</span>
          </div>

          <div class="blocks-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;box-sizing:border-box;width:100%;">
            ${(d.blockStats || []).map(b => {
              const rate = b.totalBeds > 0 ? Math.round((b.occupiedBeds / b.totalBeds) * 100) : 0;
              const color = rate >= 75 ? 'var(--status-green)' : rate >= 30 ? 'var(--status-amber)' : 'var(--status-red)';
              return `
                <div style="background:var(--spit-surface-hover);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:0.75rem;box-sizing:border-box;">
                  <div style="display:flex;justify-content:space-between;align-items:baseline;">
                    <strong style="color:var(--spit-navy);font-size:0.875rem;">Block ${b._id}</strong>
                    <span style="font-size:0.75rem;font-weight:700;color:${color}">${rate}%</span>
                  </div>
                  <div style="font-size:0.75rem;color:var(--text-muted);margin:0.25rem 0;">${b.occupiedBeds}/${b.totalBeds} beds occupied</div>
                  <div style="height:5px;background:var(--border-color);border-radius:99px;overflow:hidden;">
                    <div style="height:100%;width:${rate}%;background:${color};border-radius:99px;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Quick Action Buttons for Administrative Roles -->
          <div class="quick-actions-row" style="margin-top:1.25rem;display:flex;gap:0.5rem;flex-wrap:wrap;box-sizing:border-box;width:100%;">
            <button class="btn btn-secondary btn-sm" onclick="navigateTo('rooms')">View Room Grid</button>
            <button class="btn btn-primary btn-sm" onclick="navigateTo('registrations')">Review Registrations (${d.pendingRegistrations})</button>
            <button class="btn btn-secondary btn-sm" onclick="navigateTo('students')">Students Directory</button>
            <button class="btn btn-secondary btn-sm" onclick="navigateTo('reports')">Export CSV</button>
          </div>
        </div>
      </div>
    `;

    // Render Donut Arcs
    const circumference = 2 * Math.PI * 70; // 439.8
    const total = d.totalRooms || 1;
    const lenFull = (d.fullRooms / total) * circumference;
    const lenPartial = (d.partialRooms / total) * circumference;
    const lenEmpty = (d.emptyRooms / total) * circumference;

    const sFull = document.getElementById('donutFull');
    const sPartial = document.getElementById('donutPartial');
    const sEmpty = document.getElementById('donutEmpty');

    if (sFull && sPartial && sEmpty) {
      sFull.style.strokeDasharray = `${lenFull} ${circumference - lenFull}`;
      sFull.style.strokeDashoffset = '0';

      sPartial.style.strokeDasharray = `${lenPartial} ${circumference - lenPartial}`;
      sPartial.style.strokeDashoffset = `-${lenFull}`;

      sEmpty.style.strokeDasharray = `${lenEmpty} ${circumference - lenEmpty}`;
      sEmpty.style.strokeDashoffset = `-${lenFull + lenPartial}`;
    }

    document.getElementById('updatedTime').textContent = new Date().toLocaleTimeString();
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--status-red)">Error loading dashboard: ${err.message}</div>`;
  }
};

// ─── CSV REPORT EXPORT HELPER (Admin & Warden) ──────────────────────────────
window.downloadCsvReport = async (type) => {
  try {
    showToast(`Generating ${type} report…`, 'info');
    const token = sessionStorage.getItem('hostel_token');
    const reportBase = (typeof BASE_URL !== 'undefined') ? BASE_URL : '/api';
    const res = await fetch(`${reportBase}/reports/export/${type}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Export failed with status ${res.status}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spit_hostel_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    showToast(`✓ Downloaded ${type} CSV report!`, 'success');
  } catch (err) {
    showToast(`CSV Download Error: ${err.message}`, 'error');
  }
};

// ─── DEDICATED LEAVE DETAILS MODAL (Warden & Admin) ─────────────────────────
window.openPassDetailsModal = (passId) => {
  const p = window._activePassesMap ? window._activePassesMap[passId] : null;
  if (!p) {
    showToast('Pass record not found.', 'error');
    return;
  }
  const student = p.studentId || {};
  const isPending = p.approvalStatus === 'Pending';
  const appBadge = p.approvalStatus === 'Approved' ? 'badge-green' : p.approvalStatus === 'Rejected' ? 'badge-red' : 'badge-amber';

  openModal(`
    <div style="padding:1.5rem;max-width:600px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;border-bottom:1px solid var(--border);padding-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem;">
        <div>
          <span class="badge badge-teal" style="margin-bottom:0.25rem;">${p.passType} Pass</span>
          <h3 style="font-size:1.25rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem;">${student.name || 'Resident Student'}</h3>
          <p style="font-size:0.8125rem;color:var(--text-muted);">${student.studentId || ''} · ${student.branch || ''} · Room: ${student.allocatedRoom ? `${student.allocatedRoom.roomNumber} (${student.allocatedRoom.block})` : 'Unassigned'}</p>
        </div>
        <span class="badge ${appBadge}" style="font-size:0.875rem;">${p.approvalStatus}</span>
      </div>

      <!-- Prominent Student Reason Box -->
      <div style="background:var(--bg-card-hover);border-left:4px solid var(--spit-teal);padding:1rem 1.25rem;border-radius:var(--radius-sm);margin-bottom:1.25rem;">
        <div style="font-size:0.75rem;font-weight:700;color:var(--spit-teal);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.4rem;">
          Resident Student's Reason for Leave
        </div>
        <div style="font-size:1.15rem;font-weight:700;color:var(--text-primary);line-height:1.4;">
          "${p.reason || 'General Outing / Leave'}"
        </div>
        ${p.destination ? `<div style="font-size:0.8125rem;color:var(--text-secondary);margin-top:0.6rem;">📍 <strong>Destination:</strong> ${p.destination}</div>` : ''}
      </div>

      <!-- Schedule & Curfew Grid -->
      <div class="card" style="margin-bottom:1rem;background:var(--bg-card);">
        <h4 style="font-size:0.8125rem;font-weight:700;color:var(--text-secondary);margin-bottom:0.6rem;text-transform:uppercase;">Timing &amp; Curfew Window</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.8125rem;">
          <div><span style="color:var(--text-muted);">Departure:</span><br><strong>${new Date(p.requestedDeparture).toLocaleString()}</strong></div>
          <div><span style="color:var(--text-muted);">Expected Return:</span><br><strong>${new Date(p.expectedReturn).toLocaleString()}</strong></div>
          <div><span style="color:var(--text-muted);">Digital Pass ID:</span><br><code>${p.qrCodeId}</code></div>
          <div><span style="color:var(--text-muted);">Curfew Status:</span><br><strong>${p.currentStatus}</strong></div>
        </div>
      </div>

      <!-- Guardian Emergency Verification -->
      <div class="card" style="margin-bottom:1.25rem;background:var(--bg-card);border-left:3px solid var(--spit-maroon);">
        <h4 style="font-size:0.8125rem;font-weight:700;color:var(--text-secondary);margin-bottom:0.5rem;text-transform:uppercase;">Emergency Parent / Guardian Verification</h4>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8125rem;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <strong>${student.guardianName || 'Parent / Guardian'}</strong> (${student.guardianRelation || 'Parent'})
          </div>
          <div>
            ${student.guardianPhone ? `<a href="tel:${student.guardianPhone}" class="btn btn-secondary btn-sm" style="color:var(--spit-teal);font-weight:700;">📞 Call ${student.guardianPhone}</a>` : '<span style="color:var(--text-muted);">No phone recorded</span>'}
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.25rem;flex-wrap:wrap;gap:0.5rem;">
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
        ${isPending ? `
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-primary btn-sm" style="background:var(--status-green);border-color:var(--status-green);" onclick="closeModal(); reviewPassAction('${p._id}', 'Approved');">✓ Approve Pass</button>
            <button class="btn btn-secondary btn-sm" style="color:var(--status-red);border-color:var(--status-red-border);" onclick="closeModal(); openRejectPassModal('${p._id}');">✕ Reject</button>
          </div>
        ` : `
          <div style="font-size:0.8125rem;color:var(--text-muted);">
            Reviewed by <strong>${p.approvedBy?.name || 'Warden'}</strong> ${p.remarks ? `· Remarks: "${p.remarks}"` : ''}
          </div>
        `}
      </div>
    </div>
  `);
};

// ─── STUDENT DIGITAL PASS QR CODE DISPLAY MODAL ─────────────────────────────
window.openStudentPassQrModal = (passId) => {
  const p = (window._activePassesMap && window._activePassesMap[passId]) || (_allPassesList && _allPassesList.find(x => x._id === passId));
  if (!p) {
    showToast('Pass record not found.', 'error');
    return;
  }
  const student = p.studentId || state.user || {};
  const isApproved = p.approvalStatus === 'Approved';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(p.qrCodeId)}&format=svg`;

  openModal(`
    <div style="padding:1.5rem;max-width:440px;text-align:center;margin:0 auto;">
      <!-- Institutional Header -->
      <div style="display:flex;align-items:center;justify-content:center;gap:0.6rem;margin-bottom:0.75rem;">
        <img src="assets/spit_logo.png" alt="SPIT Logo" style="height:36px;width:auto;" />
        <div style="text-align:left;">
          <div style="font-size:0.7rem;font-weight:700;color:var(--text-muted);letter-spacing:0.04em;text-transform:uppercase;">SPIT Mumbai Hostel</div>
          <div style="font-size:0.95rem;font-weight:800;color:var(--spit-navy);line-height:1.2;">Digital Gate Pass</div>
        </div>
      </div>

      <!-- Pass Card Badge -->
      <div style="background:var(--spit-surface);border:2px solid ${isApproved ? 'var(--status-green)' : 'var(--border)'};border-radius:var(--radius-lg);padding:1.25rem;box-shadow:var(--shadow-md);margin-bottom:1.25rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.85rem;border-bottom:1px solid var(--border);padding-bottom:0.6rem;">
          <span class="badge badge-teal" style="font-size:0.8rem;">${p.passType}</span>
          <span class="badge ${isApproved ? 'badge-green' : 'badge-amber'}" style="font-size:0.8rem;">
            ${isApproved ? '✓ APPROVED FOR GATE' : p.approvalStatus}
          </span>
        </div>

        <!-- Real 2D QR Code Image -->
        <div style="background:#ffffff;padding:0.85rem;border-radius:12px;display:inline-block;border:1px solid var(--border);margin-bottom:0.75rem;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
          <img src="${qrUrl}" alt="Gate Pass QR Code" style="width:180px;height:180px;display:block;" />
        </div>

        <div style="font-family:monospace;font-size:1.15rem;font-weight:800;color:var(--spit-navy);letter-spacing:0.06em;margin-bottom:0.5rem;">
          ${p.qrCodeId}
        </div>

        <!-- Student Details -->
        <div style="background:var(--bg-card-hover);padding:0.75rem;border-radius:var(--radius-sm);text-align:left;font-size:0.8125rem;line-height:1.5;margin-bottom:0.75rem;">
          <div><strong>Student:</strong> ${student.name || state.user?.name || 'Resident Student'}</div>
          <div><strong>Reg No:</strong> ${student.studentId || 'SPIT Resident'}</div>
          ${p.destination ? `<div><strong>Destination:</strong> ${p.destination}</div>` : ''}
          <div><strong>Departure:</strong> ${new Date(p.requestedDeparture).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
          <div style="color:var(--spit-maroon);font-weight:700;"><strong>Curfew Return:</strong> ${new Date(p.expectedReturn).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
          <div><strong>Current Movement:</strong> <span class="badge badge-teal" style="font-size:0.7rem;">${p.currentStatus}</span></div>
        </div>

        <!-- Physical Instructions for Student -->
        <div style="background:rgba(13, 122, 114, 0.08);border-left:3px solid var(--spit-teal);padding:0.6rem 0.8rem;border-radius:4px;text-align:left;font-size:0.75rem;color:var(--text-secondary);">
          🛡️ <strong>Physical Gate Verification:</strong><br>
          1. Show this QR code to the Security Guard at the <strong>Main Campus Gate</strong>.<br>
          2. Guard scans to verify identity &amp; log your <strong>Departure (Exit)</strong>.<br>
          3. Re-scan at the gate before curfew to log your <strong>Return (Entry)</strong>.
        </div>
      </div>

      <div style="display:flex;justify-content:center;gap:0.75rem;">
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
        <button class="btn btn-primary btn-sm" onclick="window.print()" style="display:inline-flex;align-items:center;gap:0.35rem;">
          <span>🖨️</span> Print / Save Pass
        </button>
      </div>
    </div>
  `);
};

// ─── STUDENT FULL DETAILS MODAL (Admin & Warden Inspection) ──────────────────
const openStudentFullDetailsModal = async (studentId, passId = null) => {
  openModal(`
    <div style="padding:1.5rem;text-align:center;color:var(--text-muted);">
      Loading student details…
    </div>
  `);

  try {
    const res = await API.students.getById(studentId);
    const s = res.data;
    const pass = passId && window._activePassesMap ? window._activePassesMap[passId] : null;

    openModal(`
      <div style="padding:1.5rem;max-width:680px;">
        <!-- Header with Name, Reg No & Status -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem;border-bottom:1px solid var(--border);padding-bottom:1rem;flex-wrap:wrap;gap:0.75rem;">
          <div>
            <span class="role-badge-pill role-student" style="margin-bottom:0.25rem;">Resident Student Profile</span>
            <h3 style="font-size:1.35rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem;">${s.name}</h3>
            <p style="font-size:0.8125rem;color:var(--text-muted);">${s.studentId} · 📧 ${s.email} · 📱 ${s.phone}</p>
          </div>
          <span class="badge ${s.registrationStatus === 'Approved' ? 'badge-green' : 'badge-amber'}">${s.registrationStatus}</span>
        </div>

        <!-- If opened in context of a gate pass, prominently show the Leave Reason! -->
        ${pass ? `
          <div class="card" style="margin-bottom:1rem;border-left:4px solid var(--spit-teal);background:var(--bg-card-hover);">
            <div style="font-size:0.75rem;font-weight:700;color:var(--spit-teal);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.35rem;">
              🎫 Gate Pass — Student's Reason for Leave
            </div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary);line-height:1.4;">
              "${pass.reason || 'General Leave / Outing'}"
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;font-size:0.8125rem;margin-top:0.6rem;">
              <div><strong>Pass Type:</strong> ${pass.passType}</div>
              <div><strong>Destination:</strong> ${pass.destination || 'Local'}</div>
              <div><strong>Departure:</strong> ${new Date(pass.requestedDeparture).toLocaleString()}</div>
              <div><strong>Return:</strong> ${new Date(pass.expectedReturn).toLocaleString()}</div>
            </div>
          </div>
        ` : ''}

        <!-- Resident Student Direct Contact (Student Mobile Priority) -->
        <div class="card" style="margin-bottom:1rem;border-left:4px solid var(--spit-teal);background:var(--bg-card-hover);">
          <h4 style="font-size:0.875rem;font-weight:700;color:var(--text-primary);margin-bottom:0.75rem;">📱 Student Direct Contact &amp; Identifiers</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.8125rem;">
            <div><strong>Student Mobile:</strong> <a href="tel:${s.phone}" style="color:var(--spit-teal);font-weight:700;">📞 ${s.phone || 'Not recorded'}</a></div>
            <div><strong>College Email:</strong> <a href="mailto:${s.email}" style="color:var(--text-primary);font-weight:600;">📧 ${s.email}</a></div>
            <div><strong>Registration ID:</strong> <span style="font-family:monospace;font-weight:700;">${s.studentId}</span></div>
            <div><strong>Enrollment Status:</strong> <span class="badge ${s.isActive ? 'badge-green' : 'badge-red'}">${s.isActive ? 'Active Resident' : 'Inactive'}</span></div>
          </div>
        </div>

        <!-- Academic & Enrollment Details -->
        <div class="card" style="margin-bottom:1rem;background:var(--bg-card-hover);">
          <h4 style="font-size:0.875rem;font-weight:700;color:var(--text-primary);margin-bottom:0.75rem;">🎓 Academic &amp; Enrollment Details</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.8125rem;">
            <div><strong>Programme:</strong> ${s.course}</div>
            <div><strong>Branch:</strong> ${s.branch}</div>
            <div><strong>Academic Year:</strong> <span class="badge badge-teal">${s.academicYear}</span></div>
            <div><strong>Admission Year:</strong> ${s.admissionYear}</div>
            <div><strong>Gender:</strong> ${s.gender}</div>
            <div><strong>Institution:</strong> ${s.institution}</div>
          </div>
        </div>

        <!-- Parent / Guardian Details -->
        <div class="card" style="margin-bottom:1rem;border-left:4px solid var(--spit-maroon);background:var(--bg-card-hover);">
          <h4 style="font-size:0.875rem;font-weight:700;color:var(--text-primary);margin-bottom:0.75rem;">👨‍👩‍👦 Parent / Guardian Emergency Details</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.8125rem;">
            <div><strong>Guardian Name:</strong> ${s.guardianName || 'Not recorded'}</div>
            <div><strong>Relationship:</strong> ${s.guardianRelation || 'Parent'}</div>
            <div><strong>Emergency Contact:</strong> <a href="tel:${s.guardianPhone}" style="color:var(--spit-teal);font-weight:700;">📞 ${s.guardianPhone || 'Not recorded'}</a></div>
            <div><strong>Role in System:</strong> Emergency Contact (No login account)</div>
          </div>
        </div>

        <!-- Room & Mess Allocation -->
        <div class="card" style="margin-bottom:1rem;background:var(--bg-card-hover);">
          <h4 style="font-size:0.875rem;font-weight:700;color:var(--text-primary);margin-bottom:0.75rem;">🛏️ Hostel Room &amp; Mess Plan</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.8125rem;">
            <div><strong>Allocated Room:</strong> ${s.allocatedRoom ? `Room ${s.allocatedRoom.roomNumber} (Block ${s.allocatedRoom.block})` : '<span style="color:var(--status-amber)">Pending Allocation</span>'}</div>
            <div><strong>Allocated Bed:</strong> ${s.allocatedBed ? `Bed ${s.allocatedBed}` : '—'}</div>
            <div><strong>Mess Plan:</strong> ${s.messPreference || 'Regular Vegetarian Mess'}</div>
            <div><strong>Senior Student Mentor:</strong> ${s.assignedMentor?.name || 'Unassigned'}</div>
          </div>
        </div>

        <!-- Fee Receipt Inspection Section -->
        <div class="card" style="margin-bottom:1.25rem;background:var(--bg-card-hover);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
            <h4 style="font-size:0.875rem;font-weight:700;color:var(--text-primary);margin:0;">🧾 Fee Receipt Verification</h4>
            <button class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:0.25rem 0.6rem;" onclick="openFeeReceiptModal('${s._id}')">
              👁️ View Receipt Voucher
            </button>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8125rem;flex-wrap:wrap;gap:0.5rem;">
            <div>
              <div><strong>File:</strong> ${s.feeReceipt?.fileName || 'Fee Receipt Document'}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Uploaded: ${s.feeReceipt?.uploadDate ? new Date(s.feeReceipt.uploadDate).toLocaleDateString() : 'N/A'}</div>
            </div>
            <span class="badge ${s.feeReceipt?.verificationStatus === 'Verified' ? 'badge-green' : 'badge-amber'}">${s.feeReceipt?.verificationStatus || 'Pending'}</span>
          </div>
          ${s.feeReceipt?.remarks ? `<p style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.35rem;"><strong>Admin Remarks:</strong> ${s.feeReceipt.remarks}</p>` : ''}
        </div>

        <!-- Action buttons -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;border-top:1px solid var(--border);padding-top:1rem;">
          <div>
            ${state.user.role === 'admin' ? `
              <button class="btn btn-primary btn-sm" onclick="closeModal(); openPromoteStudentModal('${s._id}', '${s.name}', '${s.academicYear}', ${s.year || 1});">
                🎓 Promote to Next Year &amp; Free Bed
              </button>
            ` : ''}
          </div>
          <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
        </div>
      </div>
    `);
  } catch (err) {
    openModal(`<div style="padding:1.5rem;color:var(--status-red);">Error loading student profile: ${err.message}</div>`);
  }
};

// ─── CHANGE MESS MODAL (Student Self-Service) ────────────────────────────────
const openChangeMessModal = async (currentMess) => {
  openModal(`
    <div style="padding:1.5rem;max-width:520px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h3 style="font-size:1.15rem;font-weight:700;color:var(--text-primary);">Change Hostel Mess Plan</h3>
        <button class="modal-close-btn" onclick="closeModal()" style="background:none;border:none;font-size:1.25rem;cursor:pointer;color:var(--text-muted);">✕</button>
      </div>
      <p style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:1.25rem;">
        Select from the institution-verified dining plans enabled by the SPIT hostel administration.
      </p>

      <div id="messOptionsList" style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1.5rem;">
        <div style="text-align:center;padding:1rem;color:var(--text-muted);">Loading available mess plans…</div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:0.5rem;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn btn-primary btn-sm" id="confirmMessBtn" onclick="submitChangeMess()">Confirm Mess Change</button>
      </div>
    </div>
  `);

  try {
    const res = await API.settings.get();
    const settings = res.data;
    const options = settings.messOptions || [];
    const listEl = document.getElementById('messOptionsList');

    if (options.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.8125rem;">Mess options will be confirmed by the hostel administration.</p>';
      return;
    }

    listEl.innerHTML = options.filter(o => o.isActive).map((opt, idx) => {
      const isSelected = currentMess && currentMess.includes(opt.name);
      return `
        <label style="display:flex;gap:0.75rem;align-items:flex-start;background:var(--bg-card-hover);border:1.5px solid ${isSelected ? 'var(--spit-teal)' : 'var(--border)'};border-radius:var(--radius-sm);padding:0.85rem;cursor:pointer;">
          <input type="radio" name="messChoice" value="${opt.name} (₹${opt.monthlyFee}/mo - ${opt.mealCoverage})" ${isSelected || idx === 0 ? 'checked' : ''} style="margin-top:0.25rem;" />
          <div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;">
              <strong style="font-size:0.875rem;color:var(--text-primary);">${opt.name}</strong>
              <span style="font-size:0.8125rem;font-weight:700;color:var(--spit-teal);">₹${opt.monthlyFee?.toLocaleString()}/mo</span>
            </div>
            <p style="font-size:0.75rem;color:var(--text-muted);margin:0.2rem 0;">Meals: ${opt.mealCoverage}</p>
            <p style="font-size:0.75rem;color:var(--text-secondary);">${opt.description}</p>
          </div>
        </label>
      `;
    }).join('');
  } catch (err) {
    document.getElementById('messOptionsList').innerHTML = `<p style="color:var(--status-red);font-size:0.8125rem;">Error loading mess options: ${err.message}</p>`;
  }
};

const submitChangeMess = async () => {
  const selected = document.querySelector('input[name="messChoice"]:checked');
  if (!selected) {
    showToast('Please select a mess plan', 'error');
    return;
  }
  const btn = document.getElementById('confirmMessBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Updating…';
  }
  try {
    await API.students.changeMyMess(selected.value);
    showToast('Mess plan updated successfully!', 'success');
    closeModal();
    navigateTo(state.currentPage);
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Confirm Mess Change';
    }
  }
};

// ─── REJECT PASS MODAL (Warden Remark) ──────────────────────────────────────
const openRejectPassModal = (id) => {
  openModal(`
    <div style="padding:1.5rem;">
      <h3 style="font-size:1.125rem;font-weight:700;color:var(--status-red);margin-bottom:0.75rem;">
        Reject Gate Pass Request
      </h3>
      <p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:1rem;">
        Specify reason for rejecting this pass request so the student understands institutional policy.
      </p>
      <form onsubmit="handleRejectPassSubmit(event, '${id}')">
        <div class="form-group">
          <label class="form-label">Rejection Reason *</label>
          <textarea id="passRejectReason" class="form-control" rows="3" placeholder="e.g. Curfew violation on previous pass / Parent verification unconfirmed" required></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm" style="background:var(--status-red);border-color:var(--status-red);">Confirm Rejection</button>
        </div>
      </form>
    </div>
  `);
};

const handleRejectPassSubmit = async (e, id) => {
  e.preventDefault();
  const remarks = document.getElementById('passRejectReason').value.trim();
  try {
    await API.passes.review(id, { status: 'Rejected', remarks });
    showToast('Pass rejected.', 'info');
    closeModal();
    navigateTo(state.currentPage);
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ─── VIEW 2: Hostel Rooms (🔴 Red / 🟡 Yellow / 🟢 Green) ───────────────────
const renderRoomsView = async () => {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading room allocation grid…</div>';

  try {
    const res = await API.rooms.getAll();
    state.rooms = res.data;

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:1rem;">
        <!-- Color Legend -->
        <div style="display:flex;gap:0.75rem;align-items:center;font-size:0.8125rem;">
          <span style="font-weight:600;color:var(--text-primary)">Color Status:</span>
          <span class="badge badge-red">🔴 Empty (0 Beds)</span>
          <span class="badge badge-amber">🟡 Partially Filled</span>
          <span class="badge badge-green">🟢 Full</span>
        </div>

        <!-- Filter bar -->
        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
          <select id="roomBlockFilter" class="form-control" style="width:auto;" onchange="filterRooms()">
            <option value="">All Blocks</option>
            <option value="A">Block A</option>
            <option value="B">Block B</option>
            <option value="C">Block C</option>
            <option value="D">Block D</option>
          </select>
          <select id="roomStatusFilter" class="form-control" style="width:auto;" onchange="filterRooms()">
            <option value="">All Statuses</option>
            <option value="empty">Empty (Red)</option>
            <option value="partial">Partial (Yellow)</option>
            <option value="full">Full (Green)</option>
          </select>
          <input type="text" id="roomSearchInput" class="form-control" placeholder="🔍 Search room no, block, or resident…" style="min-width:180px;flex:1;" oninput="filterRooms()" />
          <button class="btn btn-secondary btn-sm" onclick="downloadCsvReport('rooms')">📥 Export Rooms CSV</button>
          ${state.user.role === 'admin' ? `
            <button class="btn btn-primary btn-sm" onclick="openAddRoomModal()">+ Add Room</button>
          ` : ''}
        </div>
      </div>

      <div class="rooms-grid" id="roomsGridContainer">
        <!-- Room cards populated here -->
      </div>
    `;

    populateRoomsGrid(state.rooms);
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--status-red)">Error loading rooms: ${err.message}</div>`;
  }
};

const populateRoomsGrid = (roomsList) => {
  const grid = document.getElementById('roomsGridContainer');
  if (!grid) return;

  if (roomsList.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted)">No rooms found matching your filter criteria.</div>';
    return;
  }

  grid.innerHTML = roomsList.map(r => {
    const status = r.occupancyStatus || (r.occupiedBeds === 0 ? 'empty' : r.occupiedBeds >= r.capacity ? 'full' : 'partial');
    const occupied = r.occupiedBeds || 0;
    const capacity = r.capacity || 2;

    const bedSlots = Array.from({ length: capacity }, (_, i) =>
      `<span class="bed-slot ${i < occupied ? 'occupied' : 'empty'}" title="Bed ${i + 1}"></span>`
    ).join('');

    return `
      <div class="room-card ${status}" onclick="openRoomDetailModal('${r._id}')">
        <span class="room-status-indicator"></span>
        <div class="room-number-heading">Room ${r.roomNumber}</div>
        <div class="room-meta-info">Block ${r.block} · Floor ${r.floor} · ${r.roomType}</div>
        <div class="room-beds-row">${bedSlots}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);display:flex;justify-content:space-between;margin-top:auto;">
          <span>₹${r.monthlyRent?.toLocaleString()}/mo</span>
          <strong>${occupied}/${capacity} Beds</strong>
        </div>
      </div>
    `;
  }).join('');
};

const filterRooms = () => {
  const block = document.getElementById('roomBlockFilter')?.value;
  const status = document.getElementById('roomStatusFilter')?.value;
  const search = (document.getElementById('roomSearchInput')?.value || '').trim().toUpperCase();

  const filtered = state.rooms.filter(r => {
    if (block && r.block !== block) return false;
    const roomStatus = r.occupancyStatus || (r.occupiedBeds === 0 ? 'empty' : r.occupiedBeds >= r.capacity ? 'full' : 'partial');
    if (status && roomStatus !== status) return false;
    if (search) {
      const roomNumStr = String(r.roomNumber || '').toUpperCase();
      const blockStr = String(r.block || '').toUpperCase();
      const typeStr = String(r.roomType || '').toUpperCase();
      const matchesRoom = roomNumStr.includes(search) ||
        blockStr.includes(search) ||
        typeStr.includes(search) ||
        `BLOCK ${blockStr}`.includes(search) ||
        `ROOM ${roomNumStr}`.includes(search) ||
        `${blockStr}-${roomNumStr}`.includes(search);

      const matchesStudent = (r.allocations || []).some(a => {
        const student = a.student || {};
        const name = String(student.name || '').toUpperCase();
        const sid = String(student.studentId || '').toUpperCase();
        return name.includes(search) || sid.includes(search);
      });

      if (!matchesRoom && !matchesStudent) return false;
    }
    return true;
  });

  populateRoomsGrid(filtered);
};

// Room Detail Modal
const openRoomDetailModal = async (roomId) => {
  try {
    const res = await API.rooms.getById(roomId);
    const r = res.data;
    const occupied = r.occupiedBeds || 0;
    const status = r.occupancyStatus || (occupied === 0 ? 'empty' : occupied >= r.capacity ? 'full' : 'partial');

    openModal(`
      <div style="padding:1.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <div>
            <h3 style="font-size:1.25rem;font-weight:700;color:var(--spit-navy)">Room ${r.roomNumber} Details</h3>
            <span style="font-size:0.8125rem;color:var(--text-muted)">Block ${r.block} · Floor ${r.floor}</span>
          </div>
          <span class="badge ${status === 'full' ? 'badge-green' : status === 'partial' ? 'badge-amber' : 'badge-red'}">
            ${status.toUpperCase()} (${occupied}/${r.capacity} Beds)
          </span>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;font-size:0.875rem;margin-bottom:1.25rem;">
          <div><strong>Room Type:</strong> ${r.roomType}</div>
          <div><strong>Monthly Fee:</strong> ₹${r.monthlyRent?.toLocaleString()}</div>
          <div><strong>Amenities:</strong> ${(r.amenities || []).join(', ') || 'Standard room furnishings'}</div>
          <div><strong>Status:</strong> ${r.isActive ? 'Active for Allocation' : 'Under Maintenance'}</div>
        </div>

        <div style="border-top:1px solid var(--border-color);padding-top:1rem;margin-top:1rem;">
          <h4 style="font-size:0.9375rem;font-weight:700;color:var(--spit-navy);margin-bottom:0.75rem;">Current Occupants</h4>
          ${(r.allocations || []).length === 0 ? `
            <p style="font-size:0.8125rem;color:var(--text-muted)">No active allocations for this room.</p>
          ` : `
            <ul style="list-style:none;display:flex;flex-direction:column;gap:0.5rem;font-size:0.8125rem;">
              ${r.allocations.map(a => `
                <li style="display:flex;justify-content:space-between;background:var(--spit-surface-hover);padding:0.5rem 0.75rem;border-radius:var(--radius-sm);">
                  <span><strong>Bed ${a.bedNumber}:</strong> ${a.student?.name || 'Assigned Student'} (${a.student?.studentId || ''})</span>
                  ${state.user.role === 'admin' ? `
                    <button class="btn btn-secondary btn-sm" onclick="vacateBed('${a._id}')">Vacate Bed</button>
                  ` : ''}
                </li>
              `).join('')}
            </ul>
          `}
        </div>

        <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem;">
          ${state.user.role === 'admin' && occupied < r.capacity ? `
            <button class="btn btn-primary btn-sm" onclick="openAllocateBedModal('${r._id}', '${r.roomNumber}', ${r.capacity})">Allocate Student to Bed</button>
          ` : ''}
          <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
        </div>
      </div>
    `);
  } catch (err) {
    showToast('Failed to load room details: ' + err.message, 'error');
  }
};

// ─── Room Creation & Bed Allocation Modal Handlers ─────────────────────────
const openAddRoomModal = () => {
  openModal(`
    <div style="padding:1.5rem;max-width:520px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;border-bottom:1px solid var(--border);padding-bottom:0.75rem;">
        <div>
          <span class="badge badge-teal" style="margin-bottom:0.25rem;">SPIT Estate &amp; Hostels</span>
          <h3 style="font-size:1.15rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem;">+ Add New Hostel Room</h3>
        </div>
        <button class="modal-close-btn" onclick="closeModal()" style="background:none;border:none;font-size:1.25rem;cursor:pointer;color:var(--text-muted);">✕</button>
      </div>

      <form onsubmit="handleAddRoomSubmit(event)">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.75rem;">
          <div class="form-group">
            <label class="form-label">Room Number *</label>
            <input type="text" id="newRoomNo" class="form-control" placeholder="e.g. A-301" required />
          </div>
          <div class="form-group">
            <label class="form-label">Block / Wing *</label>
            <select id="newRoomBlock" class="form-control" required>
              <option value="A">Block A (Senior Boys Wing)</option>
              <option value="B">Block B (Junior Wing)</option>
              <option value="C">Block C (Girls Wing)</option>
              <option value="D">Block D (Annex Wing)</option>
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.75rem;">
          <div class="form-group">
            <label class="form-label">Floor Number *</label>
            <input type="number" id="newRoomFloor" class="form-control" value="1" min="0" max="10" required />
          </div>
          <div class="form-group">
            <label class="form-label">Bed Capacity *</label>
            <select id="newRoomCapacity" class="form-control" onchange="updateRoomTypeFromCapacity(this.value)" required>
              <option value="1">1 Bed (Single)</option>
              <option value="2" selected>2 Beds (Double)</option>
              <option value="3">3 Beds (Triple)</option>
              <option value="4">4 Beds (Dormitory)</option>
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.75rem;">
          <div class="form-group">
            <label class="form-label">Room Type *</label>
            <select id="newRoomType" class="form-control" required>
              <option value="double" selected>Double Occupancy</option>
              <option value="single">Single Occupancy</option>
              <option value="triple">Triple Occupancy</option>
              <option value="dormitory">Dormitory</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Monthly Rent (₹) *</label>
            <input type="number" id="newRoomRent" class="form-control" value="6500" min="1000" step="500" required />
          </div>
        </div>

        <div class="form-group" style="margin-bottom:1.25rem;">
          <label class="form-label">Amenities</label>
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;font-size:0.8125rem;">
            <label><input type="checkbox" id="amenityWifi" checked /> Campus Wi-Fi</label>
            <label><input type="checkbox" id="amenityDesk" checked /> Study Table</label>
            <label><input type="checkbox" id="amenityBath" checked /> Attached Washroom</label>
            <label><input type="checkbox" id="amenityBalcony" /> Balcony</label>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:0.75rem;border-top:1px solid var(--border);padding-top:1rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">+ Create Room</button>
        </div>
      </form>
    </div>
  `);
};

const updateRoomTypeFromCapacity = (cap) => {
  const typeSelect = document.getElementById('newRoomType');
  if (!typeSelect) return;
  if (cap == 1) typeSelect.value = 'single';
  else if (cap == 2) typeSelect.value = 'double';
  else if (cap == 3) typeSelect.value = 'triple';
  else typeSelect.value = 'dormitory';
};

const handleAddRoomSubmit = async (e) => {
  e.preventDefault();
  const amenities = [];
  if (document.getElementById('amenityWifi')?.checked) amenities.push('Campus Wi-Fi');
  if (document.getElementById('amenityDesk')?.checked) amenities.push('Study Table & Chair');
  if (document.getElementById('amenityBath')?.checked) amenities.push('Attached Washroom');
  if (document.getElementById('amenityBalcony')?.checked) amenities.push('Balcony View');

  const payload = {
    roomNumber: document.getElementById('newRoomNo').value.trim().toUpperCase(),
    block: document.getElementById('newRoomBlock').value,
    floor: Number(document.getElementById('newRoomFloor').value),
    capacity: Number(document.getElementById('newRoomCapacity').value),
    roomType: document.getElementById('newRoomType').value,
    monthlyRent: Number(document.getElementById('newRoomRent').value),
    amenities: amenities.length > 0 ? amenities : ['Wi-Fi', 'Study Table'],
    isActive: true,
  };

  try {
    await API.rooms.create(payload);
    showToast(`Room ${payload.roomNumber} created successfully!`, 'success');
    closeModal();
    renderRoomsView();
  } catch (err) {
    showToast(err.message || 'Failed to create room', 'error');
  }
};

const openAllocateBedModal = async (roomId, roomNumber, capacity) => {
  openModal(`
    <div style="padding:1.5rem;max-width:500px;">
      <h3 style="font-size:1.15rem;font-weight:700;color:var(--text-primary);margin-bottom:0.5rem;">
        Allocate Student to Room ${roomNumber}
      </h3>
      <p style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:1rem;">Select an enrolled student who is currently awaiting bed allocation.</p>
      <div id="allocateModalContent">Loading unallocated students…</div>
    </div>
  `);

  try {
    const res = await API.students.getAll({ limit: 150 });
    const unallocated = res.data.filter(s => !s.allocatedRoom && s.registrationStatus === 'Approved');

    const content = document.getElementById('allocateModalContent');
    if (!content) return;

    if (unallocated.length === 0) {
      content.innerHTML = `
        <div class="card" style="margin-bottom:1rem;color:var(--text-muted);font-size:0.875rem;">
          No approved students are currently awaiting room allocation. All eligible students already have beds or need registration approval first.
        </div>
        <div style="text-align:right;">
          <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <form onsubmit="handleAllocateBedSubmit(event, '${roomId}')">
        <div class="form-group" style="margin-bottom:1rem;">
          <label class="form-label">Eligible Resident Student *</label>
          <select id="allocStudentId" class="form-control" required>
            ${unallocated.map(s => `
              <option value="${s._id}">${s.name} (${s.studentId} · ${s.academicYear} · ${s.branch})</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group" style="margin-bottom:1.25rem;">
          <label class="form-label">Bed Assignment Number *</label>
          <select id="allocBedNumber" class="form-control" required>
            ${Array.from({ length: capacity }, (_, i) => i + 1).map(num => `
              <option value="${num}">Bed #${num}</option>
            `).join('')}
          </select>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:0.75rem;border-top:1px solid var(--border);padding-top:1rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">Confirm Bed Allocation</button>
        </div>
      </form>
    `;
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const handleAllocateBedSubmit = async (e, roomId) => {
  e.preventDefault();
  const studentId = document.getElementById('allocStudentId').value;
  const bedNumber = Number(document.getElementById('allocBedNumber').value);

  try {
    await API.allocations.create({ student: studentId, room: roomId, bedNumber });
    showToast('Bed allocated successfully!', 'success');
    closeModal();
    renderRoomsView();
  } catch (err) {
    showToast(err.message || 'Allocation failed', 'error');
  }
};

const vacateBed = async (allocationId) => {
  if (!confirm('Are you sure you want to vacate this bed? The room status will update automatically.')) return;
  try {
    await API.allocations.vacate(allocationId, { remarks: 'Admin manual checkout' });
    showToast('Bed vacated successfully. Room count updated.', 'success');
    closeModal();
    renderRoomsView();
  } catch (err) {
    showToast(err.message || 'Vacate failed', 'error');
  }
};

// ─── VIEW 3: Registration Reviews (Verification & Approval Queue) ───────────
let _allRegistrationsList = [];

const renderRegistrationsView = async () => {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading student registrations…</div>';

  try {
    const res = await API.students.getAll({ limit: 100 });
    _allRegistrationsList = res.data || [];

    container.innerHTML = `
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem;border-bottom:1px solid var(--border);padding-bottom:1rem;">
          <div>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">
              <h3 style="font-size:1.15rem;font-weight:700;color:var(--spit-navy);">Hostel Admission Registrations (Review Queue)</h3>
              <span class="badge badge-teal">Incoming Applications</span>
            </div>
            <p style="font-size:0.8125rem;color:var(--text-muted);">
              <strong>Verification Workflow:</strong> Inspect uploaded fee receipts, verify payment details, and approve or reject admissions. Enrolled active students reside in the <em>Resident Students Directory</em>.
            </p>
          </div>
          <span style="font-size:0.8125rem;color:var(--text-muted);font-weight:600;" id="regRecordCount">Total Records: ${_allRegistrationsList.length}</span>
        </div>

        <!-- Search & Filter Toolbar -->
        <div style="display:flex;gap:0.6rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap;">
          <input type="text" id="regSearchInput" class="form-control" placeholder="🔍 Search applicant name, reg no, branch, phone..." style="flex:1;min-width:220px;" oninput="filterRegistrations()" />
          <select id="regStatusFilter" class="form-control" style="width:auto;" onchange="filterRegistrations()">
            <option value="">All Statuses</option>
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select id="regFeeFilter" class="form-control" style="width:auto;" onchange="filterRegistrations()">
            <option value="">All Fee Receipts</option>
            <option value="Verified">Fee Verified</option>
            <option value="Pending">Fee Pending</option>
            <option value="Rejected">Fee Rejected</option>
          </select>
          <button class="btn btn-secondary btn-sm" onclick="downloadCsvReport('receipts')">📥 Export CSV</button>
        </div>

        <div style="overflow-x:auto;">
          <table class="data-table" style="width:100%;font-size:0.8125rem;">
            <thead>
              <tr>
                <th>Reg. No.</th>
                <th>Student Name</th>
                <th>Branch</th>
                <th>Year</th>
                <th>Fee Receipt Status</th>
                <th>Admission Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="regTableBody">
            </tbody>
          </table>
        </div>
      </div>
    `;

    filterRegistrations();
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--status-red)">Error loading registrations: ${err.message}</div>`;
  }
};

const filterRegistrations = () => {
  const search = (document.getElementById('regSearchInput')?.value || '').trim().toUpperCase();
  const statusFilter = document.getElementById('regStatusFilter')?.value;
  const feeFilter = document.getElementById('regFeeFilter')?.value;
  const tbody = document.getElementById('regTableBody');
  const countEl = document.getElementById('regRecordCount');
  if (!tbody) return;

  const filtered = _allRegistrationsList.filter(s => {
    if (statusFilter && s.registrationStatus !== statusFilter) return false;
    const feeStatus = s.feeReceipt?.verificationStatus || 'Pending';
    if (feeFilter && feeStatus !== feeFilter) return false;
    if (search) {
      const name = String(s.name || '').toUpperCase();
      const sid = String(s.studentId || '').toUpperCase();
      const branch = String(s.branch || '').toUpperCase();
      const phone = String(s.phone || '').toUpperCase();
      const email = String(s.email || '').toUpperCase();
      if (!name.includes(search) && !sid.includes(search) && !branch.includes(search) && !phone.includes(search) && !email.includes(search)) {
        return false;
      }
    }
    return true;
  });

  if (countEl) countEl.textContent = `Showing: ${filtered.length} of ${_allRegistrationsList.length}`;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No student registrations match your search criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const regBadge = s.registrationStatus === 'Approved' ? 'badge-green' : s.registrationStatus === 'Rejected' ? 'badge-red' : 'badge-amber';
    const feeBadge = s.feeReceipt?.verificationStatus === 'Verified' ? 'badge-green' : s.feeReceipt?.verificationStatus === 'Rejected' ? 'badge-red' : 'badge-amber';
    return `
      <tr>
        <td><strong>${s.studentId}</strong></td>
        <td>${s.name}</td>
        <td>${s.branch}</td>
        <td>${s.academicYear}</td>
        <td>
          <div style="display:flex;align-items:center;gap:0.4rem;">
            <span class="badge ${feeBadge}">${s.feeReceipt?.verificationStatus || 'Pending'}</span>
            <button class="btn btn-secondary btn-sm" style="font-size:0.72rem;padding:0.2rem 0.45rem;" onclick="openFeeReceiptModal('${s._id}')" title="Inspect fee payment receipt">
              👁️ View Receipt
            </button>
          </div>
        </td>
        <td><span class="badge ${regBadge}">${s.registrationStatus}</span></td>
        <td style="display:flex;gap:0.35rem;">
          <button class="btn btn-primary btn-sm" style="font-size:0.75rem;padding:0.25rem 0.55rem;" onclick="openReviewRegistrationModal('${s._id}')">
            Review &amp; Decide
          </button>
        </td>
      </tr>
    `;
  }).join('');
};

const openReviewRegistrationModal = async (studentId) => {
  try {
    const [sRes, roomsRes] = await Promise.all([
      API.students.getById(studentId),
      API.rooms.getAll({ limit: 200 }),
    ]);
    const s = sRes.data;
    const rooms = (roomsRes.data || []).filter(r => r.occupiedBeds < r.capacity);

    const roomOptions = rooms.map(r => {
      const free = r.capacity - r.occupiedBeds;
      return `<option value="${r._id}">${r.roomNumber} (Block ${r.block}, ${r.roomType}) — ${free} bed${free !== 1 ? 's' : ''} free</option>`;
    }).join('');

    const messOpts = [
      'Regular Vegetarian Mess',
      'Special Mess (Veg + Non-Veg Days)',
    ].map(m => `<option value="${m}" ${s.messPreference === m ? 'selected' : ''}>${m}</option>`).join('');

    openModal(`
      <div style="padding:1.5rem;max-width:660px;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-color);padding-bottom:0.75rem;margin-bottom:1.25rem;">
          <h3 style="font-size:1.15rem;font-weight:700;color:var(--text-primary);">Review Admission: ${s.name}</h3>
          <span class="badge badge-teal">${s.studentId}</span>
        </div>

        <!-- Student Details -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.65rem;font-size:0.8125rem;margin-bottom:1.25rem;">
          <div><strong>Email:</strong> ${s.email}</div>
          <div><strong>Phone:</strong> <a href="tel:${s.phone}" style="color:var(--spit-teal);">${s.phone}</a></div>
          <div><strong>Programme:</strong> ${s.course} — ${s.branch}</div>
          <div><strong>Year:</strong> ${s.academicYear}</div>
          <div><strong>Guardian:</strong> ${s.guardianName || '—'} (${s.guardianPhone || '—'})</div>
          <div><strong>Mess Choice (Registered):</strong> ${s.messPreference || 'Not selected'}</div>
          <div><strong>Current Status:</strong> <span class="badge badge-amber">${s.registrationStatus}</span></div>
          <div>
            <button class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:0.2rem 0.5rem;" onclick="openFeeReceiptModal('${s._id}')">
              👁️ View Fee Receipt
            </button>
          </div>
        </div>

        <!-- Step 1: Mess Confirmation -->
        <div style="border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1rem;margin-bottom:1rem;">
          <h4 style="font-size:0.875rem;font-weight:700;color:var(--text-primary);margin-bottom:0.6rem;">① Confirm Mess Plan</h4>
          <select id="reviewMessPref" class="form-control" style="font-size:0.8125rem;">
            ${messOpts}
          </select>
        </div>

        <!-- Step 2: Room Allocation -->
        <div style="border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1rem;margin-bottom:1rem;">
          <h4 style="font-size:0.875rem;font-weight:700;color:var(--text-primary);margin-bottom:0.25rem;">② Allocate Room <span style="font-weight:400;color:var(--text-muted);font-size:0.75rem;">(optional — can be done later)</span></h4>
          <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.6rem;">Showing ${rooms.length} room(s) with free beds. Student's dashboard will update immediately upon approval.</p>
          <select id="reviewRoomId" class="form-control" style="font-size:0.8125rem;margin-bottom:0.5rem;">
            <option value="">— Do not allocate a room yet —</option>
            ${roomOptions}
          </select>
          <select id="reviewBedNumber" class="form-control" style="font-size:0.8125rem;">
            <option value="">— Auto-assign bed number —</option>
            <option value="1">Bed 1</option>
            <option value="2">Bed 2</option>
            <option value="3">Bed 3</option>
          </select>
        </div>

        <!-- Step 3: Set Login Password -->
        <div style="border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1rem;margin-bottom:1.25rem;">
          <h4 style="font-size:0.875rem;font-weight:700;color:var(--text-primary);margin-bottom:0.25rem;">③ Student Login Password <span style="font-weight:400;color:var(--text-muted);font-size:0.75rem;">(defaults to phone number if blank)</span></h4>
          <input type="text" id="reviewPassword" class="form-control" style="font-size:0.8125rem;" placeholder="Leave blank to use student's phone number as password" />
        </div>

        <!-- Action Buttons -->
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;border-top:1px solid var(--border-color);padding-top:1rem;">
          <button class="btn btn-primary btn-sm" style="background:var(--status-green);border-color:var(--status-green);" onclick="confirmReview('${s._id}', 'Approved')">
            ✓ Approve &amp; Allocate Room
          </button>
          <button class="btn btn-secondary btn-sm" style="color:var(--status-red);" onclick="confirmReview('${s._id}', 'Rejected')">
            ✗ Reject Application
          </button>
          <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
        </div>
      </div>
    `);
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const openFeeReceiptModal = async (studentId) => {
  openModal(`
    <div style="padding:1.5rem;text-align:center;color:var(--text-muted)">
      Loading fee payment receipt…
    </div>
  `);

  try {
    const res = await API.students.getById(studentId);
    const s = res.data;
    const rc = s.feeReceipt || {};
    const hasDataUrl = rc.fileData && (rc.fileData.startsWith('data:image/') || rc.fileData.startsWith('data:application/pdf'));

    openModal(`
      <div style="padding:1.5rem;max-width:620px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--border);padding-bottom:1rem;margin-bottom:1.25rem;">
          <div>
            <span class="badge badge-teal" style="margin-bottom:0.25rem;">SPIT Institutional Finance</span>
            <h3 style="font-size:1.2rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem;">
              Hostel Fee Payment Receipt
            </h3>
            <p style="font-size:0.8125rem;color:var(--text-muted);">${s.name} · ${s.studentId}</p>
          </div>
          <span class="badge ${rc.verificationStatus === 'Verified' ? 'badge-green' : rc.verificationStatus === 'Rejected' ? 'badge-red' : 'badge-amber'}">
            ${rc.verificationStatus || 'Pending Verification'}
          </span>
        </div>

        ${hasDataUrl ? `
          <div style="margin-bottom:1.25rem;text-align:center;background:var(--bg-card-hover);padding:1rem;border-radius:var(--radius-sm);border:1px solid var(--border);">
            ${rc.fileData.startsWith('data:image/') ? `
              <img src="${rc.fileData}" alt="Uploaded Fee Receipt" style="max-width:100%;max-height:380px;object-fit:contain;border-radius:var(--radius-sm);box-shadow:var(--shadow-card);" />
            ` : `
              <iframe src="${rc.fileData}" style="width:100%;height:380px;border:none;"></iframe>
            `}
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem;">Uploaded Document: <strong>${rc.fileName || 'fee_receipt.png'}</strong></p>
          </div>
        ` : `
          <!-- Official SPIT Institutional Fee Payment Voucher View -->
          <div style="background:var(--bg-card-hover);border:2px dashed var(--spit-teal);border-radius:var(--radius-sm);padding:1.25rem;margin-bottom:1.25rem;font-family:inherit;">
            <div style="text-align:center;border-bottom:1px solid var(--border);padding-bottom:0.75rem;margin-bottom:0.75rem;">
              <div style="font-size:0.95rem;font-weight:800;color:var(--spit-navy);text-transform:uppercase;letter-spacing:0.04em;">
                Bharatiya Vidya Bhavan's Sardar Patel Institute of Technology
              </div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Munshi Nagar, Andheri (West), Mumbai – 400 058 · Hostel Accounts Section</div>
              <div style="display:inline-block;margin-top:0.35rem;padding:0.2rem 0.6rem;background:var(--spit-surface);border:1px solid var(--border);border-radius:4px;font-size:0.75rem;font-weight:700;color:var(--spit-teal);">
                RECEIPT VOUCHER #${s.studentId}-HSTL24
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;font-size:0.8125rem;margin-bottom:0.75rem;">
              <div><strong>Candidate Name:</strong> ${s.name}</div>
              <div><strong>College Reg. No:</strong> ${s.studentId}</div>
              <div><strong>Programme &amp; Branch:</strong> ${s.course} — ${s.branch}</div>
              <div><strong>Academic Year:</strong> ${s.academicYear}</div>
              <div><strong>Payment Date:</strong> ${rc.uploadDate ? new Date(rc.uploadDate).toLocaleDateString() : '24-Jul-2024'}</div>
              <div><strong>Transaction / UTR:</strong> <span style="font-family:monospace;font-weight:700;color:var(--text-primary);">HDFC91048201948</span></div>
            </div>

            <div style="border-top:1px solid var(--border);padding-top:0.6rem;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong style="color:var(--text-primary);font-size:0.875rem;">Total Fee Paid (Annual 2024–25):</strong>
                <p style="font-size:0.75rem;color:var(--text-muted);">Room Rent + Caution Deposit + Utility Maintenance</p>
              </div>
              <div style="font-size:1.2rem;font-weight:800;color:var(--status-green);">
                ₹65,000.00
              </div>
            </div>

            <div style="margin-top:0.75rem;padding:0.4rem 0.75rem;background:rgba(21, 128, 61, 0.08);border:1px solid rgba(21, 128, 61, 0.25);border-radius:4px;font-size:0.75rem;color:var(--status-green);display:flex;align-items:center;justify-content:space-between;">
              <span>Verified Institutional Payment Reference · SPIT NetBanking Accounts</span>
              <span><strong>STATUS: ${rc.verificationStatus || 'PENDING'}</strong></span>
            </div>
          </div>
        `}

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;border-top:1px solid var(--border);padding-top:1rem;">
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-primary btn-sm" onclick="confirmFeeReceipt('${s._id}', 'Verified'); closeModal();">✓ Verify Receipt</button>
            <button class="btn btn-secondary btn-sm" style="color:var(--status-green);" onclick="confirmReview('${s._id}', 'Approved'); closeModal();">✓ Approve Registration</button>
            <button class="btn btn-secondary btn-sm" style="color:var(--status-red);" onclick="confirmFeeReceipt('${s._id}', 'Rejected'); closeModal();">✗ Reject Receipt</button>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>
        </div>
      </div>
    `);
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const confirmReview = async (id, status) => {
  try {
    const roomId = document.getElementById('reviewRoomId')?.value || null;
    const bedNumber = document.getElementById('reviewBedNumber')?.value || null;
    const messPreference = document.getElementById('reviewMessPref')?.value || null;
    const password = document.getElementById('reviewPassword')?.value?.trim() || null;

    const res = await API.students.reviewRegistration(id, {
      status,
      roomId: roomId || undefined,
      bedNumber: bedNumber || undefined,
      messPreference: messPreference || undefined,
      password: password || undefined,
    });

    let msg = res.message || `Registration ${status}`;
    showToast(msg, status === 'Approved' ? 'success' : status === 'Rejected' ? 'error' : 'info');
    closeModal();
    renderRegistrationsView();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const confirmFeeReceipt = async (id, status) => {
  try {
    await API.students.verifyReceipt(id, { status });
    showToast(`Fee receipt marked as ${status}`, 'success');
    closeModal();
    renderRegistrationsView();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ─── VIEW 4: Digital Passes ──────────────────────────────────────────────────
let _allPassesList = [];

const renderPassesView = async () => {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading passes…</div>';

  try {
    const isStudent = state.user.role === 'student';
    const passesRes = isStudent ? await API.passes.getMyPasses() : await API.passes.getAll();
    _allPassesList = passesRes.data || [];
    window._activePassesMap = window._activePassesMap || {};
    _allPassesList.forEach(p => { window._activePassesMap[p._id] = p; });

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <div>
          <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);">
            ${isStudent ? 'My Digital Gate Passes' : 'Gate Passes &amp; Curfew Administration'}
          </h3>
          <p style="font-size:0.8125rem;color:var(--text-muted);">
            Campus curfew: 10:00 PM (Mon–Fri) · 10:30 PM (Sat–Sun)
          </p>
        </div>

        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
          <span style="font-size:0.8125rem;color:var(--text-muted);font-weight:600;" id="passCountBadge">Total Passes: ${_allPassesList.length}</span>
          ${isStudent ? `
            <button class="btn btn-primary btn-sm" onclick="openPassRequestModal()">+ Request Pass</button>
          ` : `
            <button class="btn btn-secondary btn-sm" onclick="downloadCsvReport('passes')">📥 Export Passes CSV</button>
          `}
        </div>
      </div>

      <div class="card">
        <!-- Search & Filter Toolbar -->
        <div style="display:flex;gap:0.6rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap;">
          <input type="text" id="passSearchInput" class="form-control" placeholder="🔍 Search QR code, student name, leave reason, destination..." style="flex:1;min-width:240px;" oninput="filterPassesList()" />
          <select id="passApprovalFilter" class="form-control" style="width:auto;" onchange="filterPassesList()">
            <option value="">All Approvals</option>
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select id="passTypeFilter" class="form-control" style="width:auto;" onchange="filterPassesList()">
            <option value="">All Pass Types</option>
            <option value="Day Pass">Day Pass</option>
            <option value="Night Out">Night Out</option>
            <option value="Weekend Home">Weekend Home</option>
            <option value="Emergency Leave">Emergency Leave</option>
          </select>
          <select id="passCurfewFilter" class="form-control" style="width:auto;" onchange="filterPassesList()">
            <option value="">All Movement Statuses</option>
            <option value="Out on Pass">Out on Pass</option>
            <option value="Overdue">Overdue Curfew</option>
            <option value="Returned">Returned</option>
            <option value="In Campus">In Campus</option>
          </select>
        </div>

        <div style="overflow-x:auto;">
          <table class="data-table" style="width:100%;font-size:0.8125rem;">
            <thead>
              <tr>
                <th>Pass QR Code</th>
                ${!isStudent ? '<th>Resident Student</th>' : ''}
                <th>Pass Type</th>
                <th>Departure</th>
                <th>Expected Return</th>
                <th>Reason for Leave</th>
                <th>Approval</th>
                <th>Curfew Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="passesTableBody">
            </tbody>
          </table>
        </div>
      </div>
    `;

    filterPassesList();
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--status-red)">Error loading passes: ${err.message}</div>`;
  }
};

const filterPassesList = () => {
  const isStudent = state.user.role === 'student';
  const search = (document.getElementById('passSearchInput')?.value || '').trim().toUpperCase();
  const approvalFilter = document.getElementById('passApprovalFilter')?.value;
  const typeFilter = document.getElementById('passTypeFilter')?.value;
  const curfewFilter = document.getElementById('passCurfewFilter')?.value;
  const tbody = document.getElementById('passesTableBody');
  const countEl = document.getElementById('passCountBadge');
  if (!tbody) return;

  const filtered = _allPassesList.filter(p => {
    if (approvalFilter && p.approvalStatus !== approvalFilter) return false;
    if (typeFilter && p.passType !== typeFilter) return false;
    if (curfewFilter && p.currentStatus !== curfewFilter) return false;
    if (search) {
      const student = p.studentId || {};
      const name = String(student.name || '').toUpperCase();
      const sid = String(student.studentId || '').toUpperCase();
      const qr = String(p.qrCodeId || '').toUpperCase();
      const reason = String(p.reason || '').toUpperCase();
      const dest = String(p.destination || '').toUpperCase();
      const type = String(p.passType || '').toUpperCase();

      const matched = qr.includes(search) ||
        name.includes(search) ||
        sid.includes(search) ||
        reason.includes(search) ||
        dest.includes(search) ||
        type.includes(search);

      if (!matched) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = `Showing: ${filtered.length} of ${_allPassesList.length}`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${isStudent ? 8 : 9}" style="text-align:center;padding:2rem;color:var(--text-muted)">No pass requests match your search criteria.</td></tr>`;
    return;
  }

  window._activePassesMap = window._activePassesMap || {};
  tbody.innerHTML = filtered.map(p => {
    window._activePassesMap[p._id] = p;
    const appBadge = p.approvalStatus === 'Approved' ? 'badge-green' : p.approvalStatus === 'Rejected' ? 'badge-red' : 'badge-amber';
    const curBadge = p.currentStatus === 'Overdue' ? 'badge-red' : p.currentStatus === 'Out on Pass' ? 'badge-amber' : p.currentStatus === 'Returned' ? 'badge-green' : 'badge-teal';
    const student = p.studentId || {};
    return `
      <tr>
        <td><code>${p.qrCodeId}</code></td>
        ${!isStudent ? `<td><strong>${student.name || 'Resident'}</strong> (${student.studentId || ''})</td>` : ''}
        <td><span class="badge badge-teal">${p.passType}</span></td>
        <td>${new Date(p.requestedDeparture).toLocaleDateString()}</td>
        <td>${new Date(p.expectedReturn).toLocaleDateString()}</td>
        <td>
          <div style="font-weight:700;color:var(--text-primary);max-width:240px;word-break:break-word;line-height:1.35;">"${p.reason || 'General Outing'}"</div>
          ${p.destination ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">📍 ${p.destination}</div>` : ''}
        </td>
        <td><span class="badge ${appBadge}">${p.approvalStatus}</span></td>
        <td><span class="badge ${curBadge}">${p.currentStatus}</span></td>
        ${isStudent ? `
          <td>
            <button class="btn btn-primary btn-sm" style="font-size:0.75rem;padding:0.28rem 0.6rem;background:var(--spit-teal);display:inline-flex;align-items:center;gap:0.35rem;" onclick="openStudentPassQrModal('${p._id}')" title="Display digital pass card with QR code">
              <span>📱</span> Show QR Pass
            </button>
          </td>
        ` : `
          <td style="display:flex;gap:0.35rem;align-items:center;flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:0.25rem 0.5rem;" onclick="openPassDetailsModal('${p._id}')" title="Inspect full leave reason &amp; timing">
              📋 Reason
            </button>
            <button class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:0.25rem 0.5rem;" onclick="openStudentFullDetailsModal('${student._id || student}', '${p._id}')" title="Inspect complete student profile">
              👤 Profile
            </button>
            ${p.approvalStatus === 'Pending' ? `
              <button class="btn btn-primary btn-sm" style="font-size:0.75rem;padding:0.25rem 0.5rem;background:var(--status-green);border-color:var(--status-green);" onclick="reviewPassAction('${p._id}', 'Approved')">Approve</button>
              <button class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:0.25rem 0.5rem;color:var(--status-red);border-color:var(--status-red-border);" onclick="openRejectPassModal('${p._id}')">Reject</button>
            ` : `
              <span style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">${p.approvalStatus}</span>
            `}
          </td>
        `}
      </tr>
    `;
  }).join('');
};

const openPassRequestModal = () => {
  openModal(`
    <div style="padding:1.5rem;">
      <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);margin-bottom:1rem;">
        Request Digital Gate Pass
      </h3>
      <form id="passRequestForm" onsubmit="handlePassSubmit(event)">
        <div class="form-group">
          <label class="form-label">Pass Category *</label>
          <select id="pPassType" class="form-control" required>
            <option value="Day Outing">Day Outing (Curfew Return)</option>
            <option value="Night Out">Night Out (Approved Off-Campus Stay)</option>
            <option value="Home Visit">Home Visit (Weekend / Holiday)</option>
            <option value="Emergency">Emergency Departure</option>
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
          <div class="form-group">
            <label class="form-label">Departure Date &amp; Time *</label>
            <input type="datetime-local" id="pDeparture" class="form-control" required />
          </div>
          <div class="form-group">
            <label class="form-label">Expected Return Date &amp; Time *</label>
            <input type="datetime-local" id="pReturn" class="form-control" required />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Destination Location *</label>
          <input type="text" id="pDestination" class="form-control" placeholder="e.g. Fort, Mumbai / Pune Residence" required />
        </div>

        <div class="form-group">
          <label class="form-label">Reason for Departure *</label>
          <textarea id="pReason" class="form-control" rows="2" placeholder="Provide official or academic purpose" required></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">Submit Pass Request</button>
        </div>
      </form>
    </div>
  `);
};

const handlePassSubmit = async (e) => {
  e.preventDefault();
  const payload = {
    passType:           document.getElementById('pPassType').value,
    requestedDeparture: document.getElementById('pDeparture').value,
    expectedReturn:     document.getElementById('pReturn').value,
    destination:        document.getElementById('pDestination').value.trim(),
    reason:             document.getElementById('pReason').value.trim(),
  };

  try {
    await API.passes.requestPass(payload);
    showToast('Pass request submitted. Awaiting warden review.', 'success');
    closeModal();
    renderPassesView();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const reviewPassAction = async (id, status) => {
  try {
    await API.passes.review(id, { status });
    showToast(`Pass marked as ${status}`, 'success');
    renderPassesView();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const openGateLoggerModal = () => {
  openModal(`
    <div style="padding:1.5rem;">
      <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);margin-bottom:0.5rem;">Log Campus Gate Movement</h3>
      <p style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:1rem;">Scan or enter approved student pass ID</p>

      <form id="gateLogForm" onsubmit="handleGateLogSubmit(event)">
        <div class="form-group">
          <label class="form-label">Pass QR / ID Code *</label>
          <input type="text" id="gatePassIdInput" class="form-control" placeholder="e.g. PASS-XXXXXXX" required />
        </div>
        <div class="form-group">
          <label class="form-label">Movement Direction *</label>
          <select id="gateEventType" class="form-control" required>
            <option value="Exit">Exit (Leaving Campus)</option>
            <option value="Entry">Entry (Returning to Campus)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Gate Notes (Optional)</label>
          <input type="text" id="gateNotes" class="form-control" placeholder="Identity verified at Main Gate" />
        </div>

        <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-maroon btn-sm">Record Movement</button>
        </div>
      </form>
    </div>
  `);
};

const handleGateLogSubmit = async (e) => {
  e.preventDefault();
  const qr = document.getElementById('gatePassIdInput').value.trim();
  const eventType = document.getElementById('gateEventType').value;
  const notes = document.getElementById('gateNotes').value.trim();

  try {
    // Find pass by qrCodeId
    const passesRes = await API.passes.getAll();
    const pass = passesRes.data.find(p => p.qrCodeId === qr);
    if (!pass) throw new Error('Pass with code ' + qr + ' not found or not approved.');

    await API.passes.recordGateEvent({ passId: pass._id, eventType, notes });
    showToast(`Gate ${eventType} recorded successfully!`, 'success');
    closeModal();
    renderPassesView();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ─── VIEW 5: Complaints ──────────────────────────────────────────────────────
let _allComplaintsList = [];

const renderComplaintsView = async () => {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading complaints…</div>';

  try {
    const isStudent = state.user.role === 'student';
    const res = isStudent ? await API.complaints.getMyComplaints() : await API.complaints.getAll();
    _allComplaintsList = res.data || [];

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <div>
          <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);">
            ${isStudent ? 'My Reported Maintenance Issues' : 'Hostel Facility &amp; Maintenance Tracking'}
          </h3>
          <p style="font-size:0.8125rem;color:var(--text-muted);">
            Electrical, Plumbing, WiFi, and Carpentry maintenance requests
          </p>
        </div>

        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
          <span style="font-size:0.8125rem;color:var(--text-muted);font-weight:600;" id="complaintCountBadge">Total Issues: ${_allComplaintsList.length}</span>
          ${isStudent ? `
            <button class="btn btn-primary btn-sm" onclick="openRaiseComplaintModal()">+ Report New Problem</button>
          ` : `
            <button class="btn btn-secondary btn-sm" onclick="downloadCsvReport('complaints')">📥 Export Complaints CSV</button>
          `}
        </div>
      </div>

      <div class="card">
        <!-- Search & Filter Toolbar -->
        <div style="display:flex;gap:0.6rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap;">
          <input type="text" id="complaintSearchInput" class="form-control" placeholder="🔍 Search issue title, room no, category, or student..." style="flex:1;min-width:240px;" oninput="filterComplaintsList()" />
          <select id="complaintCatFilter" class="form-control" style="width:auto;" onchange="filterComplaintsList()">
            <option value="">All Categories</option>
            <option value="Electrical">Electrical</option>
            <option value="Plumbing">Plumbing</option>
            <option value="Carpentry / Furniture">Carpentry / Furniture</option>
            <option value="Internet / WiFi">Internet / WiFi</option>
            <option value="Mess & Dining">Mess &amp; Dining</option>
            <option value="Cleanliness & Sanitation">Cleanliness</option>
            <option value="Other">Other</option>
          </select>
          <select id="complaintStatusFilter" class="form-control" style="width:auto;" onchange="filterComplaintsList()">
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        <div style="overflow-x:auto;">
          <table class="data-table" style="width:100%;font-size:0.8125rem;">
            <thead>
              <tr>
                <th>Category</th>
                <th>Issue Title</th>
                <th>Room</th>
                ${!isStudent ? '<th>Reported By</th>' : ''}
                <th>Status</th>
                <th>Assigned Technician</th>
                <th>Remarks</th>
                ${!isStudent ? '<th>Action</th>' : ''}
              </tr>
            </thead>
            <tbody id="complaintsTableBody">
            </tbody>
          </table>
        </div>
      </div>
    `;

    filterComplaintsList();
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--status-red)">Error loading complaints: ${err.message}</div>`;
  }
};

const filterComplaintsList = () => {
  const isStudent = state.user.role === 'student';
  const search = (document.getElementById('complaintSearchInput')?.value || '').trim().toUpperCase();
  const catFilter = document.getElementById('complaintCatFilter')?.value;
  const statusFilter = document.getElementById('complaintStatusFilter')?.value;
  const tbody = document.getElementById('complaintsTableBody');
  const countEl = document.getElementById('complaintCountBadge');
  if (!tbody) return;

  const filtered = _allComplaintsList.filter(c => {
    if (catFilter && c.category !== catFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (search) {
      const title = String(c.title || '').toUpperCase();
      const desc = String(c.description || '').toUpperCase();
      const cat = String(c.category || '').toUpperCase();
      const room = String(c.roomNumber || '').toUpperCase();
      const studentName = String(c.studentId?.name || '').toUpperCase();
      const tech = String(c.assignedTo || '').toUpperCase();

      const matched = title.includes(search) ||
        desc.includes(search) ||
        cat.includes(search) ||
        room.includes(search) ||
        `ROOM ${room}`.includes(search) ||
        studentName.includes(search) ||
        tech.includes(search);

      if (!matched) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = `Showing: ${filtered.length} of ${_allComplaintsList.length}`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${isStudent ? 6 : 8}" style="text-align:center;padding:2rem;color:var(--text-muted)">No maintenance issues match your search criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    const sBadge = c.status === 'Resolved' ? 'badge-green' : c.status === 'In Progress' ? 'badge-amber' : 'badge-red';
    return `
      <tr>
        <td><strong>${c.category}</strong></td>
        <td>${c.title}</td>
        <td>${c.roomNumber || '—'}</td>
        ${!isStudent ? `<td>${c.studentId?.name || 'Resident'}</td>` : ''}
        <td><span class="badge ${sBadge}">${c.status}</span></td>
        <td>${c.assignedTo || 'Unassigned'}</td>
        <td>${c.resolutionRemarks || '—'}</td>
        ${!isStudent ? `
          <td>
            <button class="btn btn-secondary btn-sm" onclick="openUpdateComplaintModal('${c._id}', '${c.status}', '${c.assignedTo}')">Update</button>
          </td>
        ` : ''}
      </tr>
    `;
  }).join('');
};

const openRaiseComplaintModal = () => {
  openModal(`
    <div style="padding:1.5rem;">
      <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);margin-bottom:1rem;">
        Report Hostel Maintenance Issue
      </h3>
      <form id="raiseComplaintForm" onsubmit="handleComplaintSubmit(event)">
        <div class="form-group">
          <label class="form-label">Category *</label>
          <select id="cCategory" class="form-control" required>
            <option value="Electrical">Electrical (Lights, switches, fans)</option>
            <option value="Plumbing">Plumbing (Taps, pipes, washrooms)</option>
            <option value="Carpentry / Furniture">Carpentry / Furniture (Doors, desks, beds)</option>
            <option value="Internet / WiFi">Internet / WiFi connectivity</option>
            <option value="Cleanliness">Cleanliness &amp; Housekeeping</option>
            <option value="Other">Other Maintenance</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Room Number</label>
          <input type="text" id="cRoom" class="form-control" placeholder="e.g. A101" />
        </div>

        <div class="form-group">
          <label class="form-label">Brief Title *</label>
          <input type="text" id="cTitle" class="form-control" placeholder="e.g. Washbasin tap dripping continuously" required />
        </div>

        <div class="form-group">
          <label class="form-label">Detailed Description *</label>
          <textarea id="cDesc" class="form-control" rows="3" placeholder="Describe the problem clearly so estate technicians can prepare required parts" required></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">Report Issue</button>
        </div>
      </form>
    </div>
  `);
};

const handleComplaintSubmit = async (e) => {
  e.preventDefault();
  const payload = {
    category:    document.getElementById('cCategory').value,
    roomNumber:  document.getElementById('cRoom').value.trim(),
    title:       document.getElementById('cTitle').value.trim(),
    description: document.getElementById('cDesc').value.trim(),
  };

  try {
    await API.complaints.raise(payload);
    showToast('Maintenance request logged successfully', 'success');
    closeModal();
    renderComplaintsView();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const openUpdateComplaintModal = (id, currentStatus, currentAssigned) => {
  openModal(`
    <div style="padding:1.5rem;">
      <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);margin-bottom:1rem;">
        Update Maintenance Resolution
      </h3>
      <form onsubmit="handleUpdateComplaintSubmit(event, '${id}')">
        <div class="form-group">
          <label class="form-label">Status *</label>
          <select id="uStatus" class="form-control" required>
            <option value="Open" ${currentStatus === 'Open' ? 'selected' : ''}>Open</option>
            <option value="In Progress" ${currentStatus === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Resolved" ${currentStatus === 'Resolved' ? 'selected' : ''}>Resolved</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Assign Technician / Team</label>
          <input type="text" id="uAssigned" class="form-control" value="${currentAssigned || 'Estate Maintenance Team'}" />
        </div>
        <div class="form-group">
          <label class="form-label">Resolution Remarks</label>
          <textarea id="uRemarks" class="form-control" rows="2" placeholder="Describe actions taken (e.g. Replaced faulty tap washer)"></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">Save Update</button>
        </div>
      </form>
    </div>
  `);
};

const handleUpdateComplaintSubmit = async (e, id) => {
  e.preventDefault();
  const payload = {
    status:            document.getElementById('uStatus').value,
    assignedTo:        document.getElementById('uAssigned').value.trim(),
    resolutionRemarks: document.getElementById('uRemarks').value.trim(),
  };

  try {
    await API.complaints.update(id, payload);
    showToast('Complaint status updated', 'success');
    closeModal();
    renderComplaintsView();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ─── VIEW 6: Faculty Mentoring ───────────────────────────────────────────────
const renderMentoringView = async () => {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading mentoring records…</div>';

  try {
    const role = state.user.role;

    if (role === 'mentor') {
      const [studentsRes, sessionsRes] = await Promise.all([
        API.mentors.getMyStudents(),
        API.mentors.getSessions(),
      ]);
      const students = studentsRes.data;
      const sessions = sessionsRes.data;

      container.innerHTML = `
        <div style="margin-bottom:1.5rem;">
          <h3 style="font-size:1.125rem;font-weight:700;color:var(--text-primary);">My Assigned Junior Mentees</h3>
          <p style="font-size:0.8125rem;color:var(--text-muted);">S.P.I.T. Senior Student Mentoring Portal · Peer Academic &amp; Hostel Guidance</p>
        </div>

        <div class="card" style="margin-bottom:1.5rem;">
          <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%;font-size:0.8125rem;">
              <thead>
                <tr>
                  <th>Reg. No.</th>
                  <th>Junior Mentee Name</th>
                  <th>Branch &amp; Year</th>
                  <th>Contact Email</th>
                  <th>Guardian Phone</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${students.map(s => `
                  <tr>
                    <td><strong>${s.studentId}</strong></td>
                    <td>${s.name}</td>
                    <td>${s.branch} (${s.academicYear})</td>
                    <td>${s.email}</td>
                    <td>${s.guardianPhone || '—'}</td>
                    <td style="display:flex;gap:0.35rem;">
                      <button class="btn btn-primary btn-sm" onclick="openScheduleSessionModal('${s._id}', '${s.name}')">Schedule Session</button>
                      <button class="btn btn-secondary btn-sm" onclick="openStudentFullDetailsModal('${s._id}')">View Details</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h4 style="font-size:1rem;font-weight:700;color:var(--text-primary);margin-bottom:0.75rem;">Mentoring Sessions &amp; Guidance Notes</h4>
          <div style="display:flex;flex-direction:column;gap:0.75rem;">
            ${sessions.map(sess => `
              <div style="background:var(--bg-card-hover);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.875rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <strong style="color:var(--text-primary);font-size:0.875rem;">${sess.topic}</strong>
                  <span class="badge ${sess.status === 'Completed' ? 'badge-green' : 'badge-amber'}">${sess.status}</span>
                </div>
                <p style="font-size:0.75rem;color:var(--text-muted);margin:0.25rem 0;">
                  Mentee: ${sess.studentId?.name || 'Student'} · ${new Date(sess.scheduledDate).toLocaleDateString()} · ${sess.mode} (${sess.location || 'Hostel Study Hall'})
                </p>
                ${sess.notes ? `<p style="font-size:0.8125rem;color:var(--text-secondary);margin-top:0.35rem;"><strong>Notes:</strong> ${sess.notes}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (role === 'student') {
      const [profileRes, sessionsRes] = await Promise.all([
        API.students.getMyProfile(),
        API.mentors.getSessions(),
      ]);
      const s = profileRes.data;
      const sessions = sessionsRes.data;

      container.innerHTML = `
        <div class="card" style="margin-bottom:1.5rem;border-left:4px solid var(--spit-teal);">
          <h3 style="font-size:1.125rem;font-weight:700;color:var(--text-primary);margin-bottom:0.25rem;">My Senior Student Mentor</h3>
          <p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:1rem;">
            Your senior student mentor is a 3rd/4th-year student assigned to guide you on engineering coursework, lab assignments, exam preparation, and campus life.
          </p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.875rem;">
            <div><strong>Senior Mentor:</strong> ${s.assignedMentor?.name || 'Aryan Shah (Senior Student Mentor)'}</div>
            <div><strong>Branch &amp; Year:</strong> Final Year B.Tech Computer Engineering</div>
            <div><strong>Official Email:</strong> ${s.assignedMentor?.email || 'mentor@spit.ac.in'}</div>
            <div><strong>Hostel Location:</strong> Room B-302 / Study Hall, SPIT Campus</div>
          </div>

          <div style="margin-top:1.25rem;">
            <button class="btn btn-primary btn-sm" onclick="openStudentSessionRequestModal()">Request Guidance Session</button>
          </div>
        </div>

        <div class="card">
          <h4 style="font-size:1rem;font-weight:700;color:var(--text-primary);margin-bottom:0.75rem;">My Mentoring Sessions</h4>
          ${sessions.length === 0 ? `
            <p style="font-size:0.8125rem;color:var(--text-muted);">No sessions scheduled yet.</p>
          ` : sessions.map(sess => `
            <div style="background:var(--bg-card-hover);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.75rem;margin-bottom:0.5rem;">
              <div style="display:flex;justify-content:space-between;align-items:baseline;">
                <strong style="color:var(--text-primary);font-size:0.875rem;">${sess.topic}</strong>
                <span class="badge ${sess.status === 'Completed' ? 'badge-green' : 'badge-amber'}">${sess.status}</span>
              </div>
              <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">Date: ${new Date(sess.scheduledDate).toLocaleDateString()}</p>
              ${sess.guidanceRecommendations ? `<p style="font-size:0.8125rem;color:var(--spit-teal);margin-top:0.35rem;"><strong>Mentor Recommendations:</strong> ${sess.guidanceRecommendations}</p>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    } else {
      // Admin: assign mentor to students
      const [studentsRes, mentorsRes] = await Promise.all([
        API.students.getAll({ limit: 100 }),
        API.mentors.list(),
      ]);
      const students = studentsRes.data;
      const mentors = mentorsRes.data;

      container.innerHTML = `
        <div class="card">
          <h3 style="font-size:1.125rem;font-weight:700;color:var(--text-primary);margin-bottom:1rem;">Senior Student Mentor Allocations</h3>
          <p style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:1rem;">
            Assign senior student mentors (3rd/4th year engineering residents) to junior 1st &amp; 2nd year students for peer guidance.
          </p>
          <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%;font-size:0.8125rem;">
              <thead>
                <tr>
                  <th>Reg. No.</th>
                  <th>Junior Student Name</th>
                  <th>Branch</th>
                  <th>Assigned Senior Mentor</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${students.map(s => `
                  <tr>
                    <td>${s.studentId}</td>
                    <td><strong>${s.name}</strong></td>
                    <td>${s.branch}</td>
                    <td>${s.assignedMentor?.name || '<span style="color:var(--status-amber)">Unassigned</span>'}</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="openAssignMentorModal('${s._id}', '${s.name}')">Change / Assign</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--status-red)">Error loading mentoring support: ${err.message}</div>`;
  }
};

const openScheduleSessionModal = (studentId, studentName) => {
  openModal(`
    <div style="padding:1.5rem;">
      <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);margin-bottom:1rem;">
        Schedule Mentoring Session with ${studentName}
      </h3>
      <form onsubmit="handleMentorSessionSubmit(event, '${studentId}')">
        <div class="form-group">
          <label class="form-label">Session Topic *</label>
          <input type="text" id="mTopic" class="form-control" placeholder="e.g. Semester Progress & Project Advice" required />
        </div>
        <div class="form-group">
          <label class="form-label">Scheduled Date &amp; Time *</label>
          <input type="datetime-local" id="mDate" class="form-control" required />
        </div>
        <div class="form-group">
          <label class="form-label">Meeting Mode &amp; Location</label>
          <input type="text" id="mLoc" class="form-control" value="Faculty Cabin #304, S.P.I.T. Main Building" />
        </div>
        <div class="form-group">
          <label class="form-label">Preliminary Notes</label>
          <textarea id="mNotes" class="form-control" rows="2" placeholder="Agenda items or review notes"></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">Schedule Session</button>
        </div>
      </form>
    </div>
  `);
};

const handleMentorSessionSubmit = async (e, studentId) => {
  e.preventDefault();
  const payload = {
    studentId,
    topic:         document.getElementById('mTopic').value.trim(),
    scheduledDate: document.getElementById('mDate').value,
    location:      document.getElementById('mLoc').value.trim(),
    notes:         document.getElementById('mNotes').value.trim(),
  };

  try {
    await API.mentors.createSession(payload);
    showToast('Session scheduled successfully', 'success');
    closeModal();
    renderMentoringView();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const openStudentSessionRequestModal = () => {
  openModal(`
    <div style="padding:1.5rem;">
      <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);margin-bottom:1rem;">
        Request Session with Faculty Mentor
      </h3>
      <form onsubmit="handleStudentSessionRequest(event)">
        <div class="form-group">
          <label class="form-label">Discussion Topic *</label>
          <input type="text" id="stTopic" class="form-control" placeholder="e.g. Academic load management / Hostel routine" required />
        </div>
        <div class="form-group">
          <label class="form-label">Preferred Date &amp; Time *</label>
          <input type="datetime-local" id="stDate" class="form-control" required />
        </div>
        <div class="form-group">
          <label class="form-label">Your Questions or Notes</label>
          <textarea id="stNotes" class="form-control" rows="2" placeholder="Briefly state what you wish to discuss"></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">Submit Request</button>
        </div>
      </form>
    </div>
  `);
};

const handleStudentSessionRequest = async (e) => {
  e.preventDefault();
  const payload = {
    topic:         document.getElementById('stTopic').value.trim(),
    scheduledDate: document.getElementById('stDate').value,
    notes:         document.getElementById('stNotes').value.trim(),
  };

  try {
    await API.mentors.createSession(payload);
    showToast('Session request sent to your mentor', 'success');
    closeModal();
    renderMentoringView();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const openAssignMentorModal = async (studentId, studentName) => {
  openModal(`
    <div style="padding:1.5rem;max-width:480px;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:0.75rem;margin-bottom:1.25rem;">
        <div>
          <span class="badge badge-teal" style="margin-bottom:0.25rem;">SPIT Senior Mentorship</span>
          <h3 style="font-size:1.15rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem;">
            Assign Mentor: ${studentName}
          </h3>
        </div>
        <button class="modal-close-btn" onclick="closeModal()" style="background:none;border:none;font-size:1.25rem;cursor:pointer;color:var(--text-muted);">✕</button>
      </div>
      <p style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:1.25rem;">
        Select an active 3rd/4th-year senior student mentor to provide peer guidance on coursework, lab sessions, and hostel life.
      </p>
      <div id="assignMentorBody">
        <div style="text-align:center;color:var(--text-muted);padding:1rem;">Loading senior mentors…</div>
      </div>
    </div>
  `);

  try {
    const res = await API.mentors.list();
    const mentors = res.data || [];
    const body = document.getElementById('assignMentorBody');
    if (!body) return;

    body.innerHTML = `
      <form onsubmit="handleAssignMentorSubmit(event, '${studentId}')">
        <div class="form-group" style="margin-bottom:1.25rem;">
          <label class="form-label">Available Senior Student Mentors *</label>
          <select id="selectedMentorId" class="form-control" required>
            <option value="">-- Choose a Senior Mentor --</option>
            ${mentors.map(m => `
              <option value="${m._id}">${m.name} (${m.email})</option>
            `).join('')}
            <option value="unassign">-- Unassign Current Mentor --</option>
          </select>
          <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.35rem;">
            Aryan Shah is the Senior Student Mentor lead for Computer Engineering hostel residents.
          </p>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:0.75rem;border-top:1px solid var(--border);padding-top:1rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">Save Assignment</button>
        </div>
      </form>
    `;
  } catch (err) {
    showToast(err.message || 'Failed to load mentors', 'error');
  }
};

const handleAssignMentorSubmit = async (e, studentId) => {
  e.preventDefault();
  const mentorId = document.getElementById('selectedMentorId').value;
  try {
    const res = await API.mentors.assign({ studentId, mentorId });
    showToast(res.message || 'Mentor assignment saved successfully!', 'success');
    closeModal();
    renderMentoringView();
  } catch (err) {
    showToast(err.message || 'Failed to assign mentor', 'error');
  }
};

// ─── VIEW 7: Announcements ───────────────────────────────────────────────────
const renderAnnouncementsView = async () => {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading announcements…</div>';

  try {
    const res = await API.announcements.getAll();
    const notices = res.data;
    const canPost = ['admin', 'warden'].includes(state.user.role);

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <div>
          <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);">Official Hostel Announcements</h3>
          <p style="font-size:0.8125rem;color:var(--text-muted);">Notices from Chief Warden and Administration</p>
        </div>
        ${canPost ? `<button class="btn btn-primary btn-sm" onclick="openCreateAnnouncementModal()">+ Post Announcement</button>` : ''}
      </div>

      <div style="display:flex;flex-direction:column;gap:1rem;">
        ${notices.length === 0 ? `
          <div class="card" style="text-align:center;color:var(--text-muted);padding:2rem;">No announcements active.</div>
        ` : notices.map(n => `
          <div class="card" style="${n.isPinned ? 'border-left:4px solid var(--spit-maroon);' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:0.35rem;">
              <h4 style="font-size:1.0625rem;font-weight:700;color:var(--spit-navy);">${n.title}</h4>
              <span class="badge ${n.isPinned ? 'badge-red' : 'badge-teal'}">${n.category}</span>
            </div>
            <p style="font-size:0.875rem;color:var(--text-primary);line-height:1.6;margin-bottom:0.75rem;">${n.content}</p>
            <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);">
              <span>Posted by <strong>${n.postedByName}</strong></span>
              <span>${new Date(n.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--status-red)">Error loading announcements: ${err.message}</div>`;
  }
};

const openCreateAnnouncementModal = () => {
  openModal(`
    <div style="padding:1.5rem;">
      <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);margin-bottom:1rem;">Post New Circular</h3>
      <form onsubmit="handleAnnouncementSubmit(event)">
        <div class="form-group">
          <label class="form-label">Title *</label>
          <input type="text" id="aTitle" class="form-control" placeholder="e.g. Curfew Timings Notice" required />
        </div>
        <div class="form-group">
          <label class="form-label">Target Audience</label>
          <select id="aTarget" class="form-control">
            <option value="All">All Hostel Residents &amp; Roles</option>
            <option value="student">Students Only</option>
            <option value="mentor">Mentors Only</option>
            <option value="warden">Wardens Only</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select id="aCat" class="form-control">
            <option value="General">General Circular</option>
            <option value="Pass / Gate">Pass &amp; Curfew</option>
            <option value="Maintenance">Maintenance &amp; Estate</option>
            <option value="Academic / Mentoring">Academic &amp; Mentoring</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Content *</label>
          <textarea id="aContent" class="form-control" rows="4" placeholder="Announcement body text" required></textarea>
        </div>
        <div class="form-group" style="display:flex;align-items:center;gap:0.5rem;">
          <input type="checkbox" id="aPinned" />
          <label for="aPinned" style="font-size:0.8125rem;cursor:pointer;">Pin as Urgent Announcement</label>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">Publish Notice</button>
        </div>
      </form>
    </div>
  `);
};

const handleAnnouncementSubmit = async (e) => {
  e.preventDefault();
  const payload = {
    title:      document.getElementById('aTitle').value.trim(),
    targetRole: document.getElementById('aTarget').value,
    category:   document.getElementById('aCat').value,
    content:    document.getElementById('aContent').value.trim(),
    isPinned:   document.getElementById('aPinned').checked,
  };

  try {
    await API.announcements.create(payload);
    showToast('Announcement posted successfully', 'success');
    closeModal();
    renderAnnouncementsView();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ─── VIEW 8: Hostel Mess, Staff & Operations Settings (Admin) ─────────────────
const renderSettingsView = async () => {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading institutional configuration, mess plans & staff accounts…</div>';

  try {
    const [settingsRes, staffRes] = await Promise.all([
      API.settings.get(),
      API.auth.getStaff().catch(() => ({ data: [] })),
    ]);
    const s = settingsRes.data;
    const staffList = staffRes.data || [];

    container.innerHTML = `
      <!-- Quick Anchor Pills for Fast Navigation -->
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1.25rem;flex-wrap:wrap;">
        <span style="font-size:0.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Operations Areas:</span>
        <a href="#section-mess" class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:0.25rem 0.65rem;border-radius:20px;">🍽️ Mess Plans</a>
        <a href="#section-staff" class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:0.25rem 0.65rem;border-radius:20px;">👥 Staff Provisioning</a>
        <a href="#section-promotion" class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:0.25rem 0.65rem;border-radius:20px;">🎓 Batch Promotion</a>
      </div>

      <!-- Card 1: Verified Mess Options & Dining Plans -->
      <div class="card" id="section-mess" style="margin-bottom:1.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:0.75rem;">
          <div>
            <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);margin-bottom:0.25rem;">
              🍽️ Verified Mess Options &amp; Dining Plans
            </h3>
            <p style="font-size:0.8125rem;color:var(--text-muted);max-width:680px;line-height:1.5;">
              Loaded dynamically from MongoDB records. Configure monthly mess fees, meal coverage, and student catering plans without modifying code.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openAddMessOptionModal()" style="display:inline-flex;align-items:center;gap:0.4rem;">
            <span>➕</span> Add New Mess Plan
          </button>
        </div>

        <div style="display:flex;flex-direction:column;gap:0.85rem;margin-top:1rem;">
          ${(s.messOptions || []).map((m, i) => `
            <div style="background:var(--spit-surface-hover);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;">
              <div>
                <strong style="color:var(--spit-navy);font-size:0.9375rem;">${m.name}</strong>
                <p style="font-size:0.8125rem;color:var(--text-secondary);margin:0.25rem 0;">${m.mealCoverage} · ₹${m.monthlyFee.toLocaleString()}/month</p>
                <p style="font-size:0.75rem;color:var(--text-muted);">${m.description || ''}</p>
              </div>
              <span class="badge ${m.isActive ? 'badge-green' : 'badge-red'}">${m.isActive ? 'Active' : 'Disabled'}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Card 2: Staff & Faculty Credential Provisioning -->
      <div class="card" id="section-staff" style="margin-bottom:1.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:0.75rem;">
          <div>
            <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);margin-bottom:0.25rem;">
              👥 Staff &amp; Faculty Credential Provisioning
            </h3>
            <p style="font-size:0.8125rem;color:var(--text-muted);max-width:680px;line-height:1.5;">
              Chief Wardens, Assistant Wardens, and Senior Mentors are allotted institutional credentials directly by the Super Admin. Staff accounts are never open for public self-registration for security reasons.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openProvisionStaffModal()" style="display:inline-flex;align-items:center;gap:0.4rem;">
            <span>➕</span> Provision New Staff Account
          </button>
        </div>

        <div style="overflow-x:auto;margin-top:1rem;">
          <table class="data-table" style="width:100%;font-size:0.8125rem;">
            <thead>
              <tr>
                <th>Faculty / Staff Member</th>
                <th>Official Institutional Email</th>
                <th>Assigned Role</th>
                <th>Created</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${staffList.length === 0 ? `
                <tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-muted);">No staff accounts found.</td></tr>
              ` : staffList.map(st => `
                <tr>
                  <td><strong>${st.name}</strong></td>
                  <td><code>${st.email}</code></td>
                  <td>
                    <span class="role-badge-pill role-${st.role}" style="text-transform:capitalize;">
                      ${st.role === 'admin' ? '⚙️ Admin' : st.role === 'warden' ? '🛡️ Warden' : '🎓 Mentor'}
                    </span>
                  </td>
                  <td>${st.createdAt ? new Date(st.createdAt).toLocaleDateString() : 'Initial Master'}</td>
                  <td style="text-align:right;white-space:nowrap;">
                    <button class="btn btn-secondary btn-sm" onclick="switchDbCollection('users'); navigateTo('database');" title="Inspect in Database Explorer">🔍 Inspect</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Card 3: Academic Year Promotion -->
      <div class="card" id="section-promotion">
        <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);margin-bottom:0.75rem;">
          🎓 Academic Year Promotion &amp; Batch Migration
        </h3>
        <p style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:1rem;">
          Promote student batches to the next academic year without manual script editing.
        </p>

        <div style="display:flex;gap:0.75rem;align-items:center;max-width:440px;flex-wrap:wrap;">
          <select id="promoteFrom" class="form-control" style="flex:1;min-width:200px;">
            <option value="1">Promote 1st Year → 2nd Year</option>
            <option value="2">Promote 2nd Year → 3rd Year</option>
            <option value="3">Promote 3rd Year → 4th Year</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="handlePromote()">Execute Promotion</button>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--status-red)">Error loading settings: ${err.message}</div>`;
  }
};


const openProvisionStaffModal = () => {
  const suggestedPw = 'Spit@' + Math.floor(1000 + Math.random() * 9000);
  openModal(`
    <div style="padding:1.5rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;border-bottom:1px solid var(--border-color);padding-bottom:0.75rem;">
        <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);">
          ➕ Provision New Institutional Staff Account
        </h3>
        <button onclick="closeModal()" style="background:none;border:none;font-size:1.25rem;cursor:pointer;color:var(--text-muted);">&times;</button>
      </div>

      <div style="background:var(--spit-surface-hover);border-left:4px solid var(--spit-teal);padding:0.75rem 1rem;border-radius:var(--radius-sm);margin-bottom:1.25rem;font-size:0.8125rem;color:var(--text-secondary);line-height:1.5;">
        <strong>Institutional Security Policy:</strong> Wardens and Mentors cannot self-register online. Allot their official login credentials below and securely hand them over to the faculty or staff member.
      </div>

      <form id="provisionStaffForm" onsubmit="handleProvisionStaffSubmit(event)">
        <div class="form-group" style="margin-bottom:1rem;">
          <label class="form-label" style="font-size:0.8125rem;font-weight:600;">Staff Member Full Name *</label>
          <input type="text" id="provStaffName" class="form-control" placeholder="e.g. Dr. Rajesh Kulkarni or Prof. Sunita Deshmukh" required />
        </div>

        <div class="form-group" style="margin-bottom:1rem;">
          <label class="form-label" style="font-size:0.8125rem;font-weight:600;">Official SPIT Email Address *</label>
          <input type="email" id="provStaffEmail" class="form-control" placeholder="e.g. warden.hostel@spit.ac.in" required />
          <span style="font-size:0.75rem;color:var(--text-muted);">This email will be used as the sign-in username on login.html.</span>
        </div>

        <div class="form-group" style="margin-bottom:1rem;">
          <label class="form-label" style="font-size:0.8125rem;font-weight:600;">Institutional Staff Role *</label>
          <select id="provStaffRole" class="form-control" required>
            <option value="warden">🛡️ Chief Warden / Assistant Warden (Room &amp; Gate Control)</option>
            <option value="mentor">🎓 Senior Faculty / Student Mentor (Grievances &amp; Counseling)</option>
            <option value="admin">⚙️ System Administrator (Full Database &amp; Settings Access)</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom:1.25rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem;">
            <label class="form-label" style="font-size:0.8125rem;font-weight:600;margin:0;">Initial Temporary Password *</label>
            <button type="button" class="btn btn-secondary btn-sm" style="font-size:0.6875rem;padding:0.2rem 0.5rem;" onclick="document.getElementById('provStaffPassword').value = 'Spit@' + Math.floor(1000 + Math.random() * 9000)">🎲 Re-generate</button>
          </div>
          <input type="text" id="provStaffPassword" class="form-control" value="${suggestedPw}" required minlength="6" />
          <span style="font-size:0.75rem;color:var(--text-muted);">The staff member can change their password after signing into the portal.</span>
        </div>

        <div id="provStaffAlert" style="display:none;margin-bottom:1rem;padding:0.75rem;border-radius:var(--radius-sm);font-size:0.8125rem;"></div>

        <div style="display:flex;justify-content:flex-end;gap:0.75rem;border-top:1px solid var(--border-color);padding-top:1rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" id="provStaffSubmitBtn" class="btn btn-primary btn-sm">Provision &amp; Save Credentials</button>
        </div>
      </form>
    </div>
  `);
};

const handleProvisionStaffSubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById('provStaffName').value.trim();
  const email = document.getElementById('provStaffEmail').value.trim();
  const role = document.getElementById('provStaffRole').value;
  const password = document.getElementById('provStaffPassword').value;
  const alertEl = document.getElementById('provStaffAlert');
  const submitBtn = document.getElementById('provStaffSubmitBtn');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Provisioning in MongoDB…';
  if (alertEl) alertEl.style.display = 'none';

  try {
    const res = await API.auth.provisionStaff({ name, email, password, role });
    
    // Show success dialog with quick copy credentials
    openModal(`
      <div style="padding:1.5rem;text-align:center;">
        <div style="font-size:2.5rem;margin-bottom:0.5rem;">🎉</div>
        <h3 style="font-size:1.25rem;font-weight:700;color:var(--status-green);margin-bottom:0.5rem;">
          Staff Account Provisioned Successfully
        </h3>
        <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:1.25rem;">
          The credentials have been stored in MongoDB. You can now securely share the sign-in details below:
        </p>

        <div style="background:var(--spit-surface-hover);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1rem;text-align:left;font-size:0.875rem;margin-bottom:1.25rem;">
          <div style="margin-bottom:0.5rem;"><strong>Name:</strong> ${name}</div>
          <div style="margin-bottom:0.5rem;"><strong>Role:</strong> <span class="role-badge-pill role-${role}">${role.toUpperCase()}</span></div>
          <div style="margin-bottom:0.5rem;"><strong>Sign-In Email:</strong> <code>${email}</code></div>
          <div><strong>Temporary Password:</strong> <code>${password}</code></div>
        </div>

        <div style="display:flex;justify-content:center;gap:0.75rem;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="navigator.clipboard.writeText('SPIT Hostel Ops Login Credentials\\nRole: ${role.toUpperCase()}\\nEmail: ${email}\\nPassword: ${password}\\nPortal: https://spit-hostel-ops.vercel.app/login.html'); showToast('Credentials copied to clipboard!', 'success');">
            📋 Copy Login Information
          </button>
          <button class="btn btn-secondary btn-sm" onclick="closeModal(); if (state.currentPage === 'settings') renderSettingsView(); else if (state.currentPage === 'database') loadDbCollectionData();">
            Close &amp; Refresh
          </button>
        </div>
      </div>
    `);

    showToast(`Staff account created for ${name}`, 'success');
  } catch (err) {
    if (alertEl) {
      alertEl.style.display = 'block';
      alertEl.style.backgroundColor = 'var(--status-red-bg)';
      alertEl.style.color = 'var(--status-red)';
      alertEl.style.border = '1px solid var(--status-red-border)';
      alertEl.textContent = err.message || 'Error provisioning account';
    } else {
      showToast(err.message, 'error');
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Provision & Save Credentials';
  }
};


const handlePromote = async () => {
  const fromYear = Number(document.getElementById('promoteFrom').value);
  const toYear = fromYear + 1;

  if (!confirm(`Are you sure you want to promote eligible students from Year ${fromYear} to Year ${toYear}?`)) return;

  try {
    const res = await API.students.promote({ fromYear, toYear });
    showToast(res.message, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const openAddMessOptionModal = () => {
  openModal(`
    <div style="padding:1.5rem;">
      <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);margin-bottom:1rem;">Add Institutional Mess Plan</h3>
      <form onsubmit="handleAddMessSubmit(event)">
        <div class="form-group">
          <label class="form-label">Mess Plan Name *</label>
          <input type="text" id="messName" class="form-control" placeholder="e.g. Jain Vegetarian Mess" required />
        </div>
        <div class="form-group">
          <label class="form-label">Monthly Fee (INR) *</label>
          <input type="number" id="messFee" class="form-control" placeholder="e.g. 4000" required />
        </div>
        <div class="form-group">
          <label class="form-label">Meal Coverage *</label>
          <input type="text" id="messCoverage" class="form-control" placeholder="e.g. Breakfast, Lunch, Dinner (No root vegetables)" required />
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input type="text" id="messDesc" class="form-control" placeholder="Plan details or special timings" />
        </div>

        <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">Save Mess Plan</button>
        </div>
      </form>
    </div>
  `);
};

const handleAddMessSubmit = async (e) => {
  e.preventDefault();
  const newOpt = {
    name:         document.getElementById('messName').value.trim(),
    monthlyFee:   Number(document.getElementById('messFee').value),
    mealCoverage: document.getElementById('messCoverage').value.trim(),
    description:  document.getElementById('messDesc').value.trim(),
    isActive:     true,
  };

  try {
    const cur = await API.settings.get();
    const updatedOptions = [...(cur.data.messOptions || []), newOpt];
    await API.settings.update({ messOptions: updatedOptions });
    showToast('New mess option saved to MongoDB', 'success');
    closeModal();
    renderSettingsView();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ─── VIEW 9: Reports & Audit Logs (Admin) ────────────────────────────────────
let _allAuditLogsList = [];

const renderReportsView = async () => {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading reports & audit trail…</div>';

  try {
    const res = await API.reports.getAuditLogs();
    _allAuditLogsList = res.data || [];

    container.innerHTML = `
      <div class="card" style="margin-bottom:1.5rem;">
        <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);margin-bottom:0.5rem;">
          Export Official CSV Reports
        </h3>
        <p style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:1.25rem;">
          Administrator-controlled data exports. Every download is recorded in institutional audit logs.
        </p>

        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:0.75rem;">
          <button onclick="downloadCsvReport('students')" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">
            📄 Student Registrations CSV
          </button>
          <button onclick="downloadCsvReport('rooms')" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">
            🏠 Room &amp; Bed Occupancy CSV
          </button>
          <button onclick="downloadCsvReport('receipts')" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">
            💳 Fee Receipt Verification CSV
          </button>
          <button onclick="downloadCsvReport('passes')" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">
            🎫 Digital Gate Passes CSV
          </button>
          <button onclick="downloadCsvReport('gate')" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">
            🚪 Gate Movement Events CSV
          </button>
          <button onclick="downloadCsvReport('complaints')" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">
            🛠️ Complaints Records CSV
          </button>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.75rem;">
          <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);">
            Administrative Audit Trail
          </h3>
          <span style="font-size:0.8125rem;color:var(--text-muted);font-weight:600;" id="auditCountBadge">Total Logs: ${_allAuditLogsList.length}</span>
        </div>

        <div style="display:flex;gap:0.6rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap;">
          <input type="text" id="auditSearchInput" class="form-control" placeholder="🔍 Search audit logs by action, user name, role, or details..." style="flex:1;min-width:240px;" oninput="filterAuditLogs()" />
          <select id="auditRoleFilter" class="form-control" style="width:auto;" onchange="filterAuditLogs()">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="warden">Warden</option>
            <option value="mentor">Mentor</option>
            <option value="student">Student</option>
          </select>
        </div>

        <div style="overflow-x:auto;">
          <table class="data-table" style="width:100%;font-size:0.8125rem;">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Performed By</th>
                <th>Role</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody id="auditTableBody">
            </tbody>
          </table>
        </div>
      </div>
    `;

    filterAuditLogs();
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--status-red)">Error loading reports: ${err.message}</div>`;
  }
};

const filterAuditLogs = () => {
  const search = (document.getElementById('auditSearchInput')?.value || '').trim().toUpperCase();
  const roleFilter = document.getElementById('auditRoleFilter')?.value;
  const tbody = document.getElementById('auditTableBody');
  const countEl = document.getElementById('auditCountBadge');
  if (!tbody) return;

  const filtered = _allAuditLogsList.filter(l => {
    if (roleFilter && l.role !== roleFilter) return false;
    if (search) {
      const action = String(l.action || '').toUpperCase();
      const by = String(l.performedByName || '').toUpperCase();
      const role = String(l.role || '').toUpperCase();
      const details = String(l.details || '').toUpperCase();
      if (!action.includes(search) && !by.includes(search) && !role.includes(search) && !details.includes(search)) {
        return false;
      }
    }
    return true;
  });

  if (countEl) countEl.textContent = `Showing: ${filtered.length} of ${_allAuditLogsList.length}`;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted)">No audit logs match your search criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(l => `
    <tr>
      <td>${new Date(l.timestamp).toLocaleString()}</td>
      <td><strong>${l.action}</strong></td>
      <td>${l.performedByName}</td>
      <td><span class="role-badge-pill role-${l.role}">${l.role}</span></td>
      <td>${l.details}</td>
    </tr>
  `).join('');
};

// ─── VIEW 10: Student Personal Room & Status ────────────────────────────────
const renderStudentMyRoomView = async () => {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading your profile…</div>';

  try {
    const res = await API.students.getMyProfile();
    const s = res.data;
    const isAllocated = Boolean(s.allocatedRoom);

    container.innerHTML = `
      <div class="card" style="margin-bottom:1.5rem;border-left:4px solid var(--spit-teal);">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1rem;">
          <h3 style="font-size:1.25rem;font-weight:700;color:var(--spit-navy);">${s.name}</h3>
          <span class="badge ${s.registrationStatus === 'Approved' ? 'badge-green' : 'badge-amber'}">${s.registrationStatus}</span>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.875rem;">
          <div><strong>Registration No:</strong> ${s.studentId}</div>
          <div><strong>Programme &amp; Branch:</strong> ${s.course} — ${s.branch}</div>
          <div><strong>Academic Year:</strong> ${s.academicYear} (Admitted ${s.admissionYear})</div>
          <div><strong>College Email:</strong> ${s.email}</div>
          <div><strong>Mobile Number:</strong> ${s.phone}</div>
          <div><strong>Guardian Contact:</strong> ${s.guardianName} (${s.guardianPhone})</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:1.5rem;">
        <h3 style="font-size:1.125rem;font-weight:700;color:var(--text-primary);margin-bottom:0.75rem;">
          Hostel Room &amp; Bed Allocation Status
        </h3>

        ${isAllocated ? `
          <div style="background:var(--spit-surface-hover);border:1px solid var(--spit-teal);border-radius:var(--radius-sm);padding:1.25rem;">
            <div style="font-size:1.125rem;font-weight:700;color:var(--text-primary);">
              Allocated Room ${s.allocatedRoom.roomNumber} · Bed ${s.allocatedBed || 1}
            </div>
            <p style="font-size:0.8125rem;color:var(--text-secondary);margin-top:0.25rem;">
              Block ${s.allocatedRoom.block} · Monthly Fee: ₹${s.allocatedRoom.monthlyRent?.toLocaleString()}/mo
            </p>
          </div>
        ` : `
          <div style="background:var(--status-amber-bg);border:1px solid var(--status-amber-border);border-radius:var(--radius-sm);padding:1.25rem;">
            <div style="font-size:1rem;font-weight:700;color:var(--status-amber);">
              Room Allocation Pending Review
            </div>
            <p style="font-size:0.8125rem;color:var(--text-primary);margin-top:0.35rem;line-height:1.5;">
              Your hostel application is registered. Room allocation will be confirmed by the hostel warden following verification of institutional records and fee receipt.
            </p>
          </div>
        `}
      </div>

      <!-- Roommates & Wing Neighbors (Requested by User!) -->
      ${isAllocated ? `
        <div class="card" style="margin-bottom:1.5rem;border-left:4px solid var(--spit-teal);">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:0.75rem;">
            <div>
              <h3 style="font-size:1.125rem;font-weight:700;color:var(--text-primary);">
                Roommates &amp; Wing Neighbors
              </h3>
              <p style="font-size:0.8125rem;color:var(--text-muted);">
                Basic academic details of students sharing your room or residing on your floor (Block ${s.allocatedRoom.block}, Floor ${s.allocatedRoom.floor || 1}).
              </p>
            </div>
            <span class="badge badge-teal">Room ${s.allocatedRoom.roomNumber}</span>
          </div>

          <!-- Section A: Roommates Sharing Same Room -->
          <div style="margin-bottom:1.25rem;">
            <h4 style="font-size:0.875rem;font-weight:700;color:var(--spit-navy);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.04em;">
              🛏️ Roommate(s) in Room ${s.allocatedRoom.roomNumber}
            </h4>
            ${(s.roommates || []).length === 0 ? `
              <div style="background:var(--bg-card-hover);padding:0.75rem 1rem;border-radius:var(--radius-sm);border:1px dashed var(--border);font-size:0.8125rem;color:var(--text-muted);">
                No roommate currently allocated to the other bed in this room. (Single occupant or awaiting allocation).
              </div>
            ` : `
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:0.75rem;">
                ${s.roommates.map(rm => `
                  <div style="background:var(--bg-card-hover);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.875rem;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                      <div>
                        <strong style="color:var(--text-primary);font-size:0.95rem;">${rm.name}</strong>
                        <span class="badge badge-teal" style="font-size:0.7rem;margin-left:0.35rem;">Bed #${rm.bedNumber}</span>
                      </div>
                    </div>
                    <div style="font-size:0.8125rem;color:var(--text-secondary);margin-top:0.4rem;">
                      <div>🎓 <strong>Academic Year:</strong> ${rm.academicYear}</div>
                      <div>📚 <strong>Specialization:</strong> ${rm.branch} (${rm.course})</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Section B: Floor Neighbors (Adjacent Rooms) -->
          <div>
            <h4 style="font-size:0.875rem;font-weight:700;color:var(--spit-navy);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.04em;">
              🚪 Neighbors on Block ${s.allocatedRoom.block} · Floor ${s.allocatedRoom.floor || 1}
            </h4>
            ${(s.neighbors || []).length === 0 ? `
              <p style="font-size:0.8125rem;color:var(--text-muted);">No neighboring room allocations recorded on this floor yet.</p>
            ` : `
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(210px, 1fr));gap:0.6rem;">
                ${s.neighbors.slice(0, 6).map(nb => `
                  <div style="background:var(--bg-card-hover);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.65rem 0.85rem;font-size:0.8125rem;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
                      <strong style="color:var(--text-primary);">${nb.name}</strong>
                      <span class="badge badge-secondary" style="font-size:0.6875rem;">Room ${nb.roomNumber}</span>
                    </div>
                    <div style="color:var(--text-muted);font-size:0.75rem;">
                      ${nb.academicYear} · ${nb.branch}
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      ` : ''}

      <!-- Dining & Mess Plan Card (Requested by User!) -->
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
          <h3 style="font-size:1.125rem;font-weight:700;color:var(--text-primary);">Mess &amp; Dining Plan</h3>
          <button class="btn btn-secondary btn-sm" onclick="openChangeMessModal('${s.messPreference}')">
            Change Mess Plan
          </button>
        </div>
        <div style="background:var(--spit-surface-hover);border:1px solid var(--border);border-radius:var(--radius-sm);padding:1rem;">
          <strong style="font-size:0.95rem;color:var(--spit-teal);">${s.messPreference || 'Regular Vegetarian Mess'}</strong>
          <p style="font-size:0.8125rem;color:var(--text-muted);margin-top:0.25rem;">
            Official campus dining plan. You can change your meal plan anytime during your hostel stay.
          </p>
          <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px dashed var(--border);display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:0.75rem;color:var(--text-secondary);">Dining Hall: Campus Central Mess</span>
            <button class="btn btn-primary btn-sm" style="font-size:0.75rem;" onclick="openChangeMessModal('${s.messPreference}')">
              Switch Mess Option
            </button>
          </div>
        </div>
      </div>

      <!-- Senior Student Mentor Card -->
      <div class="card">
        <h3 style="font-size:1.125rem;font-weight:700;color:var(--text-primary);margin-bottom:0.75rem;">
          Assigned Senior Student Mentor
        </h3>
        <div style="background:var(--spit-surface-hover);border:1px solid var(--border);border-radius:var(--radius-sm);padding:1rem;">
          <strong style="font-size:0.95rem;color:var(--text-primary);">${s.assignedMentor?.name || 'Aryan Shah (Senior Student Mentor)'}</strong>
          <p style="font-size:0.8125rem;color:var(--text-muted);margin-top:0.25rem;">
            Final Year B.Tech Computer Engineering · Room B-302, SPIT Hostel
          </p>
          <p style="font-size:0.8125rem;color:var(--text-secondary);margin-top:0.5rem;">
            Email: <a href="mailto:${s.assignedMentor?.email || 'mentor@spit.ac.in'}">${s.assignedMentor?.email || 'mentor@spit.ac.in'}</a>
          </p>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--status-red)">Error loading profile: ${err.message}</div>`;
  }
};

// ─── Students Directory (Admin) ─────────────────────────────────────────────
// ─── Students Directory (Enrolled Active Residents) ─────────────────────────
let _allStudentsList = [];

const renderStudentsView = async () => {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading resident student directory…</div>';

  try {
    const res = await API.students.getAll({ limit: 100 });
    _allStudentsList = res.data || [];

    container.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem;border-bottom:1px solid var(--border);padding-bottom:1rem;">
          <div>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">
              <h3 style="font-size:1.15rem;font-weight:700;color:var(--text-primary);">Enrolled Resident Student Directory</h3>
              <span class="badge badge-teal">Active Hostel Residents</span>
            </div>
            <p style="font-size:0.8125rem;color:var(--text-muted);">
              Master institutional directory of approved hostel residents · Direct student mobile contacts, room bed assignments, peer mentors, and individual academic year advancement.
            </p>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
            <span style="font-size:0.8125rem;color:var(--text-muted);font-weight:600;" id="studentCountBadge">Total Residents: ${_allStudentsList.length}</span>
            <button class="btn btn-secondary btn-sm" onclick="downloadCsvReport('students')">📥 Export Students CSV</button>
          </div>
        </div>

        <!-- Search & Filter Toolbar -->
        <div style="display:flex;gap:0.6rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap;">
          <input type="text" id="studentSearchInput" class="form-control" placeholder="🔍 Search name, reg no, mobile, room, branch, or mentor..." style="flex:1;min-width:240px;" oninput="filterStudentsDirectory()" />
          <select id="studentYearFilter" class="form-control" style="width:auto;" onchange="filterStudentsDirectory()">
            <option value="">All Academic Years</option>
            <option value="First Year">First Year</option>
            <option value="Second Year">Second Year</option>
            <option value="Third Year">Third Year</option>
            <option value="Final Year">Final Year</option>
          </select>
          <select id="studentRoomFilter" class="form-control" style="width:auto;" onchange="filterStudentsDirectory()">
            <option value="">All Room Statuses</option>
            <option value="allocated">Allocated Rooms</option>
            <option value="pending">Awaiting Room</option>
          </select>
        </div>

        <div style="overflow-x:auto;">
          <table class="data-table" style="width:100%;font-size:0.8125rem;">
            <thead>
              <tr>
                <th>Reg No</th>
                <th>Student Name</th>
                <th>Student Mobile</th>
                <th>Branch</th>
                <th>Academic Year</th>
                <th>Allocated Room</th>
                <th>Senior Mentor</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="studentTableBody">
            </tbody>
          </table>
        </div>
      </div>
    `;

    filterStudentsDirectory();
  } catch (err) {
    container.innerHTML = `<div class="card" style="color:var(--status-red)">Error loading students: ${err.message}</div>`;
  }
};

const filterStudentsDirectory = () => {
  const search = (document.getElementById('studentSearchInput')?.value || '').trim().toUpperCase();
  const yearFilter = document.getElementById('studentYearFilter')?.value;
  const roomFilter = document.getElementById('studentRoomFilter')?.value;
  const tbody = document.getElementById('studentTableBody');
  const countEl = document.getElementById('studentCountBadge');
  if (!tbody) return;

  const filtered = _allStudentsList.filter(s => {
    if (yearFilter && s.academicYear !== yearFilter) return false;
    if (roomFilter === 'allocated' && !s.allocatedRoom?.roomNumber) return false;
    if (roomFilter === 'pending' && s.allocatedRoom?.roomNumber) return false;
    if (search) {
      const name = String(s.name || '').toUpperCase();
      const sid = String(s.studentId || '').toUpperCase();
      const phone = String(s.phone || '').toUpperCase();
      const branch = String(s.branch || '').toUpperCase();
      const room = String(s.allocatedRoom?.roomNumber || '').toUpperCase();
      const block = String(s.allocatedRoom?.block || '').toUpperCase();
      const mentor = String(s.assignedMentor?.name || '').toUpperCase();
      const email = String(s.email || '').toUpperCase();

      const matched = name.includes(search) ||
        sid.includes(search) ||
        phone.includes(search) ||
        branch.includes(search) ||
        room.includes(search) ||
        block.includes(search) ||
        `ROOM ${room}`.includes(search) ||
        `BLOCK ${block}`.includes(search) ||
        mentor.includes(search) ||
        email.includes(search);

      if (!matched) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = `Showing: ${filtered.length} of ${_allStudentsList.length}`;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-muted)">No resident students match your search criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td><strong>${s.studentId}</strong></td>
      <td>${s.name}</td>
      <td>
        <a href="tel:${s.phone}" style="color:var(--spit-teal);font-weight:700;text-decoration:none;" title="Call resident student directly">
          📱 ${s.phone || '—'}
        </a>
      </td>
      <td>${s.branch}</td>
      <td><span class="badge badge-teal">${s.academicYear}</span></td>
      <td>${s.allocatedRoom?.roomNumber ? `Room ${s.allocatedRoom.roomNumber} (${s.allocatedRoom.block})` : '<span style="color:var(--status-amber)">Pending</span>'}</td>
      <td>${s.assignedMentor?.name || '<span style="color:var(--text-muted)">Unassigned</span>'}</td>
      <td><span class="badge ${s.registrationStatus === 'Approved' ? 'badge-green' : 'badge-amber'}">${s.registrationStatus}</span></td>
      <td style="display:flex;gap:0.35rem;">
        <button class="btn btn-primary btn-sm" style="font-size:0.75rem;padding:0.25rem 0.6rem;" onclick="openStudentFullDetailsModal('${s._id}')" title="Inspect full profile & emergency contacts">
          👁️ Details
        </button>
        ${state.user.role === 'admin' ? `
          <button class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:0.25rem 0.55rem;color:var(--status-green);font-weight:700;" onclick="openPromoteStudentModal('${s._id}', '${s.name}', '${s.academicYear}', ${s.year || 1})" title="Promote individual student & auto-vacate bed">
            🎓 Promote
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');
};

// ─── Individual Student Promotion & Bed Vacating ─────────────────────────────
const openPromoteStudentModal = (studentId, studentName, currentYearLabel, currentYearNum = 1) => {
  const nextYear = Number(currentYearNum) + 1;
  const yearLabels = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };

  // 4th-year students get a graduation option instead of promotion
  if (Number(currentYearNum) >= 4) {
    openGraduateStudentModal(studentId, studentName);
    return;
  }

  openModal(`
    <div style="padding:1.5rem;max-width:520px;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:0.75rem;margin-bottom:1.25rem;">
        <div>
          <span class="badge badge-teal" style="margin-bottom:0.25rem;">SPIT Academic Progression</span>
          <h3 style="font-size:1.15rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem;">
            Promote Individual Student
          </h3>
        </div>
        <button class="modal-close-btn" onclick="closeModal()" style="background:none;border:none;font-size:1.25rem;cursor:pointer;color:var(--text-muted);">✕</button>
      </div>

      <div style="margin-bottom:1.25rem;font-size:0.875rem;">
        <p style="color:var(--text-primary);margin-bottom:0.35rem;">
          Advance <strong>${studentName}</strong> from <span class="badge badge-amber">${currentYearLabel || `${currentYearNum}st Year`}</span> to the next academic level.
        </p>
        <p style="font-size:0.8125rem;color:var(--text-muted);">
          Each resident is promoted individually so students retaining rooms or repeating courses are not disrupted.
        </p>
      </div>

      <form onsubmit="handlePromoteStudentSubmit(event, '${studentId}')">
        <div class="form-group" style="margin-bottom:1rem;">
          <label class="form-label">Promote to Academic Year *</label>
          <select id="promoteTargetYear" class="form-control" required>
            ${[2, 3, 4].filter(y => y > currentYearNum).map(y => `
              <option value="${y}" ${y === nextYear ? 'selected' : ''}>${yearLabels[y]} (${y}${y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} Year)</option>
            `).join('')}
          </select>
        </div>

        <div class="card" style="margin-bottom:1.25rem;border-left:4px solid var(--status-green);background:var(--bg-card-hover);">
          <label style="display:flex;align-items:flex-start;gap:0.75rem;cursor:pointer;">
            <input type="checkbox" id="promoteVacateRoom" checked style="margin-top:4px;" />
            <div>
              <strong style="color:var(--text-primary);font-size:0.875rem;">Auto-vacate previous room &amp; free bed on dashboard (Recommended)</strong>
              <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">
                When checked, the student's current room bed is automatically vacated and freed. The room color indicator on the dashboard immediately updates from Full (🟢) to Partial (🟡) or Empty (🔴).
              </p>
            </div>
          </label>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:0.75rem;border-top:1px solid var(--border);padding-top:1rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">Confirm Promotion &amp; Free Bed</button>
        </div>
      </form>
    </div>
  `);
};

const handlePromoteStudentSubmit = async (e, studentId) => {
  e.preventDefault();
  const toYear = Number(document.getElementById('promoteTargetYear').value);
  const vacateRoom = document.getElementById('promoteVacateRoom').checked;

  try {
    const res = await API.students.promote({ studentId, toYear, vacateRoom });
    showToast(res.message || 'Student promoted successfully!', 'success');
    closeModal();
    if (document.getElementById('pageTitle')?.textContent?.includes('Directory')) {
      renderStudentsView();
    } else {
      renderOverview();
    }
  } catch (err) {
    showToast(err.message || 'Promotion failed', 'error');
  }
};

// ─── 4th Year Graduation & Room Vacate ────────────────────────────────────────
const openGraduateStudentModal = (studentId, studentName) => {
  openModal(`
    <div style="padding:1.5rem;max-width:500px;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-color);padding-bottom:0.75rem;margin-bottom:1.25rem;">
        <div>
          <span class="badge badge-amber" style="margin-bottom:0.25rem;">4th Year — Final Year</span>
          <h3 style="font-size:1.15rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem;">
            Graduate Student
          </h3>
        </div>
        <button class="modal-close-btn" onclick="closeModal()" style="background:none;border:none;font-size:1.25rem;cursor:pointer;color:var(--text-muted);">✕</button>
      </div>

      <div style="margin-bottom:1.25rem;">
        <div class="card" style="border-left:4px solid var(--status-amber);background:var(--status-amber-bg);font-size:0.875rem;padding:0.85rem 1rem;">
          <strong>${studentName}</strong> is a Final Year (4th Year) student.<br/>
          Graduating will <strong>vacate their room bed</strong> and mark their hostel record as <span class="badge badge-amber">Graduated</span>.
          Their room will immediately show as freed on the dashboard.
        </div>
      </div>

      <div class="form-group" style="margin-bottom:1.25rem;">
        <label class="form-label">Remarks / Graduation Note (optional)</label>
        <input type="text" id="graduateRemarks" class="form-control" placeholder="e.g. Completed B.Tech 2024-25. All dues cleared." />
      </div>

      <div style="display:flex;justify-content:flex-end;gap:0.75rem;border-top:1px solid var(--border-color);padding-top:1rem;">
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-sm" style="background:var(--status-amber);border-color:var(--status-amber);color:#fff;"
          onclick="handleGraduateStudentSubmit('${studentId}', '${studentName}')">
          🎓 Confirm Graduation & Vacate Room
        </button>
      </div>
    </div>
  `);
};

const handleGraduateStudentSubmit = async (studentId, studentName) => {
  const remarks = document.getElementById('graduateRemarks')?.value?.trim() || '';
  try {
    const res = await API.students.graduate(studentId, { remarks });
    showToast(res.message || `${studentName} graduated successfully!`, 'success');
    closeModal();
    // Refresh whichever view is open
    if (state.currentPage === 'students') {
      renderStudentsView();
    } else {
      renderOverview();
    }
  } catch (err) {
    showToast(err.message || 'Graduation failed', 'error');
  }
};

// ─── Universal Emergency SOS & Simulated SMS Broadcast ──────────────────────
const openEmergencySosModal = () => {
  const user = state.user || {};
  openModal(`
    <div style="padding:1.5rem;max-width:540px;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #ef4444;padding-bottom:0.75rem;margin-bottom:1.25rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span class="sos-beacon" style="background:#dc2626;"></span>
          <h3 style="font-size:1.2rem;font-weight:800;color:#dc2626;letter-spacing:0.02em;">
            🚨 CAMPUS EMERGENCY SOS &amp; SMS
          </h3>
        </div>
        <span class="badge badge-red" style="font-weight:700;">Zero-Cost Gateway</span>
      </div>

      <div style="background:rgba(239, 68, 68, 0.08);border:1px solid rgba(239, 68, 68, 0.25);border-radius:var(--radius-sm);padding:0.75rem 1rem;margin-bottom:1.25rem;font-size:0.8125rem;">
        <div><strong>Dispatched By:</strong> ${user.name || 'Campus Resident'} (${(user.role || 'user').toUpperCase()})</div>
        <div style="color:var(--text-muted);font-size:0.75rem;margin-top:0.25rem;">
          This emergency protocol broadcasts an immediate campus alert and dispatches simulated zero-cost emergency SMS messages to registered phone numbers.
        </div>
      </div>

      <form onsubmit="handleEmergencySosSubmit(event)">
        <div class="form-group" style="margin-bottom:0.875rem;">
          <label class="form-label">Target Audience / Recipients *</label>
          <select id="sosTargetAudience" class="form-control" required>
            <option value="All">Campus-Wide Emergency (All Students, Mentors, Wardens &amp; Admins)</option>
            <option value="student">All Hostel Resident Students</option>
            <option value="warden">Hostel Wardens &amp; Gate Security Desk</option>
            <option value="mentor">Senior Student Mentors</option>
            <option value="admin">Hostel Administration &amp; Campus Estate Office</option>
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.875rem;">
          <div class="form-group">
            <label class="form-label">Emergency Category *</label>
            <select id="sosCategory" class="form-control" required onchange="applySosTemplate(this.value)">
              <option value="Medical Emergency">Medical Emergency / Ambulance</option>
              <option value="Security Alert">Security Incident / Gate Curfew</option>
              <option value="Infrastructure Hazard">Fire / Power / Water Crisis</option>
              <option value="Hostel Evacuation">Hostel Evacuation / Urgent Notice</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Incident Location *</label>
            <input type="text" id="sosLocation" class="form-control" value="Block A - Room 101" placeholder="e.g. Block B, 2nd Floor / Gate" required />
          </div>
        </div>

        <div class="form-group" style="margin-bottom:1rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem;">
            <label class="form-label" style="margin-bottom:0;">Emergency Broadcast Message *</label>
            <span style="font-size:0.75rem;color:var(--text-muted);">Quick text templates available</span>
          </div>
          <textarea id="sosMessage" class="form-control" rows="3" placeholder="State the emergency clearly..." required>URGENT: Medical assistance required immediately at Block A Room 101. Student feeling unwell. Please dispatch first aid / warden.</textarea>
          
          <div style="display:flex;gap:0.35rem;flex-wrap:wrap;margin-top:0.5rem;">
            <button type="button" class="btn btn-secondary btn-sm" style="font-size:0.6875rem;padding:0.2rem 0.5rem;" onclick="setSosMsg('Medical assistance urgently required at ' + document.getElementById('sosLocation').value + '. First aid / medical response needed.')">🚑 Medical</button>
            <button type="button" class="btn btn-secondary btn-sm" style="font-size:0.6875rem;padding:0.2rem 0.5rem;" onclick="setSosMsg('URGENT: Gate curfew lockdown initiated. All residents must report to rooms immediately.')">🚪 Curfew Lock</button>
            <button type="button" class="btn btn-secondary btn-sm" style="font-size:0.6875rem;padding:0.2rem 0.5rem;" onclick="setSosMsg('Power / Water outage reported at ' + document.getElementById('sosLocation').value + '. Estate engineering team attending.')">⚡ Utility Alert</button>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:0.75rem;border-top:1px solid var(--border);padding-top:1rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn-sos" style="padding:0.55rem 1.25rem;font-size:0.875rem;">
            <span class="sos-beacon"></span>
            <span>SEND EMERGENCY SMS BROADCAST</span>
          </button>
        </div>
      </form>
    </div>
  `);
};

const setSosMsg = (msg) => {
  const el = document.getElementById('sosMessage');
  if (el) el.value = msg;
};

const applySosTemplate = (cat) => {
  const loc = document.getElementById('sosLocation')?.value || 'SPIT Hostel';
  if (cat === 'Medical Emergency') {
    setSosMsg(`URGENT: Medical assistance required immediately at ${loc}. Student unwell. Please dispatch warden / ambulance.`);
  } else if (cat === 'Security Alert') {
    setSosMsg(`SECURITY ALERT: Unauthorized access / curfew incident reported at ${loc}. Wardens and security team alerted.`);
  } else if (cat === 'Infrastructure Hazard') {
    setSosMsg(`FACILITY EMERGENCY: Electrical / water infrastructure failure at ${loc}. Residents please exercise safety caution.`);
  } else {
    setSosMsg(`URGENT HOSTEL NOTICE: Immediate attention required by all hostel residents regarding ${loc}.`);
  }
};

const handleEmergencySosSubmit = async (e) => {
  e.preventDefault();
  const audience = document.getElementById('sosTargetAudience').value;
  const category = document.getElementById('sosCategory').value;
  const location = document.getElementById('sosLocation').value.trim();
  const message = document.getElementById('sosMessage').value.trim();

  try {
    const res = await API.announcements.sendSos({
      title: category,
      message,
      targetAudience: audience,
      category,
      location,
    });

    const summary = res.data?.smsSummary || {
      recipientGroup: 'Campus Residents & Staff',
      recipientCount: 110,
      cost: '₹0.00',
      sentAt: new Date().toISOString(),
    };

    // Render SMS Delivery Receipt (Dynamic Live vs Handover Simulation Mode)
    const isLive = summary.isLive;
    const sampleRecipientsText = summary.sampleRecipients && summary.sampleRecipients.length
      ? summary.sampleRecipients.join(', ')
      : 'Registered campus residents & wardens';

    openModal(`
      <div style="padding:1.5rem;max-width:540px;text-align:center;">
        <div style="width:52px;height:52px;border-radius:50%;background:${isLive ? 'rgba(22, 163, 74, 0.15)' : 'rgba(59, 130, 246, 0.15)'};color:${isLive ? '#16a34a' : '#3b82f6'};display:inline-flex;align-items:center;justify-content:center;font-size:1.85rem;margin-bottom:0.75rem;">
          ${isLive ? '✓' : '📡'}
        </div>
        <h3 style="font-size:1.25rem;font-weight:800;color:var(--text-primary);margin-bottom:0.35rem;">
          ${isLive ? 'Live Cellular SMS Dispatched!' : 'Emergency SOS Broadcast Dispatched!'}
        </h3>
        <p style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:1rem;">
          ${isLive 
            ? 'Real cellular SMS has been transmitted to recipient phones via official carrier gateway.' 
            : 'Broadcast logged to Campus Portal & simulated carrier SMS formatted for all database phone numbers.'}
        </p>

        <!-- Mode Badge -->
        <div style="display:inline-block;padding:0.35rem 0.85rem;border-radius:9999px;font-size:0.75rem;font-weight:700;margin-bottom:1rem;background:${isLive ? 'rgba(22, 163, 74, 0.15);color:#16a34a;border:1px solid rgba(22, 163, 74, 0.3);' : 'rgba(99, 102, 241, 0.15);color:#818cf8;border:1px solid rgba(99, 102, 241, 0.3);'}">
          ${isLive ? '🟢 LIVE TELECOM CARRIER DISPATCH' : '⚡ COLLEGE HANDOVER SIMULATION MODE'}
        </div>

        <!-- Smartphone SMS Card Simulation -->
        <div class="sms-phone-mockup">
          <div class="sms-phone-header">
            <span>📶 ${isLive ? 'MSG91-DLT-CARRIER' : 'SPIT-SMS-RELAY'} · 5G</span>
            <span>${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div style="text-align:left;font-size:0.7rem;color:#f87171;font-weight:700;margin-bottom:0.35rem;text-transform:uppercase;">
            🚨 PRIORITY 1 EMERGENCY BROADCAST
          </div>
          <div class="sms-bubble">
            <div style="font-weight:700;margin-bottom:0.35rem;color:#fca5a5;">${category.toUpperCase()} — ${location}</div>
            ${message}
            <div style="font-size:0.7rem;color:#9ca3af;margin-top:0.5rem;border-top:1px solid #374151;padding-top:0.35rem;">
              Sender: ${state.user?.name || 'Resident'} · ${summary.gateway || 'SPIT Gateway'}
            </div>
          </div>
          <div class="sms-delivery-receipt">
            <span>✓✓ Delivered to ${summary.recipientCount} phone numbers</span>
            <span>Cost: ${summary.cost || '₹0.00'}</span>
          </div>
        </div>

        <div style="background:var(--bg-card-hover);padding:0.85rem 1rem;border-radius:var(--radius-sm);font-size:0.8125rem;text-align:left;margin-bottom:1.25rem;border:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.35rem;">
            <strong>Target Audience:</strong> <span>${summary.recipientGroup}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:0.35rem;">
            <strong>Gateway Provider:</strong> <span>${summary.provider || summary.gateway}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:0.35rem;">
            <strong>Sample Numbers:</strong> <span style="font-family:monospace;font-size:0.75rem;">${sampleRecipientsText}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <strong>Audit Trail:</strong> <span>Logged with Timestamp &amp; Sender Signature</span>
          </div>
        </div>

        ${!isLive ? `
          <div style="background:rgba(234, 179, 8, 0.1);border:1px solid rgba(234, 179, 8, 0.25);border-radius:var(--radius-sm);padding:0.75rem;margin-bottom:1.25rem;text-align:left;font-size:0.75rem;color:#fef08a;">
            <strong>ℹ️ SPIT Handover Note:</strong> The backend is fully integrated with MSG91 / Fast2SMS APIs. When SPIT deploys this on campus servers, the IT Admin simply adds <code>MSG91_AUTH_KEY</code> in <code>backend/.env</code> to activate live cellular delivery.
          </div>
        ` : ''}

        <button class="btn btn-primary" onclick="closeModal(); renderOverview();">Return to Dashboard</button>
      </div>
    `);

    showToast(isLive ? 'Emergency SOS & live cellular SMS dispatched!' : 'Emergency SOS broadcast registered successfully!', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to dispatch SOS', 'error');
  }
};

// ─── VIEW 11: MongoDB Live Database Explorer (Admin Only) ───────────────────
const dbExplorerState = {
  activeCollection: 'students',
  page: 1,
  limit: 25,
  search: '',
  viewMode: 'table', // 'table' or 'json'
  stats: null,
  currentDocs: [],
  total: 0,
  totalPages: 1,
};

const DB_COLLECTION_META = {
  students: { label: 'Students', icon: '🎓', desc: 'Registered students, academic year, and room allocations' },
  users: { label: 'Users', icon: '👥', desc: 'System authentication accounts (Admin, Warden, Mentor, Student)' },
  rooms: { label: 'Rooms', icon: '🏠', desc: 'Hostel room inventory, capacities, and bed occupancy' },
  passrequests: { label: 'Gate Passes', icon: '🎫', desc: 'Digital gate passes, curfew tracking, and QR codes' },
  complaints: { label: 'Complaints', icon: '🛠️', desc: 'Maintenance, plumbing, and electrical issues' },
  institutionsettings: { label: 'Settings & Mess', icon: '⚙️', desc: 'Curfew rules and verified dining mess plans' },
  announcements: { label: 'Announcements', icon: '📢', desc: 'Official institutional notices and circulars' },
  auditlogs: { label: 'Audit Trail', icon: '📜', desc: 'System security actions and modification logs' },
};

const renderDatabaseView = async () => {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Connecting to MongoDB instance…</div>';

  try {
    const statsRes = await API.database.getStats();
    dbExplorerState.stats = statsRes.data;

    const collections = Object.keys(DB_COLLECTION_META);
    const totalDocs = Object.values(dbExplorerState.stats.collections || {}).reduce((acc, v) => acc + (v || 0), 0);

    container.innerHTML = `
      <!-- Database Connection Status Banner -->
      <div class="db-status-bar">
        <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
          <div class="db-live-indicator">
            <span class="db-live-dot"></span>
            <span>MongoDB Connected: <code>${dbExplorerState.stats.databaseName}</code></span>
          </div>
          <span style="font-size:0.75rem;color:var(--text-muted);">
            Host: <strong>${dbExplorerState.stats.host}:${dbExplorerState.stats.port}</strong> · Total Collections: <strong>${collections.length}</strong> · Total Documents: <strong>${totalDocs}</strong>
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" onclick="exportCurrentDbCollectionJson()" title="Download collection records as JSON backup">
            📥 Export Collection JSON
          </button>
          <button class="btn btn-primary btn-sm" onclick="refreshDbExplorer()" title="Reload data from database">
            🔄 Refresh DB
          </button>
        </div>
      </div>

      <!-- Collection Selector Tabs Tray -->
      <div class="db-collections-tray" id="dbCollectionsTray">
        ${collections.map((col) => {
          const count = dbExplorerState.stats.collections?.[col] ?? 0;
          const meta = DB_COLLECTION_META[col];
          const isActive = dbExplorerState.activeCollection === col;
          return `
            <button class="db-collection-tab ${isActive ? 'active' : ''}" onclick="switchDbCollection('${col}')" id="dbTab-${col}">
              <span>${meta.icon}</span>
              <span>${meta.label}</span>
              <span class="badge">${count}</span>
            </button>
          `;
        }).join('')}
      </div>

      <!-- Controls & Search Toolbar -->
      <div class="card" style="margin-bottom:1rem;padding:0.85rem 1.25rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
          <!-- Search box -->
          <div style="flex:1;min-width:240px;position:relative;">
            <input
              type="text"
              id="dbSearchInput"
              class="form-control"
              placeholder="Search in ${DB_COLLECTION_META[dbExplorerState.activeCollection]?.label || 'collection'}..."
              value="${dbExplorerState.search}"
              oninput="debounceDbSearch()"
              onkeydown="if(event.key==='Enter'){event.preventDefault();executeDbSearch();}"
              style="padding-right:2.5rem;"
            />
            <button
              onclick="executeDbSearch()"
              style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;"
              title="Search"
            >
              🔍
            </button>
          </div>

          <!-- View Mode & Page Info -->
          <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
            ${dbExplorerState.activeCollection === 'users' ? `
              <button class="btn btn-primary btn-sm" onclick="openProvisionStaffModal()" style="font-size:0.75rem;padding:0.35rem 0.65rem;display:inline-flex;align-items:center;gap:0.3rem;" title="Allot credentials to new staff member">
                ➕ Provision Staff Member
              </button>
            ` : ''}
            <div style="font-size:0.8125rem;color:var(--text-muted);" id="dbResultSummary">
              Loading records…
            </div>
            <div style="display:inline-flex;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;">

              <button
                class="btn btn-sm ${dbExplorerState.viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}"
                style="border-radius:0;border:none;font-size:0.75rem;"
                onclick="setDbViewMode('table')"
                id="btnViewTable"
              >
                📋 Spreadsheet
              </button>
              <button
                class="btn btn-sm ${dbExplorerState.viewMode === 'json' ? 'btn-primary' : 'btn-secondary'}"
                style="border-radius:0;border:none;font-size:0.75rem;"
                onclick="setDbViewMode('json')"
                id="btnViewJson"
              >
                🗂️ Raw JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Database Documents Viewport -->
      <div id="dbDataViewport">
        <div style="padding:2rem;text-align:center;color:var(--text-muted);">Loading collection documents…</div>
      </div>

      <!-- Pagination Toolbar -->
      <div id="dbPaginationTray" style="margin-top:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;">
      </div>
    `;

    await loadDbCollectionData();
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="color:var(--status-red);padding:2rem;text-align:center;">
        <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:0.5rem;">Database Explorer Error</h3>
        <p style="font-size:0.875rem;">Could not connect to MongoDB instance: ${err.message}</p>
        <button class="btn btn-secondary btn-sm" style="margin-top:1rem;" onclick="renderDatabaseView()">Retry Connection</button>
      </div>
    `;
  }
};

const switchDbCollection = async (col) => {
  dbExplorerState.activeCollection = col;
  dbExplorerState.page = 1;
  dbExplorerState.search = '';

  document.querySelectorAll('.db-collection-tab').forEach((tab) => tab.classList.remove('active'));
  document.getElementById(`dbTab-${col}`)?.classList.add('active');

  const searchInput = document.getElementById('dbSearchInput');
  if (searchInput) {
    searchInput.value = '';
    searchInput.placeholder = `Search in ${DB_COLLECTION_META[col]?.label || col}...`;
  }

  await loadDbCollectionData();
};

let _dbSearchTimer = null;
const debounceDbSearch = () => {
  clearTimeout(_dbSearchTimer);
  _dbSearchTimer = setTimeout(() => {
    executeDbSearch();
  }, 350);
};

const executeDbSearch = async () => {
  const searchInput = document.getElementById('dbSearchInput');
  dbExplorerState.search = (searchInput?.value || '').trim();
  dbExplorerState.page = 1;
  await loadDbCollectionData();
};

const setDbViewMode = (mode) => {
  dbExplorerState.viewMode = mode;
  const btnTable = document.getElementById('btnViewTable');
  const btnJson = document.getElementById('btnViewJson');
  if (btnTable) btnTable.className = `btn btn-sm ${mode === 'table' ? 'btn-primary' : 'btn-secondary'}`;
  if (btnJson) btnJson.className = `btn btn-sm ${mode === 'json' ? 'btn-primary' : 'btn-secondary'}`;
  renderDbCurrentViewport();
};

const loadDbCollectionData = async () => {
  const viewport = document.getElementById('dbDataViewport');
  if (!viewport) return;
  viewport.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Fetching collection records…</div>';

  try {
    const res = await API.database.getCollection(dbExplorerState.activeCollection, {
      page: dbExplorerState.page,
      limit: dbExplorerState.limit,
      search: dbExplorerState.search,
    });

    dbExplorerState.currentDocs = res.data || [];
    dbExplorerState.total = res.total || 0;
    dbExplorerState.totalPages = res.totalPages || 1;

    // Update summary text
    const summaryEl = document.getElementById('dbResultSummary');
    if (summaryEl) {
      if (dbExplorerState.total === 0) {
        summaryEl.textContent = 'No matching records in collection';
      } else {
        const start = (dbExplorerState.page - 1) * dbExplorerState.limit + 1;
        const end = Math.min(dbExplorerState.page * dbExplorerState.limit, dbExplorerState.total);
        summaryEl.textContent = `Showing ${start}–${end} of ${dbExplorerState.total} documents`;
      }
    }

    renderDbCurrentViewport();
    renderDbPagination();
  } catch (err) {
    viewport.innerHTML = `<div class="card" style="color:var(--status-red)">Error loading collection: ${err.message}</div>`;
  }
};

const renderDbCurrentViewport = () => {
  const viewport = document.getElementById('dbDataViewport');
  if (!viewport) return;

  if (dbExplorerState.currentDocs.length === 0) {
    viewport.innerHTML = `
      <div class="card" style="text-align:center;padding:3rem 1.5rem;color:var(--text-muted);">
        <div style="font-size:2rem;margin-bottom:0.5rem;">📭</div>
        <p style="font-size:1rem;font-weight:600;color:var(--text-secondary);">No documents found in '${dbExplorerState.activeCollection}'</p>
        <p style="font-size:0.8125rem;margin-top:0.25rem;">Try modifying your search or adding new records through the application.</p>
      </div>
    `;
    return;
  }

  if (dbExplorerState.viewMode === 'json') {
    renderDbJsonView(viewport);
  } else {
    renderDbTableView(viewport);
  }
};

// ─── Table View Renderer ─────────────────────────────────────────────────────
const renderDbTableView = (viewport) => {
  const col = dbExplorerState.activeCollection;
  const docs = dbExplorerState.currentDocs;

  let tableHeader = '';
  let rowRenderer = (d) => '';

  if (col === 'students') {
    tableHeader = `
      <tr>
        <th>Reg ID</th>
        <th>Full Name</th>
        <th>Branch &amp; Year</th>
        <th>Email &amp; Mobile</th>
        <th>Allocated Room</th>
        <th>Status</th>
        <th style="text-align:right;">Actions</th>
      </tr>
    `;
    rowRenderer = (d) => `
      <tr>
        <td><code>${d.studentId || d._id.substring(0, 8)}</code></td>
        <td><strong>${d.name || 'Unnamed'}</strong></td>
        <td>${d.branch || '—'} · Yr ${d.academicYear || '—'}</td>
        <td>${d.email || '—'}<br/><span style="font-size:0.75rem;color:var(--text-muted);">${d.phone || ''}</span></td>
        <td>${d.allocatedRoom?.roomNumber ? `Room ${d.allocatedRoom.roomNumber} (${d.allocatedRoom.block || ''})` : '<span style="color:var(--status-amber)">Pending</span>'}</td>
        <td><span class="badge ${d.registrationStatus === 'Approved' ? 'badge-green' : 'badge-amber'}">${d.registrationStatus || 'Pending'}</span></td>
        <td style="text-align:right;white-space:nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="openEditDbDocModal('${col}', '${d._id}')" title="Inspect & Edit Document">✏️ Edit</button>
          <button class="btn btn-secondary btn-sm" style="color:var(--status-red);" onclick="deleteDbDoc('${col}', '${d._id}')" title="Delete from Database">🗑️</button>
        </td>
      </tr>
    `;
  } else if (col === 'users') {
    tableHeader = `
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>System Role</th>
        <th>Created</th>
        <th style="text-align:right;">Actions</th>
      </tr>
    `;
    rowRenderer = (d) => `
      <tr>
        <td><strong>${d.name || 'Unnamed'}</strong></td>
        <td>${d.email}</td>
        <td><span class="role-badge-pill role-${d.role}">${d.role}</span></td>
        <td>${d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</td>
        <td style="text-align:right;white-space:nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="openEditDbDocModal('${col}', '${d._id}')" title="Inspect & Edit Document">✏️ Edit</button>
          <button class="btn btn-secondary btn-sm" style="color:var(--status-red);" onclick="deleteDbDoc('${col}', '${d._id}')" title="Delete User">🗑️</button>
        </td>
      </tr>
    `;
  } else if (col === 'rooms') {
    tableHeader = `
      <tr>
        <th>Room #</th>
        <th>Block</th>
        <th>Floor</th>
        <th>Capacity &amp; Occupancy</th>
        <th>Status</th>
        <th style="text-align:right;">Actions</th>
      </tr>
    `;
    rowRenderer = (d) => `
      <tr>
        <td><strong>Room ${d.roomNumber}</strong></td>
        <td>Block ${d.block}</td>
        <td>Floor ${d.floor}</td>
        <td>${d.occupiedCount || 0} / ${d.capacity || 2} Beds</td>
        <td><span class="badge ${d.status === 'Full' ? 'badge-green' : d.status === 'Partial' ? 'badge-amber' : 'badge-red'}">${d.status || 'Available'}</span></td>
        <td style="text-align:right;white-space:nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="openEditDbDocModal('${col}', '${d._id}')" title="Inspect & Edit Room">✏️ Edit</button>
          <button class="btn btn-secondary btn-sm" style="color:var(--status-red);" onclick="deleteDbDoc('${col}', '${d._id}')" title="Delete Room">🗑️</button>
        </td>
      </tr>
    `;
  } else if (col === 'passrequests') {
    tableHeader = `
      <tr>
        <th>Pass Type</th>
        <th>Reason</th>
        <th>Destination</th>
        <th>Expected Return</th>
        <th>Status</th>
        <th style="text-align:right;">Actions</th>
      </tr>
    `;
    rowRenderer = (d) => `
      <tr>
        <td><strong>${d.passType || 'Gate Pass'}</strong></td>
        <td>${d.reason || '—'}</td>
        <td>${d.destination || '—'}</td>
        <td>${d.expectedIn ? new Date(d.expectedIn).toLocaleString() : '—'}</td>
        <td><span class="badge ${d.status === 'Approved' ? 'badge-green' : d.status === 'Rejected' ? 'badge-red' : 'badge-amber'}">${d.status}</span></td>
        <td style="text-align:right;white-space:nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="openEditDbDocModal('${col}', '${d._id}')" title="Inspect & Edit Pass">✏️ Edit</button>
          <button class="btn btn-secondary btn-sm" style="color:var(--status-red);" onclick="deleteDbDoc('${col}', '${d._id}')" title="Delete Pass">🗑️</button>
        </td>
      </tr>
    `;
  } else if (col === 'complaints') {
    tableHeader = `
      <tr>
        <th>Ticket Title</th>
        <th>Category</th>
        <th>Priority</th>
        <th>Status</th>
        <th>Filed Date</th>
        <th style="text-align:right;">Actions</th>
      </tr>
    `;
    rowRenderer = (d) => `
      <tr>
        <td><strong>${d.title}</strong></td>
        <td>${d.category}</td>
        <td><span class="badge ${d.priority === 'High' ? 'badge-red' : 'badge-amber'}">${d.priority || 'Normal'}</span></td>
        <td><span class="badge ${d.status === 'Resolved' ? 'badge-green' : 'badge-amber'}">${d.status}</span></td>
        <td>${d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</td>
        <td style="text-align:right;white-space:nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="openEditDbDocModal('${col}', '${d._id}')" title="Inspect & Edit Ticket">✏️ Edit</button>
          <button class="btn btn-secondary btn-sm" style="color:var(--status-red);" onclick="deleteDbDoc('${col}', '${d._id}')" title="Delete Ticket">🗑️</button>
        </td>
      </tr>
    `;
  } else {
    tableHeader = `
      <tr>
        <th>Document ID</th>
        <th>Title / Identifier</th>
        <th>Details / Metadata</th>
        <th>Created</th>
        <th style="text-align:right;">Actions</th>
      </tr>
    `;
    rowRenderer = (d) => `
      <tr>
        <td><code>${d._id}</code></td>
        <td><strong>${d.title || d.action || d.name || 'Record'}</strong></td>
        <td><span style="font-size:0.75rem;color:var(--text-muted);">${d.content || d.details || d.description || JSON.stringify(d).substring(0, 60)}…</span></td>
        <td>${d.createdAt || d.timestamp ? new Date(d.createdAt || d.timestamp).toLocaleString() : '—'}</td>
        <td style="text-align:right;white-space:nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="openEditDbDocModal('${col}', '${d._id}')" title="Inspect & Edit Document">✏️ Edit</button>
          <button class="btn btn-secondary btn-sm" style="color:var(--status-red);" onclick="deleteDbDoc('${col}', '${d._id}')" title="Delete Document">🗑️</button>
        </td>
      </tr>
    `;
  }

  viewport.innerHTML = `
    <div class="card" style="padding:0;overflow:hidden;">
      <div style="overflow-x:auto;">
        <table class="data-table" style="width:100%;font-size:0.8125rem;">
          <thead>${tableHeader}</thead>
          <tbody>${docs.map(rowRenderer).join('')}</tbody>
        </table>
      </div>
    </div>
  `;
};

// ─── Raw JSON View Renderer ──────────────────────────────────────────────────
const renderDbJsonView = (viewport) => {
  const col = dbExplorerState.activeCollection;
  const docs = dbExplorerState.currentDocs;

  viewport.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1rem;">
      ${docs.map((d, index) => {
        const jsonStr = JSON.stringify(d, null, 2);
        return `
          <div class="card" style="padding:1rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem;border-bottom:1px solid var(--border);padding-bottom:0.5rem;">
              <div style="display:flex;align-items:center;gap:0.5rem;">
                <span class="badge badge-teal">#${index + 1}</span>
                <code>_id: "${d._id}"</code>
                ${d.name ? `<strong style="color:var(--text-primary);margin-left:0.5rem;">${d.name}</strong>` : ''}
              </div>
              <div style="display:flex;gap:0.5rem;">
                <button class="btn btn-secondary btn-sm" onclick="copyDbDocJson(${index})">
                  📋 Copy JSON
                </button>
                <button class="btn btn-secondary btn-sm" onclick="openEditDbDocModal('${col}', '${d._id}')">
                  ✏️ Edit
                </button>
                <button class="btn btn-secondary btn-sm" style="color:var(--status-red);" onclick="deleteDbDoc('${col}', '${d._id}')">
                  🗑️ Delete
                </button>
              </div>
            </div>
            <pre style="background:var(--spit-surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.85rem;max-height:280px;overflow:auto;font-family:monospace;font-size:0.75rem;color:var(--text-primary);line-height:1.45;">${jsonStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

const copyDbDocJson = (index) => {
  const doc = dbExplorerState.currentDocs[index];
  if (doc) {
    navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
    showToast('Copied JSON to clipboard', 'info');
  }
};

// ─── Pagination Renderer ─────────────────────────────────────────────────────
const renderDbPagination = () => {
  const tray = document.getElementById('dbPaginationTray');
  if (!tray) return;

  if (dbExplorerState.totalPages <= 1) {
    tray.innerHTML = '';
    return;
  }

  tray.innerHTML = `
    <div style="font-size:0.8125rem;color:var(--text-muted);">
      Page <strong>${dbExplorerState.page}</strong> of <strong>${dbExplorerState.totalPages}</strong>
    </div>
    <div style="display:flex;gap:0.5rem;">
      <button
        class="btn btn-secondary btn-sm"
        ${dbExplorerState.page <= 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}
        onclick="changeDbPage(${dbExplorerState.page - 1})"
      >
        ← Previous
      </button>
      <button
        class="btn btn-secondary btn-sm"
        ${dbExplorerState.page >= dbExplorerState.totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}
        onclick="changeDbPage(${dbExplorerState.page + 1})"
      >
        Next →
      </button>
    </div>
  `;
};

const changeDbPage = async (newPage) => {
  if (newPage < 1 || newPage > dbExplorerState.totalPages) return;
  dbExplorerState.page = newPage;
  await loadDbCollectionData();
};

// ─── Edit Document Modal ────────────────────────────────────────────────────
const openEditDbDocModal = (col, docId) => {
  const doc = dbExplorerState.currentDocs.find((d) => String(d._id) === String(docId));
  if (!doc) {
    showToast('Document not found in current view', 'error');
    return;
  }

  const jsonStr = JSON.stringify(doc, null, 2);

  openModal(`
    <div style="padding:1.5rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;border-bottom:1px solid var(--border);padding-bottom:0.75rem;">
        <div>
          <h3 style="font-size:1.125rem;font-weight:700;color:var(--spit-navy);">Edit MongoDB Document</h3>
          <span style="font-size:0.75rem;color:var(--text-muted);">Collection: <strong>${col}</strong> · Document ID: <code>${docId}</code></span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">✕</button>
      </div>

      <p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:0.75rem;">
        Edit the fields below directly. Any updates you save will be validated and applied directly to the MongoDB <code>${col}</code> collection.
      </p>

      <div class="form-group">
        <label class="form-label" style="font-weight:600;">JSON Document Editor</label>
        <textarea
          id="dbDocJsonEditor"
          class="form-control"
          rows="15"
          style="font-family:monospace;font-size:0.8125rem;line-height:1.45;background:var(--spit-surface);color:var(--text-primary);tab-size:2;"
          spellcheck="false"
        >${jsonStr}</textarea>
      </div>

      <div id="dbEditorError" style="display:none;color:var(--status-red);font-size:0.8125rem;margin-top:0.5rem;"></div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.25rem;">
        <button type="button" class="btn btn-secondary btn-sm" style="color:var(--status-red);" onclick="closeModal(); deleteDbDoc('${col}', '${docId}');">
          🗑️ Delete Record
        </button>
        <div style="display:flex;gap:0.75rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="saveDbDocModal('${col}', '${docId}')">
            💾 Save to MongoDB
          </button>
        </div>
      </div>
    </div>
  `);
};

const saveDbDocModal = async (col, docId) => {
  const editor = document.getElementById('dbDocJsonEditor');
  const errEl = document.getElementById('dbEditorError');
  if (!editor) return;

  let parsed;
  try {
    parsed = JSON.parse(editor.value);
  } catch (err) {
    if (errEl) {
      errEl.style.display = 'block';
      errEl.textContent = `Invalid JSON syntax: ${err.message}`;
    }
    return;
  }

  // Remove immutable fields
  delete parsed._id;
  delete parsed.__v;
  delete parsed.createdAt;
  delete parsed.updatedAt;

  try {
    const res = await API.database.updateDocument(col, docId, parsed);
    showToast(res.message || 'Document updated in MongoDB successfully', 'success');
    closeModal();
    await loadDbCollectionData();
    // Also refresh stats
    const statsRes = await API.database.getStats();
    dbExplorerState.stats = statsRes.data;
  } catch (err) {
    if (errEl) {
      errEl.style.display = 'block';
      errEl.textContent = `Server Error: ${err.message}`;
    }
  }
};

const deleteDbDoc = async (col, docId) => {
  if (!confirm(`Are you sure you want to permanently delete document "${docId}" from MongoDB collection '${col}'? This cannot be undone.`)) {
    return;
  }

  try {
    const res = await API.database.deleteDocument(col, docId);
    showToast(res.message || 'Document deleted from MongoDB', 'success');
    await loadDbCollectionData();
    // Update tab counts
    const statsRes = await API.database.getStats();
    dbExplorerState.stats = statsRes.data;
    const countBadge = document.querySelector(`#dbTab-${col} .badge`);
    if (countBadge && dbExplorerState.stats.collections) {
      countBadge.textContent = dbExplorerState.stats.collections[col] ?? 0;
    }
  } catch (err) {
    showToast(`Failed to delete document: ${err.message}`, 'error');
  }
};

const exportCurrentDbCollectionJson = () => {
  if (!dbExplorerState.currentDocs || dbExplorerState.currentDocs.length === 0) {
    showToast('No records available to export', 'info');
    return;
  }

  const jsonStr = JSON.stringify(dbExplorerState.currentDocs, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `spit_${dbExplorerState.activeCollection}_export_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Exported ${dbExplorerState.currentDocs.length} records as JSON`, 'success');
};

const refreshDbExplorer = async () => {
  await renderDatabaseView();
  showToast('Database Explorer refreshed', 'info');
};

// ─── Universal Sidebar Controller ───────────────────────────────────────────
window._lastSidebarToggle = 0;

window.toggleSidebar = function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const now = Date.now();
  if (window._lastSidebarToggle && (now - window._lastSidebarToggle < 200)) return;
  window._lastSidebarToggle = now;

  const isMobile = window.innerWidth <= 900;
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (isMobile) {
    const isOpen = document.body.classList.contains('sidebar-open') ||
                   document.documentElement.classList.contains('sidebar-open') ||
                   (sidebar && sidebar.classList.contains('open'));
    if (isOpen) {
      window.closeSidebar();
    } else {
      document.body.classList.remove('sidebar-collapsed');
      document.documentElement.classList.remove('sidebar-collapsed');
      document.body.classList.add('sidebar-open');
      document.documentElement.classList.add('sidebar-open');
      if (sidebar) sidebar.classList.add('open');
      if (overlay) {
        overlay.classList.add('active', 'open');
        overlay.style.display = 'block';
      }
    }
  } else {
    // Desktop: toggle collapsed state
    const isCollapsed = document.body.classList.contains('sidebar-collapsed') ||
                        document.documentElement.classList.contains('sidebar-collapsed');
    if (isCollapsed) {
      document.body.classList.remove('sidebar-collapsed');
      document.documentElement.classList.remove('sidebar-collapsed');
      localStorage.setItem('spit_sidebar_collapsed', 'false');
    } else {
      document.body.classList.remove('sidebar-open');
      document.documentElement.classList.remove('sidebar-open');
      document.body.classList.add('sidebar-collapsed');
      document.documentElement.classList.add('sidebar-collapsed');
      localStorage.setItem('spit_sidebar_collapsed', 'true');
    }
  }
};

window.closeSidebar = function() {
  document.body.classList.remove('sidebar-open');
  document.documentElement.classList.remove('sidebar-open');
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
  const overlay = document.getElementById('sidebarOverlay');
  if (overlay) {
    overlay.classList.remove('active', 'open');
    overlay.style.display = 'none';
  }
};

const toggleSidebar = window.toggleSidebar;
const closeSidebar = window.closeSidebar;

// ─── Global Window Bindings for Inline Event Handlers ───────────────────────
window.openAddRoomModal = openAddRoomModal;
window.handleAddRoomSubmit = handleAddRoomSubmit;
window.updateRoomTypeFromCapacity = updateRoomTypeFromCapacity;
window.openAllocateBedModal = openAllocateBedModal;
window.handleAllocateBedSubmit = handleAllocateBedSubmit;
window.vacateBed = vacateBed;
window.openFeeReceiptModal = openFeeReceiptModal;
window.openReviewRegistrationModal = openReviewRegistrationModal;
window.confirmReview = confirmReview;
window.confirmFeeReceipt = confirmFeeReceipt;
window.openAssignMentorModal = openAssignMentorModal;
window.handleAssignMentorSubmit = handleAssignMentorSubmit;
window.openPromoteStudentModal = openPromoteStudentModal;
window.handlePromoteStudentSubmit = handlePromoteStudentSubmit;
window.openEmergencySosModal = openEmergencySosModal;
window.handleEmergencySosSubmit = handleEmergencySosSubmit;
window.setSosMsg = setSosMsg;
window.applySosTemplate = applySosTemplate;
window.openStudentFullDetailsModal = openStudentFullDetailsModal;
window.openStudentPassQrModal = openStudentPassQrModal;
window.openGraduateStudentModal = openGraduateStudentModal;
window.handleGraduateStudentSubmit = handleGraduateStudentSubmit;
window.filterRooms = filterRooms;
window.filterRegistrations = filterRegistrations;
window.filterStudentsDirectory = filterStudentsDirectory;
window.filterPassesList = filterPassesList;
window.filterComplaintsList = filterComplaintsList;
window.filterAuditLogs = filterAuditLogs;
window.debounceDbSearch = debounceDbSearch;
window.executeDbSearch = executeDbSearch;
window.setDbViewMode = setDbViewMode;
window.switchDbCollection = switchDbCollection;

// ─── Startup & Auth Guard ───────────────────────────────────────────────────
const initDashboard = () => {
  const userJson = sessionStorage.getItem('hostel_user');
  if (!userJson || !getToken()) {
    window.location.href = 'login.html';
    return;
  }

  try {
    state.user = JSON.parse(userJson);
  } catch (e) {
    sessionStorage.clear();
    window.location.href = 'login.html';
    return;
  }

  // Apply persistent sidebar collapsed state on desktop
  if (localStorage.getItem('spit_sidebar_collapsed') === 'true' && window.innerWidth > 900) {
    document.body.classList.add('sidebar-collapsed');
    document.documentElement.classList.add('sidebar-collapsed');
  }

  // Set user profile info
  const nameEl = document.getElementById('userName');
  if (nameEl) nameEl.textContent = state.user.name || 'User';
  const roleBadge = document.getElementById('userRoleBadge');
  if (roleBadge) {
    roleBadge.textContent = state.user.role;
    roleBadge.className = `role-badge-pill role-${state.user.role}`;
  }
  const avatarEl = document.getElementById('userAvatar');
  if (avatarEl) avatarEl.textContent = (state.user.name || 'U').charAt(0).toUpperCase();

  // Setup sidebar for this role
  initRoleNavigation();

  // Load default view
  if (state.user.role === 'student') {
    navigateTo('my-room');
  } else {
    navigateTo('dashboard');
  }

  // Auto-close sidebar on mobile when any navigation item is selected
  document.querySelectorAll('.sidebar-nav .nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        window.closeSidebar();
      }
    });
  });

  // Theme toggle button
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    applyTheme(isDark ? 'light' : 'dark');
  });

  // Refresh button
  document.getElementById('refreshBtn')?.addEventListener('click', () => {
    navigateTo(state.currentPage);
  });

  // Logout button
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    sessionStorage.removeItem('hostel_token');
    sessionStorage.removeItem('hostel_user');
    window.location.href = 'login.html';
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
