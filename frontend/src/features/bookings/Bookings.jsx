import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Users, Plus, Check, CheckCircle, ChevronLeft, ChevronRight, Monitor, X, Search, AlertCircle, Edit2, Trash2, Archive, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { io } from 'socket.io-client';
import api, { API_URL } from '../../utils/api';
import AlertModal from '../../components/AlertModal';

const Bookings = () => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('dworkz_user');
    return savedUser ? JSON.parse(savedUser) : { role: 'admin', name: 'Administrator' };
  });
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  const handleDayClick = (day) => {
    setSelectedDay(day);
    setIsDayModalOpen(true);
  };
  
  const [bookingData, setBookingData] = useState({
    clientId: '',
    clientName: '',
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    isGuest: false,
    email: '',
    phone: '',
    hourlyRate: 500,
    notes: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  const showAlert = (title, message, type = 'success') => {
    setAlertConfig({ isOpen: true, title, message, type });
  };

  const fetchBookings = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const res = await api.get(`/api/v1/bookings?month=${month}&year=${year}`);
      setBookings(res.data.data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!['admin', 'staff'].includes(user.role)) return;
    try {
      const res = await api.get('/api/v1/clients');
      setClients(res.data.data);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchClients();

    const socket = io(API_URL);
    socket.on('bookingUpdated', () => {
      fetchBookings(true);
    });

    return () => socket.disconnect();
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const day = i - (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()) + 1;
    return day > 0 && day <= (new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()) ? day : null;
  });

  const openNewBooking = () => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    setBookingData({
      clientId: '',
      clientName: user.role === 'client' ? user.name : '',
      date: dateStr,
      startTime: '09:00',
      endTime: '10:00',
      isGuest: false,
      email: '',
      phone: '',
      hourlyRate: 500,
      notes: ''
    });
    setIsEditing(false);
    setIsModalOpen(true);
    setError('');
  };

  const openEditBooking = (booking) => {
    setBookingData({
      clientId: booking.client?._id || booking.client || '',
      clientName: booking.clientName,
      date: new Date(booking.date).toISOString().split('T')[0],
      startTime: booking.startTime,
      endTime: booking.endTime,
      isGuest: booking.isGuest || false,
      email: booking.guestDetails?.email || '',
      phone: booking.guestDetails?.phone || '',
      hourlyRate: booking.hourlyRate || 500,
      notes: booking.notes || ''
    });
    setEditingId(booking._id);
    setIsEditing(true);
    setIsModalOpen(true);
    setError('');
  };

  const openConfirmDelete = (id) => {
    setDeletingId(id);
    setIsConfirmOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (bookingData.isGuest && bookingData.phone.length !== 10) {
        throw new Error('Phone Number must be exactly 10 digits.');
      }
      const token = localStorage.getItem('dworkz_token');
      const start = parseInt(bookingData.startTime.split(':')[0]);
      const end = parseInt(bookingData.endTime.split(':')[0]);
      const duration = end - start;
      if (duration <= 0) throw new Error('End time must be after start time');

      const payload = {
        ...bookingData,
        duration,
        guestDetails: bookingData.isGuest ? {
          email: bookingData.email,
          phone: bookingData.phone
        } : undefined
      };

      if (isEditing) {
        await api.put(`/api/v1/bookings/${editingId}`, payload);
      } else {
        await api.post('/api/v1/bookings', payload);
      }
      
      setIsModalOpen(false);
      fetchBookings();
      window.dispatchEvent(new Event('refreshAlerts'));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/api/v1/bookings/${deletingId}`);
      setIsConfirmOpen(false);
      fetchBookings();
      window.dispatchEvent(new Event('refreshAlerts'));
    } catch (err) {
      showAlert('Error', 'Failed to cancel booking. ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateInvoice = async (bookingId) => {
    try {
      const res = await api.post(`/api/v1/invoices/guest/${bookingId}`, {});
      if (res.data.success) {
        if (res.data.alreadyExists) {
          showAlert('Info', 'Billing invoice for this session already exists.', 'info');
        } else {
          showAlert('Success', 'Visitor Billing Invoice Generated!', 'success');
        }
        fetchBookings(); // Refresh to update the checkmark
      }
    } catch (err) {
      showAlert('Error', 'Error generating billing invoice: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const timeSlots = Array.from({ length: 13 }, (_, i) => `${String(i + 9).padStart(2, '0')}:00`);

  return (
    <div className="p-4 sm:p-8 w-full max-w-7xl mx-auto space-y-6 sm:space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-textMain uppercase tracking-tight">Meeting Room Management</h1>
          <p className="text-textMuted mt-2 font-medium">Coordinate workspace availability and manage client reservations.</p>
        </div>
        <button onClick={openNewBooking} className="bg-primary hover:bg-primary/90 text-textMain px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25 flex items-center gap-2 active:scale-95 shrink-0">
          <Plus size={18} /> New Booking
        </button>
      </div>

      <div className="bg-surface border border-borderSubtle p-5 sm:p-8 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm gap-4 group">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-center shrink-0">
            <Monitor size={30} className="text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-xl font-bold text-textMain tracking-tight">Main Meeting Room</h3>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-5 text-[10px] font-black text-textMuted uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><Users size={14} className="text-primary" /> Capacity: 05</span>
              <span className="flex items-center gap-1.5"><Monitor size={14} className="text-primary" /> HD Monitor</span>
              <span className="flex items-center gap-1.5 text-primary/60"><CheckCircle size={14} /> High Speed WiFi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="bg-surface border border-borderSubtle rounded-2xl overflow-visible shadow-sm">
        <div className="p-5 sm:p-8 border-b border-borderSubtle flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface/50 backdrop-blur-sm rounded-t-2xl">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-background border border-borderSubtle rounded-xl flex items-center justify-center text-primary shrink-0">
                <CalendarIcon size={20} />
             </div>
             <h2 className="text-xl font-black text-textMain tracking-tight">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrevMonth} className="p-2 border border-borderSubtle rounded-xl text-textMuted hover:text-primary transition-all"><ChevronLeft size={20} /></button>
            <button onClick={handleNextMonth} className="p-2 border border-borderSubtle rounded-xl text-textMuted hover:text-primary transition-all"><ChevronRight size={20} /></button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-px bg-borderSubtle/30">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="bg-background/20 py-4 text-center text-[10px] font-black text-textMuted uppercase tracking-widest opacity-60">{d}</div>
          ))}
          {calendarDays.map((day, i) => {
            const dayBookings = bookings.filter(b => new Date(b.date).getDate() === day);
            const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
            const isHovered = hoveredDay === day;

            return (
              <div 
                key={i} 
                onMouseEnter={() => day && setHoveredDay(day)} 
                onMouseLeave={() => setHoveredDay(null)} 
                onClick={() => day && handleDayClick(day)}
                className={`min-h-[70px] sm:min-h-[120px] p-2 sm:p-4 bg-surface transition-all relative cursor-pointer ${!day ? 'opacity-10' : 'hover:bg-primary/[0.02]'}`}
              >
                {day && (
                  <>
                    <div className={`text-[10px] sm:text-xs font-black w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg sm:rounded-xl mb-1.5 sm:mb-3 ${isToday ? 'bg-primary text-textMain shadow-lg shadow-primary/20' : 'text-textMuted'}`}>{day}</div>
                    <div className="flex gap-1">
                      {dayBookings.slice(0, 3).map((_, idx) => (
                        <div key={idx} className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_5px_rgba(20,184,166,0.5)]"></div>
                      ))}
                      {dayBookings.length > 3 && <div className="text-[8px] font-black text-primary">+</div>}
                    </div>

                    <AnimatePresence>
                      {isHovered && dayBookings.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: i > 28 ? -10 : 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: i > 28 ? -10 : 10, scale: 0.95 }} className={`absolute z-40 left-1/2 -translate-x-1/2 w-64 bg-surface border border-borderSubtle rounded-2xl shadow-2xl p-4 overflow-hidden ${i > 28 ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                          <div className={`absolute left-0 w-full h-1 bg-primary ${i > 28 ? 'bottom-0' : 'top-0'}`}></div>
                          <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-4">Booked Slots</p>
                          <div className="space-y-3">
                            {dayBookings.map((b, bi) => (
                              <div key={bi} className="group/item border-b border-borderSubtle/30 pb-3 last:border-0 last:pb-0">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-[10px] font-black text-primary">{b.startTime} - {b.endTime}</span>
                                  <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    {['admin', 'staff'].includes(user.role) && <button onClick={(e) => { e.stopPropagation(); openEditBooking(b); }} className="text-primary hover:bg-primary/10 p-1 rounded"><Edit2 size={12} /></button>}
                                    <button onClick={(e) => { e.stopPropagation(); openConfirmDelete(b._id); }} className="text-rose-500 hover:bg-rose-500/10 p-1 rounded"><Trash2 size={12} /></button>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center">
                                  <p className="text-xs font-bold text-textMain truncate">{b.clientName}</p>
                                  {b.isGuest && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[7px] font-black bg-orange-500/10 text-orange-400 px-1 py-0.5 rounded uppercase">Visitor Session</span>
                                      {b.invoiceGenerated ? (
                                        <div className="text-emerald-500 bg-emerald-500/10 p-1 rounded-md border border-emerald-500/20 shadow-sm" title="Invoice Already Generated">
                                          <Check size={10} strokeWidth={4} />
                                        </div>
                                      ) : (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleGenerateInvoice(b._id); }} 
                                          className="text-emerald-500 hover:bg-emerald-500/10 p-1 rounded-md border border-emerald-500/20 active:scale-90 transition-transform"
                                          title="Generate Billing Invoice"
                                        >
                                          <Plus size={10} strokeWidth={4} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Booking Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-surface border border-borderSubtle rounded-2xl p-5 sm:p-8 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xl font-black text-textMain uppercase tracking-tight">{isEditing ? 'Edit' : 'New'} Booking</h2>
                  <p className="text-[10px] text-textMuted font-black uppercase tracking-widest mt-1">Workspace Reservation Portal</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-textMuted transition-all"><X size={20}/></button>
              </div>

              {error && <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-[11px] font-bold"><AlertCircle size={14} /> {error}</div>}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Client / Guest Name</label>
                      <button type="button" onClick={() => setBookingData({...bookingData, isGuest: !bookingData.isGuest, clientId: '', clientName: ''})} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border transition-all ${bookingData.isGuest ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                        {bookingData.isGuest ? 'Switch to Member' : 'Switch to Guest'}
                      </button>
                    </div>
                    <input required type="text" placeholder={bookingData.isGuest ? "Guest Name..." : "Search member company..."} value={bookingData.clientName} 
                      onChange={(e) => {
                        const val = e.target.value;
                        const found = !bookingData.isGuest ? clients.find(c => (c.companyName || c.name)?.toLowerCase() === val.toLowerCase()) : null;
                        setBookingData({ ...bookingData, clientName: val, clientId: found ? found._id : '' });
                      }} 
                      list={bookingData.isGuest ? "" : "client-list"} className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary outline-none font-bold" 
                    />
                    {!bookingData.isGuest && <datalist id="client-list">{clients.map(c => <option key={c._id} value={c.companyName || c.name} />)}</datalist>}
                  </div>
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Meeting Date</label>
                    <input required type="date" min={new Date().toISOString().split('T')[0]} value={bookingData.date} onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })} className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain font-bold outline-none focus:border-primary" />
                  </div>
                </div>

                {bookingData.isGuest && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Guest Email</label>
                      <input required type="email" placeholder="email@example.com" value={bookingData.email} onChange={(e) => setBookingData({...bookingData, email: e.target.value})} className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary outline-none font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Guest Phone</label>
                      <input required type="text" placeholder="10-digit phone number" value={bookingData.phone} onChange={(e) => setBookingData({...bookingData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary outline-none font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Hourly Rate (₹)</label>
                      <input required type="number" onWheel={(e) => e.target.blur()} placeholder="500" value={bookingData.hourlyRate} onChange={(e) => setBookingData({...bookingData, hourlyRate: e.target.value})} className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain focus:border-primary outline-none font-bold" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Start Time</label>
                    <select value={bookingData.startTime} onChange={(e) => setBookingData({ ...bookingData, startTime: e.target.value })} className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain font-bold outline-none">
                      {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">End Time</label>
                    <select value={bookingData.endTime} onChange={(e) => setBookingData({ ...bookingData, endTime: e.target.value })} className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain font-bold outline-none">
                      {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Meeting Notes</label>
                  <textarea value={bookingData.notes} onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })} className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm text-textMain font-medium outline-none min-h-[80px] resize-none" />
                </div>

                <button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90 text-textMain py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 transition-all">
                  {submitting ? 'Processing...' : isEditing ? 'Update Reservation' : 'Confirm Booking'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Professional Confirmation Modal */}
      <AnimatePresence>
        {isConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface border border-borderSubtle rounded-3xl p-10 w-full max-w-md shadow-2xl text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500"></div>
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                <Archive size={40} className="text-rose-500" />
              </div>
              <h2 className="text-2xl font-black text-textMain uppercase tracking-tight mb-2">Archive Booking?</h2>
              <p className="text-textMuted font-medium mb-8">This will move the reservation to the history logs for future analytics. You can still access this data in the reporting section.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setIsConfirmOpen(false)} className="px-6 py-4 bg-background border border-borderSubtle rounded-2xl text-textMain font-black uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all">Go Back</button>
                <button onClick={handleCancelBooking} disabled={submitting} className="px-6 py-4 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20">
                  {submitting ? 'Archiving...' : 'Confirm Archive'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AlertModal 
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig({...alertConfig, isOpen: false})}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />

      {/* Day Bookings Sheet/Modal (Mobile/Tablet friendly) */}
      <AnimatePresence>
        {isDayModalOpen && selectedDay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface border border-borderSubtle rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-black text-textMain uppercase tracking-tight">Bookings for {currentDate.toLocaleString('default', { month: 'long' })} {selectedDay}</h2>
                  <p className="text-[9px] text-textMuted font-black uppercase tracking-widest mt-1">Daily Reservations List</p>
                </div>
                <button onClick={() => setIsDayModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-textMuted transition-all"><X size={18} /></button>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {bookings.filter(b => new Date(b.date).getDate() === selectedDay).length === 0 ? (
                  <p className="text-xs text-textMuted py-4 text-center font-bold">No reservations scheduled for this day.</p>
                ) : (
                  bookings.filter(b => new Date(b.date).getDate() === selectedDay).map((b, bi) => (
                    <div key={bi} className="border border-borderSubtle/50 p-4 rounded-xl space-y-2 bg-background/30 group">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-black text-primary">{b.startTime} - {b.endTime}</span>
                        <div className="flex gap-2">
                          {['admin', 'staff'].includes(user.role) && (
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setIsDayModalOpen(false);
                                openEditBooking(b); 
                              }} 
                              className="text-primary hover:bg-primary/10 p-1.5 rounded-lg border border-primary/20"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setIsDayModalOpen(false);
                              openConfirmDelete(b._id); 
                            }} 
                            className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/20"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-bold text-textMain">{b.clientName}</p>
                        {b.isGuest && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-black bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded uppercase">Visitor</span>
                            {b.invoiceGenerated ? (
                              <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Paid</span>
                            ) : (
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setIsDayModalOpen(false);
                                  handleGenerateInvoice(b._id); 
                                }} 
                                className="text-emerald-500 hover:bg-emerald-500/10 px-1.5 py-0.5 rounded text-[8px] font-black uppercase border border-emerald-500/20 active:scale-95 transition-all"
                              >
                                Bill
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-borderSubtle flex gap-4">
                <button 
                  onClick={() => {
                    setIsDayModalOpen(false);
                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
                    setBookingData({
                      clientId: '',
                      clientName: user.role === 'client' ? user.name : '',
                      date: dateStr,
                      startTime: '09:00',
                      endTime: '10:00',
                      isGuest: false,
                      email: '',
                      phone: '',
                      hourlyRate: 500,
                      notes: ''
                    });
                    setIsEditing(false);
                    setIsModalOpen(true);
                    setError('');
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-textMain py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Plus size={14} /> Add Reservation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Bookings;
