import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { formatDate } from '../utils/formatters';
import {
  Shield,
  LogOut,
  QrCode,
  History,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Compass,
  Building2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Megaphone,
  Pin
} from 'lucide-react';

export const GuardPortal = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'activity'

  // Gate Selection
  const [selectedGate, setSelectedGate] = useState('main'); // 'main' | 'east'

  // Scan Token State
  const [tokenInput, setTokenInput] = useState('');
  const [scanning, setScanning] = useState(false);

  // Result Card State (Success or Refused)
  const [scanResult, setScanResult] = useState(null); // { status: 'allowed' | 'refused', message, student, event }

  // Manual Entry State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manualNote, setManualNote] = useState('');
  const [processingManualId, setProcessingManualId] = useState(null);

  // Today's Activity State
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState('');

  // Staff Announcements State
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true);
    try {
      const data = await apiFetch('/api/announcements');
      setAnnouncements(data?.items || []);
    } catch (_) {
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchEvents();
    }
  }, [activeTab]);

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setScanning(true);
    setScanResult(null);
    try {
      const data = await apiFetch('/api/gate/scan', {
        method: 'POST',
        body: JSON.stringify({
          token: tokenInput.trim(),
          gate: selectedGate
        })
      });

      setScanResult({
        status: 'allowed',
        message: data.message || 'Movement permitted',
        student: data.student,
        event: data.event
      });
      setTokenInput('');
    } catch (err) {
      setScanResult({
        status: 'refused',
        message: err.message || 'Movement refused'
      });
    } finally {
      setScanning(false);
    }
  };

  // Student Search for Manual Entry
  const handleSearchStudents = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const data = await apiFetch(`/api/gate/student-lookup?q=${encodeURIComponent(q.trim())}`);
      setSearchResults(data?.items || []);
    } catch (_) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Manual Entry / Exit Recording
  const handleManualAction = async (student, type) => {
    setProcessingManualId(`${student.id}-${type}`);
    setScanResult(null);
    try {
      const data = await apiFetch('/api/gate/manual', {
        method: 'POST',
        body: JSON.stringify({
          studentId: student.studentId,
          type,
          gate: selectedGate,
          note: manualNote.trim() || undefined
        })
      });

      setScanResult({
        status: 'allowed',
        message: data.message || `Manual ${type} permitted`,
        student: data.student,
        event: data.event
      });
      setManualNote('');
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      setScanResult({
        status: 'refused',
        message: err.message || `Manual ${type} refused`
      });
    } finally {
      setProcessingManualId(null);
    }
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    setEventsError('');
    try {
      const data = await apiFetch('/api/gate/events?limit=30');
      setEvents(data?.items || []);
    } catch (err) {
      setEventsError(err.message || 'Failed to load gate activity');
    } finally {
      setLoadingEvents(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Station Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 grid place-items-center font-bold text-white shadow-lg shadow-blue-600/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white leading-none">HostelOps Gate Station</h1>
            <span className="text-[11px] text-slate-400 font-medium">Campus Access Control</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg text-xs font-semibold text-slate-300 border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Gate Officer: {user?.name || user?.email}</span>
          </div>
          <button
            onClick={logout}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-red-900/40 hover:text-red-400 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-header */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'scan'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Scan / Record</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'activity'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Today's Activity</span>
          </button>
        </div>

        {/* Gate Switcher */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider hidden sm:inline">Active Gate:</span>
          <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex">
            <button
              onClick={() => setSelectedGate('main')}
              className={`px-2.5 py-1 rounded-md font-bold text-xs transition ${
                selectedGate === 'main' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Main Gate
            </button>
            <button
              onClick={() => setSelectedGate('east')}
              className={`px-2.5 py-1 rounded-md font-bold text-xs transition ${
                selectedGate === 'east' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              East Gate
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-6">
        {activeTab === 'scan' && (
          <div className="space-y-6">
            {/* LARGE RESULT CARD */}
            {scanResult && (
              <div
                className={`p-6 md:p-8 rounded-2xl border-2 shadow-2xl transition animate-in fade-in zoom-in-95 duration-150 ${
                  scanResult.status === 'allowed'
                    ? 'bg-emerald-950/90 border-emerald-500 text-white'
                    : 'bg-rose-950/90 border-rose-500 text-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl grid place-items-center shrink-0 ${
                    scanResult.status === 'allowed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {scanResult.status === 'allowed' ? (
                      <CheckCircle2 className="w-9 h-9" />
                    ) : (
                      <XCircle className="w-9 h-9" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                        scanResult.status === 'allowed' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
                      }`}>
                        {scanResult.status === 'allowed' ? 'MOVEMENT ALLOWED' : 'MOVEMENT REFUSED'}
                      </span>
                      <button
                        onClick={() => setScanResult(null)}
                        className="text-slate-400 hover:text-white text-xs font-bold"
                      >
                        Dismiss ✕
                      </button>
                    </div>

                    <h3 className="text-xl md:text-2xl font-black">
                      {scanResult.message}
                    </h3>

                    {scanResult.student && (
                      <div className="mt-4 pt-4 border-t border-emerald-500/30 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-slate-950/40 p-3 rounded-xl border border-emerald-500/20">
                          <span className="text-[10px] uppercase font-bold text-emerald-300 block">Resident Student</span>
                          <strong className="text-sm font-bold block">{scanResult.student.name}</strong>
                          <span className="font-mono text-emerald-200">{scanResult.student.studentId}</span>
                        </div>
                        <div className="bg-slate-950/40 p-3 rounded-xl border border-emerald-500/20">
                          <span className="text-[10px] uppercase font-bold text-emerald-300 block">Accommodation</span>
                          <strong className="text-sm font-bold block">{scanResult.student.hostel}</strong>
                          <span className="text-emerald-200">Room {scanResult.student.room}</span>
                        </div>
                        <div className="bg-slate-950/40 p-3 rounded-xl border border-emerald-500/20">
                          <span className="text-[10px] uppercase font-bold text-emerald-300 block">Checkpoint</span>
                          <strong className="text-sm font-bold capitalize block">{selectedGate} Gate</strong>
                          <span className="text-emerald-200 uppercase font-mono font-bold">{scanResult.event?.type}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: Quick Pass Scan / Token input */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 grid place-items-center">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Scan Quick Pass</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Paste or type the student's Quick Pass token code below to verify signature and record checkpoint movement.
                  </p>
                </div>

                <form onSubmit={handleScanSubmit} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Quick Pass Token String
                    </label>
                    <textarea
                      rows={3}
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={scanning || !tokenInput.trim()}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs disabled:opacity-50 transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                  >
                    {scanning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying & Recording...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4" />
                        <span>Verify Quick Pass</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Box 2: Manual Student Entry (No QR) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Manual Checkpoint Entry</h3>
                  <p className="text-xs text-slate-400">
                    Use when a resident's phone is discharged or token cannot be scanned.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchStudents}
                    placeholder="Search by student name or ID (STU-xxxx)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  {searching && (
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin absolute right-3 top-3" />
                  )}
                </div>

                {/* Note input */}
                <div>
                  <input
                    type="text"
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    maxLength={200}
                    placeholder="Optional manual reason / note (phone dead, etc.)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Results List */}
                <div className="flex-1 max-h-56 overflow-y-auto space-y-2 custom-scrollbar">
                  {searchResults.length > 0 ? (
                    searchResults.map((s) => (
                      <div
                        key={s.id}
                        className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs gap-2"
                      >
                        <div>
                          <strong className="text-white block font-bold">{s.name}</strong>
                          <span className="text-[11px] font-mono text-slate-400">
                            {s.studentId} · {s.hostel} ({s.room})
                          </span>
                          <span className={`text-[10px] font-bold block uppercase mt-0.5 ${
                            s.currentState === 'in' ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            Currently: {s.currentState.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleManualAction(s, 'exit')}
                            disabled={s.currentState === 'out' || processingManualId === `${s.id}-exit`}
                            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg text-[11px] transition"
                          >
                            Exit
                          </button>
                          <button
                            onClick={() => handleManualAction(s, 'entry')}
                            disabled={s.currentState === 'in' || processingManualId === `${s.id}-entry`}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg text-[11px] transition"
                          >
                            Entry
                          </button>
                        </div>
                      </div>
                    ))
                  ) : searchQuery.trim().length >= 2 ? (
                    <p className="text-xs text-slate-500 text-center py-4 italic">No matching students found</p>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">Type at least 2 characters to look up student</p>
                  )}
                </div>
              </div>
            </div>

            {/* Staff & Campus Announcements Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Staff & Security Bulletins
                  </h3>
                </div>
                <button
                  onClick={fetchAnnouncements}
                  disabled={loadingAnnouncements}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingAnnouncements ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingAnnouncements ? (
                <p className="text-xs text-slate-500 py-4 text-center">Loading bulletins...</p>
              ) : announcements.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No active bulletins for staff at this time.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {announcements.slice(0, 3).map((item) => (
                    <div
                      key={item._id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                        item.pinned
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          {item.pinned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Pin className="w-2.5 h-2.5" /> Pinned
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              {item.audience === 'all' ? 'All Campus' : 'Staff Notice'}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">
                            {new Date(item.publishAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                          {item.body}
                        </p>
                      </div>
                      <div className="pt-2 mt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                        Posted by {item.createdBy?.name || 'Administration'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Today's Activity */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-xs">
              <div>
                <h3 className="text-base font-bold text-white">Recent Gate Log</h3>
                <p className="text-xs text-slate-400">Real-time log of campus entries and departures</p>
              </div>

              <button
                onClick={fetchEvents}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingEvents ? 'animate-spin' : ''}`} />
                <span>Refresh Log</span>
              </button>
            </div>

            {eventsError && (
              <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{eventsError}</span>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Timestamp</th>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Movement</th>
                      <th className="py-3.5 px-4">Gate</th>
                      <th className="py-3.5 px-4">Officer / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loadingEvents ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-28" /></td>
                          <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-32" /></td>
                          <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-24" /></td>
                          <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-16" /></td>
                          <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-16" /></td>
                          <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-24" /></td>
                        </tr>
                      ))
                    ) : events.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                          No gate events recorded yet today.
                        </td>
                      </tr>
                    ) : (
                      events.map((e) => (
                        <tr key={e._id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 text-slate-400 font-mono whitespace-nowrap text-[11px]">
                            {formatDate(e.at)}
                          </td>
                          <td className="py-3.5 px-4">
                            <strong className="text-white block font-bold">{e.student?.name}</strong>
                            <span className="font-mono text-slate-400 text-[11px]">{e.student?.studentId}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                            <span>{e.hostel} · Room {e.room}</span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase inline-flex items-center gap-1 ${
                              e.type === 'exit'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {e.type === 'exit' ? <ArrowRight className="w-3 h-3" /> : <ArrowLeft className="w-3 h-3" />}
                              {e.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 capitalize text-slate-300 font-medium">
                            {e.gate} Gate
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {e.note ? (
                              <span className="italic text-slate-300 font-medium">"{e.note}"</span>
                            ) : (
                              <span>Officer: {e.recordedBy?.name || 'Staff'}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
