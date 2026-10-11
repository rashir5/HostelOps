import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { formatDate } from '../utils/formatters';
import {
  Megaphone,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Pin,
  Clock,
  Calendar,
  Building2,
  Users,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  AlertTriangle
} from 'lucide-react';

export const Announcements = () => {
  const { user } = useAuth();

  // Announcements list state
  const [announcements, setAnnouncements] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Hostels for dropdown
  const [hostels, setHostels] = useState([]);

  // Form modal state (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    audience: 'all',
    hostel: '',
    pinned: false,
    publishAt: '',
    expiresAt: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverFormError, setServerFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Delete modal confirmation
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, [page]);

  useEffect(() => {
    fetchHostels();
  }, []);

  const fetchHostels = async () => {
    try {
      const data = await apiFetch('/api/hostels');
      setHostels(data || []);
    } catch (_) {}
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/api/announcements/manage?page=${page}&limit=${limit}`);
      setAnnouncements(data?.items || []);
      setTotal(data?.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      title: '',
      body: '',
      audience: 'all',
      hostel: '',
      pinned: false,
      publishAt: '',
      expiresAt: ''
    });
    setFormErrors({});
    setServerFormError('');
    setFormSuccess('');
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item._id);
    setFormData({
      title: item.title || '',
      body: item.body || '',
      audience: item.audience || 'all',
      hostel: item.hostel || '',
      pinned: Boolean(item.pinned),
      publishAt: item.publishAt ? new Date(item.publishAt).toISOString().slice(0, 16) : '',
      expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 16) : ''
    });
    setFormErrors({});
    setServerFormError('');
    setFormSuccess('');
    setModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.title.trim()) {
      errs.title = 'Title is required';
    } else if (formData.title.length > 120) {
      errs.title = 'Title must not exceed 120 characters';
    }

    if (!formData.body.trim()) {
      errs.body = 'Message body is required';
    } else if (formData.body.length > 2000) {
      errs.body = 'Message body must not exceed 2000 characters';
    }

    if (formData.publishAt && formData.expiresAt) {
      const pub = new Date(formData.publishAt);
      const exp = new Date(formData.expiresAt);
      if (exp <= pub) {
        errs.expiresAt = 'Expiration date/time must be after publish date/time';
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setServerFormError('');
    setFormSuccess('');

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        body: formData.body.trim(),
        audience: formData.audience,
        hostel: formData.hostel.trim() || undefined,
        pinned: formData.pinned,
        publishAt: formData.publishAt ? new Date(formData.publishAt).toISOString() : undefined,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null
      };

      if (editingId) {
        await apiFetch(`/api/announcements/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setFormSuccess('Announcement updated successfully!');
      } else {
        await apiFetch('/api/announcements', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setFormSuccess('Announcement published successfully!');
      }

      fetchAnnouncements();
      setTimeout(() => {
        setModalOpen(false);
        setFormSuccess('');
      }, 1500);
    } catch (err) {
      setServerFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/announcements/${deletingItem._id}`, {
        method: 'DELETE'
      });
      setDeletingItem(null);
      fetchAnnouncements();
    } catch (err) {
      alert(err.message || 'Failed to delete announcement');
    } finally {
      setDeleting(false);
    }
  };

  const canModify = (item) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'warden') {
      const creatorId = item.createdBy?._id || item.createdBy;
      return String(creatorId) === String(user?.id);
    }
    return false;
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 md:p-8 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-300">CAMPUS COMMUNICATIONS</span>
          <h2 className="text-2xl font-extrabold mt-1">Official Announcements</h2>
          <p className="text-sm text-slate-300 mt-2 max-w-xl">
            Publish notices, urgent alerts, and residential broadcast messages to students and staff.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnnouncements}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white transition flex items-center gap-2 backdrop-blur-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 shadow-lg shadow-blue-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Create Notice</span>
          </button>
        </div>
      </div>

      {/* Main Table / Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs font-semibold">Loading announcements...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Announcements Posted</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Get started by creating your first official campus announcement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Announcement</th>
                  <th className="px-4 py-3.5">Audience & Target</th>
                  <th className="px-4 py-3.5">Status & Timing</th>
                  <th className="px-4 py-3.5">Posted By</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {announcements.map((item) => {
                  const now = new Date();
                  const isScheduled = item.publishAt && new Date(item.publishAt) > now;
                  const isExpired = item.expiresAt && new Date(item.expiresAt) <= now;
                  const isActive = !isScheduled && !isExpired;

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4 max-w-md">
                        <div className="flex items-start gap-2">
                          {item.pinned && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1 shrink-0 mt-0.5">
                              <Pin className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                              Pinned
                            </span>
                          )}
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm leading-snug">
                              {item.title}
                            </h4>
                            <p className="text-slate-500 text-xs mt-1 line-clamp-2 leading-relaxed">
                              {item.body}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                            item.audience === 'students'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : item.audience === 'staff'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            <Users className="w-3 h-3" />
                            {item.audience === 'all' ? 'All Campus' : item.audience}
                          </span>
                          {item.hostel && (
                            <div className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{item.hostel}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-slate-600">
                        <div className="space-y-1">
                          <div>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Live
                              </span>
                            )}
                            {isScheduled && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                                Scheduled
                              </span>
                            )}
                            {isExpired && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                Expired
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Published: {formatDate(item.publishAt)}
                          </div>
                          {item.expiresAt && (
                            <div className="text-[10px] text-slate-400">
                              Expires: {formatDate(item.expiresAt)}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-slate-700">
                        <div className="font-semibold text-slate-800">
                          {item.createdBy?.name || 'Administrator'}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                          {item.createdBy?.role || 'Staff'}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        {canModify(item) ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Announcement"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingItem(item)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Announcement"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Read-only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Page <strong className="text-slate-800">{page}</strong> of{' '}
              <strong className="text-slate-800">{totalPages}</strong> ({total} total notices)
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
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 grid place-items-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingId ? 'Edit Announcement' : 'Publish New Announcement'}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Broadcast communications across campus
                  </span>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {serverFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{serverFormError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Title Field with Character Counter */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Title <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[10px] font-mono ${
                    formData.title.length > 120 ? 'text-rose-500 font-bold' : 'text-slate-400'
                  }`}>
                    {formData.title.length}/120
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={120}
                  value={formData.title}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, title: e.target.value }));
                    if (formErrors.title) setFormErrors((p) => ({ ...p, title: '' }));
                  }}
                  placeholder="e.g. Scheduled Power Outage & Water Supply Maintenance"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
                {formErrors.title && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.title}</p>
                )}
              </div>

              {/* Message Body Field with Character Counter */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Message Body <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[10px] font-mono ${
                    formData.body.length > 2000 ? 'text-rose-500 font-bold' : 'text-slate-400'
                  }`}>
                    {formData.body.length}/2000
                  </span>
                </div>
                <textarea
                  rows={5}
                  maxLength={2000}
                  value={formData.body}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, body: e.target.value }));
                    if (formErrors.body) setFormErrors((p) => ({ ...p, body: '' }));
                  }}
                  placeholder="Write clear, plain text announcement details here..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition resize-none leading-relaxed"
                />
                {formErrors.body && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.body}</p>
                )}
              </div>

              {/* Audience and Target Hostel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Audience
                  </label>
                  <select
                    value={formData.audience}
                    onChange={(e) => setFormData((p) => ({ ...p, audience: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  >
                    <option value="all">All Campus (Everyone)</option>
                    <option value="students">Students Only</option>
                    <option value="staff">Staff Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Hostel (Optional)
                  </label>
                  <select
                    value={formData.hostel}
                    onChange={(e) => setFormData((p) => ({ ...p, hostel: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  >
                    <option value="">All Hostels (Campus-wide)</option>
                    {hostels.map((h) => (
                      <option key={h._id || h.name} value={h.name}>
                        {h.name} Hostel
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Publish Date & Expiry Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Publish Date & Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.publishAt}
                    onChange={(e) => setFormData((p) => ({ ...p, publishAt: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Defaults to immediately if left blank
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Expiration Date & Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, expiresAt: e.target.value }));
                      if (formErrors.expiresAt) setFormErrors((p) => ({ ...p, expiresAt: '' }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                  {formErrors.expiresAt && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.expiresAt}</p>
                  )}
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Notice will automatically disappear once expired
                  </span>
                </div>
              </div>

              {/* Pin Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/60 transition">
                  <input
                    type="checkbox"
                    checked={formData.pinned}
                    onChange={(e) => setFormData((p) => ({ ...p, pinned: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <Pin className={`w-3.5 h-3.5 ${formData.pinned ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                    <span>Pin this announcement to top of feed</span>
                  </div>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-blue-600/30"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingId ? 'Update Notice' : 'Publish Notice'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 grid place-items-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Announcement?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently remove "{deletingItem.title}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm shadow-rose-600/30 flex items-center gap-1.5"
              >
                {deleting && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
