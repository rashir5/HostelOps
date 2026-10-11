import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { formatDate } from '../utils/formatters';
import {
  Wrench,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Check,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send,
  X,
  Filter,
  Shield,
  Building2,
  User
} from 'lucide-react';

export const Complaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);

  // Detail Modal / Panel state
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState('');
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [modalActionError, setModalActionError] = useState('');

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, categoryFilter, priorityFilter, hostelFilter, page]);

  const fetchSummary = async () => {
    try {
      const data = await apiFetch('/api/complaints/summary');
      setSummary(data);
    } catch (_) {
      // Summary error is non-fatal
    }
  };

  const fetchComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.set('status', statusFilter);
      if (categoryFilter) queryParams.set('category', categoryFilter);
      if (priorityFilter) queryParams.set('priority', priorityFilter);
      if (hostelFilter) queryParams.set('hostel', hostelFilter);
      queryParams.set('page', page);
      queryParams.set('limit', limit);

      const data = await apiFetch(`/api/complaints?${queryParams.toString()}`);
      setComplaints(data?.items || []);
      setTotal(data?.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  // Open detail modal and sync state
  const handleOpenDetail = (complaint) => {
    setSelectedComplaint(complaint);
    setSelectedPriority(complaint.priority || 'normal');
    setStatusNote('');
    setCommentText('');
    setModalActionError('');
  };

  // Update Status (only valid transitions allowed)
  const handleUpdateStatus = async (nextStatus) => {
    if (!selectedComplaint) return;
    setUpdatingStatus(true);
    setModalActionError('');
    try {
      const res = await apiFetch(`/api/complaints/${selectedComplaint._id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: nextStatus,
          note: statusNote.trim() || undefined
        })
      });
      setSelectedComplaint(res.complaint);
      setStatusNote('');
      fetchComplaints();
      fetchSummary();
    } catch (err) {
      setModalActionError(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Update Priority
  const handleUpdatePriority = async () => {
    if (!selectedComplaint || !selectedPriority) return;
    setUpdatingPriority(true);
    setModalActionError('');
    try {
      const res = await apiFetch(`/api/complaints/${selectedComplaint._id}/priority`, {
        method: 'PUT',
        body: JSON.stringify({ priority: selectedPriority })
      });
      setSelectedComplaint(res.complaint);
      fetchComplaints();
      fetchSummary();
    } catch (err) {
      setModalActionError(err.message || 'Failed to update priority');
    } finally {
      setUpdatingPriority(false);
    }
  };

  // Post Comment
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!selectedComplaint || !commentText.trim()) return;
    setPostingComment(true);
    setModalActionError('');
    try {
      const res = await apiFetch(`/api/complaints/${selectedComplaint._id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: commentText.trim() })
      });
      setSelectedComplaint(res.complaint);
      setCommentText('');
      fetchComplaints();
    } catch (err) {
      setModalActionError(err.message || 'Failed to add comment');
    } finally {
      setPostingComment(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" /> In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Resolved
          </span>
        );
      case 'reopened':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-purple-600" /> Reopened
          </span>
        );
      case 'closed':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
            <Check className="w-3 h-3 text-slate-500" /> Closed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
            High
          </span>
        );
      case 'normal':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 text-slate-700 border border-slate-200">
            Normal
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-50 text-slate-500 border border-slate-200">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  // Determine allowed next status buttons based on current status
  const getValidNextStatuses = (currentStatus) => {
    switch (currentStatus) {
      case 'open':
        return [{ status: 'in_progress', label: 'Mark In Progress', color: 'bg-blue-600 hover:bg-blue-700 text-white' }];
      case 'in_progress':
        return [{ status: 'resolved', label: 'Mark Resolved', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' }];
      case 'resolved':
        return [
          { status: 'closed', label: 'Close Ticket', color: 'bg-slate-700 hover:bg-slate-800 text-white' },
          { status: 'reopened', label: 'Reopen Ticket', color: 'bg-purple-600 hover:bg-purple-700 text-white' }
        ];
      case 'reopened':
        return [
          { status: 'in_progress', label: 'Mark In Progress', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
          { status: 'resolved', label: 'Mark Resolved', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' }
        ];
      case 'closed':
      default:
        return [];
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 grid place-items-center">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Maintenance & Complaints</h2>
            <p className="text-xs text-slate-500">
              Track room repairs, update ticket statuses, manage priorities, and respond to residents
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchComplaints();
            fetchSummary();
          }}
          className="self-start md:self-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary KPI Strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Tickets</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">{summary.total || 0}</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs bg-amber-50/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Open</span>
            <span className="text-xl font-black text-amber-600 mt-0.5 block">{summary.open || 0}</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs bg-blue-50/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">In Progress</span>
            <span className="text-xl font-black text-blue-600 mt-0.5 block">{summary.in_progress || 0}</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs bg-purple-50/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Reopened</span>
            <span className="text-xl font-black text-purple-600 mt-0.5 block">{summary.reopened || 0}</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs bg-rose-50/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Urgent Active</span>
            <span className="text-xl font-black text-rose-600 mt-0.5 block">{summary.urgent || 0}</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Resolved</span>
            <span className="text-xl font-black text-emerald-600 mt-0.5 block">{summary.resolved || 0}</span>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 pr-2 border-r border-slate-200">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Filters:</span>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="reopened">Reopened</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="">All Categories</option>
          <option value="plumbing">Plumbing</option>
          <option value="electrical">Electrical</option>
          <option value="wifi">Wi-Fi</option>
          <option value="housekeeping">Housekeeping</option>
          <option value="furniture">Furniture</option>
          <option value="other">Other</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>

        {/* Hostel Filter */}
        <select
          value={hostelFilter}
          onChange={(e) => {
            setHostelFilter(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="">All Hostels</option>
          <option value="Maple House">Maple House</option>
          <option value="Cedar House">Cedar House</option>
          <option value="Oak House">Oak House</option>
        </select>

        {(statusFilter || categoryFilter || priorityFilter || hostelFilter) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setCategoryFilter('');
              setPriorityFilter('');
              setHostelFilter('');
              setPage(1);
            }}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold underline ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Complaints Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ticket</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Hostel & Room</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date Filed</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-7 bg-slate-100 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400 font-medium">
                    No maintenance complaints match the selected criteria.
                  </td>
                </tr>
              ) : (
                complaints.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                      {item.complaintId}
                    </td>
                    <td className="py-3.5 px-4">
                      <strong className="text-slate-900 block font-semibold">{item.student?.name}</strong>
                      <span className="font-mono text-[11px] text-slate-500">{item.student?.studentId}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      <span className="font-medium text-slate-900 block">{item.hostel}</span>
                      <span className="text-[11px] text-slate-500">Room {item.room}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap capitalize text-slate-700 font-medium">
                      {item.category}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderPriorityBadge(item.priority)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusBadge(item.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenDetail(item)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold shadow-2xs transition"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{complaints.length > 0 ? (page - 1) * limit + 1 : 0}</strong> to{' '}
            <strong className="text-slate-900">{Math.min(page * limit, total)}</strong> of{' '}
            <strong className="text-slate-900">{total}</strong> complaints
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL / MANAGEMENT PANEL */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-bold text-blue-400">
                  {selectedComplaint.complaintId}
                </span>
                {renderStatusBadge(selectedComplaint.status)}
                {renderPriorityBadge(selectedComplaint.priority)}
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
              {modalActionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{modalActionError}</span>
                </div>
              )}

              {/* Resident & Room Details Banner (NO phone, NO guardian) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Resident Student</span>
                    <strong className="text-slate-900 text-sm block">{selectedComplaint.student?.name}</strong>
                    <span className="font-mono text-slate-500 text-[11px]">{selectedComplaint.student?.studentId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Location Assignment</span>
                    <strong className="text-slate-900 text-sm block">{selectedComplaint.hostel}</strong>
                    <span className="text-slate-500 text-[11px]">Room {selectedComplaint.room}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex flex-wrap justify-between text-[11px] text-slate-500">
                  <span>Category: <strong className="text-slate-700 capitalize">{selectedComplaint.category}</strong></span>
                  <span>Reported: <strong className="text-slate-700">{formatDate(selectedComplaint.createdAt)}</strong></span>
                  {selectedComplaint.resolvedAt && (
                    <span className="text-emerald-700 font-semibold">
                      Resolved: {formatDate(selectedComplaint.resolvedAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Problem Description</h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedComplaint.description}
                </div>
              </div>

              {/* STATUS CHANGE SECTION - Displays ONLY Valid Next Steps */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs">Update Lifecycle Status</h4>
                  <span className="text-[11px] text-slate-500">Current: <strong className="capitalize">{selectedComplaint.status.replace('_', ' ')}</strong></span>
                </div>

                {getValidNextStatuses(selectedComplaint.status).length > 0 ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Optional note for status change (dispatched, parts needed, etc.)..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />

                    <div className="flex flex-wrap gap-2 pt-1">
                      {getValidNextStatuses(selectedComplaint.status).map((btn) => (
                        <button
                          key={btn.status}
                          onClick={() => handleUpdateStatus(btn.status)}
                          disabled={updatingStatus}
                          className={`px-3.5 py-2 rounded-lg text-xs font-semibold shadow-2xs disabled:opacity-50 transition ${btn.color}`}
                        >
                          {updatingStatus ? 'Updating...' : btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    This complaint is closed. No further status transitions are available.
                  </p>
                )}
              </div>

              {/* PRIORITY CHANGE SECTION */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Adjust Priority Level</h4>
                  <p className="text-[11px] text-slate-500">Change urgency according to maintenance workload</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <button
                    onClick={handleUpdatePriority}
                    disabled={updatingPriority || selectedPriority === selectedComplaint.priority}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg text-xs disabled:opacity-40 transition"
                  >
                    {updatingPriority ? 'Saving...' : 'Set Priority'}
                  </button>
                </div>
              </div>

              {/* COMMENTS THREAD */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Comments & Activity History ({selectedComplaint.comments?.length || 0})</span>
                </h4>

                <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar">
                  {selectedComplaint.comments && selectedComplaint.comments.length > 0 ? (
                    selectedComplaint.comments.map((c, i) => (
                      <div
                        key={c._id || i}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          c.role === 'student'
                            ? 'bg-blue-50/50 border-blue-100 text-slate-800'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{c.author?.name || 'Staff Member'}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              c.role === 'student' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {c.role}
                            </span>
                          </span>
                          <span className="text-slate-400">{formatDate(c.createdAt)}</span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No notes or comments added yet.</p>
                  )}
                </div>

                {/* Add Comment Box */}
                <form onSubmit={handlePostComment} className="pt-2 flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    maxLength={500}
                    placeholder="Write a message or internal note (max 500 chars)..."
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={postingComment || !commentText.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
