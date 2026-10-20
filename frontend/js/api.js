/**
 * api.js — Centralized API client for SPIT Hostel Ops.
 */

// Dynamic BASE_URL: Automatically works on localhost, mobile LAN IP (192.168.x.x), tunnels, and Vercel cloud deployments
const BASE_URL = (window.location.port && window.location.port !== '5000' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? 'http://localhost:5000/api'
  : '/api';

// ── Auth token helpers (sessionStorage = one session per tab) ──────────────
const getToken = () => sessionStorage.getItem('hostel_token');

const authHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

// ── Core fetch wrapper ──────────────────────────────────────────────────────
const request = async (method, path, body = null) => {
  const options = {
    method,
    headers: authHeaders(),
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);

  // Token expired or unauthorized on protected routes
  if (response.status === 401 && !path.includes('/auth/login') && !path.includes('/public-register') && !path.includes('/check-status')) {
    sessionStorage.removeItem('hostel_token');
    sessionStorage.removeItem('hostel_user');
    window.location.href = 'login.html';
    return;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
};

const API = {
  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: {
    getStats:     () => request('GET', '/dashboard/stats'),
    getRoomsGrid: () => request('GET', '/dashboard/rooms-grid'),
  },

  // ── Rooms ────────────────────────────────────────────────────────────────
  rooms: {
    getAll:    (params = {}) => request('GET', `/rooms?${new URLSearchParams(params)}`),
    getById:   (id)          => request('GET', `/rooms/${id}`),
    getBlocks: ()            => request('GET', '/rooms/blocks'),
    create:    (data)        => request('POST', '/rooms', data),
    update:    (id, data)    => request('PUT',  `/rooms/${id}`, data),
    delete:    (id)          => request('DELETE', `/rooms/${id}`),
  },

  // ── Students ─────────────────────────────────────────────────────────────
  students: {
    getAll:             (params = {}) => request('GET', `/students?${new URLSearchParams(params)}`),
    getById:            (id)          => request('GET', `/students/${id}`),
    getMyProfile:       ()            => request('GET', '/students/me'),
    changeMyMess:       (messPreference) => request('PUT', '/students/me/mess', { messPreference }),
    publicRegister:     (data)        => request('POST', '/students/public-register', data),
    checkStatus:        (regNo)       => request('GET', `/students/check-status/${encodeURIComponent(regNo)}`),
    reviewRegistration: (id, data)    => request('PATCH', `/students/${id}/review-registration`, data),
    verifyReceipt:      (id, data)    => request('PATCH', `/students/${id}/verify-receipt`, data),
    promote:            (data)        => request('POST', '/students/promote', data),
    graduate:           (id, data)    => request('POST', `/students/${id}/graduate`, data),
    create:             (data)        => request('POST', '/students', data),
    update:             (id, data)    => request('PUT',  `/students/${id}`, data),
    delete:             (id)          => request('DELETE', `/students/${id}`),
  },

  // ── Allocations ──────────────────────────────────────────────────────────
  allocations: {
    getAll:  (params = {}) => request('GET', `/allocations?${new URLSearchParams(params)}`),
    getById: (id)          => request('GET', `/allocations/${id}`),
    create:  (data)        => request('POST', '/allocations', data),
    vacate:  (id, data)    => request('PATCH', `/allocations/${id}/vacate`, data),
    delete:  (id)          => request('DELETE', `/allocations/${id}`),
  },

  // ── Digital Passes ───────────────────────────────────────────────────────
  passes: {
    requestPass:     (data)        => request('POST', '/passes/request', data),
    getMyPasses:     ()            => request('GET',  '/passes/my-passes'),
    getAll:          (params = {}) => request('GET',  `/passes/all?${new URLSearchParams(params)}`),
    review:          (id, data)    => request('PATCH', `/passes/${id}/review`, data),
    recordGateEvent: (data)        => request('POST', '/passes/gate-event', data),
    getOutStudents:  ()            => request('GET',  '/passes/out-students'),
  },

  // ── Complaints ───────────────────────────────────────────────────────────
  complaints: {
    raise:           (data)        => request('POST', '/complaints', data),
    getMyComplaints: ()            => request('GET',  '/complaints/my-complaints'),
    getAll:          (params = {}) => request('GET',  `/complaints/all?${new URLSearchParams(params)}`),
    update:          (id, data)    => request('PATCH', `/complaints/${id}`, data),
  },

  // ── Mentors ──────────────────────────────────────────────────────────────
  mentors: {
    getMyStudents: ()            => request('GET',  '/mentors/my-students'),
    getSessions:   ()            => request('GET',  '/mentors/sessions'),
    createSession: (data)        => request('POST', '/mentors/sessions', data),
    updateSession: (id, data)    => request('PATCH', `/mentors/sessions/${id}`, data),
    list:          ()            => request('GET',  '/mentors/list'),
    assign:        (data)        => request('POST', '/mentors/assign', data),
  },

  // ── Announcements ────────────────────────────────────────────────────────
  announcements: {
    getAll:  ()         => request('GET',  '/announcements'),
    create:  (data)     => request('POST', '/announcements', data),
    sendSos: (data)     => request('POST', '/announcements/sos', data),
    delete:  (id)       => request('DELETE', `/announcements/${id}`),
  },

  // ── Institutional Settings & Mess Options ────────────────────────────────
  settings: {
    get:    ()     => request('GET', '/settings'),
    update: (data) => request('PUT', '/settings', data),
  },

  // ── Reports & Audit Logs ─────────────────────────────────────────────────
  reports: {
    getAuditLogs: () => request('GET', '/reports/audit-logs'),
    downloadUrl:  (type) => {
      const token = sessionStorage.getItem('hostel_token') || '';
      return `${BASE_URL}/reports/export/${type}?token=${encodeURIComponent(token)}`;
    },
  },

  // ── Live Database Explorer ───────────────────────────────────────────────
  database: {
    getStats: () => request('GET', '/database/stats'),
    getCollection: (name, params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request('GET', `/database/collection/${name}${q ? `?${q}` : ''}`);
    },
    updateDocument: (name, id, data) => request('PUT', `/database/collection/${name}/${id}`, data),
    deleteDocument: (name, id) => request('DELETE', `/database/collection/${name}/${id}`),
  },

  // ── Authentication & Staff Provisioning ───────────────────────────────────
  auth: {
    login:          (data) => request('POST', '/auth/login', data),
    getMe:          ()     => request('GET',  '/auth/me'),
    provisionStaff: (data) => request('POST', '/auth/provision-staff', data),
    getStaff:       ()     => request('GET',  '/auth/staff'),
  },
};

