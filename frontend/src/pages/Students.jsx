import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, Phone, UserCheck } from 'lucide-react';

export const Students = () => {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [hostel, setHostel] = useState('');
  const [course, setCourse] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudents();
  }, [page, search, hostel, course, year]);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (search) params.append('search', search.trim());
      if (hostel) params.append('hostel', hostel);
      if (course) params.append('course', course);
      if (year) params.append('year', year);

      const res = await fetch(`/api/students?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load students directory');

      const data = await res.json();
      setStudents(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Error fetching student records');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      {/* Page Header Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Student Directory</h2>
            <p className="text-xs text-slate-500">Search and filter active student registrations and accommodation allocations</p>
          </div>
          <button
            onClick={fetchStudents}
            className="self-start sm:self-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-2 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, ID, course..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          {/* Hostel Filter */}
          <div>
            <select
              value={hostel}
              onChange={(e) => { setHostel(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            >
              <option value="">All Hostels</option>
              <option value="Maple House">Maple House</option>
              <option value="Cedar House">Cedar House</option>
              <option value="Oak House">Oak House</option>
            </select>
          </div>

          {/* Course Filter */}
          <div>
            <select
              value={course}
              onChange={(e) => { setCourse(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            >
              <option value="">All Courses</option>
              <option value="B.Tech">B.Tech</option>
              <option value="B.Sc">B.Sc</option>
              <option value="M.Tech">M.Tech</option>
              <option value="M.Sc">M.Sc</option>
              <option value="Ph.D">Ph.D</option>
            </select>
          </div>

          {/* Study Year Filter */}
          <div>
            <select
              value={year}
              onChange={(e) => { setYear(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            >
              <option value="">All Study Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Students Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">College ID</th>
                <th className="py-3.5 px-4">Course / Year</th>
                <th className="py-3.5 px-4">Allocation</th>
                <th className="py-3.5 px-4">Mess</th>
                <th className="py-3.5 px-4">Contact Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-28" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-28" /></td>
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No student records match the selected filters.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {s.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                      {s.studentId}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">{s.course}</span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="text-slate-500">Year {s.studyYear}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {s.allocation ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 font-medium rounded-md border border-blue-100">
                          {s.allocation.hostel} · Room {s.allocation.room} (Bed {s.allocation.bed})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 font-medium rounded-md border border-amber-100">
                          Awaiting allocation
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {s.mess || 'Standard Mess'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {s.phone || s.guardian ? (
                        <div className="space-y-0.5">
                          {s.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {s.phone}</p>}
                          {s.guardian && <p className="text-[11px] text-slate-400">Guardian: {s.guardian}</p>}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Withheld</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{total > 0 ? startItem : 0}</strong> to <strong className="text-slate-900">{endItem}</strong> of <strong className="text-slate-900">{total}</strong> students
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="px-3 py-1 bg-slate-200 rounded-md font-semibold text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition shadow-2xs"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
