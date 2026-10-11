import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { formatDate } from '../utils/formatters';
import {
  Ticket,
  CheckCircle2,
  XCircle,
  Clock,
  Compass,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  Calendar,
  ArrowRight
} from 'lucide-react';

export const PassRequests = () => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'out' | 'rejected' | 'all' | 'overdue'
  const [passes, setPasses] = useState([]);
  const [overduePasses, setOverduePasses] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reject modal state
  const [rejectModalPass, setRejectModalPass] = useState(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Confirm action modal state
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'approve' | 'mark-out' | 'mark-returned', pass }

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'overdue') {
      fetchOverdue();
    } else {
      fetchPasses();
    }
  }, [activeTab, page]);

  const fetchPasses = async () => {
    setLoading(true);
    setError('');
    try {
      const statusParam = activeTab === 'all' ? '' : `status=${activeTab}&`;
      const data = await apiFetch(`/api/passes?${statusParam}page=${page}&limit=${limit}`);
      setPasses(data?.items || []);
      setTotal(data?.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load passes');
    } finally {
      setLoading(false);
    }
  };

  const fetchOverdue = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/passes/overdue');
      setOverduePasses(data?.items || []);
      setTotal(data?.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load overdue passes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (passId) => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/passes/${passId}/approve`, {
        method: 'PUT',
        body: JSON.stringify({})
      });
      setConfirmAction(null);
      fetchPasses();
    } catch (err) {
      alert(err.message || 'Failed to approve pass');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!decisionNote.trim()) {
      setRejectError('A decision note is required when rejecting a pass request');
      return;
    }

    setActionLoading(true);
    setRejectError('');
    try {
      await apiFetch(`/api/passes/${rejectModalPass._id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ decisionNote: decisionNote.trim() })
      });
      setRejectModalPass(null);
      setDecisionNote('');
      fetchPasses();
    } catch (err) {
      setRejectError(err.message || 'Failed to reject pass');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkOut = async (passId) => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/passes/${passId}/mark-out`, { method: 'PUT' });
      setConfirmAction(null);
      fetchPasses();
    } catch (err) {
      alert(err.message || 'Failed to mark pass as out');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReturned = async (passId) => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/passes/${passId}/mark-returned`, { method: 'PUT' });
      setConfirmAction(null);
      if (activeTab === 'overdue') {
        fetchOverdue();
      } else {
        fetchPasses();
      }
    } catch (err) {
      alert(err.message || 'Failed to mark pass as returned');
    } finally {
      setActionLoading(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> Pending
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-600" /> Approved
          </span>
        );
      case 'out':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
            <Compass className="w-3 h-3 text-purple-600" /> Out
          </span>
        );
      case 'returned':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Returned
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" /> Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
            <XCircle className="w-3 h-3 text-slate-500" /> Cancelled
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

  const totalPages = Math.ceil(total / limit) || 1;

  const tabs = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'out', label: 'Checked Out' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'all', label: 'All Passes' },
    { id: 'overdue', label: 'Overdue Returns', isAlert: true }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 grid place-items-center">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Long Pass Management</h2>
            <p className="text-xs text-slate-500">
              Review institutional student leave requests, authorise departures, and track returns
            </p>
          </div>
        </div>

        <button
          onClick={() => (activeTab === 'overdue' ? fetchOverdue() : fetchPasses())}
          className="self-start md:self-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex items-center gap-1 overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? tab.isAlert
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-blue-600 text-white shadow-xs'
                  : tab.isAlert
                  ? 'text-rose-600 hover:bg-rose-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.isAlert && <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {activeTab === 'overdue' ? (
          /* OVERDUE TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Hostel & Room</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Expected Return</th>
                  <th className="py-3.5 px-4">Overdue By</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-28" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-36" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                      <td className="py-4 px-4 text-right"><div className="h-7 bg-slate-100 rounded w-24 ml-auto" /></td>
                    </tr>
                  ))
                ) : overduePasses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      No overdue pass returns at this time. All student movements are on schedule!
                    </td>
                  </tr>
                ) : (
                  overduePasses.map((pass) => (
                    <tr key={pass._id} className="hover:bg-rose-50/40 transition">
                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 block font-semibold">{pass.student?.name}</strong>
                        <span className="font-mono text-[11px] text-slate-500">{pass.student?.studentId}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-medium text-slate-900 block">{pass.hostel || 'Assigned Block'}</span>
                        <span className="text-[11px] text-slate-500">Room {pass.roomNo || '—'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-semibold block">{pass.destination}</span>
                        <span className="text-[11px] text-slate-500">{pass.reason}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap font-medium">
                        {formatDate(pass.expectedReturnAt)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          {pass.hoursLate} hrs overdue
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setConfirmAction({ type: 'mark-returned', pass })}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                        >
                          Mark Returned
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* STANDARD PASSES TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Hostel & Room</th>
                  <th className="py-3.5 px-4">Destination & Reason</th>
                  <th className="py-3.5 px-4">Schedule</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Decision / Note</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-36" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-40" /></td>
                      <td className="py-4 px-4"><div className="h-5 bg-slate-100 rounded w-20" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-28" /></td>
                      <td className="py-4 px-4 text-right"><div className="h-7 bg-slate-100 rounded w-28 ml-auto" /></td>
                    </tr>
                  ))
                ) : passes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-400 font-medium">
                      No pass applications found for this filter.
                    </td>
                  </tr>
                ) : (
                  passes.map((pass) => (
                    <tr key={pass._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 block font-semibold">{pass.student?.name}</strong>
                        <span className="font-mono text-[11px] text-slate-500">{pass.student?.studentId}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        <span className="font-medium text-slate-900 block">{pass.hostel || 'Hostel'}</span>
                        <span className="text-[11px] text-slate-500">Room {pass.roomNo || '—'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-semibold text-slate-900 block">{pass.destination}</span>
                        <span className="text-[11px] text-slate-500">{pass.reason}</span>
                        {pass.leaveContact && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Leave Contact: {pass.leaveContact}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap text-[11px]">
                        <div>Dep: <span className="font-medium text-slate-900">{formatDate(pass.departureAt)}</span></div>
                        <div>Ret: <span className="font-medium text-slate-900">{formatDate(pass.expectedReturnAt)}</span></div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(pass.status)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px] max-w-xs">
                        {pass.decisionNote ? (
                          <span className="italic">"{pass.decisionNote}"</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {/* Pending -> Approve / Reject */}
                        {pass.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setConfirmAction({ type: 'approve', pass })}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setRejectModalPass(pass);
                                setDecisionNote('');
                                setRejectError('');
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {/* Approved -> Mark Out */}
                        {pass.status === 'approved' && (
                          <button
                            onClick={() => setConfirmAction({ type: 'mark-out', pass })}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                          >
                            Mark Out
                          </button>
                        )}

                        {/* Out -> Mark Returned */}
                        {pass.status === 'out' && (
                          <button
                            onClick={() => setConfirmAction({ type: 'mark-returned', pass })}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                          >
                            Mark Returned
                          </button>
                        )}

                        {/* Other statuses */}
                        {!['pending', 'approved', 'out'].includes(pass.status) && (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer (when not in overdue tab) */}
        {activeTab !== 'overdue' && (
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing <strong className="text-slate-900">{passes.length > 0 ? (page - 1) * limit + 1 : 0}</strong> to{' '}
              <strong className="text-slate-900">{Math.min(page * limit, total)}</strong> of{' '}
              <strong className="text-slate-900">{total}</strong> pass records
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
        )}
      </div>

      {/* REJECT MODAL */}
      {rejectModalPass && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Reject Long Pass Request
              </h3>
              <button
                onClick={() => setRejectModalPass(null)}
                className="text-rose-200 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>Student: <strong className="text-slate-900">{rejectModalPass.student?.name}</strong> ({rejectModalPass.student?.studentId})</div>
                <div>Destination: <span className="font-medium text-slate-800">{rejectModalPass.destination}</span></div>
              </div>

              {rejectError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{rejectError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Rejection <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder="Provide decision note for student..."
                  required
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalPass(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !decisionNote.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM ACTION MODAL (Approve, Mark Out, Mark Returned) */}
      {confirmAction && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 text-center space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 grid place-items-center mx-auto">
              <Ticket className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                {confirmAction.type === 'approve' && 'Approve Pass Request?'}
                {confirmAction.type === 'mark-out' && 'Confirm Student Departure?'}
                {confirmAction.type === 'mark-returned' && 'Confirm Student Return?'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Student <strong className="text-slate-800">{confirmAction.pass.student?.name}</strong> (
                {confirmAction.pass.student?.studentId}) to{' '}
                <strong className="text-slate-800">{confirmAction.pass.destination}</strong>.
              </p>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  if (confirmAction.type === 'approve') handleApprove(confirmAction.pass._id);
                  else if (confirmAction.type === 'mark-out') handleMarkOut(confirmAction.pass._id);
                  else if (confirmAction.type === 'mark-returned') handleMarkReturned(confirmAction.pass._id);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 shadow-xs transition"
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
