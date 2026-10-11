import React, { useState, useEffect } from 'react';
import { User, Plus, RefreshCw, AlertCircle, X, ShieldCheck, MoveRight, LogOut, Search, CheckCircle2 } from 'lucide-react';

export const Rooms = () => {
  const [hostels, setHostels] = useState([]);
  const [activeHostel, setActiveHostel] = useState('Maple House');
  const [rooms, setRooms] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBed, setSelectedBed] = useState(null);

  useEffect(() => {
    fetchHostels();
  }, []);

  useEffect(() => {
    if (activeHostel) {
      fetchRooms(activeHostel);
    }
  }, [activeHostel]);

  const fetchHostels = async () => {
    try {
      const res = await fetch('/api/hostels', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setHostels(data || []);
        if (data.length > 0 && !activeHostel) {
          setActiveHostel(data[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching hostels:', err);
    }
  };

  const fetchRooms = async (hostelName) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/rooms?hostel=${encodeURIComponent(hostelName)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load room inventory');
      const data = await res.json();
      setRooms(data || []);
    } catch (err) {
      setError(err.message || 'Error fetching room map');
    } finally {
      setLoading(false);
    }
  };

  // Filter rooms based on selection
  const filteredRooms = rooms.filter((r) => {
    if (filter === 'Occupied') {
      return r.beds && r.beds.some((b) => b.student);
    }
    if (filter === 'Vacant') {
      return r.beds && r.beds.some((b) => !b.student);
    }
    return true;
  });

  // Calculate live counts
  const totalBeds = rooms.length * 2;
  const occupiedBeds = rooms.reduce(
    (sum, r) => sum + (r.beds ? r.beds.filter((b) => b.student).length : 0),
    0
  );
  const vacantBeds = totalBeds - occupiedBeds;

  // Group rooms by floor
  const floors = {};
  filteredRooms.forEach((r) => {
    const f = r.floor || 1;
    if (!floors[f]) floors[f] = [];
    floors[f].push(r);
  });

  const handleActionSuccess = () => {
    setSelectedBed(null);
    fetchRooms(activeHostel);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Room Map & Occupancy</h2>
          <p className="text-xs text-slate-500">Visual bus-style seat layout for student bed allocations across hostels</p>
        </div>

        <button
          onClick={() => fetchRooms(activeHostel)}
          className="self-start md:self-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-2 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Map
        </button>
      </div>

      {/* Main Room Map Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
        {/* Hostel Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-4 overflow-x-auto custom-scrollbar">
          {(hostels.length > 0 ? hostels : [{ name: 'Maple House' }, { name: 'Cedar House' }, { name: 'Oak House' }]).map(
            (h) => (
              <button
                key={h.name}
                onClick={() => setActiveHostel(h.name)}
                className={`px-5 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  activeHostel === h.name
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {h.name}
              </button>
            )
          )}
        </div>

        {/* Legend, Summary & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          {/* Legend */}
          <div className="flex items-center gap-5 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-[#16a34a] inline-block shadow-2xs" />
              <span>Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-[#dc2626] inline-block shadow-2xs" />
              <span>Vacant</span>
            </div>
          </div>

          {/* Counts */}
          <div className="text-xs text-slate-600">
            <strong className="text-slate-900 font-bold">{occupiedBeds}</strong> occupied /{' '}
            <strong className="text-slate-900 font-bold">{vacantBeds}</strong> vacant /{' '}
            <strong className="text-slate-900 font-bold">{totalBeds}</strong> total beds
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
            {['All', 'Occupied', 'Vacant'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  filter === f
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Bus-Style Floor Blocks */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : Object.keys(floors).length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">
            No rooms match the selected filter criteria.
          </div>
        ) : (
          Object.keys(floors)
            .sort((a, b) => Number(a) - Number(b))
            .map((floorNum) => {
              const floorRooms = floors[floorNum];
              // Group into rows of 4 rooms (2 left, 2 right)
              const busRows = [];
              for (let i = 0; i < floorRooms.length; i += 4) {
                busRows.push(floorRooms.slice(i, i + 4));
              }

              return (
                <div key={floorNum} className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Floor {floorNum}
                  </h4>

                  {/* Bus Layout Container */}
                  <div className="bg-slate-100/80 border border-slate-200/90 rounded-2xl p-4 md:p-6 space-y-3">
                    {busRows.map((rowRooms, rowIndex) => {
                      const leftRooms = [rowRooms[0], rowRooms[1]];
                      const rightRooms = [rowRooms[2], rowRooms[3]];

                      return (
                        <div key={rowIndex} className="flex items-center justify-between md:justify-start gap-0">
                          {/* Left 2 Rooms */}
                          <div className="flex items-center gap-3">
                            {leftRooms.map((r, idx) =>
                              r ? (
                                <RoomTile
                                  key={r._id || r.roomNo}
                                  room={r}
                                  hostelName={activeHostel}
                                  onBedClick={setSelectedBed}
                                />
                              ) : (
                                <div key={idx} className="w-10 h-10 opacity-0" />
                              )
                            )}
                          </div>

                          {/* Central Aisle / Corridor */}
                          <div className="w-8 md:w-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center relative min-h-[44px]">
                            <div className="w-[1px] bg-slate-300 h-full absolute left-1/2 -translate-x-1/2" />
                          </div>

                          {/* Right 2 Rooms */}
                          <div className="flex items-center gap-3">
                            {rightRooms.map((r, idx) =>
                              r ? (
                                <RoomTile
                                  key={r._id || r.roomNo}
                                  room={r}
                                  hostelName={activeHostel}
                                  onBedClick={setSelectedBed}
                                />
                              ) : (
                                <div key={idx} className="w-10 h-10 opacity-0" />
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Bed Click Detail & Action Modal */}
      {selectedBed && (
        <BedModal
          bedInfo={selectedBed}
          hostelsList={hostels}
          onClose={() => setSelectedBed(null)}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
};

// Component: Room Tile with 2 Bed halves side by side
const RoomTile = ({ room, hostelName, onBedClick }) => {
  const bed1 = room.beds ? room.beds[0] : { bedNo: '01', student: null };
  const bed2 = room.beds ? room.beds[1] : { bedNo: '02', student: null };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* 42x28px twin bed icon container */}
      <div className="w-[42px] h-[28px] border border-slate-300 rounded-md overflow-hidden bg-white shadow-2xs flex">
        {/* Bed 01 */}
        <BedButton
          bed={bed1}
          roomNo={room.roomNo}
          hostelName={hostelName}
          onBedClick={onBedClick}
        />
        {/* Bed 02 */}
        <BedButton
          bed={bed2}
          roomNo={room.roomNo}
          hostelName={hostelName}
          onBedClick={onBedClick}
        />
      </div>
      {/* Room Number */}
      <span className="text-[10px] font-bold text-slate-600 tracking-tight">
        {room.roomNo}
      </span>
    </div>
  );
};

// Component: Individual Bed Half Button
const BedButton = ({ bed, roomNo, hostelName, onBedClick }) => {
  const isOccupied = Boolean(bed && bed.student);
  const studentName = isOccupied ? bed.student.name : 'Vacant';
  const ariaLabel = `${hostelName} ${roomNo} bed ${bed ? bed.bedNo : '01'}, ${
    isOccupied ? `occupied by ${studentName}` : 'vacant'
  }`;

  return (
    <button
      onClick={() => onBedClick({ ...bed, roomNo, hostelName })}
      aria-label={ariaLabel}
      title={isOccupied ? studentName : 'Vacant'}
      className={`flex-1 h-full border-none p-0 cursor-pointer grid place-items-center transition-all ${
        isOccupied
          ? 'bg-[#16a34a] hover:bg-[#15803d] text-white'
          : 'bg-[#dc2626] hover:bg-[#b91c1c] text-white'
      } focus:outline-none focus:ring-2 focus:ring-blue-600 focus:z-10`}
    >
      {isOccupied ? (
        <User className="w-3.5 h-3.5 fill-white stroke-none" />
      ) : (
        <Plus className="w-3.5 h-3.5 stroke-[3]" />
      )}
    </button>
  );
};

// Component: Interactive Bed Modal (View, Allocate, Move, Release)
const BedModal = ({ bedInfo, hostelsList, onClose, onSuccess }) => {
  const isOccupied = Boolean(bedInfo.student);
  const student = bedInfo.student;

  // View state modes: 'details' | 'allocate' | 'move' | 'release_confirm'
  const [mode, setMode] = useState(isOccupied ? 'details' : 'allocate');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Allocate State
  const [unallocatedStudents, setUnallocatedStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Move State
  const [moveHostel, setMoveHostel] = useState(bedInfo.hostelName || 'Maple House');
  const [moveRoomNo, setMoveRoomNo] = useState('');
  const [moveBedNo, setMoveBedNo] = useState('01');

  // Load unallocated students if in allocate mode
  useEffect(() => {
    if (mode === 'allocate') {
      fetchUnallocatedStudents();
    }
  }, [mode]);

  const fetchUnallocatedStudents = async () => {
    setStudentsLoading(true);
    try {
      const res = await fetch('/api/students?allocated=false&limit=100', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUnallocatedStudents(data.items || []);
      }
    } catch (err) {
      console.error('Error loading unallocated students:', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  // 1. Submit Allocate Bed
  const handleAllocate = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setActionError('Please select a student to allocate');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          studentId: selectedStudentId,
          hostel: bedInfo.hostelName,
          roomNo: bedInfo.roomNo,
          bedNo: bedInfo.bedNo
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to allocate bed');
      }
      setActionSuccessMsg('Bed allocated successfully!');
      setTimeout(() => onSuccess(), 1000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Submit Move Bed
  const handleMove = async (e) => {
    e.preventDefault();
    if (!moveRoomNo.trim()) {
      setActionError('Please enter a target room number');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/allocations/${encodeURIComponent(student.studentId)}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          hostel: moveHostel,
          roomNo: moveRoomNo.trim(),
          bedNo: moveBedNo
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to move bed allocation');
      }
      setActionSuccessMsg('Student bed moved successfully!');
      setTimeout(() => onSuccess(), 1000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Submit Release Bed
  const handleRelease = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/allocations/${encodeURIComponent(student.studentId)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to release bed allocation');
      }
      setActionSuccessMsg('Bed allocation released successfully!');
      setTimeout(() => onSuccess(), 1000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredStudents = unallocatedStudents.filter((s) => {
    if (!studentSearch.trim()) return true;
    const term = studentSearch.toLowerCase();
    return s.name.toLowerCase().includes(term) || s.studentId.toLowerCase().includes(term);
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold">
              {mode === 'details' && 'Bed Allocation Details'}
              {mode === 'allocate' && 'Allocate Student to Vacant Bed'}
              {mode === 'move' && 'Move Student to Another Bed'}
              {mode === 'release_confirm' && 'Confirm Bed Release'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location Banner */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700 flex justify-between">
          <span>Hostel: <strong className="text-slate-900">{bedInfo.hostelName}</strong></span>
          <span className="text-blue-600 font-bold">Room {bedInfo.roomNo} · Bed {bedInfo.bedNo}</span>
        </div>

        {/* Error / Success Feedback */}
        {actionError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccessMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Modal Content Body */}
        <div className="p-6 space-y-4">
          {/* MODE 1: DETAILS (Occupied Bed Details & Main Actions) */}
          {mode === 'details' && student && (
            <div className="space-y-4">
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Name</span>
                  <p className="text-base font-bold text-slate-900">{student.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-200/60">
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">College ID</span>
                    <span className="font-mono font-bold text-slate-800">{student.studentId}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Study Year</span>
                    <span className="font-semibold text-slate-800">Year {student.studyYear} of {student.duration || 4}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-200/60">
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Course</span>
                    <span className="font-semibold text-slate-800">{student.course}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Mess Preference</span>
                    <span className="font-semibold text-slate-800">{student.mess || 'Standard Mess'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Occupied Bed */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => setMode('move')}
                  className="w-full sm:w-1/2 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-xs"
                >
                  <MoveRight className="w-4 h-4" />
                  <span>Move Bed</span>
                </button>
                <button
                  onClick={() => setMode('release_confirm')}
                  className="w-full sm:w-1/2 py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4 text-amber-600" />
                  <span>Release Bed</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: ALLOCATE STUDENT */}
          {mode === 'allocate' && (
            <form onSubmit={handleAllocate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Unallocated Student
                </label>

                {/* Search Bar */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search unallocated students..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                {/* Student Select Box */}
                {studentsLoading ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading unallocated students...</div>
                ) : filteredStudents.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    No unallocated students match your search.
                  </div>
                ) : (
                  <select
                    size={5}
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none space-y-1 custom-scrollbar"
                  >
                    {filteredStudents.map((s) => (
                      <option key={s._id} value={s.studentId} className="p-2 rounded hover:bg-blue-50 cursor-pointer">
                        {s.name} ({s.studentId}) — {s.course} (Yr {s.studyYear})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                {isOccupied && (
                  <button
                    type="button"
                    onClick={() => setMode('details')}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={actionLoading || !selectedStudentId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition shadow-xs"
                >
                  {actionLoading ? 'Allocating...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: MOVE BED */}
          {mode === 'move' && student && (
            <form onSubmit={handleMove} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900">
                Moving student <strong className="font-bold">{student.name}</strong> ({student.studentId}) from{' '}
                <strong>{bedInfo.hostelName} {bedInfo.roomNo}</strong>.
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Hostel</label>
                  <select
                    value={moveHostel}
                    onChange={(e) => setMoveHostel(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    {(hostelsList.length > 0 ? hostelsList : [{ name: 'Maple House' }, { name: 'Cedar House' }, { name: 'Oak House' }]).map(
                      (h) => (
                        <option key={h.name} value={h.name}>
                          {h.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Room No</label>
                    <input
                      type="text"
                      placeholder="e.g. A-102"
                      value={moveRoomNo}
                      onChange={(e) => setMoveRoomNo(e.target.value)}
                      required
                      className="w-full border border-slate-200 rounded-lg p-2 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bed Number</label>
                    <select
                      value={moveBedNo}
                      onChange={(e) => setMoveBedNo(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="01">Bed 01</option>
                      <option value="02">Bed 02</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMode('details')}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition shadow-xs"
                >
                  {actionLoading ? 'Moving...' : 'Confirm Move'}
                </button>
              </div>
            </form>
          )}

          {/* MODE 4: RELEASE CONFIRMATION */}
          {mode === 'release_confirm' && student && (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 grid place-items-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Release Bed Allocation?</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Are you sure you want to release bed allocation for{' '}
                  <strong className="text-slate-800">{student.name}</strong> ({student.studentId}) from{' '}
                  <strong>{bedInfo.hostelName} Room {bedInfo.roomNo}</strong>?
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setMode('details')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRelease}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition shadow-xs"
                >
                  {actionLoading ? 'Releasing...' : 'Yes, Release Bed'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
