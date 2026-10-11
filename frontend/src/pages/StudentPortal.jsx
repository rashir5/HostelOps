import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { formatDate } from '../utils/formatters';
import QRCode from 'qrcode';
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
  Home,
  Building2,
  Ticket,
  LogOut,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Clock,
  XCircle,
  Menu,
  X,
  BedDouble,
  Compass,
  Calendar,
  Info,
  Wrench,
  MessageSquare,
  Send,
  RotateCcw,
  Check,
  ChevronRight,
  AlertTriangle,
  QrCode,
  Shield,
  ArrowRight,
  ArrowLeft,
  Copy,
  History as HistoryIcon,
  Megaphone,
  Pin
} from 'lucide-react';

export const StudentPortal = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'room' | 'passes' | 'complaints'
  const [mobileOpen, setMobileOpen] = useState(false);
  const [student, setStudent] = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [studentError, setStudentError] = useState('');

  // Passes state
  const [passes, setPasses] = useState([]);
  const [loadingPasses, setLoadingPasses] = useState(false);
  const [passesError, setPassesError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  // New Pass Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    reason: '',
    destination: '',
    leaveContact: '',
    departureAt: '',
    expectedReturnAt: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverFormError, setServerFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Complaints state
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [complaintsError, setComplaintsError] = useState('');
  const [complaintFormOpen, setComplaintFormOpen] = useState(false);
  const [complaintFormData, setComplaintFormData] = useState({
    category: 'plumbing',
    description: '',
    priority: 'normal'
  });
  const [complaintFormErrors, setComplaintFormErrors] = useState({});
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [serverComplaintError, setServerComplaintError] = useState('');
  const [complaintSuccess, setComplaintSuccess] = useState('');

  // Complaint Detail Modal / View
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [reopeningId, setReopeningId] = useState(null);

  // Gate & Quick Pass state
  const [gateEvents, setGateEvents] = useState([]);
  const [gateStatus, setGateStatus] = useState({ currentStatus: 'in', lastEvent: null });
  const [loadingGate, setLoadingGate] = useState(false);
  const [gateError, setGateError] = useState('');
  const [quickPass, setQuickPass] = useState(null); // { token, type, expiresAt, qrDataUrl }
  const [quickPassLoading, setQuickPassLoading] = useState(false);
  const [quickPassError, setQuickPassError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [copiedToken, setCopiedToken] = useState(false);
  const tokenTextareaRef = useRef(null);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchGateStatusQuick();
    fetchAnnouncements();
  }, []);

  const fetchGateStatusQuick = async () => {
    try {
      const data = await apiFetch('/api/gate/mine');
      setGateStatus({
        currentStatus: data?.currentStatus || 'in',
        lastEvent: data?.lastEvent || null
      });
    } catch (_) {}
  };

  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true);
    setAnnouncementsError('');
    try {
      const data = await apiFetch('/api/announcements');
      setAnnouncements(data?.items || []);
    } catch (err) {
      setAnnouncementsError(err.message || 'Failed to load announcements');
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'passes') {
      fetchPasses();
    } else if (activeTab === 'complaints') {
      fetchComplaints();
    } else if (activeTab === 'gate') {
      fetchGateData();
    } else if (activeTab === 'announcements') {
      fetchAnnouncements();
    }
  }, [activeTab]);

  // Countdown timer for quick pass
  useEffect(() => {
    if (!quickPass?.expiresAt) {
      setTimeRemaining(0);
      return;
    }

    const calcSeconds = () => {
      const diff = new Date(quickPass.expiresAt).getTime() - Date.now();
      return Math.max(0, Math.floor(diff / 1000));
    };

    setTimeRemaining(calcSeconds());
    const timer = setInterval(() => {
      const sec = calcSeconds();
      setTimeRemaining(sec);
      if (sec <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [quickPass]);

  const getISTHour = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 3600000);
    return ist.getHours();
  };

  const isWithinGateHours = () => {
    const hour = getISTHour();
    return hour >= 5 && hour < 22;
  };

  const handleGenerateQuickPass = async (type) => {
    setQuickPassLoading(true);
    setQuickPassError('');
    try {
      const res = await apiFetch('/api/gate/quick-pass', {
        method: 'POST',
        body: JSON.stringify({ type })
      });

      const qrDataUrl = await QRCode.toDataURL(res.token, {
        width: 280,
        margin: 2,
        color: { dark: '#020617', light: '#ffffff' }
      });

      setQuickPass({
        token: res.token,
        type: res.type,
        expiresAt: res.expiresAt,
        qrDataUrl
      });
      fetchGateData();
    } catch (err) {
      setQuickPassError(err.message || 'Failed to generate Quick Pass');
    } finally {
      setQuickPassLoading(false);
    }
  };

  const handleCopyToken = async () => {
    if (!quickPass?.token) return;

    let copied = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(quickPass.token);
        copied = true;
      }
    } catch (_) {
      copied = false;
    }

    if (!copied && tokenTextareaRef.current) {
      try {
        tokenTextareaRef.current.select();
        copied = document.execCommand('copy');
      } catch (_) {
        copied = false;
      }
    }

    setCopiedToken(true);
    setTimeout(() => {
      setCopiedToken(false);
    }, 2000);
  };

  const fetchGateData = async () => {
    setLoadingGate(true);
    setGateError('');
    try {
      const data = await apiFetch('/api/gate/mine');
      setGateEvents(data?.items || []);
      setGateStatus({
        currentStatus: data?.currentStatus || 'in',
        lastEvent: data?.lastEvent || null
      });
    } catch (err) {
      setGateError(err.message || 'Failed to load gate history');
    } finally {
      setLoadingGate(false);
    }
  };

  const fetchProfile = async () => {
    setLoadingStudent(true);
    setStudentError('');
    try {
      const data = await apiFetch('/api/students/me');
      setStudent(data);
    } catch (err) {
      setStudentError(err.message || 'Failed to load your profile');
    } finally {
      setLoadingStudent(false);
    }
  };

  const fetchPasses = async () => {
    setLoadingPasses(true);
    setPassesError('');
    try {
      const data = await apiFetch('/api/passes/mine');
      setPasses(data?.items || []);
    } catch (err) {
      setPassesError(err.message || 'Failed to load passes');
    } finally {
      setLoadingPasses(false);
    }
  };

  const fetchComplaints = async () => {
    setLoadingComplaints(true);
    setComplaintsError('');
    try {
      const data = await apiFetch('/api/complaints/mine');
      setComplaints(data?.items || []);
    } catch (err) {
      setComplaintsError(err.message || 'Failed to load complaints');
    } finally {
      setLoadingComplaints(false);
    }
  };

  // Form inline validation for Passes
  const validateForm = () => {
    const errors = {};
    if (!formData.reason.trim()) {
      errors.reason = 'Reason is required';
    } else if (formData.reason.length > 200) {
      errors.reason = 'Reason must not exceed 200 characters';
    }

    if (!formData.destination.trim()) {
      errors.destination = 'Destination is required';
    } else if (formData.destination.length > 200) {
      errors.destination = 'Destination must not exceed 200 characters';
    }

    if (formData.leaveContact && formData.leaveContact.length > 200) {
      errors.leaveContact = 'Leave contact must not exceed 200 characters';
    }

    if (!formData.departureAt) {
      errors.departureAt = 'Departure date and time are required';
    } else {
      const depDate = new Date(formData.departureAt);
      if (isNaN(depDate.getTime())) {
        errors.departureAt = 'Invalid departure date';
      } else if (depDate <= new Date()) {
        errors.departureAt = 'Departure date/time must be in the future';
      }
    }

    if (!formData.expectedReturnAt) {
      errors.expectedReturnAt = 'Expected return date and time are required';
    } else if (formData.departureAt) {
      const depDate = new Date(formData.departureAt);
      const retDate = new Date(formData.expectedReturnAt);
      if (isNaN(retDate.getTime())) {
        errors.expectedReturnAt = 'Invalid return date';
      } else if (retDate <= depDate) {
        errors.expectedReturnAt = 'Return date/time must be after departure';
      } else {
        const stayDays = (retDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24);
        if (stayDays > 14) {
          errors.expectedReturnAt = `Stay duration (${stayDays.toFixed(1)} days) exceeds the maximum allowed 14 days`;
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setServerFormError('');
  };

  const handleSubmitPass = async (e) => {
    e.preventDefault();
    setServerFormError('');
    setFormSuccess('');

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        reason: formData.reason.trim(),
        destination: formData.destination.trim(),
        leaveContact: formData.leaveContact.trim() || undefined,
        departureAt: new Date(formData.departureAt).toISOString(),
        expectedReturnAt: new Date(formData.expectedReturnAt).toISOString()
      };

      await apiFetch('/api/passes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setFormSuccess('Long pass requested successfully! Your application is currently pending warden approval.');
      setFormData({
        reason: '',
        destination: '',
        leaveContact: '',
        departureAt: '',
        expectedReturnAt: ''
      });
      setFormErrors({});
      fetchPasses();
      setTimeout(() => {
        setFormOpen(false);
        setFormSuccess('');
      }, 2500);
    } catch (err) {
      setServerFormError(err.message || 'Failed to submit pass request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPass = async (passId) => {
    if (!window.confirm('Are you sure you want to cancel this pending pass request?')) {
      return;
    }
    setCancellingId(passId);
    try {
      await apiFetch(`/api/passes/${passId}/cancel`, { method: 'PUT' });
      fetchPasses();
    } catch (err) {
      alert(err.message || 'Failed to cancel pass');
    } finally {
      setCancellingId(null);
    }
  };

  // Complaint form validation
  const validateComplaintForm = () => {
    const errors = {};
    if (!complaintFormData.category) {
      errors.category = 'Category is required';
    }
    if (!complaintFormData.description.trim()) {
      errors.description = 'Description is required';
    } else if (complaintFormData.description.length > 1000) {
      errors.description = 'Description must not exceed 1000 characters';
    }
    setComplaintFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    setServerComplaintError('');
    setComplaintSuccess('');

    if (!validateComplaintForm()) return;

    setSubmittingComplaint(true);
    try {
      const payload = {
        category: complaintFormData.category,
        description: complaintFormData.description.trim(),
        priority: complaintFormData.priority || 'normal'
      };

      await apiFetch('/api/complaints', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setComplaintSuccess('Complaint raised successfully! The hostel administration has been notified.');
      setComplaintFormData({
        category: 'plumbing',
        description: '',
        priority: 'normal'
      });
      setComplaintFormErrors({});
      fetchComplaints();
      setTimeout(() => {
        setComplaintFormOpen(false);
        setComplaintSuccess('');
      }, 2000);
    } catch (err) {
      setServerComplaintError(err.message || 'Failed to raise complaint');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  // Add Comment to complaint
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedComplaint) return;

    setSubmittingComment(true);
    try {
      const res = await apiFetch(`/api/complaints/${selectedComplaint._id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: commentText.trim() })
      });
      setCommentText('');
      setSelectedComplaint(res.complaint);
      fetchComplaints();
    } catch (err) {
      alert(err.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Reopen complaint
  const handleReopenComplaint = async (complaintId) => {
    const note = prompt('Optional note explaining why this complaint is being reopened:');
    if (note === null) return; // User cancelled prompt

    setReopeningId(complaintId);
    try {
      const res = await apiFetch(`/api/complaints/${complaintId}/reopen`, {
        method: 'PUT',
        body: JSON.stringify({ text: note || undefined })
      });
      if (selectedComplaint && selectedComplaint._id === complaintId) {
        setSelectedComplaint(res.complaint);
      }
      fetchComplaints();
    } catch (err) {
      alert(err.message || 'Failed to reopen complaint');
    } finally {
      setReopeningId(null);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'out':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1">
            <Compass className="w-3 h-3" /> Checked Out
          </span>
        );
      case 'returned':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Returned
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30 inline-flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const renderComplaintStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 inline-flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" /> In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case 'reopened':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reopened
          </span>
        );
      case 'closed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30 inline-flex items-center gap-1">
            <Check className="w-3 h-3" /> Closed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
            High
          </span>
        );
      case 'normal':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-800 text-slate-300 border border-slate-700">
            Normal
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-900 text-slate-400 border border-slate-800">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'room', label: 'My Room', icon: BedDouble },
    { id: 'passes', label: 'Passes', icon: Ticket },
    { id: 'gate', label: 'Quick Pass', icon: QrCode },
    { id: 'complaints', label: 'Complaints', icon: Wrench }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 grid place-items-center font-black text-lg text-white shadow-lg shadow-blue-500/30">
              HO
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white leading-none">HostelOps</h1>
              <span className="text-[11px] text-slate-400 font-medium">Student Portal</span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Label */}
        <div className="px-6 pt-5 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          RESIDENT MENU
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 font-bold grid place-items-center text-sm border border-blue-500/30">
              {student?.name?.split(' ').map((p) => p[0]).join('').slice(0, 2) || 'S'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {student?.name || user?.name || 'Student'}
              </p>
              <span className="text-[11px] font-mono text-slate-400 truncate block">
                {student?.studentId || user?.email}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-red-900/40 hover:text-red-400 rounded-lg transition border border-slate-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold text-white capitalize">
              {activeTab === 'home' && 'Student Residence Overview'}
              {activeTab === 'announcements' && 'Campus Announcements & Notices'}
              {activeTab === 'room' && 'My Room & Bed Details'}
              {activeTab === 'passes' && 'Long Pass Applications'}
              {activeTab === 'gate' && 'Gate Pass & Movement History'}
              {activeTab === 'complaints' && 'Maintenance & Complaints'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {student?.allocation ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5" />
                {student.allocation.hostel} · Room {student.allocation.room}
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold">
                Awaiting Allocation
              </span>
            )}
            <button
              onClick={logout}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition flex items-center gap-1.5 border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
          {/* Global Loading / Error for student profile */}
          {loadingStudent ? (
            <div className="space-y-6">
              <div className="h-44 bg-slate-900 rounded-2xl animate-pulse border border-slate-800" />
              <div className="h-64 bg-slate-900 rounded-2xl animate-pulse border border-slate-800" />
            </div>
          ) : studentError ? (
            <div className="p-6 bg-red-950/40 border border-red-800 rounded-2xl text-red-200 text-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span>{studentError}</span>
              </div>
              <button
                onClick={fetchProfile}
                className="px-3.5 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          ) : (
            <ErrorBoundary key={activeTab}>
              {/* TAB 1: HOME */}
              {activeTab === 'home' && (
                <div className="space-y-6">
                  {/* Banner */}
                  <div className="bg-gradient-to-r from-blue-900/80 via-indigo-900/70 to-slate-900 rounded-2xl p-6 md:p-8 border border-blue-800/40 shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-full border border-blue-400/30 uppercase tracking-wider">
                        Welcome Back
                      </span>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-3">
                        {student.name}
                      </h2>
                      <p className="text-xs md:text-sm text-slate-300 mt-2 max-w-xl">
                        College ID: <strong className="text-white font-mono">{student.studentId}</strong> · Course:{' '}
                        <strong className="text-white">{student.course}</strong> (Year {student.studyYear})
                      </p>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          onClick={() => setActiveTab('passes')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
                        >
                          <Ticket className="w-4 h-4" />
                          <span>Request Long Pass</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('complaints')}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition"
                        >
                          <Wrench className="w-4 h-4" />
                          <span>Raise Maintenance Complaint</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('room')}
                          className="px-4 py-2 bg-slate-800/60 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 flex items-center gap-2 transition"
                        >
                          <BedDouble className="w-4 h-4" />
                          <span>View Room & Bed</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Summary Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Accommodation Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Current Accommodation
                        </span>
                        {student.allocation ? (
                          <>
                            <p className="text-lg font-bold text-white mt-1">{student.allocation.hostel}</p>
                            <p className="text-xs font-semibold text-blue-400 mt-0.5">
                              Room {student.allocation.room} · Bed {student.allocation.bed}
                            </p>
                          </>
                        ) : (
                          <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs font-semibold">
                            Awaiting Allocation
                          </div>
                        )}
                      </div>
                      <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-slate-400">
                        Status: <span className="font-semibold text-slate-200">Active Resident</span>
                      </div>
                    </div>

                    {/* Academic Status Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Academic Programme
                        </span>
                        <p className="text-lg font-bold text-white mt-1">{student.course}</p>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Year {student.studyYear} of {student.duration || 4} · Academic Year {student.academicYear}
                        </p>
                      </div>
                      <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-slate-400">
                        Registered Email: <span className="font-mono text-slate-200">{student.email}</span>
                      </div>
                    </div>

                    {/* Mess Preference Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Dining & Mess
                        </span>
                        <p className="text-lg font-bold text-white mt-1">{student.mess || 'Standard Mess'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Active meal subscription active</p>
                      </div>
                      <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-slate-400">
                        Institutional Hall Meal Plan
                      </div>
                    </div>
                  </div>

                  {/* Latest Announcements on Home */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-amber-400" />
                        <h3 className="text-base font-bold text-white">Latest Announcements</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('announcements')}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
                      >
                        View All ({announcements.length}) →
                      </button>
                    </div>

                    {loadingAnnouncements ? (
                      <div className="py-8 text-center text-xs text-slate-500">Loading campus updates...</div>
                    ) : announcements.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        No active announcements for your hostel or audience at this time.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {announcements.slice(0, 3).map((item) => (
                          <div
                            key={item._id}
                            className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                              item.pinned
                                ? 'bg-amber-500/5 border-amber-500/30'
                                : 'bg-slate-950/60 border-slate-800'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                {item.pinned ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    <Pin className="w-2.5 h-2.5" /> Pinned
                                  </span>
                                ) : (
                                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                    {item.hostel ? `${item.hostel} only` : 'General'}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500">
                                  {new Date(item.publishAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                                {item.body}
                              </p>
                            </div>
                            <div className="pt-3 mt-3 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-500">
                              <span>By {item.createdBy?.name || 'Administration'}</span>
                              <button
                                onClick={() => setActiveTab('announcements')}
                                className="text-blue-400 hover:text-blue-300 font-semibold"
                              >
                                Read more
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: MY ROOM */}
              {activeTab === 'room' && (
                <div className="space-y-6">
                  {student.allocation ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
                        <div>
                          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30">
                            Assigned & Allocated
                          </span>
                          <h3 className="text-2xl font-bold text-white mt-2">
                            {student.allocation.hostel}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Campus Residential Block Assignment
                          </p>
                        </div>

                        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-right sm:text-left">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Assigned Bed
                          </span>
                          <span className="text-xl font-black text-blue-400">
                            Bed {student.allocation.bed}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Room Number
                          </span>
                          <p className="text-base font-bold text-white mt-1 font-mono">
                            {student.allocation.room}
                          </p>
                        </div>

                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Hostel Block
                          </span>
                          <p className="text-base font-bold text-white mt-1">
                            {student.allocation.hostel}
                          </p>
                        </div>

                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Room Bed Number
                          </span>
                          <p className="text-base font-bold text-white mt-1">
                            Bed {student.allocation.bed}
                          </p>
                        </div>
                      </div>

                      <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-4 text-xs text-slate-300 space-y-1">
                        <p className="font-semibold text-blue-300 flex items-center gap-1.5">
                          <Info className="w-4 h-4" /> Room Rules & Guidelines
                        </p>
                        <p>
                          Keep your room clean and orderly. Any room change requests must be approved by the hostel warden.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-amber-800/40 rounded-2xl p-8 text-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 grid place-items-center mx-auto border border-amber-500/30">
                        <BedDouble className="w-7 h-7" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Awaiting Bed Allocation</h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Your residential room and bed assignment has not yet been processed by the hostel administration. Please check back shortly or consult your hostel warden.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PASSES */}
              {activeTab === 'passes' && (
                <div className="space-y-6">
                  {!student.allocation && (
                    <div className="p-4 bg-amber-950/40 border border-amber-800 rounded-2xl text-amber-200 text-xs flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <strong className="block font-bold">Cannot Apply for Long Pass</strong>
                        <span>You must have an active residential bed allocation to apply for a long pass.</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">My Long Passes</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Manage your institutional leave applications and monitor approval status
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={fetchPasses}
                        disabled={loadingPasses}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingPasses ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>

                      {student.allocation && (
                        <button
                          onClick={() => setFormOpen(!formOpen)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{formOpen ? 'Hide Form' : 'Request Long Pass'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {formOpen && student.allocation && (
                    <div className="bg-slate-900 border border-blue-900/40 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl animate-in fade-in duration-150">
                      <div className="border-b border-slate-800 pb-4">
                        <h4 className="text-base font-bold text-white">New Long Pass Request</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Maximum allowable stay is 14 days. Departure must be scheduled in the future.
                        </p>
                      </div>

                      {serverFormError && (
                        <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                          <span>{serverFormError}</span>
                        </div>
                      )}

                      {formSuccess && (
                        <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{formSuccess}</span>
                        </div>
                      )}

                      <form onSubmit={handleSubmitPass} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                              Destination <span className="text-rose-400">*</span>
                            </label>
                            <input
                              type="text"
                              name="destination"
                              value={formData.destination}
                              onChange={handleFormChange}
                              maxLength={200}
                              placeholder="e.g. Home (New Delhi), Academic Conference"
                              className={`w-full bg-slate-950 border ${
                                formErrors.destination ? 'border-rose-500' : 'border-slate-800'
                              } rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 transition`}
                            />
                            {formErrors.destination && (
                              <p className="text-[11px] text-rose-400 mt-1">{formErrors.destination}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                              Leave Contact Details (Optional)
                            </label>
                            <input
                              type="text"
                              name="leaveContact"
                              value={formData.leaveContact}
                              onChange={handleFormChange}
                              maxLength={200}
                              placeholder="e.g. +91 98765 43210 or Parent address"
                              className={`w-full bg-slate-950 border ${
                                formErrors.leaveContact ? 'border-rose-500' : 'border-slate-800'
                              } rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 transition`}
                            />
                            {formErrors.leaveContact && (
                              <p className="text-[11px] text-rose-400 mt-1">{formErrors.leaveContact}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                              Departure Date & Time <span className="text-rose-400">*</span>
                            </label>
                            <input
                              type="datetime-local"
                              name="departureAt"
                              value={formData.departureAt}
                              onChange={handleFormChange}
                              className={`w-full bg-slate-950 border ${
                                formErrors.departureAt ? 'border-rose-500' : 'border-slate-800'
                              } rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition`}
                            />
                            {formErrors.departureAt && (
                              <p className="text-[11px] text-rose-400 mt-1">{formErrors.departureAt}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                              Expected Return Date & Time <span className="text-rose-400">*</span>
                            </label>
                            <input
                              type="datetime-local"
                              name="expectedReturnAt"
                              value={formData.expectedReturnAt}
                              onChange={handleFormChange}
                              className={`w-full bg-slate-950 border ${
                                formErrors.expectedReturnAt ? 'border-rose-500' : 'border-slate-800'
                              } rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition`}
                            />
                            {formErrors.expectedReturnAt && (
                              <p className="text-[11px] text-rose-400 mt-1">{formErrors.expectedReturnAt}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                            Reason for Leave <span className="text-rose-400">*</span>
                          </label>
                          <textarea
                            name="reason"
                            rows={3}
                            value={formData.reason}
                            onChange={handleFormChange}
                            maxLength={200}
                            placeholder="Provide brief explanation for requested leave..."
                            className={`w-full bg-slate-950 border ${
                              formErrors.reason ? 'border-rose-500' : 'border-slate-800'
                            } rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 transition`}
                          />
                          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                            <span>{formErrors.reason && <span className="text-rose-400">{formErrors.reason}</span>}</span>
                            <span>{formData.reason.length}/200 characters</span>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setFormOpen(false)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30 disabled:opacity-50 transition flex items-center gap-1.5"
                          >
                            {submitting ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Submitting...</span>
                              </>
                            ) : (
                              <span>Submit Application</span>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xs">
                    {loadingPasses ? (
                      <div className="p-8 text-center text-xs text-slate-400 space-y-3">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                        <p>Loading your pass history...</p>
                      </div>
                    ) : passesError ? (
                      <div className="p-6 text-center text-xs text-rose-300">
                        <p>{passesError}</p>
                      </div>
                    ) : passes.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                        <Ticket className="w-8 h-8 mx-auto text-slate-600" />
                        <p className="font-semibold text-slate-300">No pass requests on record</p>
                        <p>You haven't requested any long passes yet. Use the button above to apply.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              <th className="py-3.5 px-4">Destination & Reason</th>
                              <th className="py-3.5 px-4">Departure</th>
                              <th className="py-3.5 px-4">Expected Return</th>
                              <th className="py-3.5 px-4">Status</th>
                              <th className="py-3.5 px-4">Warden Note</th>
                              <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-xs">
                            {passes.map((pass) => (
                              <tr key={pass._id} className="hover:bg-slate-800/40 transition">
                                <td className="py-4 px-4">
                                  <strong className="text-white block">{pass.destination}</strong>
                                  <span className="text-slate-400 text-[11px]">{pass.reason}</span>
                                  {pass.leaveContact && (
                                    <span className="text-slate-500 text-[10px] block mt-0.5 font-mono">
                                      Contact: {pass.leaveContact}
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-slate-300 whitespace-nowrap">
                                  {formatDate(pass.departureAt)}
                                </td>
                                <td className="py-4 px-4 text-slate-300 whitespace-nowrap">
                                  {formatDate(pass.expectedReturnAt)}
                                </td>
                                <td className="py-4 px-4 whitespace-nowrap">
                                  {renderStatusBadge(pass.status)}
                                </td>
                                <td className="py-4 px-4 text-slate-400 text-[11px] max-w-xs">
                                  {pass.status === 'rejected' && pass.decisionNote ? (
                                    <div className="p-2 bg-rose-950/30 border border-rose-900/40 rounded-lg text-rose-300">
                                      <strong className="block text-[10px] uppercase font-bold text-rose-400">Reason:</strong>
                                      <span>{pass.decisionNote}</span>
                                    </div>
                                  ) : pass.decisionNote ? (
                                    <span className="italic">"{pass.decisionNote}"</span>
                                  ) : (
                                    <span className="text-slate-600">—</span>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-right whitespace-nowrap">
                                  {pass.status === 'pending' ? (
                                    <button
                                      onClick={() => handleCancelPass(pass._id)}
                                      disabled={cancellingId === pass._id}
                                      className="px-3 py-1.5 bg-rose-900/30 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-lg text-xs font-semibold transition"
                                    >
                                      {cancellingId === pass._id ? 'Cancelling...' : 'Cancel'}
                                    </button>
                                  ) : (
                                    <span className="text-slate-600 text-[11px]">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: COMPLAINTS */}
              {activeTab === 'complaints' && (
                <div className="space-y-6">
                  {!student.allocation && (
                    <div className="p-4 bg-amber-950/40 border border-amber-800 rounded-2xl text-amber-200 text-xs flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <strong className="block font-bold">Cannot Raise Complaint</strong>
                        <span>You must have an active residential bed allocation to file maintenance complaints.</span>
                      </div>
                    </div>
                  )}

                  {/* Header Bar */}
                  <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Maintenance & Complaints</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Report residential issues, track maintenance repairs, and communicate with facility staff
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={fetchComplaints}
                        disabled={loadingComplaints}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingComplaints ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>

                      {student.allocation && (
                        <button
                          onClick={() => setComplaintFormOpen(!complaintFormOpen)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{complaintFormOpen ? 'Hide Form' : 'Raise Complaint'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Raise Complaint Form */}
                  {complaintFormOpen && student.allocation && (
                    <div className="bg-slate-900 border border-blue-900/40 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl animate-in fade-in duration-150">
                      <div className="border-b border-slate-800 pb-4">
                        <h4 className="text-base font-bold text-white">Report a Maintenance Issue</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Assigned to your room: <strong className="text-slate-200">{student.allocation.hostel} · Room {student.allocation.room}</strong>
                        </p>
                      </div>

                      {serverComplaintError && (
                        <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                          <span>{serverComplaintError}</span>
                        </div>
                      )}

                      {complaintSuccess && (
                        <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{complaintSuccess}</span>
                        </div>
                      )}

                      <form onSubmit={handleSubmitComplaint} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                              Issue Category <span className="text-rose-400">*</span>
                            </label>
                            <select
                              value={complaintFormData.category}
                              onChange={(e) => setComplaintFormData((p) => ({ ...p, category: e.target.value }))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                            >
                              <option value="plumbing">Plumbing (Leak, tap, drain, washroom)</option>
                              <option value="electrical">Electrical (Light, switch, fan, socket)</option>
                              <option value="wifi">Wi-Fi & Internet Connectivity</option>
                              <option value="housekeeping">Housekeeping & Cleaning</option>
                              <option value="furniture">Furniture & Carpentry (Bed, chair, desk, lock)</option>
                              <option value="other">Other Maintenance Issue</option>
                            </select>
                            {complaintFormErrors.category && (
                              <p className="text-[11px] text-rose-400 mt-1">{complaintFormErrors.category}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                              Priority Level
                            </label>
                            <select
                              value={complaintFormData.priority}
                              onChange={(e) => setComplaintFormData((p) => ({ ...p, priority: e.target.value }))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                            >
                              <option value="low">Low (Minor inconvenience)</option>
                              <option value="normal">Normal (Standard repair)</option>
                              <option value="high">High (Urgent attention requested)</option>
                              <option value="urgent">Urgent (Safety or water hazard)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                            Description of the Problem <span className="text-rose-400">*</span>
                          </label>
                          <textarea
                            rows={4}
                            value={complaintFormData.description}
                            onChange={(e) => {
                              setComplaintFormData((p) => ({ ...p, description: e.target.value }));
                              if (complaintFormErrors.description) setComplaintFormErrors((p) => ({ ...p, description: '' }));
                            }}
                            maxLength={1000}
                            placeholder="Describe what is broken, where it is located in the room, and how long it has been occurring..."
                            className={`w-full bg-slate-950 border ${
                              complaintFormErrors.description ? 'border-rose-500' : 'border-slate-800'
                            } rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 transition`}
                          />
                          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                            <span>{complaintFormErrors.description && <span className="text-rose-400">{complaintFormErrors.description}</span>}</span>
                            <span>{complaintFormData.description.length}/1000 characters</span>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setComplaintFormOpen(false)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={submittingComplaint}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30 disabled:opacity-50 transition flex items-center gap-1.5"
                          >
                            {submittingComplaint ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Submitting...</span>
                              </>
                            ) : (
                              <span>Submit Complaint</span>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Complaints List Table */}
                  <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xs">
                    {loadingComplaints ? (
                      <div className="p-8 text-center text-xs text-slate-400 space-y-3">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                        <p>Loading your complaint history...</p>
                      </div>
                    ) : complaintsError ? (
                      <div className="p-6 text-center text-xs text-rose-300">
                        <p>{complaintsError}</p>
                      </div>
                    ) : complaints.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                        <Wrench className="w-8 h-8 mx-auto text-slate-600" />
                        <p className="font-semibold text-slate-300">No complaints reported</p>
                        <p>Everything in your room is in working order! Use the button above if you ever encounter maintenance issues.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              <th className="py-3.5 px-4">Ticket</th>
                              <th className="py-3.5 px-4">Category</th>
                              <th className="py-3.5 px-4">Description</th>
                              <th className="py-3.5 px-4">Priority</th>
                              <th className="py-3.5 px-4">Status</th>
                              <th className="py-3.5 px-4">Date Filed</th>
                              <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-xs">
                            {complaints.map((item) => (
                              <tr key={item._id} className="hover:bg-slate-800/40 transition">
                                <td className="py-4 px-4 font-mono font-bold text-blue-400 whitespace-nowrap">
                                  {item.complaintId}
                                </td>
                                <td className="py-4 px-4 whitespace-nowrap capitalize text-slate-300">
                                  {item.category}
                                </td>
                                <td className="py-4 px-4 text-slate-300 max-w-xs">
                                  <p className="line-clamp-2 text-[12px]">{item.description}</p>
                                  {item.comments && item.comments.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 font-medium mt-1">
                                      <MessageSquare className="w-3 h-3" />
                                      {item.comments.length} comment{item.comments.length > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-4 whitespace-nowrap">
                                  {renderPriorityBadge(item.priority)}
                                </td>
                                <td className="py-4 px-4 whitespace-nowrap">
                                  {renderComplaintStatusBadge(item.status)}
                                </td>
                                <td className="py-4 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                                  {formatDate(item.createdAt)}
                                </td>
                                <td className="py-4 px-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-2">
                                    {item.status === 'resolved' && (
                                      <button
                                        onClick={() => handleReopenComplaint(item._id)}
                                        disabled={reopeningId === item._id}
                                        className="px-2.5 py-1.5 bg-purple-900/40 hover:bg-purple-900/70 text-purple-300 border border-purple-800/60 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Reopen</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setSelectedComplaint(item)}
                                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                                    >
                                      <span>Thread</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Complaint Detail & Comment Thread Modal */}
                  {selectedComplaint && (
                    <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-bold text-blue-400">
                              {selectedComplaint.complaintId}
                            </span>
                            {renderComplaintStatusBadge(selectedComplaint.status)}
                            {renderPriorityBadge(selectedComplaint.priority)}
                          </div>
                          <button
                            onClick={() => setSelectedComplaint(null)}
                            className="text-slate-400 hover:text-white p-1"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                          {/* Complaint Details Card */}
                          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span>Category: <strong className="text-white capitalize">{selectedComplaint.category}</strong></span>
                              <span>Room: <strong className="text-white">{selectedComplaint.hostel} · Room {selectedComplaint.room}</strong></span>
                            </div>
                            <div className="text-xs text-slate-200 pt-1 leading-relaxed">
                              {selectedComplaint.description}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                              <span>Reported: {formatDate(selectedComplaint.createdAt)}</span>
                              {selectedComplaint.resolvedAt && (
                                <span className="text-emerald-400 font-medium">
                                  Resolved: {formatDate(selectedComplaint.resolvedAt)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Reopen Action button in modal if resolved */}
                          {selectedComplaint.status === 'resolved' && (
                            <div className="p-3 bg-purple-950/30 border border-purple-900/50 rounded-xl flex items-center justify-between text-xs">
                              <span className="text-purple-300">Issue marked as resolved. If the problem persists, you can reopen it:</span>
                              <button
                                onClick={() => handleReopenComplaint(selectedComplaint._id)}
                                disabled={reopeningId === selectedComplaint._id}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reopen Complaint</span>
                              </button>
                            </div>
                          )}

                          {/* Comments Thread */}
                          <div className="space-y-4">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Discussion & Updates ({selectedComplaint.comments?.length || 0})</span>
                            </h5>

                            <div className="space-y-3">
                              {selectedComplaint.comments && selectedComplaint.comments.length > 0 ? (
                                selectedComplaint.comments.map((c, i) => (
                                  <div
                                    key={c._id || i}
                                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                                      c.role === 'student'
                                        ? 'bg-blue-950/20 border-blue-900/40 text-slate-200'
                                        : 'bg-slate-950 border-slate-800 text-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="font-semibold text-white flex items-center gap-1.5">
                                        <span>{c.author?.name || (c.role === 'student' ? student?.name : 'Facility Staff')}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                          c.role === 'student' ? 'bg-blue-600/30 text-blue-300' : 'bg-emerald-600/30 text-emerald-300'
                                        }`}>
                                          {c.role}
                                        </span>
                                      </span>
                                      <span className="text-slate-500">{formatDate(c.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{c.text}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-slate-500 italic">No comments or staff notes yet.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Modal Footer / Add Comment Box */}
                        <form onSubmit={handleAddComment} className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            maxLength={500}
                            placeholder="Add a comment or follow-up note (max 500 chars)..."
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                          <button
                            type="submit"
                            disabled={submittingComment || !commentText.trim()}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Post</span>
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: QUICK PASS & GATE MOVEMENT */}
              {activeTab === 'gate' && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl grid place-items-center shrink-0 ${
                        gateStatus.currentStatus === 'out'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {gateStatus.currentStatus === 'out' ? (
                          <Compass className="w-6 h-6 animate-pulse" />
                        ) : (
                          <Shield className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Current Movement Status
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wide border ${
                            gateStatus.currentStatus === 'out'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}>
                            {gateStatus.currentStatus === 'out' ? 'Currently Outside' : 'Currently Inside'}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white mt-1">
                          {gateStatus.currentStatus === 'out'
                            ? `Marked outside since ${gateStatus.lastEvent ? formatDate(gateStatus.lastEvent.at) : 'recently'} (${gateStatus.lastEvent?.gate || 'main'} gate)`
                            : 'Present on hostel campus. Ready for quick departures or entry validation.'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={fetchGateData}
                      disabled={loadingGate}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-slate-700 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingGate ? 'animate-spin' : ''}`} />
                      <span>Refresh Status</span>
                    </button>
                  </div>

                  {/* IST Hours Restriction Notice */}
                  {!isWithinGateHours() && (
                    <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl flex items-start gap-3 text-amber-200 text-xs">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-300">Quick Pass Hours Restriction (05:00 – 22:00 IST)</p>
                        <p className="text-amber-200/90 mt-0.5 leading-relaxed">
                          Quick Passes can only be generated between 05:00 and 22:00 IST. Outside of these operating hours, please check in directly at the security checkpoint with the warden or guard on duty.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quick Pass Generator Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <QrCode className="w-5 h-5 text-blue-400" />
                          <span>Generate Quick Pass</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Produce a one-time dynamic QR code for instant security scanning at the campus gate.
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleGenerateQuickPass('exit')}
                          disabled={quickPassLoading || !isWithinGateHours()}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
                        >
                          <ArrowRight className="w-4 h-4" />
                          <span>Exit Pass</span>
                        </button>
                        <button
                          onClick={() => handleGenerateQuickPass('entry')}
                          disabled={quickPassLoading || !isWithinGateHours()}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Entry Pass</span>
                        </button>
                      </div>
                    </div>

                    {/* Server Error Alert */}
                    {quickPassError && (
                      <div className="p-3.5 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{quickPassError}</span>
                      </div>
                    )}

                    {/* Active Quick Pass Display */}
                    {quickPass ? (
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
                        {/* QR Box & Manual Entry Section */}
                        <div className="flex flex-col items-center shrink-0 w-full max-w-[240px]">
                          <div className="p-3 bg-white rounded-2xl shadow-2xl shrink-0 w-full flex items-center justify-center">
                            {timeRemaining > 0 ? (
                              <img
                                src={quickPass.qrDataUrl}
                                alt="Quick Pass QR Code"
                                className="w-56 h-56 object-contain rounded-lg"
                              />
                            ) : (
                              <div className="w-56 h-56 bg-slate-100 rounded-lg flex flex-col items-center justify-center p-4 text-center">
                                <XCircle className="w-12 h-12 text-rose-500 mb-2" />
                                <span className="text-xs font-bold text-slate-800">QR Code Expired</span>
                                <span className="text-[11px] text-slate-500 mt-1">Generate a new pass to present at the gate</span>
                              </div>
                            )}
                          </div>

                          {/* Under QR code: Copy code button & Code for manual entry text box */}
                          {timeRemaining > 0 ? (
                            <div className="w-full mt-3 space-y-1.5 text-left">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                  Code for manual entry
                                </label>
                                <button
                                  type="button"
                                  onClick={handleCopyToken}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                                >
                                  {copiedToken ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-300" />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy code</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <textarea
                                ref={tokenTextareaRef}
                                readOnly
                                value={quickPass.token}
                                rows={3}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[10px] font-mono text-slate-300 break-all select-all focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
                              />
                            </div>
                          ) : (
                            <div className="w-full mt-3 p-2 bg-rose-950/30 border border-rose-900/50 rounded-lg text-center">
                              <span className="text-xs font-semibold text-rose-400">
                                Expired, generate a new pass
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Pass Meta Information */}
                        <div className="space-y-4 max-w-sm">
                          <div>
                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                              quickPass.type === 'exit'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}>
                              {quickPass.type === 'exit' ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                              <span>{quickPass.type.toUpperCase()} PASS</span>
                            </span>

                            <h4 className="text-xl font-black text-white mt-2">
                              {student?.name}
                            </h4>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              Roll No / ID: <strong className="text-slate-200">{student?.studentId}</strong>
                            </p>
                            {student?.allocation && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                Hostel: <strong className="text-slate-200">{student.allocation.hostel} · Room {student.allocation.room}</strong>
                              </p>
                            )}
                          </div>

                          {/* Countdown Timer or Expired Card */}
                          {timeRemaining > 0 ? (
                            <div className="p-4 bg-slate-900 border border-blue-500/30 rounded-xl space-y-1">
                              <span className="text-[11px] uppercase font-bold text-slate-400 flex items-center justify-center md:justify-start gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                                <span>Expires in</span>
                              </span>
                              <div className="text-3xl font-mono font-black text-blue-400 tracking-wider">
                                {Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:
                                {(timeRemaining % 60).toString().padStart(2, '0')}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Single use only · Token invalidates upon scan
                              </p>
                            </div>
                          ) : (
                            <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-xl space-y-2">
                              <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                <span>Pass Expired</span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                This QR code has expired and cannot be verified at the checkpoint.
                              </p>
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => handleGenerateQuickPass(quickPass.type)}
                                  disabled={!isWithinGateHours()}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                                >
                                  Generate New Pass
                                </button>
                                <button
                                  onClick={() => setQuickPass(null)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl text-center space-y-3">
                        <QrCode className="w-12 h-12 text-slate-600 mx-auto" />
                        <div>
                          <p className="text-sm font-semibold text-slate-300">No Active Pass Generated</p>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                            Click "Exit Pass" or "Entry Pass" above to produce a 5-minute dynamic QR code before approaching the campus gate.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Gate Movement History List */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <HistoryIcon className="w-5 h-5 text-blue-400" />
                          <span>Gate Movement History</span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Audit trail of past campus exits and entries recorded at security checkpoints.
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {gateEvents.length} total recorded
                      </span>
                    </div>

                    {loadingGate ? (
                      <div className="p-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                        <span className="text-xs font-semibold">Loading movement records...</span>
                      </div>
                    ) : gateError ? (
                      <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-xs">
                        {gateError}
                      </div>
                    ) : gateEvents.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        No gate movement events recorded yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
                            <tr>
                              <th className="px-4 py-3">Timestamp</th>
                              <th className="px-4 py-3">Movement</th>
                              <th className="px-4 py-3">Gate</th>
                              <th className="px-4 py-3">Checkpoint Staff</th>
                              <th className="px-4 py-3">Pass Ref</th>
                              <th className="px-4 py-3">Note</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {gateEvents.map((evt) => (
                              <tr key={evt._id} className="hover:bg-slate-800/40 transition">
                                <td className="px-4 py-3.5 whitespace-nowrap text-slate-300 font-medium">
                                  {formatDate(evt.at)}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  {evt.type === 'exit' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      <ArrowRight className="w-3 h-3 text-amber-400" />
                                      Exit
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      <ArrowLeft className="w-3 h-3 text-emerald-400" />
                                      Entry
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap capitalize text-slate-300">
                                  {evt.gate} Gate
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap text-slate-400">
                                  {evt.recordedBy?.name || 'Gate Officer'}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  {evt.pass ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                      Pass Attached
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-[11px]">Regular</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-slate-400 max-w-[160px] truncate" title={evt.note || ''}>
                                  {evt.note || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 7: ANNOUNCEMENTS */}
              {activeTab === 'announcements' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-850">
                      <div>
                        <div className="flex items-center gap-2">
                          <Megaphone className="w-6 h-6 text-amber-400" />
                          <h3 className="text-xl font-bold text-white">Campus & Hostel Announcements</h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Official notices, hostel directives, and circulars for residents
                        </p>
                      </div>
                      <button
                        onClick={fetchAnnouncements}
                        disabled={loadingAnnouncements}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 self-start sm:self-auto transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingAnnouncements ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    </div>

                    {loadingAnnouncements ? (
                      <div className="py-16 text-center text-xs text-slate-500">Loading announcements...</div>
                    ) : announcements.length === 0 ? (
                      <div className="py-16 text-center space-y-2">
                        <Megaphone className="w-10 h-10 text-slate-700 mx-auto" />
                        <p className="text-sm font-semibold text-slate-300">No announcements found</p>
                        <p className="text-xs text-slate-500">
                          There are currently no active announcements for your hostel or audience.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-6 space-y-4">
                        {announcements.map((item) => (
                          <div
                            key={item._id}
                            className={`p-6 rounded-2xl border transition ${
                              item.pinned
                                ? 'bg-amber-500/5 border-amber-500/30'
                                : 'bg-slate-950/60 border-slate-800'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                {item.pinned && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    <Pin className="w-3 h-3" /> Pinned
                                  </span>
                                )}
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 capitalize">
                                  {item.audience === 'all' ? 'All Campus' : item.audience}
                                </span>
                                {item.hostel && (
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                    {item.hostel}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400">
                                Published {new Date(item.publishAt).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>

                            <h4 className="text-lg font-bold text-white mb-2">{item.title}</h4>

                            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                              {item.body}
                            </div>

                            <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500">Posted by:</span>
                                <span className="font-semibold text-slate-200">
                                  {item.createdBy?.name || 'Administration'}
                                </span>
                                {item.createdBy?.role && (
                                  <span className="text-[10px] uppercase font-bold text-slate-500 px-1.5 py-0.5 bg-slate-800 rounded">
                                    {item.createdBy.role}
                                  </span>
                                )}
                              </div>
                              {item.expiresAt && (
                                <span className="text-slate-500 text-[11px]">
                                  Valid until {new Date(item.expiresAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ErrorBoundary>
          )}
        </main>
      </div>
    </div>
  );
};
