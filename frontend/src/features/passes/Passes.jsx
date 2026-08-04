import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Clock, CheckCircle, ShieldCheck, LogOut, ArrowRight, Archive, Eye, X, Mail, FileText, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

const Passes = () => {
  const [activeTab, setActiveTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    companyAddress: '',
    gstNumber: '',
    purpose: 'Day Pass',
    email: '',
    aadharNumber: ''
  });

  const [notification, setNotification] = useState(null);
  const [selectedVisitor, setSelectedVisitor] = useState(null); // Detailed view state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceVisitor, setInvoiceVisitor] = useState(null);
  const [invoiceAmount, setInvoiceAmount] = useState('450');
  const [applyGst, setApplyGst] = useState(true);
  const [serviceDate, setServiceDate] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [numberOfDays, setNumberOfDays] = useState(1);
  const days = numberOfDays === '' ? 1 : Number(numberOfDays);

  const handleOpenInvoiceModal = (visitor) => {
    setInvoiceVisitor(visitor);
    const purpose = visitor.purpose || 'Day Pass';
    if (purpose.toLowerCase().includes('hour')) {
      setInvoiceAmount('100');
    } else if (purpose.toLowerCase().includes('week')) {
      setInvoiceAmount('2000');
    } else if (purpose.toLowerCase().includes('other')) {
      setInvoiceAmount('500');
    } else {
      setInvoiceAmount('450');
    }
    setApplyGst(true);
    // Default issueDate to today, serviceDate to today
    const today = new Date().toISOString().split('T')[0];
    setServiceDate(today);
    setIssueDate(today);
    setNumberOfDays(1);
    setShowInvoiceModal(true);
  };

  const handleGenerateInvoice = async () => {
    if (!invoiceVisitor) return;
    try {
      const res = await api.post(`/api/v1/invoices/visitor/${invoiceVisitor._id}`, {
        amount: Number(invoiceAmount) || 0,
        applyGst,
        serviceDate,
        issueDate,
        numberOfDays: days
      });
      if (res.data.success) {
        setNotification({ 
          type: 'success', 
          message: `Invoice ${res.data.data.invoiceId} successfully generated for ${invoiceVisitor.name}! View it under the Billing dashboard.` 
        });
        
        // Update local state
        setLogs(prev => prev.map(log => log._id === invoiceVisitor._id ? { ...log, invoiceGenerated: true } : log));
        setSelectedVisitor(null); // Close detail view if open
        setShowInvoiceModal(false);
        setInvoiceVisitor(null);
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Invoice Generation Error: ' + (err.response?.data?.error || err.message) });
    }
  };

  useEffect(() => {
    if (selectedVisitor) {
      console.log('Viewing Visitor:', selectedVisitor);
    }
  }, [selectedVisitor]);



  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/visitors');
      setLogs(res.data.data.filter(v => ['Day Pass', 'Weekly Pass', 'Hourly Pass'].includes(v.purpose)));
    } catch (err) {
      console.error('Error fetching visitor logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/v1/visitors', {
        name: formData.name,
        companyName: formData.companyName,
        companyAddress: formData.companyAddress,
        gstNumber: formData.gstNumber,
        purpose: formData.purpose,
        email: formData.email,
        aadharNumber: formData.aadharNumber
      });
      setFormData({ name: '', companyName: '', companyAddress: '', gstNumber: '', purpose: 'Day Pass', email: '', aadharNumber: '' });
      setActiveTab('logs');
      fetchLogs();
      setNotification({ type: 'success', message: 'Pass Created! Generating Invoice...' });
      
      // Automatically open the billing modal for this new pass
      if (res.data.data) {
        handleOpenInvoiceModal(res.data.data);
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Registration Error: ' + (err.response?.data?.error || err.message) });
    }
  };

  const handleCheckOut = async (id) => {
    console.log('Initiating Checkout for ID:', id);
    try {
      const res = await api.put(`/api/v1/visitors/${id}/checkout`);
      
      console.log('Checkout Response:', res.data);
      
      if (res.data.success) {
        setNotification({ type: 'success', message: 'Visitor checked out successfully!' });
        setSelectedVisitor(null);
        fetchLogs();
      } else {
        throw new Error(res.data.error || 'Server reported failure');
      }
    } catch (err) {
      console.error('Checkout Failure:', err);
      const errMsg = err.response?.data?.error || err.message;
      setNotification({ type: 'error', message: 'Check-out Failed: ' + errMsg });
    }
  };

  const handleArchive = async (id) => {
    try {
      await api.put(`/api/v1/visitors/${id}/archive`);
      setNotification({ type: 'success', message: 'Visitor archived for analytics!' });
      setSelectedVisitor(null);
      fetchLogs();
    } catch (err) {
      setNotification({ type: 'error', message: 'Archive Error: ' + (err.response?.data?.error || err.message) });
    }
  };

  const filteredLogs = logs.filter(l =>
    l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPurposeStyle = (purpose) => {
    const p = purpose?.toLowerCase() || '';
    if (p.includes('day')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (p.includes('week')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (p.includes('hour')) return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
    if (p.includes('vendor') || p.includes('maint')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    if (p.includes('meet')) return 'bg-primary/10 text-primary border-primary/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  return (
    <div className="p-4 sm:p-8 w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-4 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-textMain uppercase tracking-tight">
            Passes Management
          </h1>
          <p className="text-textMuted mt-2 font-medium">Manage day, weekly, and hourly passes, and view history.</p>
        </div>

        <div className="bg-surface border border-borderSubtle p-1 rounded-xl flex gap-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'logs' ? 'bg-primary text-textMain shadow-lg' : 'text-textMuted hover:text-textMain'}`}
          >
            Passes Logs
          </button>
          <button
            onClick={() => setActiveTab('checkin')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'checkin' ? 'bg-primary text-textMain shadow-lg' : 'text-textMuted hover:text-textMain'}`}
          >
            New Check-In
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'logs' ? (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex gap-4 items-center">
              <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-primary transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search visitors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface border border-borderSubtle text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <div className="bg-surface border border-borderSubtle rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-textMain">
                  <thead className="bg-background/50 border-b border-borderSubtle text-textMuted">
                    <tr>
                      <th className="px-6 py-4 font-medium">Visitor</th>
                      <th className="px-6 py-4 font-medium">Aadhar Number</th>
                      <th className="px-6 py-4 font-medium">Purpose</th>
                      <th className="px-6 py-4 font-medium">Time In</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderSubtle">
                    {loading ? (
                      <tr><td colSpan={6} className="px-6 py-10 text-center text-textMuted">Loading...</td></tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-10 text-center text-textMuted">No visitor records found.</td></tr>
                    ) : filteredLogs.map((log) => (
                      <tr 
                        key={log._id} 
                        onClick={() => setSelectedVisitor(log)}
                        className="hover:bg-white/5 transition-all group cursor-pointer active:scale-[0.99]"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-textMain flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-black shadow-inner flex-shrink-0">
                              {log.name?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold">{log.name}</div>
                              <div className="text-textMuted text-[10px] uppercase tracking-widest font-black mt-0.5">{log.companyName || 'Individual'}</div>
                              <div className="text-[10px] text-primary/80 font-bold lowercase tracking-normal mt-0.5">{log.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-textMain font-mono text-sm">{log.aadharLast4 ? `****${log.aadharLast4}` : 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${getPurposeStyle(log.purpose)}`}>
                            {log.purpose}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-textMuted font-medium">
                            <Clock size={14} className="text-primary" aria-hidden="true" />
                            {new Date(log.timeIn).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {log.status === 'Checked In' ? (
                            <span role="status" className="px-3 py-1.5 bg-teal-500/10 text-teal-400 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-max border border-teal-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" aria-hidden="true" /> {log.status}
                            </span>
                          ) : (
                            <span role="status" className="px-3 py-1.5 bg-surface border border-borderSubtle text-textMuted rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-max">
                              <CheckCircle size={14} aria-hidden="true" /> Completed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedVisitor(log); }}
                              className="p-2 bg-surface border border-borderSubtle rounded-lg text-textMuted hover:text-primary hover:border-primary transition-all shadow-sm"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                            {log.invoiceGenerated ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setNotification({ type: 'success', message: 'Invoice already generated for this visitor! You can print and track it inside the Billing & Payments dashboard.' }); }}
                                className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                title="Invoice Already Generated"
                              >
                                <FileText size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenInvoiceModal(log); }}
                                className="p-2 bg-primary/10 border border-primary/20 rounded-lg text-primary hover:bg-primary hover:text-textMain transition-all shadow-sm"
                                title="Generate Day/Week Pass Invoice"
                              >
                                <FileText size={14} />
                              </button>
                            )}
                            {log.status === 'Completed' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleArchive(log._id); }}
                                className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                title="Archive for Analytics"
                              >
                                <Archive size={14} />
                              </button>
                            )}
                            {log.status === 'Checked In' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCheckOut(log._id); }}
                                className="bg-primary/10 text-primary hover:bg-primary hover:text-textMain transition-all px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-primary/20"
                              >
                                <LogOut size={14} /> Check Out
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="checkin"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-surface border border-borderSubtle rounded-2xl p-5 sm:p-8 max-w-3xl shadow-xl"
          >
            <div className="mb-8 border-b border-borderSubtle pb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2"><UserPlus className="text-primary" /> Front Desk Check-in</h2>
              <p className="text-sm text-textMuted mt-1">Fill out the details below to register a new visitor.</p>
            </div>

            <form onSubmit={handleCheckIn} className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">Full Name <span className="text-rose-400">*</span></label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    type="text"
                    className="w-full bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-textMain focus:border-primary focus:outline-none transition-all placeholder:text-textMuted/30"
                    placeholder="e.g. John Wick"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">Company / Affiliation</label>
                  <input
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    type="text"
                    className="w-full bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-textMain focus:border-primary focus:outline-none transition-all placeholder:text-textMuted/30"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">Company Address</label>
                  <input
                    value={formData.companyAddress}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                    type="text"
                    className="w-full bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-textMain focus:border-primary focus:outline-none transition-all placeholder:text-textMuted/30"
                    placeholder="Enter company address..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">Pass Type <span className="text-rose-400">*</span></label>
                  <select
                    required
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-textMain focus:border-primary focus:outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="Day Pass">☀️ Day Pass</option>
                    <option value="Weekly Pass">📅 Weekly Pass</option>
                    <option value="Hourly Pass">⏱ Hourly Pass</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Aadhar Number (ID Proof) <span className="text-rose-400">*</span></label>
                <input
                  required
                  value={formData.aadharNumber}
                  onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                  type="text"
                  className="w-full bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-textMain focus:border-primary focus:outline-none transition-all placeholder:text-textMuted/30 font-mono tracking-[0.3em]"
                  placeholder="XXXX XXXX XXXX"
                  maxLength={12}
                />
                <p className="text-[10px] text-textMuted">12-digit Aadhar number — only a secure hash and the last 4 digits are stored. The full number is never saved.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">Email Address <span className="text-rose-400">*</span></label>
                  <input
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    type="email"
                    className="w-full bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-textMain focus:border-primary focus:outline-none transition-all placeholder:text-textMuted/30"
                    placeholder="visitor@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">GST Number (Optional)</label>
                  <input
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() })}
                    type="text"
                    className="w-full bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-textMain focus:border-primary focus:outline-none transition-all placeholder:text-textMuted/30 font-mono tracking-widest uppercase"
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                  />
                  <p className="text-[10px] text-textMuted">Used for 18% GST invoice generation.</p>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-textMain px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-2xl shadow-primary/40 flex items-center gap-3 text-sm"
                >
                  Confirm Check-In <ArrowRight size={20} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visitor Detail Modal - Stability Overhaul */}
      {selectedVisitor && (
        <div 
          onClick={() => setSelectedVisitor(null)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/95 backdrop-blur-xl cursor-default"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-primary/20 rounded-3xl sm:rounded-[2.5rem] w-full max-w-2xl shadow-2xl p-5 sm:p-10 flex flex-col relative max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getPurposeStyle(selectedVisitor.purpose)}`}>
                  {selectedVisitor.purpose}
                </span>
                <h2 className="text-3xl font-black text-textMain uppercase tracking-tight mt-4">{selectedVisitor.name}</h2>
                <p className="text-primary font-bold text-sm uppercase tracking-widest mt-1">
                  {selectedVisitor.companyName || 'Individual Pass Holder'}
                </p>
              </div>
              <button onClick={() => setSelectedVisitor(null)} className="p-2 hover:bg-white/5 rounded-full text-textMuted hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8 flex-1">
              {/* Security Credentials */}
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-textMuted mb-4">Security Credentials</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 bg-background/40 p-4 sm:p-6 rounded-2xl border border-borderSubtle">
                  <div className="space-y-1">
                    <p className="text-[10px] text-textMuted uppercase font-bold">Aadhar Number</p>
                    <p className="text-textMain font-mono text-base font-bold">{selectedVisitor.aadharLast4 ? `****${selectedVisitor.aadharLast4}` : 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-textMuted uppercase font-bold">Check-In Time</p>
                    <div className="flex items-center gap-2 text-textMain font-bold text-sm mt-1">
                      <Clock size={14} className="text-primary" />
                      {new Date(selectedVisitor.timeIn).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-textMuted uppercase font-bold">Session Status</p>
                    <div className="flex items-center gap-2 text-textMain font-bold text-sm mt-1">
                      {selectedVisitor.timeOut ? (
                        <span className="text-emerald-400 font-bold">Completed at {new Date(selectedVisitor.timeOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      ) : (
                        <span className="text-primary animate-pulse font-bold">Live Tracking</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-borderSubtle w-full opacity-30"></div>

              {/* Contact Information */}
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-textMuted mb-4">Contact Information</h3>
                <div className="flex items-center gap-4 p-4 bg-background/40 rounded-2xl border border-borderSubtle max-w-md">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-textMuted uppercase font-bold">Email Address</p>
                    <p className="text-xs text-textMain font-bold truncate w-56">{selectedVisitor.email}</p>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-6 flex flex-wrap gap-3 items-center justify-end w-full border-t border-borderSubtle/30">
                {selectedVisitor.status === 'Checked In' ? (
                  <>
                    <button 
                      onClick={() => handleCheckOut(selectedVisitor._id)}
                      className="bg-primary hover:bg-primary/95 text-textMain px-6 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Check Out Now
                    </button>
                    {selectedVisitor.invoiceGenerated ? (
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] whitespace-nowrap">
                        Invoice Ready
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleOpenInvoiceModal(selectedVisitor)}
                        className="bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500 hover:text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
                      >
                        Bill Pass
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] inline-flex items-center gap-2 whitespace-nowrap">
                      <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                      Checkout Finalized
                    </div>
                    {selectedVisitor.invoiceGenerated ? (
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] whitespace-nowrap">
                        Invoice Ready
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleOpenInvoiceModal(selectedVisitor)}
                        className="bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500 hover:text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
                      >
                        Bill Pass
                      </button>
                    )}
                    <button 
                      onClick={() => handleArchive(selectedVisitor._id)}
                      className="bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white p-4 rounded-xl transition-all"
                      title="Archive Log"
                    >
                      <Archive size={14} />
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setSelectedVisitor(null)}
                  className="px-6 py-4 bg-surface border border-borderSubtle text-textMain rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-background transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Visitor Invoice Modal */}
      <AnimatePresence>
        {showInvoiceModal && invoiceVisitor && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-background/90 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-primary/20 rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-borderSubtle">
                <h3 className="text-lg font-bold text-textMain uppercase tracking-tight flex items-center gap-2">
                  <FileText className="text-primary" /> Bill Visitor Pass
                </h3>
                <button
                  onClick={() => { setShowInvoiceModal(false); setInvoiceVisitor(null); }}
                  className="p-1 hover:bg-white/5 rounded-full text-textMuted hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-background rounded-2xl border border-borderSubtle space-y-2">
                  <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Visitor Details</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-textMain text-sm">{invoiceVisitor.name}</span>
                    <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded uppercase font-black tracking-widest">{invoiceVisitor.purpose}</span>
                  </div>
                  <p className="text-xs text-textMuted font-medium">{invoiceVisitor.email}</p>
                </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary">Daily Rate (INR)</label>
                    <input
                      type="number"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      className="w-full bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-textMain focus:border-primary focus:outline-none transition-all placeholder:text-textMuted/30 font-black text-lg"
                      placeholder="450"
                    />
                                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary">Number of Days</label>
                    <input
                      type="number"
                      min="1"
                      value={numberOfDays}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNumberOfDays(val === '' ? '' : Math.max(1, parseInt(val) || 1));
                      }}
                      className="w-full bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-textMain focus:border-primary focus:outline-none transition-all placeholder:text-textMuted/30 font-black text-lg"
                      placeholder="1"
                    />
                  </div>
                </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-primary">Service Start Date</label>
                    <input
                      type="date"
                      value={serviceDate}
                      onChange={(e) => setServiceDate(e.target.value)}
                      className="w-full bg-background border border-borderSubtle rounded-2xl px-4 py-3 text-textMain focus:border-primary focus:outline-none transition-all font-bold text-sm"
                    />
                    <p className="text-[9px] text-textMuted">
                      {days > 1 && serviceDate ? (
                        <span className="text-primary font-bold">
                          Billed to: {(() => {
                            const d = new Date(serviceDate);
                            d.setDate(d.getDate() + (days - 1));
                            return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                          })()}
                        </span>
                      ) : (
                        'Date client used the pass'
                      )}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary">Date of Issue</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full bg-background border border-borderSubtle rounded-2xl px-4 py-3 text-textMain focus:border-primary focus:outline-none transition-all font-bold text-sm"
                    />
                    <p className="text-[9px] text-textMuted">Invoice issue date</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-background rounded-2xl border border-borderSubtle">
                  <input
                    type="checkbox"
                    id="applyGst"
                    checked={applyGst}
                    onChange={(e) => setApplyGst(e.target.checked)}
                    className="w-5 h-5 rounded border-borderSubtle text-primary focus:ring-primary cursor-pointer bg-transparent"
                  />
                  <label htmlFor="applyGst" className="text-xs font-bold text-textMain cursor-pointer select-none">
                    Apply 18% GST (9% CGST + 9% SGST)
                  </label>
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-2">
                  <div className="flex justify-between text-xs text-textMuted font-medium">
                    <span>Base Fare {days > 1 ? `(₹${Number(invoiceAmount || 0).toLocaleString()} x ${days} Days)` : ''}:</span>
                    <span>₹{Number((Number(invoiceAmount || 0) * days).toFixed(2)).toLocaleString()}</span>
                  </div>
                  {applyGst && (
                    <>
                      <div className="flex justify-between text-xs text-textMuted font-medium">
                        <span>CGST @ 9%:</span>
                        <span>₹{((Number(invoiceAmount || 0) * days) * 0.09).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-textMuted font-medium">
                        <span>SGST @ 9%:</span>
                        <span>₹{((Number(invoiceAmount || 0) * days) * 0.09).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="h-px bg-borderSubtle opacity-30 my-2"></div>
                  <div className="flex justify-between text-sm font-black text-textMain">
                    <span>Total Amount:</span>
                    <span>
                      ₹{applyGst 
                        ? ((Number(invoiceAmount || 0) * days) * 1.18).toFixed(2) 
                        : (Number(invoiceAmount || 0) * days).toFixed(2)
                      }
                    </span>
                  </div>
                </div>               </div>

                <div className="pt-4 flex gap-4">
                  <button
                    onClick={() => { setShowInvoiceModal(false); setInvoiceVisitor(null); }}
                    className="flex-1 bg-surface border border-borderSubtle text-textMain py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateInvoice}
                    className="flex-1 bg-primary text-textMain py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Generate Invoice
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Notification Modal */}
      <AnimatePresence>
        {notification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-borderSubtle rounded-3xl p-8 max-w-sm w-full shadow-2xl teal-glow relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-1.5 ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              
              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${notification.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {notification.type === 'success' ? <CheckCircle size={32} /> : <ShieldCheck size={32} className="rotate-180" />}
                </div>
                
                <h3 className="text-xl font-bold text-textMain mb-2">
                  {notification.type === 'success' ? 'Success' : 'Attention'}
                </h3>
                <p className="text-textMuted text-sm leading-relaxed mb-8">
                  {notification.message}
                </p>
                
                <button 
                  onClick={() => setNotification(null)}
                  className="w-full bg-primary hover:bg-primary/90 text-textMain py-3 rounded-xl font-black uppercase tracking-widest transition-all"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Passes;
