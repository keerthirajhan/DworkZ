import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Clock, Camera, CheckCircle, ShieldCheck, LogOut, ArrowRight, Phone, Archive, Eye, X, UserCircle, RefreshCw, Mail, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

const Visitors = () => {
  const [activeTab, setActiveTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    personToVisit: '',
    purpose: 'Meeting',
    email: '',
    aadharNumber: '',
    otp: ''
  });

  const [notification, setNotification] = useState(null);
  const [selectedVisitor, setSelectedVisitor] = useState(null); // Detailed view state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceVisitor, setInvoiceVisitor] = useState(null);
  const [invoiceAmount, setInvoiceAmount] = useState('450');
  const [applyGst, setApplyGst] = useState(true);
  const [serviceDate, setServiceDate] = useState('');
  const [issueDate, setIssueDate] = useState('');

  const handleOpenInvoiceModal = (visitor) => {
    setInvoiceVisitor(visitor);
    setInvoiceAmount('450');
    setApplyGst(true);
    // Default issueDate to today, serviceDate to today
    const today = new Date().toISOString().split('T')[0];
    setServiceDate(today);
    setIssueDate(today);
    setShowInvoiceModal(true);
  };

  const handleGenerateInvoice = async () => {
    if (!invoiceVisitor) return;
    try {
      const res = await api.post(`/api/v1/invoices/visitor/${invoiceVisitor._id}`, {
        amount: Number(invoiceAmount) || 0,
        applyGst,
        serviceDate,
        issueDate
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

  const [capturedImage, setCapturedImage] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    setIsCameraOpen(true);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setNotification({ type: 'error', message: 'Could not access camera. Please check browser permissions.' });
      setIsCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/visitors');
      setLogs(res.data.data.filter(v => !['Day Pass', 'Weekly Pass', 'Hourly Pass'].includes(v.purpose)));
    } catch (err) {
      console.error('Error fetching visitor logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSendOtp = async () => {
    // Basic Field Validation
    if (!formData.name?.trim()) {
      setNotification({ type: 'error', message: 'Full Name is required before sending OTP.' });
      return;
    }
    if (!formData.personToVisit?.trim()) {
      setNotification({ type: 'error', message: 'Please specify whom you are here to visit.' });
      return;
    }
    if (!formData.aadharNumber || formData.aadharNumber.length !== 12) {
      setNotification({ type: 'error', message: 'A valid 12-digit Aadhar number is required.' });
      return;
    }
    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      setNotification({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    try {
      const res = await api.post('/api/v1/visitors/kiosk-send-otp', {
        email: formData.email
      });
      setOtpSent(true);
      if (res.data.devOtp) {
        setFormData(prev => ({ ...prev, otp: res.data.devOtp }));
        setNotification({ 
          type: 'success', 
          message: `OTP Generated! (Dev Mode Bypass: Automatically filled OTP for you: ${res.data.devOtp})` 
        });
      } else {
        setNotification({ type: 'success', message: 'OTP has been sent to your email!' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Error sending OTP: ' + (err.response?.data?.error || err.message) });
    }
  };

  const handleVerifyOtp = async () => {
    try {
      await api.post('/api/v1/visitors/kiosk-verify-otp', {
        email: formData.email,
        otp: formData.otp
      });
      setOtpVerified(true);
      setNotification({ type: 'success', message: 'OTP Verified Successfully!' });
    } catch (err) {
      setNotification({ type: 'error', message: 'Verification Failed: ' + (err.response?.data?.error || err.message) });
    }
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!otpVerified) {
      setNotification({ type: 'error', message: 'Please verify OTP before submitting.' });
      return;
    }
    try {
      await api.post('/api/v1/visitors', {
        name: formData.name,
        companyName: formData.companyName,
        personToVisit: formData.personToVisit,
        purpose: formData.purpose,
        email: formData.email,
        aadharNumber: formData.aadharNumber,
        idProofUrl: capturedImage,
        isOtpVerified: true
      });
      setFormData({ name: '', companyName: '', personToVisit: '', purpose: 'Meeting', email: '', aadharNumber: '', otp: '' });
      setCapturedImage(null);
      setOtpSent(false);
      setOtpVerified(false);
      setActiveTab('logs');
      fetchLogs();
      setNotification({ type: 'success', message: 'Welcome to DworkZ! Check-in Successful.' });
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
    l.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.personToVisit?.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-textMain uppercase tracking-tight">
            Visitor Management
          </h1>
          <p className="text-textMuted mt-1">Front desk check-in kiosk and visitor logs.</p>
        </div>

        <div className="bg-surface border border-borderSubtle p-1 rounded-xl flex gap-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'logs' ? 'bg-primary text-textMain shadow-lg' : 'text-textMuted hover:text-textMain'}`}
          >
            Visitor Logs
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
                      <th className="px-6 py-4 font-medium">ID Proof (Aadhar)</th>
                      <th className="px-6 py-4 font-medium">Visiting</th>
                      <th className="px-6 py-4 font-medium">Purpose</th>
                      <th className="px-6 py-4 font-medium">Time In</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderSubtle">
                    {loading ? (
                      <tr><td colSpan={7} className="px-6 py-10 text-center text-textMuted">Loading...</td></tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-10 text-center text-textMuted">No visitor records found.</td></tr>
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
                          <div className="flex items-center gap-1 mt-0.5">
                            <ShieldCheck size={10} className="text-emerald-400" />
                            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">OTP Verified</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-textMain font-medium">{log.personToVisit}</div>
                          <div className="text-[10px] text-textMuted uppercase font-bold tracking-tighter">Host</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${getPurposeStyle(log.purpose)}`}>
                            {log.purpose}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-textMuted font-medium">
                            <Clock size={14} className="text-primary" />
                            {new Date(log.timeIn).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {log.status === 'Checked In' ? (
                            <span className="px-3 py-1.5 bg-teal-500/10 text-teal-400 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-max border border-teal-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" /> {log.status}
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 bg-surface border border-borderSubtle text-textMuted rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-max">
                              <CheckCircle size={14} /> Completed
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">Whom to Visit <span className="text-rose-400">*</span></label>
                  <input
                    required
                    value={formData.personToVisit}
                    onChange={(e) => setFormData({ ...formData, personToVisit: e.target.value })}
                    type="text"
                    className="w-full bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-textMain focus:border-primary focus:outline-none transition-all placeholder:text-textMuted/30"
                    placeholder="Client or staff name..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">Purpose of Visit <span className="text-rose-400">*</span></label>
                  <select
                    required
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-textMain focus:border-primary focus:outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="Meeting">📅 Scheduled Meeting</option>
                    <option value="Vendor / Maintenance">🔧 Vendor / Maintenance</option>
                    <option value="Others">💡 Others</option>
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
                  <div className="flex gap-3">
                    <input
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      type="email"
                      className="w-full bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-textMain focus:border-primary focus:outline-none transition-all placeholder:text-textMuted/30"
                      placeholder="visitor@example.com"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-textMain px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                    >
                      {otpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">
                    OTP Verification <span className="text-rose-400">*</span>
                    {otpVerified && <span className="ml-2 text-emerald-400">✓ Verified</span>}
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={formData.otp}
                      onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                      disabled={!otpSent || otpVerified}
                      className="w-full bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-textMain focus:border-primary focus:outline-none transition-all disabled:opacity-30 placeholder:text-textMuted/30 font-mono tracking-[0.3em]"
                      placeholder={otpSent ? '123456' : 'Send OTP first'}
                      maxLength={6}
                    />
                    {otpSent && !otpVerified && (
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-textMain px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                      >
                        Verify
                      </button>
                    )}
                    {otpVerified && (
                      <div className="flex items-center justify-center px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                        <ShieldCheck size={20} className="text-emerald-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-borderSubtle/30">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary block mb-4">Identity Capture (Optional)</label>
                
                {!isCameraOpen && !capturedImage && (
                  <div 
                    onClick={startCamera}
                    className="border-2 border-dashed border-borderSubtle/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer group bg-background/30"
                  >
                    <div className="w-14 h-14 bg-surface border border-borderSubtle rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xl group-hover:border-primary/30">
                      <Camera className="text-textMuted group-hover:text-primary transition-colors" size={24} />
                    </div>
                    <p className="text-sm font-bold text-textMain mb-1">Open Camera</p>
                    <p className="text-xs text-textMuted uppercase tracking-tighter">Click to capture entry photo for record</p>
                  </div>
                )}

                {isCameraOpen && (
                  <div className="relative rounded-3xl overflow-hidden border-2 border-primary shadow-2xl shadow-primary/20 max-w-md mx-auto">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full aspect-video object-cover"
                    />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
                      <button 
                        type="button"
                        onClick={capturePhoto}
                        className="bg-primary text-textMain px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl"
                      >
                        Capture
                      </button>
                      <button 
                        type="button"
                        onClick={stopCamera}
                        className="bg-surface border border-borderSubtle text-textMain px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {capturedImage && (
                  <div className="relative rounded-3xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl shadow-emerald-500/10 max-w-md mx-auto group">
                    <img src={capturedImage} alt="Captured" className="w-full aspect-video object-cover" />
                    <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        type="button"
                        onClick={() => { setCapturedImage(null); startCamera(); }}
                        className="bg-emerald-500 text-textMain px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest"
                      >
                        Retake Photo
                      </button>
                    </div>
                    <div className="absolute top-2 right-2 bg-emerald-500 text-textMain p-1 rounded-full">
                      <CheckCircle size={16} />
                    </div>
                  </div>
                )}

                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={!otpVerified}
                  className="bg-primary hover:bg-primary/90 text-textMain px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-2xl shadow-primary/40 flex items-center gap-3 text-sm disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
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
            className="bg-surface border border-primary/20 rounded-3xl sm:rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col lg:flex-row max-h-[90vh] overflow-y-auto lg:overflow-hidden"
          >
            {/* Identity Card */}
            <div className="lg:w-5/12 bg-background p-5 sm:p-10 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-borderSubtle relative">
              <div className="absolute top-6 left-6">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getPurposeStyle(selectedVisitor.purpose)}`}>
                  {selectedVisitor.purpose}
                </span>
              </div>
              
              <div className="w-full aspect-square rounded-3xl overflow-hidden shadow-2xl bg-surface border border-borderSubtle group relative">
                {selectedVisitor.idProofUrl ? (
                  <img src={selectedVisitor.idProofUrl} alt="Visitor" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-textMuted opacity-20">
                    <Camera size={64} />
                    <p className="text-[10px] uppercase font-black mt-4">Proof Missing</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                  <p className="text-xs text-white font-bold uppercase tracking-widest">Authorized Entry Capture</p>
                </div>
              </div>

              <div className="mt-8 text-center">
                <h2 className="text-3xl font-black text-textMain uppercase tracking-tight">{selectedVisitor.name}</h2>
                <p className="text-primary font-bold text-sm uppercase tracking-widest mt-3">{selectedVisitor.companyName || 'Individual Visitor'}</p>
              </div>
            </div>

            {/* Visit Dossier */}
            <div className="lg:w-7/12 p-5 sm:p-10 space-y-6 sm:space-y-10 overflow-y-auto">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-textMuted mb-6">Security Credentials</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-10">
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-textMuted uppercase font-bold">Visiting Official</p>
                      <p className="text-textMain font-bold text-lg">{selectedVisitor.personToVisit}</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-textMuted uppercase font-bold">Aadhar ID</p>
                      <p className="text-textMain font-mono text-lg">{selectedVisitor.aadharLast4 ? `****${selectedVisitor.aadharLast4}` : 'N/A'}</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-textMuted uppercase font-bold">Check-In Time</p>
                      <div className="flex items-center gap-2 text-textMain font-bold">
                        <Clock size={16} className="text-primary" />
                        {new Date(selectedVisitor.timeIn).toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-textMuted uppercase font-bold">Session Status</p>
                      <div className="flex items-center gap-2 text-textMain font-bold">
                        {selectedVisitor.timeOut ? (
                          <span className="text-emerald-400">Completed at {new Date(selectedVisitor.timeOut).toLocaleTimeString()}</span>
                        ) : (
                          <span className="text-primary animate-pulse">Live Tracking</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedVisitor(null)} className="p-2 hover:bg-white/5 rounded-full text-textMuted hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="h-px bg-borderSubtle w-full opacity-50"></div>

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-textMuted mb-6">Contact & Verification</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="flex items-center gap-4 p-4 bg-background rounded-2xl border border-borderSubtle">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-textMuted uppercase font-bold">Email</p>
                      <p className="text-xs text-textMain font-bold truncate w-40">{selectedVisitor.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-background rounded-2xl border border-borderSubtle">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-textMuted uppercase font-bold">OTP</p>
                      <p className="text-xs text-emerald-400 font-black uppercase tracking-widest">Verified</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                {selectedVisitor.status === 'Checked In' ? (
                  <div className="flex flex-1 gap-4">
                    <button 
                      onClick={() => handleCheckOut(selectedVisitor._id)}
                      className="flex-1 bg-primary text-textMain py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Check Out Now
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-1 gap-4">
                    <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-5 rounded-2xl font-black uppercase tracking-widest text-xs text-center flex items-center justify-center gap-2 whitespace-nowrap">
                      <CheckCircle size={18} className="flex-shrink-0" />
                      <span className="leading-none whitespace-nowrap">Checkout Finalized</span>
                    </div>
                    <button 
                      onClick={() => handleArchive(selectedVisitor._id)}
                      className="bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white px-6 py-5 rounded-2xl transition-all"
                      title="Archive Log"
                    >
                      <Archive size={20} />
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => setSelectedVisitor(null)}
                  className="px-12 bg-surface border border-borderSubtle text-textMain py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-background transition-colors"
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
              className="bg-surface border border-primary/20 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
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

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">Base Amount (INR)</label>
                  <input
                    type="number"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    className="w-full bg-background border border-borderSubtle rounded-2xl px-5 py-4 text-textMain focus:border-primary focus:outline-none transition-all placeholder:text-textMuted/30 font-black text-lg"
                    placeholder="450"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary">Service Date</label>
                    <input
                      type="date"
                      value={serviceDate}
                      onChange={(e) => setServiceDate(e.target.value)}
                      className="w-full bg-background border border-borderSubtle rounded-2xl px-4 py-3 text-textMain focus:border-primary focus:outline-none transition-all font-bold text-sm"
                    />
                    <p className="text-[9px] text-textMuted">Date client used the pass</p>
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
                    <span>Base Fare:</span>
                    <span>₹{Number(invoiceAmount || 0).toLocaleString()}</span>
                  </div>
                  {applyGst && (
                    <>
                      <div className="flex justify-between text-xs text-textMuted font-medium">
                        <span>CGST @ 9%:</span>
                        <span>₹{(Number(invoiceAmount || 0) * 0.09).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-textMuted font-medium">
                        <span>SGST @ 9%:</span>
                        <span>₹{(Number(invoiceAmount || 0) * 0.09).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="h-px bg-borderSubtle opacity-30 my-2"></div>
                  <div className="flex justify-between text-sm font-black text-textMain">
                    <span>Total Amount:</span>
                    <span>
                      ₹{applyGst 
                        ? (Number(invoiceAmount || 0) * 1.18).toFixed(2) 
                        : Number(invoiceAmount || 0).toFixed(2)
                      }
                    </span>
                  </div>
                </div>

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

export default Visitors;
