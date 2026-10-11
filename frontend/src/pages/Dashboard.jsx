import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  BedDouble,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  Ticket,
  AlertTriangle,
  Clock,
  Wrench,
  Compass
} from 'lucide-react';
import { apiFetch } from '../utils/api';

export const Dashboard = () => {
  const [hostels, setHostels] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [pendingPasses, setPendingPasses] = useState(0);
  const [overduePasses, setOverduePasses] = useState(0);
  const [currentlyOutCount, setCurrentlyOutCount] = useState(0);
  const [openComplaints, setOpenComplaints] = useState(0);
  const [urgentComplaints, setUrgentComplaints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch total students count
      const studentsData = await apiFetch('/api/students?limit=1');
      setTotalStudents(studentsData?.total || 0);

      // 2. Fetch hostels summary
      const hostelsData = await apiFetch('/api/hostels');
      setHostels(hostelsData || []);

      // 3. Fetch pending passes count
      try {
        const passesData = await apiFetch('/api/passes?status=pending&limit=1');
        setPendingPasses(passesData?.total || 0);
      } catch (_) {
        setPendingPasses(0);
      }

      // 4. Fetch overdue returns count
      try {
        const overdueData = await apiFetch('/api/passes/overdue');
        setOverduePasses(overdueData?.total || (overdueData?.items ? overdueData.items.length : 0));
      } catch (_) {
        setOverduePasses(0);
      }

      // 5. Fetch complaints summary
      try {
        const complaintsSummary = await apiFetch('/api/complaints/summary');
        setOpenComplaints(complaintsSummary?.open || 0);
        setUrgentComplaints(complaintsSummary?.urgent || 0);
      } catch (_) {
        setOpenComplaints(0);
        setUrgentComplaints(0);
      }

      // 6. Fetch currently out count
      try {
        const outData = await apiFetch('/api/gate/currently-out');
        setCurrentlyOutCount(outData?.total || 0);
      } catch (_) {
        setCurrentlyOutCount(0);
      }
    } catch (err) {
      setError(err.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  const totalBeds = hostels.reduce((sum, h) => sum + (h.totalBeds || 0), 0);
  const totalAvailable = hostels.reduce((sum, h) => sum + (h.available || 0), 0);
  const totalOccupied = hostels.reduce((sum, h) => sum + (h.occupied || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse p-5" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded-lg flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Eyebrow / Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-300">INSTITUTION OVERVIEW</span>
          <h2 className="text-2xl font-extrabold mt-1">A Connected Campus. A Clear Overview.</h2>
          <p className="text-sm text-slate-300 mt-2 max-w-xl">
            Live institutional accommodation capacity, student allocations, and room maps managed in real time.
          </p>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 text-white">
          <Building2 className="w-64 h-64" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total Students</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{totalStudents}</p>
            <span className="text-xs text-slate-500 mt-1 block">Active registrations</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total Hostels</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{hostels.length}</p>
            <span className="text-xs text-slate-500 mt-1 block">Active residential blocks</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total Capacity</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{totalBeds}</p>
            <span className="text-xs text-slate-500 mt-1 block">Institutional bed capacity</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 grid place-items-center">
            <BedDouble className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Available Beds</span>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1">{totalAvailable}</p>
            <span className="text-xs text-slate-500 mt-1 block">Ready for allocation</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Operational Highlights Cards (Passes, Gate & Complaints) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Link
          to="/passes"
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between hover:border-blue-300 transition group"
        >
          <div>
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Pending Passes</span>
            <p className="text-3xl font-extrabold text-amber-600 mt-1">{pendingPasses}</p>
            <span className="text-xs text-slate-500 mt-1 flex items-center gap-1 group-hover:text-blue-600">
              <span>Awaiting review</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 grid place-items-center">
            <Clock className="w-6 h-6" />
          </div>
        </Link>

        <Link
          to="/passes"
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between hover:border-rose-300 transition group"
        >
          <div>
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Overdue Returns</span>
            <p className={`text-3xl font-extrabold mt-1 ${overduePasses > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {overduePasses}
            </p>
            <span className="text-xs text-slate-500 mt-1 flex items-center gap-1 group-hover:text-rose-600">
              <span>Expected return exceeded</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl grid place-items-center ${overduePasses > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </Link>

        <Link
          to="/gate-activity"
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between hover:border-blue-300 transition group"
        >
          <div>
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Currently Out</span>
            <p className="text-3xl font-extrabold text-blue-600 mt-1">{currentlyOutCount}</p>
            <span className="text-xs text-slate-500 mt-1 flex items-center gap-1 group-hover:text-blue-600">
              <span>Campus departures</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
            <Compass className="w-6 h-6" />
          </div>
        </Link>

        <Link
          to="/complaints"
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between hover:border-blue-300 transition group"
        >
          <div>
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Open Complaints</span>
            <p className="text-3xl font-extrabold text-blue-600 mt-1">{openComplaints}</p>
            <span className="text-xs text-slate-500 mt-1 flex items-center gap-1 group-hover:text-blue-600">
              <span>Awaiting maintenance resolution</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
            <Wrench className="w-6 h-6" />
          </div>
        </Link>

        <Link
          to="/complaints"
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center justify-between hover:border-rose-300 transition group"
        >
          <div>
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Urgent Complaints</span>
            <p className={`text-3xl font-extrabold mt-1 ${urgentComplaints > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {urgentComplaints}
            </p>
            <span className="text-xs text-slate-500 mt-1 flex items-center gap-1 group-hover:text-rose-600">
              <span>Critical facility repairs</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl grid place-items-center ${urgentComplaints > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
            <AlertCircle className="w-6 h-6" />
          </div>
        </Link>
      </div>

      {/* Hostel Occupancy Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Hostel Occupancy</h3>
            <p className="text-xs text-slate-500 mt-0.5">Live occupied vs available bed statistics per residence block</p>
          </div>
          <Link
            to="/rooms"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition"
          >
            <span>Open Room Map</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-5">
          {hostels.map((h) => {
            const pct = h.totalBeds ? Math.round((h.occupied / h.totalBeds) * 100) : 0;
            return (
              <div key={h._id || h.name} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-800">{h.name}</span>
                  <span className="text-slate-600">
                    <strong className="text-blue-700">{h.occupied}</strong> / {h.totalBeds} beds occupied ({pct}%)
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                    title={`${h.name}: ${h.occupied} occupied`}
                  />
                  <div
                    className="h-full bg-amber-400 opacity-60"
                    style={{ width: `${(h.maintenanceBeds / (h.totalBeds || 1)) * 100}%` }}
                    title={`${h.maintenanceBeds} in maintenance`}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>Available: {h.available} beds</span>
                  <span>Maintenance: {h.maintenanceBeds} beds</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
