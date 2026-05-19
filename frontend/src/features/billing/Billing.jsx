import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Send, Download, CheckCircle, AlertCircle, Clock, Trash2, Mail, Loader2, X, ShieldCheck, Printer, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import AlertModal from '../../components/AlertModal';

// Helper to convert number to words
const numberToWords = (num) => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const inWords = (n) => {
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit !== 0 ? ' ' + a[digit] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
    return inWords(Math.floor(num)) + 'Only';
  };
  return 'INR ' + inWords(Math.floor(num));
};

const Billing = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenModal, setShowGenModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  const showAlert = (title, message, type = 'success') => {
    setAlertConfig({ isOpen: true, title, message, type });
  };
  
  const printRef = useRef();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('dworkz_token');
      const res = await axios.get('http://localhost:5000/api/v1/invoices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(res.data.data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const showNotify = (message, type = 'success') => {
    showAlert(type === 'success' ? 'Success' : 'Error', message, type);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('dworkz_token');
      const res = await axios.post('http://localhost:5000/api/v1/invoices/generate', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotify(res.data.message);
      setShowGenModal(false);
      fetchInvoices();
    } catch (err) {
      showNotify(err.response?.data?.error || 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendEmail = async (id) => {
    try {
      const token = localStorage.getItem('dworkz_token');
      await axios.post(`http://localhost:5000/api/v1/invoices/${id}/send`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotify('Tax invoice delivered successfully.');
      fetchInvoices();
    } catch (err) {
      showNotify('Email trigger failed.', 'error');
    }
  };

  const handleMarkAsPaid = async (id) => {
    try {
      const token = localStorage.getItem('dworkz_token');
      await axios.post(`http://localhost:5000/api/v1/invoices/${id}/mark-paid`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotify('Payment received and invoice updated.');
      fetchInvoices();
    } catch (err) {
      showNotify('Action failed.', 'error');
    }
  };

  const handleMarkInvoiceSent = async (id) => {
    try {
      const token = localStorage.getItem('dworkz_token');
      await axios.post(`http://localhost:5000/api/v1/invoices/${id}/mark-sent`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotify('Invoice marked as manually sent.');
      fetchInvoices();
    } catch (err) {
      showNotify('Action failed.', 'error');
    }
  };

  const handleDeleteInvoice = async (id) => {
    try {
      const token = localStorage.getItem('dworkz_token');
      await axios.delete(`http://localhost:5000/api/v1/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotify('Invoice moved to archives.');
      fetchInvoices();
    } catch (err) {
      showNotify('Deletion failed.', 'error');
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    const originalTitle = document.title;
    
    // Set professional filename for PDF saving
    document.title = `Invoice_${selectedInvoice?.invoiceId || 'DworkZ'}`;
    
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { margin: 0; }
        body { padding: 1.5cm; }
      }
    `;
    document.head.appendChild(style);

    document.body.innerHTML = printContent;
    window.print();
    
    document.body.innerHTML = originalContent;
    document.head.removeChild(style);
    document.title = originalTitle;
    window.location.reload(); // Refresh to restore React state
  };

  const openPreview = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPreview(true);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Paid': return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-max border border-emerald-500/20"><CheckCircle size={12}/> Paid</span>;
      case 'Pending': return <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-max border border-blue-500/20"><Clock size={12}/> Pending</span>;
      case 'Overdue': return <span className="px-3 py-1 bg-rose-500/10 text-rose-400 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-max border border-rose-500/20"><AlertCircle size={12}/> Overdue</span>;
      default: return null;
    }
  };

  const totalCollected = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
  const pendingPayments = invoices.filter(i => i.status === 'Pending').reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
  const overdueAmount = invoices.filter(i => i.status === 'Overdue').reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);

  const filteredInvoices = invoices.filter(i => 
    i.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.clientId?.companyName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-8 relative">
      
      {/* Alerts are now handled by AlertModal at the bottom */}

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-textMain uppercase tracking-tight mb-2">Billing & Payments</h1>
          <p className="text-textMuted max-w-lg">Manage professional Billing Invoices, track revenue, and automate your collection workflow.</p>
        </div>
        <button onClick={() => setShowGenModal(true)} className="bg-primary text-textMain px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3">
          <FileText size={16} /> Run Monthly Billing
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-surface border border-borderSubtle p-8 rounded-[32px] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-emerald-500/10 transition-all"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-textMuted mb-1">Total Revenue</p>
          <p className="text-3xl font-black text-textMain tracking-tight">₹{totalCollected.toLocaleString()}</p>
        </div>
        <div className="bg-surface border border-borderSubtle p-8 rounded-[32px] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-all"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-textMuted mb-1">Pending Collections</p>
          <p className="text-3xl font-black text-textMain">₹{pendingPayments.toLocaleString()}</p>
        </div>
        <div className="bg-surface border border-borderSubtle p-8 rounded-[32px] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-rose-500/10 transition-all"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-textMuted mb-1">Overdue Amount</p>
          <p className="text-3xl font-black text-textMain">₹{overdueAmount.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-surface border border-borderSubtle rounded-[32px] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-borderSubtle">
           <div className="relative group max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-primary transition-colors" size={18} />
            <input type="text" placeholder="Search by Invoice # or Client..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-background border border-borderSubtle text-sm rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-primary transition-all font-bold text-textMain" />
          </div>
        </div>
        <table className="w-full text-left text-sm text-textMain">
          <thead className="bg-background/50 border-b border-borderSubtle text-textMuted uppercase font-black tracking-widest text-[10px]">
            <tr>
              <th className="px-8 py-5">Billing Invoice #</th>
              <th className="px-8 py-5">Company / Client</th>
              <th className="px-8 py-5">Amount (INR)</th>
              <th className="px-8 py-5">Status</th>
              <th className="px-8 py-5 text-right">Systematic Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderSubtle/30">
            {loading ? (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-textMuted font-black uppercase tracking-widest text-[10px]">Syncing Billing Ledger...</td></tr>
            ) : filteredInvoices.length === 0 ? (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-textMuted">No billing records found.</td></tr>
            ) : filteredInvoices.map(invoice => (
              <tr key={invoice._id} className="hover:bg-white/5 transition-all group">
                <td className="px-8 py-6">
                  <div className="font-bold text-primary text-base underline underline-offset-4 cursor-pointer" onClick={() => openPreview(invoice)}>{invoice.invoiceId}</div>
                </td>
                <td className="px-8 py-6">
                  <div className="font-bold text-textMain uppercase tracking-tight">{invoice.clientId?.companyName || invoice.bookingId?.clientName || 'Visitor'}</div>
                </td>
                <td className="px-8 py-6">
                  <div className="font-black text-textMain text-lg">₹{Number(invoice.totalAmount).toLocaleString()}</div>
                  <div className="text-[10px] uppercase font-black text-textMuted tracking-widest mt-0.5">{invoice.billingPeriod}</div>
                </td>
                <td className="px-8 py-6">{getStatusBadge(invoice.status)}</td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => openPreview(invoice)} 
                      className="bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-textMain p-3 rounded-xl transition-all"
                      title="Direct Print Invoice"
                    >
                      <Printer size={18} />
                    </button>
                    {invoice.status !== 'Paid' && (
                      <button 
                        onClick={() => handleMarkAsPaid(invoice._id)} 
                        className="bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 text-emerald-400 hover:text-white p-3 rounded-xl transition-all"
                        title="Mark as Paid"
                      >
                        <ShieldCheck size={18} />
                      </button>
                    )}
                    {!invoice.sent && (
                      <button 
                        onClick={() => handleMarkInvoiceSent(invoice._id)} 
                        className="bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-all text-textMuted hover:text-white border border-borderSubtle"
                        title="Mark Manually Sent"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                    <button onClick={() => handleDeleteInvoice(invoice._id)} className="bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white p-3 rounded-xl transition-all" title="Move to Archives"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Professional Tax Invoice Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedInvoice && (() => {
          return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                     <h2 className="font-black uppercase tracking-[4px] text-gray-400 text-xs">Billing Invoice Preview</h2>
                     <button onClick={() => setShowPreview(false)} className="bg-white shadow-sm border border-gray-100 hover:bg-gray-100 p-2 rounded-xl transition-colors"><X size={20} className="text-gray-400" /></button>
                  </div>

                  <div className="p-10 overflow-y-auto custom-scrollbar flex-1" ref={printRef}>
                    <div className="border border-black bg-white">
                           <div className="text-sm font-bold text-gray-800 p-2 border-b border-black">DworkZ - {selectedInvoice.isGuest ? 'Visitor Session' : 'Client Invoice'}</div>
                      <div className="grid grid-cols-2 border-b border-black">
                        <div className="p-4 border-r border-black space-y-3">
                           <div className="items-center gap-3">
                              <h3 className="font-black text-lg text-gray-800 leading-none">DworkZ</h3>
                           </div>
                           <div className="text-[10px] leading-relaxed text-gray-600 font-bold">14/71, East TV Swamy Road<br/>Subramaniya Puram Road, R S Puram<br/>Coimbatore, Tamil Nadu<br/>PIN Code: 641002<br/>Email: info.dworkzcbe@gmail.com<br/>GSTIN: 33AAZFD3031H1ZG</div>
                        </div>
                        <div className="flex flex-col h-full">
                           <div className="grid grid-cols-2 border-b border-black flex-1">
                              <div className="p-3 border-r border-black h-full"><p className="text-[9px] font-black uppercase text-gray-400">Invoice No.</p><p className="font-black text-xs text-gray-800 mt-1">{selectedInvoice.invoiceId}</p></div>
                              <div className="p-3 h-full"><p className="text-[9px] font-black uppercase text-gray-400">Dated</p><p className="font-black text-xs text-gray-800 mt-1">{new Date(selectedInvoice.dateGenerated).toLocaleDateString()}</p></div>
                           </div>
                           <div className="p-3 flex-1">
                             <p className="text-[9px] font-black uppercase text-gray-400">Terms of Payment</p>
                             <p className="font-black text-xs text-gray-800 mt-1">
                               {(() => {
                                 if (selectedInvoice.status === 'Paid') {
                                   return "Paid in Full / One-Time";
                                 }
                                 const generated = new Date(selectedInvoice.dateGenerated);
                                 const due = new Date(selectedInvoice.dueDate);
                                 const diffDays = Math.ceil(Math.abs(due - generated) / (1000 * 60 * 60 * 24));
                                 
                                 if (selectedInvoice.isGuest || selectedInvoice.clientId?.planType === 'Daily' || selectedInvoice.billingPeriod?.toLowerCase().includes('onboarding') || selectedInvoice.billingPeriod?.toLowerCase().includes('upgrade') || selectedInvoice.billingPeriod?.toLowerCase().includes('one-time') || diffDays <= 1) {
                                   return "Due on Receipt (One-Time)";
                                 }
                                 return `${diffDays} Days (Due: ${due.toLocaleDateString()})`;
                               })()}
                             </p>
                           </div>
                        </div>
                      </div>

                      <div className="border-b border-black">
                        <div className="p-4"><p className="text-[9px] font-black uppercase text-gray-400 mb-2">BILL TO</p><h4 className="font-black text-sm text-gray-800 uppercase">{selectedInvoice.clientId?.companyName || selectedInvoice.bookingId?.clientName}</h4><div className="text-[10px] text-gray-600 font-bold mt-1 leading-relaxed">{selectedInvoice.clientId?.billingDetails?.billingAddress || selectedInvoice.bookingId?.guestDetails?.phone || 'N/A'}{selectedInvoice.clientId?.billingDetails?.gstNumber && <><br/>GSTIN: {selectedInvoice.clientId.billingDetails.gstNumber}</>}</div></div>
                      </div>

                      <table className="w-full text-left text-[10px] border-b border-black">
                         <thead><tr className="font-black uppercase tracking-widest text-center border-b border-black"><td className="p-2 border-r border-black w-12 whitespace-nowrap">S.No.</td><td className="p-2 border-r border-black">Particulars</td><td className="p-2 border-r border-black w-32">Type</td><td className="p-2 border-r border-black w-32">Rate</td><td className="p-2 w-32">Amount</td></tr></thead>
                        <tbody className="font-bold text-gray-700">
                          <tr className="h-40 align-top">
                            <td className="p-4 border-r border-black text-center">1</td>
                            <td className="p-4 border-r border-black">
                              <div className="font-black text-gray-800 text-xs mb-1">
                                {selectedInvoice.isGuest ? 'Meeting Room Booking' : selectedInvoice.clientId?.planType === 'Yearly' ? 'Annual Rent Income-Space' : 'Rent Income-Space'}
                              </div>
                              <div className="text-[9px] italic text-gray-400">
                                {(() => {
                                  if (selectedInvoice.isGuest) {
                                    return 'One-time session reservation';
                                  }
                                  const plan = selectedInvoice.clientId?.planType || 'Monthly';
                                  if (plan === 'Daily') {
                                    return `Day pass rental charges for ${selectedInvoice.billingPeriod}`;
                                  }
                                  if (plan === 'Yearly') {
                                    try {
                                      const parts = selectedInvoice.billingPeriod.split(' ');
                                      if (parts.length === 2) {
                                        const startMonth = parts[0];
                                        const startYear = parseInt(parts[1]);
                                        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                                        const monthIndex = months.findIndex(m => m.toLowerCase().startsWith(startMonth.toLowerCase()));
                                        
                                        if (monthIndex !== -1) {
                                          const startDate = new Date(startYear, monthIndex, 1);
                                          const endDate = new Date(startDate.getFullYear() + 1, startDate.getMonth() - 1, 1);
                                          
                                          const formatMonthYear = (date) => {
                                            const m = months[date.getMonth()];
                                            const y = date.getFullYear().toString().slice(-2);
                                            return `${m} ${y}`;
                                          };
                                          
                                          return `Annual workspace rental charges for ${formatMonthYear(startDate)} to ${formatMonthYear(endDate)}`;
                                        }
                                      }
                                    } catch (e) {
                                      console.error("Error formatting yearly period:", e);
                                    }
                                    return `Annual workspace rental charges for ${selectedInvoice.billingPeriod}`;
                                  }
                                  return `Monthly Workspace Rental Charges for ${selectedInvoice.billingPeriod}`;
                                })()}
                              </div>
                            </td>
                            <td className="p-4 border-r border-black text-center">{selectedInvoice.isGuest ? 'Service' : 'Rental'}</td>
                            <td className="p-4 border-r border-black text-right">₹{selectedInvoice.baseAmount.toLocaleString()}</td>
                            <td className="p-4 text-right">₹{selectedInvoice.baseAmount.toLocaleString()}</td>
                          </tr>
                          {selectedInvoice.overageAmount > 0 && (
                            <tr><td className="p-4 border-r border-black text-center">2</td><td className="p-4 border-r border-black"><div className="font-black text-gray-800 text-xs mb-1">Utilization Overage</div><div className="text-[9px] italic text-gray-400">Meeting Room Usage Beyond Quota</div></td><td className="p-4 border-r border-black text-center">Service</td><td className="p-4 border-r border-black text-right">₹{selectedInvoice.overageAmount.toLocaleString()}</td><td className="p-4 text-right">₹{selectedInvoice.overageAmount.toLocaleString()}</td></tr>
                          )}
                          {selectedInvoice.cgstAmount > 0 && (
                             <tr className="border-t border-black font-bold text-xs"><td colSpan={4} className="p-2 border-r border-black text-right uppercase">Add: CGST @ 9%</td><td className="p-2 text-right">₹{selectedInvoice.cgstAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td></tr>
                          )}
                          {selectedInvoice.sgstAmount > 0 && (
                             <tr className="border-t border-black font-bold text-xs"><td colSpan={4} className="p-2 border-r border-black text-right uppercase">Add: SGST @ 9%</td><td className="p-2 text-right">₹{selectedInvoice.sgstAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td></tr>
                          )}
                          <tr className="border-t border-black font-black text-xs"><td colSpan={4} className="p-3 border-r border-black text-right uppercase tracking-widest">Total Amount</td><td className="p-3 text-right text-base text-[#00bfa5]">₹{selectedInvoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td></tr>
                        </tbody>
                      </table>
                      <div className="p-4 border-b border-black"><p className="text-[9px] font-black uppercase text-gray-400 mb-1">Amount Chargeable (in words)</p><p className="font-black text-xs text-gray-800 uppercase">{numberToWords(selectedInvoice.totalAmount)}</p></div>
                      <div className="grid grid-cols-2">
                        <div className="p-4 border-r border-black space-y-1"><p className="text-[9px] font-black uppercase text-gray-400 mb-2">Company's Bank Details</p><p className="text-[10px] font-bold text-gray-700">A/c Holder: <span className="font-black text-gray-900">DworkZ</span></p><p className="text-[10px] font-bold text-gray-700">A/c No.: <span className="font-black text-gray-900">50200118437552</span></p><p className="text-[10px] font-bold text-gray-700">A/c Type: <span className="font-black text-gray-900">Current Account</span></p><p className="text-[10px] font-bold text-gray-700">IFS Code: <span className="font-black text-gray-900">HDFC0005651</span></p><p className="text-[10px] font-bold text-gray-700">Branch: <span className="font-black text-gray-900">EAST SAMBANDHAM ROAD R S PURAM</span></p></div>
                        <div className="p-4 text-right flex flex-col justify-between"><p className="text-[10px] font-black uppercase text-gray-400">for DworkZ</p><div className="space-y-1"><div className="w-16 h-8 bg-[#00bfa5]/10 rounded ml-auto flex items-center justify-center"><CheckCircle size={20} className="text-[#00bfa5]" /></div><p className="font-black text-[10px] uppercase text-gray-800 tracking-widest">Authorised Signatory</p></div></div>
                      </div>
                    </div>
                    <div className="text-center py-4 font-black text-gray-300 uppercase tracking-[10px] text-[8px]">This is a Computer Generated Billing Invoice</div>
                  </div>

                  <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-between gap-4">
                     <button onClick={() => setShowPreview(false)} className="px-8 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-100 transition-all">Cancel View</button>
                      <div className="flex gap-4">
                        <button onClick={handlePrint} className="px-10 py-4 bg-primary text-textMain rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"><Printer size={16} /> Print & Save Invoice</button>
                      </div>
                  </div>
               </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {showGenModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-surface border border-primary/50 rounded-[32px] p-10 max-w-md w-full shadow-2xl text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
               <div className="w-20 h-20 rounded-[28px] bg-primary/10 text-primary flex items-center justify-center mx-auto mb-8 shadow-inner shadow-primary/20"><FileText size={40} /></div>
               <h3 className="text-2xl font-black text-textMain mb-3 uppercase tracking-tight">Run Billing Ledger</h3>
               <p className="text-sm text-textMuted mb-10 leading-relaxed font-medium px-4">Generate official Billing Invoices for all active clients. This run includes utilization overage checks based on contract terms.</p>
               <div className="flex gap-4">
                 <button disabled={generating} onClick={handleGenerate} className="flex-1 bg-primary text-textMain py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50">{generating ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Start Billing Run'}</button>
                 <button onClick={() => setShowGenModal(false)} className="flex-1 bg-background border border-borderSubtle text-textMain py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
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
    </div>
  );
};

export default Billing;
