import React, { useState, useEffect } from 'react';
import { Coffee, Plus, Trash2, Receipt, X, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

const Refreshments = () => {
  const [logs, setLogs] = useState([]);
  const [pending, setPending] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
    client: '',
    itemName: '',
    quantity: 1,
    unitPrice: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Delete confirmation
  const [logToDelete, setLogToDelete] = useState(null);

  // Generate invoice confirmation
  const [clientToInvoice, setClientToInvoice] = useState(null);

  const showNotify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [logsRes, pendingRes, clientsRes] = await Promise.all([
        api.get('/api/v1/refreshments'),
        api.get('/api/v1/refreshments/pending'),
        api.get('/api/v1/clients')
      ]);
      setLogs(logsRes.data.data);
      setPending(pendingRes.data.data);
      setClients(clientsRes.data.data || []);
    } catch (err) {
      console.error('Error fetching refreshments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => setFormData({
    client: '',
    itemName: '',
    quantity: 1,
    unitPrice: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const computedAmount = (Number(formData.quantity) || 0) * (Number(formData.unitPrice) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client) return showNotify('Please select a client.', 'error');
    if (!formData.itemName.trim()) return showNotify('Please enter an item name.', 'error');
    if (!formData.quantity || Number(formData.quantity) <= 0) return showNotify('Quantity must be at least 1.', 'error');
    if (formData.unitPrice === '' || Number(formData.unitPrice) < 0) return showNotify('Please enter a valid price.', 'error');

    try {
      await api.post('/api/v1/refreshments', {
        ...formData,
        quantity: Number(formData.quantity),
        unitPrice: Number(formData.unitPrice)
      });
      showNotify('Refreshment logged successfully');
      setIsModalOpen(false);
      fetchAll();
    } catch (err) {
      showNotify(err.response?.data?.error || 'Failed to log refreshment', 'error');
    }
  };

  const handleDelete = async () => {
    if (!logToDelete) return;
    try {
      await api.delete(`/api/v1/refreshments/${logToDelete._id}`);
      showNotify('Log entry removed');
      setLogToDelete(null);
      fetchAll();
    } catch (err) {
      showNotify(err.response?.data?.error || 'Failed to delete entry', 'error');
      setLogToDelete(null);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!clientToInvoice) return;
    try {
      const res = await api.post('/api/v1/refreshments/generate-invoice', { clientId: clientToInvoice.client._id });
      showNotify(`Invoice ${res.data.data.invoiceId} generated — see it under Billing.`);
      setClientToInvoice(null);
      fetchAll();
    } catch (err) {
      showNotify(err.response?.data?.error || 'Failed to generate invoice', 'error');
      setClientToInvoice(null);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 relative">
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold text-white ${notification.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
            {notification.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-textMain uppercase tracking-tight">Refreshments</h1>
          <p className="text-textMuted text-sm mt-1">Log client consumption and bill it separately from rent</p>
        </div>
        <button onClick={handleOpenModal}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25">
          <Plus size={16} /> Log Refreshment
        </button>
      </div>

      {/* Pending Summary */}
      <div className="bg-surface border border-borderSubtle rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-borderSubtle">
          <h2 className="text-sm font-black text-textMain uppercase tracking-widest">Pending Charges by Client</h2>
        </div>
        {loading ? (
          <div className="p-12 text-center text-textMuted text-sm">Loading...</div>
        ) : pending.length === 0 ? (
          <div className="p-12 text-center">
            <Coffee size={32} className="text-textMuted mx-auto mb-3 opacity-40" />
            <p className="text-textMuted text-sm">No unbilled refreshment charges right now</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {pending.map(p => (
              <div key={p.client._id} className="bg-background/50 border border-borderSubtle rounded-2xl p-5 flex flex-col gap-3">
                <div>
                  <p className="text-sm font-black text-textMain">{p.client.companyName}</p>
                  <p className="text-[10px] text-textMuted mt-0.5">{p.logCount} unbilled item{p.logCount !== 1 ? 's' : ''}</p>
                </div>
                <p className="text-2xl font-black text-primary">₹{p.totalPending.toLocaleString()}</p>
                <button onClick={() => setClientToInvoice(p)}
                  className="flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary hover:text-white text-primary border border-primary/20 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  <Receipt size={14} /> Generate Invoice
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Logs */}
      <div className="bg-surface border border-borderSubtle rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-borderSubtle">
          <h2 className="text-sm font-black text-textMain uppercase tracking-widest">All Entries · {logs.length}</h2>
        </div>
        {loading ? (
          <div className="p-12 text-center text-textMuted text-sm">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Coffee size={32} className="text-textMuted mx-auto mb-3 opacity-40" />
            <p className="text-textMuted text-sm">No refreshments logged yet</p>
          </div>
        ) : logs.map(log => (
          <div key={log._id} className="px-4 sm:px-6 py-4 border-b border-borderSubtle last:border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 group hover:bg-primary/5 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Coffee size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-black text-textMain">{log.itemName} <span className="text-textMuted font-bold">x{log.quantity}</span></p>
                <p className="text-[10px] text-textMuted mt-0.5">
                  {log.client?.companyName || 'Unknown Client'} &nbsp;·&nbsp; {new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {log.notes ? ` · ${log.notes}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
              <p className="text-sm font-black text-textMain">₹{log.amount.toLocaleString()}</p>
              {log.invoiceGenerated ? (
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">Billed</span>
              ) : (
                <button onClick={() => setLogToDelete(log)}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-textMuted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Log Refreshment Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-borderSubtle rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-textMain uppercase tracking-tight">Log Refreshment</h2>
                  <p className="text-xs text-textMuted mt-1">Record what a client consumed</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-textMuted hover:text-textMain"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest">Client</label>
                  <select value={formData.client} onChange={e => setFormData({ ...formData, client: e.target.value })}
                    className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none" required>
                    <option value="">Select a client...</option>
                    {clients.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest">Item</label>
                  <input type="text" value={formData.itemName} onChange={e => setFormData({ ...formData, itemName: e.target.value })}
                    className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none"
                    placeholder="e.g. Coffee, Sandwich" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest">Quantity</label>
                    <input type="number" min="1" step="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest">Price / Unit (₹)</label>
                    <input type="number" min="0" step="0.01" value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                      className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none"
                      placeholder="0.00" required />
                  </div>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[10px] font-black text-textMuted uppercase tracking-widest">Total Amount</span>
                  <span className="text-sm font-black text-primary">₹{computedAmount.toLocaleString()}</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest">Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest">Notes (optional)</label>
                  <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    rows={2} className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none resize-none"
                    placeholder="Any additional context..." />
                </div>
                <div className="flex gap-4 pt-1">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 text-sm font-bold text-textMuted hover:text-textMain transition-colors">Cancel</button>
                  <button type="submit"
                    className="flex-[2] bg-primary hover:bg-primary/90 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25">
                    Log Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {logToDelete && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-rose-500/50 rounded-[32px] p-10 max-w-sm w-full shadow-2xl text-center">
              <div className="w-20 h-20 rounded-[28px] bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-8 shadow-inner shadow-rose-500/20">
                <ShieldAlert size={40} />
              </div>
              <h3 className="text-2xl font-black text-textMain mb-3 uppercase tracking-tight">Remove Entry</h3>
              <p className="text-sm text-textMuted mb-10 leading-relaxed font-medium">
                Delete <span className="text-rose-500 font-bold">"{logToDelete.itemName} x{logToDelete.quantity}"</span> (₹{logToDelete.amount})? This cannot be undone.
              </p>
              <div className="flex gap-4">
                <button onClick={handleDelete}
                  className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 active:scale-95">
                  Confirm Delete
                </button>
                <button onClick={() => setLogToDelete(null)}
                  className="flex-1 bg-background border border-borderSubtle text-textMain py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all active:scale-95">
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Generate Invoice Confirmation */}
      <AnimatePresence>
        {clientToInvoice && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-primary/40 rounded-[32px] p-10 max-w-sm w-full shadow-2xl text-center">
              <div className="w-20 h-20 rounded-[28px] bg-primary/10 text-primary flex items-center justify-center mx-auto mb-8 shadow-inner shadow-primary/20">
                <Receipt size={40} />
              </div>
              <h3 className="text-2xl font-black text-textMain mb-3 uppercase tracking-tight">Generate Invoice</h3>
              <p className="text-sm text-textMuted mb-10 leading-relaxed font-medium">
                This will create a standalone Refreshments invoice for <span className="text-primary font-bold">{clientToInvoice.client.companyName}</span> covering
                {' '}{clientToInvoice.logCount} item{clientToInvoice.logCount !== 1 ? 's' : ''} totalling <span className="text-primary font-bold">₹{clientToInvoice.totalPending.toLocaleString()}</span>. It'll appear under Billing.
              </p>
              <div className="flex gap-4">
                <button onClick={handleGenerateInvoice}
                  className="flex-1 bg-primary text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95">
                  Confirm
                </button>
                <button onClick={() => setClientToInvoice(null)}
                  className="flex-1 bg-background border border-borderSubtle text-textMain py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all active:scale-95">
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Refreshments;
