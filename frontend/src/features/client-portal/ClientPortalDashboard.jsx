import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, X, CheckCircle, XCircle, AlertCircle, Plus, Archive, Settings, LogOut, Home, ChevronRight, Trash2, Menu } from 'lucide-react';

const ROOMS = ['Meeting Room'];
const TIME_SLOTS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ClientPortalDashboard = ({ client, token, onLogout }) => {
  const [activeTab, setActiveTab] = useState('bookings');
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({ roomName: ROOMS[0], date: '', startTime: '09:00', endTime: '10:00', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState({ open: false, title: '', message: '', type: 'success' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [isChangingPw, setIsChangingPw] = useState(false);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const showAlert = (title, message, type = 'success') => setAlert({ open: true, title, message, type });

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/v1/client-portal/bookings`, authHeader);
      setBookings(res.data.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        showAlert('Session Expired', 'Your session has expired. Please log in again.', 'error');
        setTimeout(onLogout, 2000);
      } else {
        showAlert('Error', 'Failed to load bookings', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const getDuration = (start, end) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
  };

  const handleBook = async (e) => {
    e.preventDefault();
    const duration = getDuration(bookingForm.startTime, bookingForm.endTime);
    if (duration <= 0) return showAlert('Error', 'End time must be after start time.', 'error');
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/v1/client-portal/bookings`, { ...bookingForm, duration }, authHeader);
      setIsBookingModalOpen(false);
      setBookingForm({ roomName: ROOMS[0], date: '', startTime: '09:00', endTime: '10:00', notes: '' });
      fetchBookings();
      showAlert('Booking Confirmed!', `${bookingForm.roomName} booked for ${bookingForm.date} from ${bookingForm.startTime} to ${bookingForm.endTime}.`);
    } catch (err) {
      showAlert('Error', err.response?.data?.error || 'Booking failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (bookingId) => {
    try {
      await axios.put(`${API_URL}/api/v1/client-portal/bookings/${bookingId}/cancel`, {}, authHeader);
      fetchBookings();
      showAlert('Booking Cancelled', 'Your booking has been cancelled successfully.');
    } catch (err) {
      showAlert('Error', err.response?.data?.error || 'Failed to cancel booking.', 'error');
    }
  };

  const handleDelete = async (bookingId) => {
    try {
      await axios.delete(`${API_URL}/api/v1/client-portal/bookings/${bookingId}`, authHeader);
      fetchBookings();
      showAlert('Record Deleted', 'The booking record has been permanently removed.');
    } catch (err) {
      showAlert('Error', err.response?.data?.error || 'Failed to delete record.', 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirm) return showAlert('Error', 'New passwords do not match.', 'error');
    if (passwordForm.newPassword.length < 6) return showAlert('Error', 'Password must be at least 6 characters.', 'error');
    setIsChangingPw(true);
    try {
      await axios.post(`${API_URL}/api/v1/client-portal/change-password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }, authHeader);
      setPasswordForm({ currentPassword: '', newPassword: '', confirm: '' });
      showAlert('Password Updated', 'Your password has been changed successfully.');
    } catch (err) {
      showAlert('Error', err.response?.data?.error || 'Failed to change password.', 'error');
    } finally {
      setIsChangingPw(false);
    }
  };

  const upcomingBookings = bookings.filter(b => b.status === 'Confirmed' && new Date(b.date) >= new Date());
  const archivedBookings = bookings.filter(b => b.status === 'Cancelled' || new Date(b.date) < new Date());

  const navItems = [
    { key: 'bookings', label: 'Bookings', icon: Calendar },
    { key: 'archive', label: 'Archive', icon: Archive },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="portal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 border-r border-borderSubtle bg-background flex flex-col
        transition-transform duration-300 ease-in-out
        md:static md:translate-x-0
        ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-24 flex items-center justify-between px-6 md:px-8">
          <div className="flex flex-col justify-center">
            <div className="text-2xl md:text-3xl font-bold text-textMain tracking-tighter flex items-baseline leading-none">
              DworkZ<span className="text-primary text-3xl md:text-4xl leading-[0] ml-0.5">.</span>
            </div>
            <div className="text-[0.6rem] tracking-[0.6em] text-primary/60 ml-0.5 font-bold mt-2 uppercase">Member Portal</div>
          </div>
          <button onClick={() => setMenuOpen(false)} className="md:hidden p-2 rounded-xl text-textMuted hover:text-white hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-4">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setActiveTab(key); setMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === key ? 'bg-primary/10 text-primary' : 'text-textMuted hover:text-textMain hover:bg-surface'}`}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        {/* Client Info */}
        <div className="p-4 mx-4 mb-4 bg-surface border border-borderSubtle rounded-2xl">
          <p className="text-xs font-black text-textMain truncate">{client.companyName}</p>
          <p className="text-[10px] text-textMuted truncate mt-0.5">{client.contactEmail}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Active Member</span>
          </div>
        </div>

        <button onClick={onLogout} className="flex items-center gap-3 px-8 py-5 text-sm font-bold text-textMuted hover:text-rose-400 transition-colors border-t border-borderSubtle">
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 border-b border-borderSubtle flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)} className="md:hidden p-1.5 rounded-xl text-textMuted hover:text-white hover:bg-white/10 transition-colors">
              <Menu size={20} />
            </button>
            <div className="text-xs text-textMuted flex items-center gap-2">
              <span>Portal</span>
              <ChevronRight size={12} />
              <span className="text-textMain font-bold capitalize">{activeTab}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-textMain">{client.name}</p>
              <p className="text-[10px] text-textMuted">{client.planType} · {client.workspaceDetails}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

          {/* ── BOOKINGS TAB ── */}
          {activeTab === 'bookings' && (
            <div className="max-w-4xl mx-auto space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black text-textMain uppercase tracking-tight">Meeting Rooms</h1>
                  <p className="text-textMuted text-sm mt-1">Book your workspace meeting rooms</p>
                </div>
                <button onClick={() => setIsBookingModalOpen(true)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-textMain px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25">
                  <Plus size={16} /> New Booking
                </button>
              </div>

              {/* Plan Info Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Plan Type', value: client.planType },
                  { label: 'Workspace', value: client.workspaceType },
                  { label: 'Seats', value: client.seats },
                  { label: 'Monthly Rent', value: `₹${client.rentAmount?.toLocaleString()}` }
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface border border-borderSubtle rounded-2xl p-4">
                    <p className="text-[10px] font-black text-textMuted uppercase tracking-widest">{label}</p>
                    <p className="text-lg font-black text-textMain mt-1">{value}</p>
                  </div>
                ))}
              </div>

              {/* Upcoming Bookings */}
              <div className="bg-surface border border-borderSubtle rounded-3xl overflow-hidden">
                <div className="px-6 py-4 border-b border-borderSubtle">
                  <h2 className="text-sm font-black text-textMain uppercase tracking-widest">Upcoming Bookings</h2>
                </div>
                {loading ? (
                  <div className="p-12 text-center text-textMuted text-sm">Loading...</div>
                ) : upcomingBookings.length === 0 ? (
                  <div className="p-12 text-center">
                    <Calendar size={32} className="text-textMuted mx-auto mb-3 opacity-40" />
                    <p className="text-textMuted text-sm">No upcoming bookings</p>
                    <button onClick={() => setIsBookingModalOpen(true)}
                      className="mt-4 text-primary text-xs font-black uppercase tracking-widest hover:underline">
                      + Book a Room
                    </button>
                  </div>
                ) : upcomingBookings.map(b => (
                  <div key={b._id} className="px-4 sm:px-6 py-4 border-b border-borderSubtle last:border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 group hover:bg-primary/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Calendar size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-textMain">{b.roomName}</p>
                        <p className="text-[10px] text-textMuted mt-0.5">
                          {new Date(b.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                          &nbsp;·&nbsp;{b.startTime} – {b.endTime}&nbsp;·&nbsp;{b.duration}hr
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">Confirmed</span>
                      <button onClick={() => handleCancel(b._id)}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-rose-400 hover:text-rose-500 transition-all text-[10px] font-black uppercase tracking-widest">Cancel</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ARCHIVE TAB ── */}
          {activeTab === 'archive' && (
            <div className="max-w-4xl mx-auto space-y-6 relative z-10">
              <div>
                <h1 className="text-3xl font-black text-textMain uppercase tracking-tight">Archive</h1>
                <p className="text-textMuted text-sm mt-1">Past and cancelled bookings</p>
              </div>
              <div className="bg-surface border border-borderSubtle rounded-3xl overflow-hidden">
                <div className="px-6 py-4 border-b border-borderSubtle">
                  <h2 className="text-sm font-black text-textMain uppercase tracking-widest">Booking History · {archivedBookings.length} records</h2>
                </div>
                {archivedBookings.length === 0 ? (
                  <div className="p-12 text-center">
                    <Archive size={32} className="text-textMuted mx-auto mb-3 opacity-40" />
                    <p className="text-textMuted text-sm">No archived bookings yet</p>
                  </div>
                ) : archivedBookings.map(b => (
                  <div key={b._id} className="px-4 sm:px-6 py-4 border-b border-borderSubtle last:border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${b.status === 'Cancelled' ? 'bg-rose-500/10' : 'bg-surface'}`}>
                        {b.status === 'Cancelled' ? <XCircle size={18} className="text-rose-400" /> : <CheckCircle size={18} className="text-slate-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-textMuted">{b.roomName}</p>
                        <p className="text-[10px] text-textMuted/60 mt-0.5">
                          {new Date(b.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          &nbsp;·&nbsp;{b.startTime} – {b.endTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${b.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                        {b.status === 'Cancelled' ? 'Cancelled' : 'Completed'}
                      </span>
                      <button onClick={() => handleDelete(b._id)}
                        className="p-1.5 text-textMuted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6 relative z-10">
              <div>
                <h1 className="text-3xl font-black text-textMain uppercase tracking-tight">Settings</h1>
                <p className="text-textMuted text-sm mt-1">Manage your portal account</p>
              </div>

              {/* Profile Card */}
              <div className="bg-surface border border-borderSubtle rounded-3xl p-6 space-y-4">
                <h2 className="text-xs font-black text-textMuted uppercase tracking-widest">Account Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Company', value: client.companyName },
                    { label: 'Contact Name', value: client.name },
                    { label: 'Email', value: client.contactEmail },
                    { label: 'Phone', value: client.contactPhone },
                    { label: 'Plan Type', value: client.planType },
                    { label: 'Workspace', value: client.workspaceDetails },
                  ].map(({ label, value }) => (
                    <div key={label} className="space-y-1">
                      <p className="text-[10px] font-black text-textMuted uppercase tracking-widest">{label}</p>
                      <p className="text-sm font-bold text-textMain">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Change Password */}
              <div className="bg-surface border border-borderSubtle rounded-3xl p-6">
                <h2 className="text-xs font-black text-textMuted uppercase tracking-widest mb-6">Change Password</h2>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {[
                    { key: 'currentPassword', label: 'Current Password', placeholder: 'Enter current password' },
                    { key: 'newPassword', label: 'New Password', placeholder: 'At least 6 characters' },
                    { key: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-[10px] font-black text-primary uppercase tracking-widest">{label}</label>
                      <input
                        type="password"
                        value={passwordForm[key]}
                        onChange={e => setPasswordForm({ ...passwordForm, [key]: e.target.value })}
                        className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
                        placeholder={placeholder}
                        required
                      />
                    </div>
                  ))}
                  <button type="submit" disabled={isChangingPw}
                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-textMain py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25 mt-2">
                    {isChangingPw ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>

              <button onClick={onLogout}
                className="w-full border border-rose-500/20 text-rose-400 hover:bg-rose-500/5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                <LogOut size={16} /> Sign Out of Portal
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ── NEW BOOKING MODAL ── */}
      <AnimatePresence>
        {isBookingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-borderSubtle rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-textMain uppercase tracking-tight">Book a Room</h2>
                  <p className="text-xs text-textMuted mt-1">Select your preferred room and time slot</p>
                </div>
                <button onClick={() => setIsBookingModalOpen(false)} className="text-textMuted hover:text-textMain"><X size={18} /></button>
              </div>
              <form onSubmit={handleBook} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest">Room</label>
                  <select value={bookingForm.roomName} onChange={e => setBookingForm({ ...bookingForm, roomName: e.target.value })}
                    className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none">
                    {ROOMS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest">Date</label>
                  <input type="date" value={bookingForm.date} onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest">Start Time</label>
                    <select value={bookingForm.startTime} onChange={e => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none">
                      {TIME_SLOTS.slice(0, -1).map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest">End Time</label>
                    <select value={bookingForm.endTime} onChange={e => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none">
                      {TIME_SLOTS.slice(1).map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                {/* Duration preview */}
                {bookingForm.startTime && bookingForm.endTime && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[10px] font-black text-textMuted uppercase tracking-widest">Duration</span>
                    <span className="text-sm font-black text-primary">{Math.max(0, getDuration(bookingForm.startTime, bookingForm.endTime))} hour(s)</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest">Notes (optional)</label>
                  <textarea value={bookingForm.notes} onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })}
                    rows={2} className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none resize-none"
                    placeholder="Purpose of booking..." />
                </div>
                <div className="flex gap-4 pt-1">
                  <button type="button" onClick={() => setIsBookingModalOpen(false)}
                    className="flex-1 py-3 text-sm font-bold text-textMuted hover:text-textMain transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting}
                    className="flex-[2] bg-primary hover:bg-primary/90 disabled:opacity-50 text-textMain py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25">
                    {isSubmitting ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Alert Modal */}
      <AnimatePresence>
        {alert.open && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface border border-borderSubtle rounded-[2rem] p-8 w-full max-w-sm shadow-2xl text-center">
              <div className={`w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center ${alert.type === 'error' ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'}`}>
                {alert.type === 'error' ? <XCircle size={32} /> : <CheckCircle size={32} />}
              </div>
              <h3 className="text-xl font-black text-textMain mb-2 uppercase tracking-tight">{alert.title}</h3>
              <p className="text-sm text-textMuted mb-8 leading-relaxed">{alert.message}</p>
              <button onClick={() => setAlert({ ...alert, open: false })}
                className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${alert.type === 'error' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-primary hover:bg-primary/90'} text-white`}>
                Continue
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientPortalDashboard;
