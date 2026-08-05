import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Coffee, Plus, Trash2, Receipt, X, CheckCircle, AlertTriangle, ShieldAlert, ChevronLeft, ChevronRight, Tag, Download, Upload, BarChart3, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

const todayStr = () => new Date().toISOString().split('T')[0];

// Minimal CSV parser (handles quoted fields with embedded commas), good
// enough for the simple flat format this module imports/exports.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else { field += c; }
    } else if (c === '"') { inQuotes = true; }
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (field !== '' || row.length > 0) { row.push(field); rows.push(row); row = []; field = ''; }
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else { field += c; }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || r[0] !== '');
}

const Refreshments = () => {
  const [tab, setTab] = useState('daily'); // daily | entries | reports
  const [notification, setNotification] = useState(null);

  // Dashboard
  const [dashboard, setDashboard] = useState(null);

  // Daily entry
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [dailyRows, setDailyRows] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [savingDay, setSavingDay] = useState(false);

  // Pending / invoice generation
  const [pending, setPending] = useState([]);
  const [clientToInvoice, setClientToInvoice] = useState(null);

  // All entries (filterable)
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [filters, setFilters] = useState({ client: '', date: '', month: '', item: '', status: '' });
  const [logToDelete, setLogToDelete] = useState(null);
  const [clientOptions, setClientOptions] = useState([]);

  // Reports
  const [reports, setReports] = useState(null);

  // Pricing
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [pricing, setPricing] = useState([]);
  const [newPriceItem, setNewPriceItem] = useState('');
  const [newPriceValue, setNewPriceValue] = useState('');

  // Import
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const showNotify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/api/v1/refreshments/dashboard');
      setDashboard(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchPending = async () => {
    try {
      const res = await api.get('/api/v1/refreshments/pending');
      setPending(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchDaily = async (date) => {
    setDailyLoading(true);
    try {
      const res = await api.get(`/api/v1/refreshments/daily?date=${date}`);
      setDailyRows(res.data.data.map(r => ({ ...r, other: r.other.length ? r.other : [] })));
    } catch (err) {
      console.error(err);
    } finally {
      setDailyLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.client) params.set('client', filters.client);
      if (filters.date) params.set('date', filters.date);
      if (filters.month) params.set('month', filters.month);
      if (filters.item) params.set('item', filters.item);
      if (filters.status) params.set('status', filters.status);
      const res = await api.get(`/api/v1/refreshments?${params.toString()}`);
      setLogs(res.data.data);
    } catch (err) { console.error(err); } finally { setLogsLoading(false); }
  };

  const fetchReports = async () => {
    try {
      const res = await api.get('/api/v1/refreshments/reports');
      setReports(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchPricing = async () => {
    try {
      const res = await api.get('/api/v1/refreshments/pricing');
      setPricing(res.data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchDashboard(); fetchPending(); fetchPricing(); }, []);
  useEffect(() => {
    api.get('/api/v1/clients').then(res => setClientOptions(res.data.data || [])).catch(() => {});
  }, []);
  useEffect(() => { if (tab === 'daily') fetchDaily(selectedDate); }, [tab, selectedDate]);
  useEffect(() => { if (tab === 'entries') fetchLogs(); }, [tab, filters]);
  useEffect(() => { if (tab === 'reports') fetchReports(); }, [tab]);

  // ── Daily entry grid handlers ──
  const updateRow = (clientId, field, value) => {
    setDailyRows(rows => rows.map(r => r.client._id === clientId ? { ...r, [field]: value } : r));
  };

  const addOtherItem = (clientId) => {
    setDailyRows(rows => rows.map(r => r.client._id === clientId
      ? { ...r, other: [...r.other, { itemName: '', quantity: '' }] } : r));
  };

  const updateOtherItem = (clientId, idx, field, value) => {
    setDailyRows(rows => rows.map(r => r.client._id === clientId
      ? { ...r, other: r.other.map((o, i) => i === idx ? { ...o, [field]: value } : o) } : r));
  };

  const removeOtherItem = (clientId, idx) => {
    setDailyRows(rows => rows.map(r => r.client._id === clientId
      ? { ...r, other: r.other.filter((_, i) => i !== idx) } : r));
  };

  const rowsWithData = useMemo(() =>
    dailyRows.filter(r => Number(r.coffee) > 0 || Number(r.tea) > 0 || r.other.some(o => Number(o.quantity) > 0)).length,
    [dailyRows]
  );

  const handleSaveDay = async () => {
    setSavingDay(true);
    try {
      const entries = dailyRows.map(r => ({
        clientId: r.client._id,
        coffee: Number(r.coffee) || 0,
        tea: Number(r.tea) || 0,
        other: r.other.filter(o => o.itemName && Number(o.quantity) > 0),
        notes: r.notes
      }));
      const res = await api.post('/api/v1/refreshments/daily', { date: selectedDate, entries });
      showNotify(res.data.message || "Today's entries saved");
      fetchDaily(selectedDate);
      fetchDashboard();
      fetchPending();
    } catch (err) {
      showNotify(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSavingDay(false);
    }
  };

  const shiftDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // ── Billing ──
  const handleGenerateInvoice = async () => {
    if (!clientToInvoice) return;
    try {
      const res = await api.post('/api/v1/refreshments/generate-invoice', { clientId: clientToInvoice.client._id });
      showNotify(`Invoice ${res.data.data.invoiceId} generated — see it under Billing.`);
      setClientToInvoice(null);
      fetchPending();
      fetchDashboard();
    } catch (err) {
      showNotify(err.response?.data?.error || 'Failed to generate invoice', 'error');
    }
  };

  // ── Logs delete ──
  const handleDeleteLog = async () => {
    if (!logToDelete) return;
    try {
      await api.delete(`/api/v1/refreshments/${logToDelete._id}`);
      showNotify('Entry removed');
      setLogToDelete(null);
      fetchLogs();
      fetchDashboard();
      fetchPending();
    } catch (err) {
      showNotify(err.response?.data?.error || 'Failed to delete', 'error');
      setLogToDelete(null);
    }
  };

  // ── Pricing ──
  const handleSavePrice = async (itemName, unitPrice) => {
    try {
      await api.put('/api/v1/refreshments/pricing', { itemName, unitPrice });
      showNotify(`Price saved for ${itemName}`);
      fetchPricing();
      fetchPending();
    } catch (err) {
      showNotify(err.response?.data?.error || 'Failed to save price', 'error');
    }
  };

  // ── Import / Export ──
  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) return showNotify('CSV appears empty', 'error');
    const header = parsed[0].map(h => h.trim().toLowerCase());
    const idx = {
      date: header.indexOf('date'), client: header.indexOf('client'),
      item: header.indexOf('item'), quantity: header.indexOf('quantity'), notes: header.indexOf('notes')
    };
    if (idx.date === -1 || idx.client === -1 || idx.item === -1 || idx.quantity === -1) {
      return showNotify('CSV must have Date, Client, Item, Quantity columns', 'error');
    }
    const rows = parsed.slice(1).map(r => ({
      date: r[idx.date], client: r[idx.client], item: r[idx.item], quantity: r[idx.quantity], notes: idx.notes > -1 ? r[idx.notes] : ''
    }));
    try {
      const res = await api.post('/api/v1/refreshments/import', { rows });
      setImportResult(res.data);
      showNotify(`Imported ${res.data.imported} row(s)${res.data.errorCount ? `, ${res.data.errorCount} skipped` : ''}`);
      fetchDashboard(); fetchPending();
      if (tab === 'daily') fetchDaily(selectedDate);
      if (tab === 'entries') fetchLogs();
    } catch (err) {
      showNotify(err.response?.data?.error || 'Import failed', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Exports respect whatever filters are currently active in the All
  // Entries tab (client/date/month/status) — covers "date-wise,
  // client-wise, monthly, invoice status" from a single button rather than
  // a separate scope-picker dialog. Called with no filters (from the
  // header button) it exports everything.
  const handleExport = (useFilters = false) => {
    const params = new URLSearchParams();
    if (useFilters) {
      if (filters.date) { params.set('scope', 'date'); params.set('date', filters.date); }
      else if (filters.client) { params.set('scope', 'client'); params.set('client', filters.client); }
      else if (filters.month) { params.set('scope', 'month'); params.set('month', filters.month); }
      else { params.set('scope', 'all'); }
      if (filters.status) params.set('status', filters.status);
    } else {
      params.set('scope', 'all');
    }
    api.get(`/api/v1/refreshments/export?${params.toString()}`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `refreshments-export-${todayStr()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => showNotify('Export failed', 'error'));
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 relative">
      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold text-white max-w-md ${notification.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
            {notification.type === 'error' ? <AlertTriangle size={18} className="shrink-0" /> : <CheckCircle size={18} className="shrink-0" />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-textMain uppercase tracking-tight">Refreshments</h1>
          <p className="text-textMuted text-sm mt-1">Log today's cups, bill separately from rent whenever you're ready</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setIsPricingOpen(true)}
            className="flex items-center gap-2 bg-surface border border-borderSubtle hover:border-primary/40 text-textMain px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
            <Tag size={14} /> Pricing
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-surface border border-borderSubtle hover:border-primary/40 text-textMain px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
            <Upload size={14} /> Import
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelected} />
          <button onClick={() => handleExport(false)}
            className="flex items-center gap-2 bg-surface border border-borderSubtle hover:border-primary/40 text-textMain px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
            <Download size={14} /> Export All
          </button>
        </div>
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Coffee", value: dashboard?.todayCoffee ?? '···', suffix: 'cups' },
          { label: "Today's Tea", value: dashboard?.todayTea ?? '···', suffix: 'cups' },
          { label: 'This Month', value: dashboard?.monthTotal ?? '···', suffix: 'items' },
          { label: 'Pending Clients', value: dashboard?.pendingClientsCount ?? '···', suffix: 'to bill' }
        ].map((c, i) => (
          <div key={i} className="bg-surface border border-borderSubtle rounded-3xl p-5">
            <p className="text-[10px] font-black text-textMuted uppercase tracking-widest">{c.label}</p>
            <p className="text-3xl font-black text-primary mt-2">{c.value}</p>
            <p className="text-[10px] text-textMuted mt-0.5">{c.suffix}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-borderSubtle">
        {[{ key: 'daily', label: 'Daily Entry' }, { key: 'entries', label: 'All Entries' }, { key: 'reports', label: 'Reports' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-textMain'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DAILY ENTRY TAB ── */}
      {tab === 'daily' && (
        <div className="space-y-6">
          <div className="bg-surface border border-borderSubtle rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-borderSubtle flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => shiftDate(-1)} className="p-2 text-textMuted hover:text-textMain hover:bg-background rounded-xl transition-colors"><ChevronLeft size={16} /></button>
                <input type="date" value={selectedDate} max={todayStr()} onChange={e => setSelectedDate(e.target.value)}
                  className="bg-background border border-borderSubtle rounded-xl px-4 py-2 text-sm font-bold text-textMain focus:border-primary focus:outline-none" />
                <button onClick={() => shiftDate(1)} disabled={selectedDate >= todayStr()}
                  className="p-2 text-textMuted hover:text-textMain hover:bg-background rounded-xl transition-colors disabled:opacity-30"><ChevronRight size={16} /></button>
                <button onClick={() => setSelectedDate(todayStr())} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline ml-1">Today</button>
              </div>
              <p className="text-[11px] text-textMuted font-bold">{rowsWithData} of {dailyRows.length} clients have entries today</p>
            </div>

            {dailyLoading ? (
              <div className="p-12 text-center text-textMuted text-sm">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-borderSubtle text-[10px] font-black text-textMuted uppercase tracking-widest">
                      <th className="text-left px-6 py-3">Client</th>
                      <th className="text-center px-3 py-3 w-24">Coffee</th>
                      <th className="text-center px-3 py-3 w-24">Tea</th>
                      <th className="text-left px-3 py-3">Other</th>
                      <th className="text-left px-3 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRows.map(row => (
                      <tr key={row.client._id} className="border-b border-borderSubtle last:border-0 hover:bg-primary/5 transition-colors">
                        <td className="px-6 py-3 font-bold text-textMain">
                          <div className="flex items-center gap-2">
                            {row.client.companyName}
                            {row.locked && <span title="Already invoiced for this day"><Lock size={12} className="text-textMuted" /></span>}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <input type="number" min="0" disabled={row.locked} value={row.coffee || ''}
                            onChange={e => updateRow(row.client._id, 'coffee', e.target.value)}
                            placeholder="0"
                            className="w-full text-center bg-background border border-borderSubtle rounded-lg py-2 text-sm font-bold focus:border-primary focus:outline-none disabled:opacity-40" />
                        </td>
                        <td className="px-3 py-3">
                          <input type="number" min="0" disabled={row.locked} value={row.tea || ''}
                            onChange={e => updateRow(row.client._id, 'tea', e.target.value)}
                            placeholder="0"
                            className="w-full text-center bg-background border border-borderSubtle rounded-lg py-2 text-sm font-bold focus:border-primary focus:outline-none disabled:opacity-40" />
                        </td>
                        <td className="px-3 py-3 min-w-[220px]">
                          <div className="space-y-1.5">
                            {row.other.map((o, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <input type="text" placeholder="Item" value={o.itemName} disabled={row.locked}
                                  onChange={e => updateOtherItem(row.client._id, idx, 'itemName', e.target.value)}
                                  className="flex-1 bg-background border border-borderSubtle rounded-lg px-2 py-1.5 text-xs focus:border-primary focus:outline-none disabled:opacity-40" />
                                <input type="number" min="0" placeholder="Qty" value={o.quantity} disabled={row.locked}
                                  onChange={e => updateOtherItem(row.client._id, idx, 'quantity', e.target.value)}
                                  className="w-16 bg-background border border-borderSubtle rounded-lg px-2 py-1.5 text-xs text-center focus:border-primary focus:outline-none disabled:opacity-40" />
                                {!row.locked && (
                                  <button onClick={() => removeOtherItem(row.client._id, idx)} className="text-textMuted hover:text-rose-500"><X size={13} /></button>
                                )}
                              </div>
                            ))}
                            {!row.locked && (
                              <button onClick={() => addOtherItem(row.client._id)}
                                className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
                                <Plus size={11} /> Add item
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <input type="text" placeholder="Optional" value={row.notes} disabled={row.locked}
                            onChange={e => updateRow(row.client._id, 'notes', e.target.value)}
                            className="w-full bg-background border border-borderSubtle rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none disabled:opacity-40" />
                        </td>
                      </tr>
                    ))}
                    {dailyRows.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-10 text-textMuted text-sm">No active clients to log for.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {dailyRows.length > 0 && (
              <div className="px-6 py-4 border-t border-borderSubtle flex justify-end">
                <button onClick={handleSaveDay} disabled={savingDay}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25 disabled:opacity-60">
                  {savingDay ? 'Saving...' : "Save Today's Entries"}
                </button>
              </div>
            )}
          </div>

          {/* Pending by Client */}
          <div className="bg-surface border border-borderSubtle rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-borderSubtle">
              <h2 className="text-sm font-black text-textMain uppercase tracking-widest">Pending Charges by Client</h2>
            </div>
            {pending.length === 0 ? (
              <div className="p-10 text-center">
                <Coffee size={28} className="text-textMuted mx-auto mb-2 opacity-40" />
                <p className="text-textMuted text-sm">No unbilled charges right now</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {pending.map(p => (
                  <div key={p.client._id} className="bg-background/50 border border-borderSubtle rounded-2xl p-5 flex flex-col gap-3">
                    <div>
                      <p className="text-sm font-black text-textMain">{p.client.companyName}</p>
                      <p className="text-[10px] text-textMuted mt-0.5">
                        {Object.entries(p.byItem).map(([item, qty]) => `${item} x${qty}`).join(' · ')}
                      </p>
                    </div>
                    {p.missingPricing.length > 0 ? (
                      <p className="text-[10px] text-orange-400 font-bold">Set a price for {p.missingPricing.join(', ')} first</p>
                    ) : (
                      <p className="text-2xl font-black text-primary">₹{p.estimatedAmount.toLocaleString()} <span className="text-[10px] text-textMuted font-bold">est.</span></p>
                    )}
                    <button onClick={() => setClientToInvoice(p)} disabled={p.missingPricing.length > 0}
                      className="flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary hover:text-white text-primary border border-primary/20 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                      <Receipt size={14} /> Generate Invoice
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ALL ENTRIES TAB ── */}
      {tab === 'entries' && (
        <div className="space-y-4">
          <div className="bg-surface border border-borderSubtle rounded-3xl p-4 flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Client</label>
              <select value={filters.client} onChange={e => setFilters(f => ({ ...f, client: e.target.value }))}
                className="bg-background border border-borderSubtle rounded-xl px-3 py-2 text-xs focus:border-primary focus:outline-none max-w-[160px]">
                <option value="">All Clients</option>
                {clientOptions.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Date</label>
              <input type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value, month: '' }))}
                className="bg-background border border-borderSubtle rounded-xl px-3 py-2 text-xs focus:border-primary focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Month</label>
              <input type="month" value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value, date: '' }))}
                className="bg-background border border-borderSubtle rounded-xl px-3 py-2 text-xs focus:border-primary focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Item</label>
              <input type="text" placeholder="e.g. Coffee" value={filters.item} onChange={e => setFilters(f => ({ ...f, item: e.target.value }))}
                className="bg-background border border-borderSubtle rounded-xl px-3 py-2 text-xs focus:border-primary focus:outline-none w-32" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Status</label>
              <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                className="bg-background border border-borderSubtle rounded-xl px-3 py-2 text-xs focus:border-primary focus:outline-none">
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="billed">Billed</option>
              </select>
            </div>
            {(filters.date || filters.month || filters.item || filters.status || filters.client) && (
              <button onClick={() => setFilters({ client: '', date: '', month: '', item: '', status: '' })}
                className="text-[10px] font-black text-rose-400 uppercase tracking-widest hover:underline">Clear Filters</button>
            )}
            <button onClick={() => handleExport(true)}
              className="flex items-center gap-1.5 ml-auto bg-primary/10 hover:bg-primary hover:text-white text-primary border border-primary/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
              <Download size={12} /> Export This View
            </button>
          </div>

          <div className="bg-surface border border-borderSubtle rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-borderSubtle">
              <h2 className="text-sm font-black text-textMain uppercase tracking-widest">Entries · {logs.length}</h2>
            </div>
            {logsLoading ? (
              <div className="p-12 text-center text-textMuted text-sm">Loading...</div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-textMuted text-sm">No entries match these filters</div>
            ) : logs.map(log => (
              <div key={log._id} className="px-4 sm:px-6 py-4 border-b border-borderSubtle last:border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 group hover:bg-primary/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Coffee size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-textMain">{log.itemName} <span className="text-textMuted font-bold">x{log.quantity}</span></p>
                    <p className="text-[10px] text-textMuted mt-0.5">
                      {log.client?.companyName || 'Unknown'} &nbsp;·&nbsp; {new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {log.notes ? ` · ${log.notes}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                  {log.invoiceGenerated ? (
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">Billed · ₹{log.amount}</span>
                  ) : (
                    <>
                      <span className="px-2.5 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">Pending</span>
                      <button onClick={() => setLogToDelete(log)}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-textMuted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── REPORTS TAB ── */}
      {tab === 'reports' && (
        <div className="space-y-6">
          {!reports ? (
            <div className="p-12 text-center text-textMuted text-sm">Loading reports...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Today', data: reports.today },
                  { label: 'This Week', data: reports.thisWeek },
                  { label: 'This Month', data: reports.thisMonth }
                ].map(period => (
                  <div key={period.label} className="bg-surface border border-borderSubtle rounded-3xl p-6">
                    <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-3">{period.label}</p>
                    <p className="text-3xl font-black text-primary">{period.data.totalQty}</p>
                    <p className="text-[10px] text-textMuted mb-4">total items</p>
                    <div className="flex gap-4 text-xs font-bold text-textMain">
                      <span>☕ Coffee: {period.data.coffee}</span>
                      <span>🍵 Tea: {period.data.tea}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-surface border border-borderSubtle rounded-3xl p-6">
                  <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-4">Top Consuming Clients (This Month)</p>
                  {reports.topClients.length === 0 ? (
                    <p className="text-textMuted text-sm">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {reports.topClients.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="font-bold text-textMain">{i + 1}. {c.companyName}</span>
                          <span className="text-primary font-black">{c.totalQty} items</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-surface border border-borderSubtle rounded-3xl p-6">
                  <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-4">Invoices</p>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-bold text-textMain">Pending Clients</span>
                    <span className="text-orange-400 font-black">{reports.pendingInvoicesCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-textMain">Invoices Generated (all time)</span>
                    <span className="text-emerald-500 font-black">{reports.billedInvoicesCount}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Pricing Modal */}
      <AnimatePresence>
        {isPricingOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-borderSubtle rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-textMain uppercase tracking-tight">Pricing</h2>
                  <p className="text-xs text-textMuted mt-1">Set once — never asked for during daily entry</p>
                </div>
                <button onClick={() => setIsPricingOpen(false)} className="text-textMuted hover:text-textMain"><X size={18} /></button>
              </div>

              <div className="space-y-3 mb-6">
                {pricing.length === 0 && <p className="text-textMuted text-sm">No prices set yet. Add Coffee and Tea to get started.</p>}
                {pricing.map(p => (
                  <div key={p._id} className="flex items-center gap-3 bg-background/50 border border-borderSubtle rounded-xl px-4 py-3">
                    <span className="flex-1 text-sm font-bold text-textMain">{p.itemName}</span>
                    <span className="text-textMuted text-xs">₹</span>
                    <input type="number" min="0" step="0.01" defaultValue={p.unitPrice}
                      onBlur={e => { if (Number(e.target.value) !== p.unitPrice) handleSavePrice(p.itemName, e.target.value); }}
                      className="w-20 bg-background border border-borderSubtle rounded-lg px-2 py-1.5 text-sm text-right focus:border-primary focus:outline-none" />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-borderSubtle">
                <input type="text" placeholder="New item (e.g. Coffee)" value={newPriceItem} onChange={e => setNewPriceItem(e.target.value)}
                  className="flex-1 bg-background border border-borderSubtle rounded-xl px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                <span className="text-textMuted text-xs">₹</span>
                <input type="number" min="0" step="0.01" placeholder="0" value={newPriceValue} onChange={e => setNewPriceValue(e.target.value)}
                  className="w-20 bg-background border border-borderSubtle rounded-xl px-2 py-2.5 text-sm focus:border-primary focus:outline-none" />
                <button onClick={() => {
                  if (!newPriceItem.trim() || newPriceValue === '') return;
                  handleSavePrice(newPriceItem.trim(), newPriceValue);
                  setNewPriceItem(''); setNewPriceValue('');
                }} className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90"><Plus size={16} /></button>
              </div>
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
                Delete <span className="text-rose-500 font-bold">"{logToDelete.itemName} x{logToDelete.quantity}"</span>? This cannot be undone.
              </p>
              <div className="flex gap-4">
                <button onClick={handleDeleteLog}
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
                This will create a standalone Refreshments invoice for <span className="text-primary font-bold">{clientToInvoice.client.companyName}</span> totalling
                {' '}<span className="text-primary font-bold">₹{clientToInvoice.estimatedAmount.toLocaleString()}</span>. It'll appear under Billing.
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
