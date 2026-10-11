import React, { useState, useEffect } from 'react';
import { History, RefreshCw, AlertCircle, ArrowRight, UserCheck, MoveRight, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

export const Allocations = () => {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAuditLogs(page);
  }, [page]);

  const fetchAuditLogs = async (currentPage) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/audit-logs?page=${currentPage}&limit=${limit}`, { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to load audit logs');
      }
      const data = await res.json();
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Error fetching audit logs');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const renderActionBadge = (action) => {
    switch (action) {
      case 'ALLOCATE_BED':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-emerald-600" />
            ALLOCATED
          </span>
        );
      case 'MOVE_BED':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
            <MoveRight className="w-3 h-3 text-blue-600" />
            MOVED
          </span>
        );
      case 'RELEASE_BED':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
            <LogOut className="w-3 h-3 text-amber-600" />
            RELEASED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {action}
          </span>
        );
    }
  };

  const renderDetails = (log) => {
    const d = log.details || {};
    if (log.action === 'ALLOCATE_BED') {
      return (
        <div className="text-xs text-slate-700 space-y-0.5">
          <div>
            <span className="font-bold text-slate-900">{d.studentName || d.studentId}</span>{' '}
            <span className="text-slate-500">({d.studentId})</span>
          </div>
          <div className="text-slate-600">
            Allocated to <span className="font-semibold text-slate-900">{d.hostel}</span>, Room{' '}
            <span className="font-semibold text-slate-900">{d.roomNo}</span> (Bed {d.bedNo})
          </div>
        </div>
      );
    }

    if (log.action === 'MOVE_BED') {
      const from = d.from || {};
      const to = d.to || {};
      return (
        <div className="text-xs text-slate-700 space-y-1">
          <div>
            <span className="font-bold text-slate-900">{d.studentName || d.studentId}</span>{' '}
            <span className="text-slate-500">({d.studentId})</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-slate-600">
            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
              {from.hostel} {from.roomNo} (Bed {from.bedNo})
            </span>
            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="bg-blue-50 px-2 py-0.5 rounded text-blue-800 font-semibold border border-blue-100">
              {to.hostel} {to.roomNo} (Bed {to.bedNo})
            </span>
          </div>
        </div>
      );
    }

    if (log.action === 'RELEASE_BED') {
      const rel = d.releasedFrom || {};
      return (
        <div className="text-xs text-slate-700 space-y-0.5">
          <div>
            <span className="font-bold text-slate-900">{d.studentName || d.studentId}</span>{' '}
            <span className="text-slate-500">({d.studentId})</span>
          </div>
          <div className="text-slate-600">
            Released from <span className="font-medium text-slate-800">{rel.hostel || d.hostel}</span>, Room{' '}
            <span className="font-medium text-slate-800">{rel.roomNo || d.roomNo}</span> (Bed {rel.bedNo || d.bedNo})
          </div>
        </div>
      );
    }

    return <pre className="text-[11px] text-slate-600 font-mono">{JSON.stringify(d, null, 2)}</pre>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 grid place-items-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Allocation Audit Trail</h2>
            <p className="text-xs text-slate-500">Historical log of room assignments, transfers, and bed releases</p>
          </div>
        </div>

        <button
          onClick={() => fetchAuditLogs(page)}
          className="self-start md:self-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-2 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Log
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">Timestamp</th>
                <th className="py-3.5 px-5">Actor</th>
                <th className="py-3.5 px-5">Action</th>
                <th className="py-3.5 px-5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-5"><div className="h-4 bg-slate-100 rounded w-28" /></td>
                    <td className="py-4 px-5"><div className="h-4 bg-slate-100 rounded w-36" /></td>
                    <td className="py-4 px-5"><div className="h-5 bg-slate-100 rounded w-24" /></td>
                    <td className="py-4 px-5"><div className="h-4 bg-slate-100 rounded w-64" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-xs text-slate-400 font-medium">
                    No allocation audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-5 text-xs text-slate-500 whitespace-nowrap font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-xs font-semibold text-slate-800 whitespace-nowrap">
                      {log.actor}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      {renderActionBadge(log.action)}
                    </td>
                    <td className="py-3.5 px-5">
                      {renderDetails(log)}
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
            Showing <strong className="text-slate-900">{logs.length > 0 ? (page - 1) * limit + 1 : 0}</strong> to{' '}
            <strong className="text-slate-900">{Math.min(page * limit, total)}</strong> of{' '}
            <strong className="text-slate-900">{total}</strong> log entries
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
    </div>
  );
};
