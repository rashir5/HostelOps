import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { formatDate } from '../utils/formatters';
import {
  Shield,
  Compass,
  Clock,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  ArrowRight,
  ArrowLeft,
  Ticket,
  AlertTriangle
} from 'lucide-react';

export const GateActivity = () => {
  const [activeTab, setActiveTab] = useState('out'); // 'out' | 'events'

  // Tab 1: Currently Out State
  const [currentlyOut, setCurrentlyOut] = useState([]);
  const [loadingOut, setLoadingOut] = useState(false);
  const [outError, setOutError] = useState('');
  const [outSearch, setOutSearch] = useState('');

  // Tab 2: All Events State
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalEvents, setTotalEvents] = useState(0);

  // Filters for All Events
  const [filterType, setFilterType] = useState('all'); // 'all' | 'exit' | 'entry'
  const [filterGate, setFilterGate] = useState('all'); // 'all' | 'main' | 'east'
  const [filterDate, setFilterDate] = useState(''); // 'YYYY-MM-DD'
  const [filterStudentId, setFilterStudentId] = useState('');

  useEffect(() => {
    if (activeTab === 'out') {
      fetchCurrentlyOut();
    } else {
      fetchEvents();
    }
  }, [activeTab, page]);

  const fetchCurrentlyOut = async () => {
    setLoadingOut(true);
    setOutError('');
    try {
      const data = await apiFetch('/api/gate/currently-out');
      setCurrentlyOut(data?.items || []);
    } catch (err) {
      setOutError(err.message || 'Failed to load currently out students');
    } finally {
      setLoadingOut(false);
    }
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    setEventsError('');
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('limit', limit);
      if (filterType && filterType !== 'all') queryParams.append('type', filterType);
      if (filterGate && filterGate !== 'all') queryParams.append('gate', filterGate);
      if (filterDate) queryParams.append('date', filterDate);
      if (filterStudentId.trim()) queryParams.append('studentId', filterStudentId.trim());

      const data = await apiFetch(`/api/gate/events?${queryParams.toString()}`);
      setEvents(data?.items || []);
      setTotalEvents(data?.total || 0);
    } catch (err) {
      setEventsError(err.message || 'Failed to load gate events');
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleApplyFilter = (e) => {
    e?.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const handleResetFilter = () => {
    setFilterType('all');
    setFilterGate('all');
    setFilterDate('');
    setFilterStudentId('');
    setPage(1);
    setTimeout(() => {
      fetchEvents();
    }, 0);
  };

  const formatDurationOut = (leftAt) => {
    if (!leftAt) return '—';
    const diffMs = Math.max(0, Date.now() - new Date(leftAt).getTime());
    const totalMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  // Filtered currently out items by local search text
  const filteredCurrentlyOut = currentlyOut.filter((item) => {
    if (!outSearch.trim()) return true;
    const term = outSearch.toLowerCase().trim();
    const name = item.student?.name?.toLowerCase() || '';
    const sid = item.student?.studentId?.toLowerCase() || '';
    const hostel = item.hostel?.toLowerCase() || '';
    return name.includes(term) || sid.includes(term) || hostel.includes(term);
  });

  const totalPages = Math.ceil(totalEvents / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 md:p-8 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-300">CAMPUS SECURITY & ACCESS</span>
          <h2 className="text-2xl font-extrabold mt-1">Gate Activity Management</h2>
          <p className="text-sm text-slate-300 mt-2 max-w-xl">
            Live monitoring of student campus exits, entry verification, checkpoint history, and active departures.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === 'out') fetchCurrentlyOut();
              else fetchEvents();
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white transition flex items-center gap-2 backdrop-blur-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('out')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'out'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Currently Out</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'out' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {currentlyOut.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'events'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>All Events History</span>
        </button>
      </div>

      {/* TAB 1: CURRENTLY OUT */}
      {activeTab === 'out' && (
        <div className="space-y-4">
          {/* Search bar & count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={outSearch}
                onChange={(e) => setOutSearch(e.target.value)}
                placeholder="Search by student name, roll number, or hostel..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-800">{filteredCurrentlyOut.length}</strong> of{' '}
              <strong className="text-slate-800">{currentlyOut.length}</strong> students outside
            </div>
          </div>

          {loadingOut ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs font-semibold">Loading currently out students...</p>
            </div>
          ) : outError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{outError}</span>
            </div>
          ) : filteredCurrentlyOut.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No Students Currently Outside</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {outSearch.trim()
                  ? 'No students matching your search are currently marked outside.'
                  : 'All residents are currently inside the hostel premises.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-4 py-3.5">Hostel & Room</th>
                      <th className="px-4 py-3.5">Exit Time</th>
                      <th className="px-4 py-3.5">Gate</th>
                      <th className="px-4 py-3.5">Duration Out</th>
                      <th className="px-4 py-3.5">Pass Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCurrentlyOut.map((item) => (
                      <tr key={item.eventId || item.student?.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{item.student?.name}</div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {item.student?.studentId}
                          </div>
                          {item.student?.course && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {item.student.course} · Year {item.student.studyYear}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          <div className="font-medium">{item.hostel}</div>
                          <div className="text-slate-400 text-[11px]">Room {item.room}</div>
                        </td>
                        <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                          {formatDate(item.leftAt)}
                        </td>
                        <td className="px-4 py-4 capitalize font-medium text-slate-700 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {item.gate} Gate
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-500" />
                            {formatDurationOut(item.leftAt)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {item.hasApprovedPass ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Ticket className="w-3 h-3 text-blue-500" />
                              Approved Long Pass
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                              Quick / Regular Exit
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL EVENTS HISTORY */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Filters Form */}
          <form
            onSubmit={handleApplyFilter}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Movement Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                >
                  <option value="all">All Movements (Entry & Exit)</option>
                  <option value="exit">Exit Only</option>
                  <option value="entry">Entry Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Checkpoint Gate
                </label>
                <select
                  value={filterGate}
                  onChange={(e) => setFilterGate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                >
                  <option value="all">All Gates</option>
                  <option value="main">Main Gate</option>
                  <option value="east">East Gate</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Specific Date
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Student Roll / ID
                </label>
                <input
                  type="text"
                  value={filterStudentId}
                  onChange={(e) => setFilterStudentId(e.target.value)}
                  placeholder="e.g. STU-001 or Roll No"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetFilter}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              >
                Clear Filters
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm shadow-blue-600/20"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Apply Filters</span>
              </button>
            </div>
          </form>

          {/* Events Table */}
          {loadingEvents ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs font-semibold">Loading gate events...</p>
            </div>
          ) : eventsError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{eventsError}</span>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <Shield className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No Gate Events Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No access log entries match the selected filters or date range.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Timestamp</th>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-4 py-3.5">Movement</th>
                      <th className="px-4 py-3.5">Gate</th>
                      <th className="px-4 py-3.5">Recorded By</th>
                      <th className="px-4 py-3.5">Pass Reference</th>
                      <th className="px-4 py-3.5">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events.map((evt) => (
                      <tr key={evt._id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-4 whitespace-nowrap text-slate-600 font-medium">
                          {formatDate(evt.at)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{evt.student?.name || '—'}</div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {evt.student?.studentId || '—'}
                          </div>
                          {evt.hostel && evt.hostel !== '—' && (
                            <div className="text-[10px] text-slate-400">
                              {evt.hostel} · Room {evt.room}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {evt.type === 'exit' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <ArrowRight className="w-3 h-3 text-amber-500" />
                              Exit
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ArrowLeft className="w-3 h-3 text-emerald-500" />
                              Entry
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 capitalize font-medium text-slate-700 whitespace-nowrap">
                          {evt.gate} Gate
                        </td>
                        <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                          <div className="font-medium text-slate-800">{evt.recordedBy?.name || 'Officer'}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{evt.recordedBy?.role || 'guard'}</div>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {evt.pass ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                                Pass: {evt.pass.status}
                              </span>
                              {evt.pass.destination && (
                                <p className="text-[11px] text-slate-500 truncate max-w-[160px]" title={evt.pass.destination}>
                                  To: {evt.pass.destination}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Regular</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-600 max-w-[180px] truncate" title={evt.note || ''}>
                          {evt.note || <span className="text-slate-400 italic">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Page <strong className="text-slate-800">{page}</strong> of{' '}
                  <strong className="text-slate-800">{totalPages}</strong> ({totalEvents} total movements)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition flex items-center gap-1 font-medium shadow-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition flex items-center gap-1 font-medium shadow-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
