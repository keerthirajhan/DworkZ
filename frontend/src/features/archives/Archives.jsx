import React, { useState, useEffect } from 'react';
import { Archive, Trash2, Clock, Search, Filter, ShieldAlert, History, UserCircle, Briefcase, TrendingUp, Bookmark, CheckCircle, AlertTriangle, X, Package, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import api from '../../utils/api';

const Archives = () => {
  const [archivedItems, setArchivedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [notification, setNotification] = useState(null);
  const [retentionPeriods, setRetentionPeriods] = useState(() => {
    const saved = localStorage.getItem('dworkz_retention_periods');
    if (saved && !saved.startsWith('{')) {
      return { all: saved, visitors: saved, clients: saved, bookings: saved, inventory: saved, billing: saved };
    }
    return saved ? JSON.parse(saved) : {
      all: '30 Days', visitors: '30 Days', clients: '30 Days', bookings: '30 Days', inventory: '30 Days', billing: '30 Days'
    };
  });
  const [pendingRetentionPeriod, setPendingRetentionPeriod] = useState('');
  const [showRetentionConfirm, setShowRetentionConfirm] = useState(false);

  const fetchArchived = async () => {
    setLoading(true);
    try {
      const [visitorRes, clientRes, bookingRes, inventoryRes, billingRes] = await Promise.allSettled([
        api.get('/api/v1/visitors/archived'),
        api.get('/api/v1/clients/archived'),
        api.get('/api/v1/bookings/archived'),
        api.get('/api/v1/inventory/archived'),
        api.get('/api/v1/invoices/archived')
      ]);

      const visitors = visitorRes.status === 'fulfilled' ? (visitorRes.value.data.data || []).map(i => ({ ...i, source: 'Visitors', name: i.name })) : [];
      const clients = clientRes.status === 'fulfilled' ? (clientRes.value.data.data || []).map(i => ({ ...i, source: 'Clients', name: i.clientName || i.name })) : [];
      const bookings = bookingRes.status === 'fulfilled' ? (bookingRes.value.data.data || []).map(i => ({ ...i, source: 'Bookings', name: i.name })) : [];
      const inventory = inventoryRes.status === 'fulfilled' ? (inventoryRes.value.data.data || []).map(i => ({ ...i, source: 'Inventory', name: i.itemName })) : [];
      const billing = billingRes.status === 'fulfilled' ? (billingRes.value.data.data || []).map(i => ({ ...i, source: 'Billing', name: i.invoiceId })) : [];

      setArchivedItems([...visitors, ...clients, ...bookings, ...inventory, ...billing]);
    } catch (err) {
      console.error('Error fetching archives:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchived();
  }, []);

  const showNotify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handlePermanentDelete = async (id, source) => {
    try {
      let endpoint = '';
      if (source === 'Visitors') endpoint = 'visitors';
      else if (source === 'Clients') endpoint = 'clients';
      else if (source === 'Bookings') endpoint = 'bookings';
      else if (source === 'Inventory') endpoint = 'inventory';
      else if (source === 'Billing') endpoint = 'invoices';
      
      await api.delete(`/api/v1/${endpoint}/${id}/permanent`);
      
      setShowConfirmDelete(false);
      setSelectedItem(null);
      fetchArchived();
      showNotify(`${source} record purged from database.`);
    } catch (err) {
      showNotify(err.response?.data?.error || 'Deletion failed. Admin permission required.', 'error');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const selectedItemsData = archivedItems.filter(item => selectedIds.includes(item._id));
      const sourceGroups = selectedItemsData.reduce((acc, item) => {
        acc[item.source] = acc[item.source] || [];
        acc[item.source].push(item._id);
        return acc;
      }, {});

      for (const [source, ids] of Object.entries(sourceGroups)) {
        let endpoint = source === 'Billing' ? 'invoices' : source.toLowerCase();
        for(const id of ids) {
          await api.delete(`/api/v1/${endpoint}/${id}/permanent`);
        }
      }

      setShowBulkDeleteConfirm(false);
      setSelectedIds([]);
      fetchArchived();
      showNotify(`${selectedIds.length} records permanently removed.`);
    } catch (err) {
      showNotify('Mass deletion failed.', 'error');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) setSelectedIds([]);
    else setSelectedIds(filteredItems.map(i => i._id));
  };

  const filteredItems = archivedItems.filter(item => {
    const nameStr = item.name || '';
    const matchesSearch = nameStr.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.source.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesType;
  });

  const sourceIcons = {
    'Visitors': <UserCircle size={14} />,
    'Clients': <Briefcase size={14} />,
    'Bookings': <Bookmark size={14} />,
    'Inventory': <Package size={14} />,
    'Billing': <FileText size={14} />
  };

  const allPeriodsSame = ['visitors', 'clients', 'bookings', 'inventory', 'billing'].every(k => retentionPeriods[k] === retentionPeriods.visitors);
  const currentDisplayPeriod = filterType === 'all' ? (allPeriodsSame ? retentionPeriods.visitors : 'Mixed') : retentionPeriods[filterType];

  return (
    <div className="p-4 sm:p-8 w-full max-w-7xl mx-auto space-y-8 relative">
      
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className={`fixed top-8 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${notification.type === 'error' ? 'bg-rose-500/10 border-rose-500/50 text-rose-500' : 'bg-primary/10 border-primary/50 text-primary'} backdrop-blur-xl min-w-[300px]`}>
            {notification.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
            <span className="font-bold text-sm">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-auto hover:scale-110 transition-transform"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-textMain uppercase tracking-tight mb-2">System Archives</h1>
          <p className="text-textMuted max-w-lg">Review and manage deleted historical records across all DworkZ modules.</p>
        </div>

        <div className="flex flex-col gap-4">
           <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col items-start">
                 <p className="text-[9px] font-black uppercase text-textMuted tracking-widest mb-1.5">Retention Period</p>
                 <select 
                   value={currentDisplayPeriod}
                   onChange={(e) => {
                     setPendingRetentionPeriod(e.target.value);
                     setShowRetentionConfirm(true);
                   }}
                   className="bg-surface border border-borderSubtle text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl focus:outline-none focus:border-primary transition-all text-textMain shadow-lg cursor-pointer"
                 >
                    {currentDisplayPeriod === 'Mixed' && <option value="Mixed" disabled hidden>Mixed Periods</option>}
                    <option value="30 Days">30 Days (Standard)</option>
                    <option value="90 Days">90 Days (Extended)</option>
                    <option value="1 Year">1 Year (Audit)</option>
                    <option value="Never Delete">Never (Manual Only)</option>
                 </select>
              </div>
              <div className="flex items-center gap-2 bg-surface border border-borderSubtle p-1 rounded-2xl overflow-x-auto max-w-full">
                {['all', 'visitors', 'clients', 'bookings', 'inventory', 'billing'].map((type) => (
                  <button
                    key={type}
                    onClick={() => { setFilterType(type); setSelectedIds([]); }}
                    className={`flex-shrink-0 px-3 sm:px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === type ? 'bg-primary text-textMain shadow-lg' : 'text-textMuted hover:text-textMain'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
           </div>
          {selectedIds.length > 0 && (
             <motion.button initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={() => setShowBulkDeleteConfirm(true)} className="self-start bg-rose-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-2">
               <Trash2 size={14} /> Delete Selected ({selectedIds.length})
            </motion.button>
          )}
        </div>
      </div>

      {/* System Policy Alert */}
      <div className="bg-surface/50 border border-primary/20 p-6 rounded-[32px] flex items-start gap-5 relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all"></div>
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0 border border-primary/20 shadow-inner"><ShieldAlert size={24} /></div>
        <div className="space-y-1 relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Data Integrity & Sovereignty Policy</p>
          <p className="text-textMain font-bold text-sm leading-relaxed">
            Deleted records are retained in the system vault for <span className="text-primary underline underline-offset-4 decoration-2">
              {currentDisplayPeriod === 'Mixed' ? 'their respective periods' : currentDisplayPeriod}
            </span> for audit compliance. Automated purging occurs on the 1st of every month for expired entries.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-primary transition-colors" size={18} />
            <input type="text" placeholder="Search archives..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-surface border border-borderSubtle text-sm rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary transition-all shadow-xl font-bold text-textMain" />
          </div>

          <div className="bg-surface border border-borderSubtle rounded-[32px] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-textMain">
                <thead className="bg-background/50 border-b border-borderSubtle text-textMuted uppercase font-black tracking-widest text-[10px]">
                  <tr>
                    <th className="px-8 py-5 w-12"><button onClick={toggleSelectAll} className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${selectedIds.length === filteredItems.length && filteredItems.length > 0 ? 'bg-primary border-primary text-textMain' : 'border-borderSubtle hover:border-primary'}`}>{selectedIds.length === filteredItems.length && filteredItems.length > 0 && <CheckCircle size={14} />}</button></th>
                    <th className="px-8 py-5">Source & Name</th>
                    <th className="px-8 py-5">Archived On</th>
                    <th className="px-8 py-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderSubtle/30">
                  {loading ? (
                    <tr><td colSpan={4} className="px-8 py-12 text-center text-textMuted font-black uppercase tracking-widest text-[10px]">Syncing archives...</td></tr>
                  ) : filteredItems.length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-12 text-center text-textMuted">No records found.</td></tr>
                  ) : filteredItems.map((item) => (
                    <tr key={item._id} className={`hover:bg-white/5 transition-all group active:scale-[0.995] ${selectedIds.includes(item._id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-8 py-5"><button onClick={() => toggleSelect(item._id)} className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${selectedIds.includes(item._id) ? 'bg-primary border-primary text-textMain' : 'border-borderSubtle group-hover:border-primary'}`}>{selectedIds.includes(item._id) && <CheckCircle size={14} />}</button></td>
                      <td className="px-8 py-5" onClick={() => setSelectedItem(item)}>
                        <div className="flex items-center gap-4 cursor-pointer">
                          <div className="w-10 h-10 rounded-xl bg-background border border-borderSubtle flex items-center justify-center text-primary">{sourceIcons[item.source]}</div>
                          <div><div className="font-bold text-textMain">{item.name}</div><div className="text-[10px] uppercase font-black text-primary/60">{item.source}</div></div>
                        </div>
                      </td>
                      <td className="px-8 py-5 cursor-pointer" onClick={() => setSelectedItem(item)}><div className="flex items-center gap-2 text-textMuted font-medium"><History size={14} className="text-primary/40" />{new Date(item.archivedAt || item.createdAt).toLocaleDateString()}</div></td>
                      <td className="px-8 py-5 text-right"><button onClick={() => setSelectedItem(item)} className="text-primary hover:text-textMain transition-colors text-[10px] font-black uppercase tracking-widest">Details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <AnimatePresence>
            {selectedItem && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-surface border border-borderSubtle rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12"></div>
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-14 h-14 rounded-2xl bg-background border border-borderSubtle flex items-center justify-center text-primary text-xl font-black">{selectedItem.name?.charAt(0)}</div>
                   <div><h4 className="font-black text-textMain text-xl leading-tight">{selectedItem.name}</h4><p className="text-xs text-textMuted uppercase tracking-widest font-black">Archived {selectedItem.source}</p></div>
                </div>

                <div className="space-y-4 mb-8">
                   <div className="flex justify-between items-center text-[11px]"><span className="text-textMuted uppercase font-black tracking-widest">Archived On</span><span className="font-bold text-textMain">{new Date(selectedItem.archivedAt || selectedItem.createdAt).toLocaleString()}</span></div>
                   
                   {selectedItem.source === 'Billing' && (
                     <>
                        <div className="flex justify-between items-center text-[11px]"><span className="text-textMuted uppercase font-black tracking-widest">Total Amount</span><span className="font-black text-primary text-lg">₹{selectedItem.totalAmount?.toLocaleString()}</span></div>
                        <div className="flex justify-between items-center text-[11px]"><span className="text-textMuted uppercase font-black tracking-widest">Period</span><span className="font-bold text-textMain">{selectedItem.billingPeriod}</span></div>
                        <div className="flex justify-between items-center text-[11px]"><span className="text-textMuted uppercase font-black tracking-widest">Client</span><span className="font-bold text-textMain">{selectedItem.clientId?.companyName || 'N/A'}</span></div>
                     </>
                   )}

                   {selectedItem.source === 'Inventory' && (
                     <div className="flex justify-between items-center text-[11px]"><span className="text-textMuted uppercase font-black tracking-widest">Total Value</span><span className="font-bold text-primary font-black">₹{selectedItem.totalCost?.toLocaleString()}</span></div>
                   )}
                </div>

                <div className="space-y-3">
                   <button onClick={() => setShowConfirmDelete(true)} className="w-full bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/5"><Trash2 size={14} /> Permanent Delete</button>
                   <button onClick={() => setSelectedItem(null)} className="w-full bg-background border border-borderSubtle text-textMuted hover:text-textMain py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all">Close Details</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-surface border border-rose-500/50 rounded-[32px] p-10 max-w-sm w-full shadow-2xl text-center">
              <div className="w-20 h-20 rounded-[28px] bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-8 shadow-inner shadow-rose-500/20"><Trash2 size={40} /></div>
              <h3 className="text-2xl font-black text-textMain mb-3 uppercase tracking-tight">Bulk Purge</h3>
              <p className="text-sm text-textMuted mb-10 leading-relaxed font-medium">You are about to permanently remove <span className="text-rose-500 font-bold">{selectedIds.length}</span> archived records. This action cannot be undone.</p>
              <div className="flex gap-4">
                <button onClick={handleBulkDelete} className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 active:scale-95">Confirm Bulk Delete</button>
                <button onClick={() => setShowBulkDeleteConfirm(false)} className="flex-1 bg-background border border-borderSubtle text-textMain py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all active:scale-95">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirmDelete && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-surface border border-rose-500/50 rounded-[32px] p-10 max-w-sm w-full shadow-2xl text-center">
              <div className="w-20 h-20 rounded-[28px] bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-8 shadow-inner shadow-rose-500/20"><ShieldAlert size={40} /></div>
              <h3 className="text-2xl font-black text-textMain mb-3 uppercase tracking-tight">Security Check</h3>
              <p className="text-sm text-textMuted mb-10 leading-relaxed font-medium">You are about to permanently purge this <span className="text-rose-500 font-bold">{selectedItem?.source}</span> record. This action is irreversible.</p>
              <div className="flex gap-4">
                <button onClick={() => handlePermanentDelete(selectedItem._id, selectedItem.source)} className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 active:scale-95">Confirm Delete</button>
                <button onClick={() => setShowConfirmDelete(false)} className="flex-1 bg-background border border-borderSubtle text-textMain py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all active:scale-95">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showRetentionConfirm && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div role="dialog" aria-modal="true" aria-labelledby="confirm-change-title" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-surface border border-primary/50 rounded-[32px] p-10 max-w-sm w-full shadow-2xl text-center">
              <div className="w-20 h-20 rounded-[28px] bg-primary/10 text-primary flex items-center justify-center mx-auto mb-8 shadow-inner shadow-primary/20"><ShieldAlert size={40} aria-hidden="true" /></div>
              <h3 id="confirm-change-title" className="text-2xl font-black text-textMain mb-3 uppercase tracking-tight">Confirm Change</h3>
              <p className="text-sm text-textMuted mb-10 leading-relaxed font-medium">Are you sure you want to change the <span className="text-primary font-bold uppercase">{filterType}</span> retention period to <span className="text-primary font-bold">{pendingRetentionPeriod}</span>?</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setRetentionPeriods(prev => {
                      const next = { ...prev };
                      if (filterType === 'all') {
                        Object.keys(next).forEach(k => next[k] = pendingRetentionPeriod);
                      } else {
                        next[filterType] = pendingRetentionPeriod;
                      }
                      localStorage.setItem('dworkz_retention_periods', JSON.stringify(next));
                      return next;
                    });
                    setShowRetentionConfirm(false);
                    showNotify(`${filterType === 'all' ? 'Global' : filterType} retention period updated to ${pendingRetentionPeriod}.`);
                  }} 
                  className="flex-1 bg-primary text-textMain py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-primary/20 active:scale-95"
                >
                  Confirm
                </button>
                <button 
                  onClick={() => setShowRetentionConfirm(false)} 
                  className="flex-1 bg-background border border-borderSubtle text-textMain py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all active:scale-95"
                >
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

export default Archives;
