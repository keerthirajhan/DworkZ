import React, { useState, useEffect, useRef } from 'react';
import { Coffee, ChevronLeft, ChevronRight, Tag, Download, Upload, X, CheckCircle, AlertTriangle, Receipt, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

const todayStr = () => new Date().toISOString().split('T')[0];
const thisMonthStr = () => todayStr().slice(0, 7);

// Minimal CSV parser (handles quoted fields with embedded commas) — kept
// from the original build, still needed since Import/Export stayed in
// scope for this simplified redesign.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; } }
      else { field += c; }
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

// SIMPLIFIED REDESIGN: two views only — Daily Entry (log Coffee/Tea per
// client, per day) and Statements (a client's monthly breakdown + the
// invoice launch point). Reports, dashboards, generic filters, and
// open-ended "Other" items were deliberately removed — none of that was
// part of the actual requirement.
const Refreshments = () => {
  const [view, setView] = useState('daily'); // daily | statements
  const [notification, setNotification] = useState(null);
  const showNotify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const [clientOptions, setClientOptions] = useState([]);
  useEffect(() => {
    api.get('/api/v1/clients').then(res => setClientOptions(res.data.data || [])).catch(() => {});
  }, []);

  // ── Daily Entry ──
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [dailyRows, setDailyRows] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [savingDay, setSavingDay] = useState(false);

  const fetchDaily = async (date) => {
    setDailyLoading(true);
    try {
      const res = await api.get(`/api/v1/refreshments/daily?date=${date}`);
      setDailyRows(res.data.data);
    } catch (err) { console.error(err); } finally { setDailyLoading(false); }
  };
  useEffect(() => { if (view === 'daily') fetchDaily(selectedDate); }, [view, selectedDate]);

  const updateRow = (clientId, field, value) => {
    setDailyRows(rows => rows.map(r => r.client._id === clientId ? { ...r, [field]: value } : r));
  };

  const handleSaveDay = async () => {
    setSavingDay(true);
    try {
      const entries = dailyRows.map(r => ({ clientId: r.client._id, coffee: Number(r.coffee) || 0, tea: Number(r.tea) || 0 }));
      const res = await api.post('/api/v1/refreshments/daily', { date: selectedDate, entries });
      showNotify(res.data.message || "Today's counts saved");
      fetchDaily(selectedDate);
      fetchPending();
    } catch (err) {
      showNotify(err.response?.data?.error || 'Failed to save', 'error');
    } finally { setSavingDay(false); }
  };

  const shiftDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // ── Pending clients (lightweight, not a dashboard) ──
  const [pending, setPending] = useState([]);
  const fetchPending = async () => {
    try {
      const res = await api.get('/api/v1/refreshments/pending');
      setPending(res.data.data);
    } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchPending(); }, []);

  // ── Statements ──
  const [statementClient, setStatementClient] = useState('');
  const [statementMonth, setStatementMonth] = useState(thisMonthStr());
  const [statement, setStatement] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [confirmInvoice, setConfirmInvoice] = useState(false);

  const fetchStatement = async () => {
    if (!statementClient || !statementMonth) return;
    setStatementLoading(true);
    try {
      const res = await api.get(`/api/v1/refreshments/statement?client=${statementClient}&month=${statementMonth}`);
      setStatement(res.data.data);
    } catch (err) {
      console.error(err);
      setStatement(null);
    } finally { setStatementLoading(false); }
  };
  useEffect(() => { if (view === 'statements') fetchStatement(); }, [view, statementClient, statementMonth]);

  const jumpToClientStatement = (clientId) => {
    setStatementClient(clientId);
    setStatementMonth(thisMonthStr());
    setView('statements');
  };

  const handleGenerateInvoice = async () => {
    try {
      const res = await api.post('/api/v1/refreshments/generate-invoice', { clientId: statementClient, month: statementMonth });
      showNotify(`Invoice ${res.data.data.invoiceId} generated — see it under Billing.`);
      setConfirmInvoice(false);
      fetchStatement();
      fetchPending();
    } catch (err) {
      showNotify(err.response?.data?.error || 'Failed to generate invoice', 'error');
      setConfirmInvoice(false);
    }
  };

  // ── Rates (Coffee/Tea only) ──
  const [isRatesOpen, setIsRatesOpen] = useState(false);
  const [rates, setRates] = useState({ Coffee: '', Tea: '' });
  const fetchRates = async () => {
    try {
      const res = await api.get('/api/v1/refreshments/pricing');
      const map = { Coffee: '', Tea: '' };
      res.data.data.forEach(p => { map[p.itemName] = p.unitPrice; });
      setRates(map);
    } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchRates(); }, []);

  const handleSaveRate = async (itemName, unitPrice) => {
    try {
      await api.put('/api/v1/refreshments/pricing', { itemName, unitPrice });
      showNotify(`${itemName} rate saved`);
      fetchRates();
      if (view === 'statements') fetchStatement();
    } catch (err) {
      showNotify(err.response?.data?.error || 'Failed to save rate', 'error');
    }
  };

  // ── Import / Export ──
  const fileInputRef = useRef(null);
  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) return showNotify('CSV appears empty', 'error');
    const header = parsed[0].map(h => h.trim().toLowerCase());
    const idx = { date: header.indexOf('date'), client: header.indexOf('client'), item: header.indexOf('item'), quantity: header.indexOf('quantity') };
    if (idx.date === -1 || idx.client === -1 || idx.item === -1 || idx.quantity === -1) {
      return showNotify('CSV must have Date, Client, Item, Quantity columns', 'error');
    }
    const rows = parsed.slice(1).map(r => ({ date: r[idx.date], client: r[idx.client], item: r[idx.item], quantity: r[idx.quantity] }));
    try {
      const res = await api.post('/api/v1/refreshments/import', { rows });
      showNotify(`Imported ${res.data.imported} row(s)${res.data.errorCount ? `, ${res.data.errorCount} skipped` : ''}`);
      fetchPending();
      if (view === 'daily') fetchDaily(selectedDate);
      if (view === 'statements') fetchStatement();
    } catch (err) {
      showNotify(err.response?.data?.error || 'Import failed', 'error');
    } finally { e.target.value = ''; }
  };

  const handleExport = (scoped) => {
    const params = new URLSearchParams();
    if (scoped && statementClient && statementMonth) {
      params.set('scope', 'client'); params.set('client', statementClient);
    } else {
      params.set('scope', 'all');
    }
    api.get(`/api/v1/refreshments/export?${params.toString()}`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url; a.download = `refreshments-export-${todayStr()}.csv`; a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => showNotify('Export failed', 'error'));
  };

  const selectedClientName = clientOptions.find(c => c._id === statementClient)?.companyName || '';

  return (
    <div className="p-6 sm:p-8 space-y-6 relative">
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
          <p className="text-textMuted text-sm mt-1">Log Coffee &amp; Tea per client, bill monthly — no GST</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setIsRatesOpen(true)}
            className="flex items-center gap-2 bg-surface border border-borderSubtle hover:border-primary/40 text-textMain px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
            <Tag size={14} /> Rates
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

      {/* View toggle */}
      <div className="flex gap-2 border-b border-borderSubtle">
        {[{ key: 'daily', label: 'Daily Entry' }, { key: 'statements', label: 'Statements' }].map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${view === t.key ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-textMain'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DAILY ENTRY ── */}
      {view === 'daily' && (
        <div className="bg-surface border border-borderSubtle rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-borderSubtle flex items-center gap-2">
            <button onClick={() => shiftDate(-1)} className="p-2 text-textMuted hover:text-textMain hover:bg-background rounded-xl transition-colors"><ChevronLeft size={16} /></button>
            <input type="date" value={selectedDate} max={todayStr()} onChange={e => setSelectedDate(e.target.value)}
              className="bg-background border border-borderSubtle rounded-xl px-4 py-2 text-sm font-bold text-textMain focus:border-primary focus:outline-none" />
            <button onClick={() => shiftDate(1)} disabled={selectedDate >= todayStr()}
              className="p-2 text-textMuted hover:text-textMain hover:bg-background rounded-xl transition-colors disabled:opacity-30"><ChevronRight size={16} /></button>
            <button onClick={() => setSelectedDate(todayStr())} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline ml-1">Today</button>
          </div>

          {dailyLoading ? (
            <div className="p-12 text-center text-textMuted text-sm">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-borderSubtle text-[10px] font-black text-textMuted uppercase tracking-widest">
                  <th className="text-left px-6 py-3">Client</th>
                  <th className="text-center px-3 py-3 w-32">☕ Coffee</th>
                  <th className="text-center px-3 py-3 w-32">🍵 Tea</th>
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
                        onChange={e => updateRow(row.client._id, 'coffee', e.target.value)} placeholder="0"
                        className="w-full text-center bg-background border border-borderSubtle rounded-lg py-2 text-sm font-bold focus:border-primary focus:outline-none disabled:opacity-40" />
                    </td>
                    <td className="px-3 py-3">
                      <input type="number" min="0" disabled={row.locked} value={row.tea || ''}
                        onChange={e => updateRow(row.client._id, 'tea', e.target.value)} placeholder="0"
                        className="w-full text-center bg-background border border-borderSubtle rounded-lg py-2 text-sm font-bold focus:border-primary focus:outline-none disabled:opacity-40" />
                    </td>
                  </tr>
                ))}
                {dailyRows.length === 0 && (
                  <tr><td colSpan={3} className="text-center py-10 text-textMuted text-sm">No active clients to log for.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {dailyRows.length > 0 && (
            <div className="px-6 py-4 border-t border-borderSubtle flex justify-end">
              <button onClick={handleSaveDay} disabled={savingDay}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25 disabled:opacity-60">
                {savingDay ? 'Saving...' : "Save Today's Counts"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STATEMENTS ── */}
      {view === 'statements' && (
        <div className="space-y-6">
          {/* Needs billing — lightweight list, click to jump straight in */}
          {pending.length > 0 && (
            <div className="bg-surface border border-borderSubtle rounded-3xl p-5">
              <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-3">Needs Billing</p>
              <div className="flex flex-wrap gap-2">
                {pending.map(p => (
                  <button key={p.client._id} onClick={() => jumpToClientStatement(p.client._id)}
                    className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 text-orange-400 px-4 py-2 rounded-xl text-xs font-bold transition-all">
                    {p.client.companyName} <span className="text-[10px] opacity-70">({p.entryCount})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Client + Month picker */}
          <div className="bg-surface border border-borderSubtle rounded-3xl p-5 flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Client</label>
              <select value={statementClient} onChange={e => setStatementClient(e.target.value)}
                className="w-full bg-background border border-borderSubtle rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none">
                <option value="">Select a client...</option>
                {clientOptions.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-textMuted uppercase tracking-widest">Month</label>
              <input type="month" value={statementMonth} onChange={e => setStatementMonth(e.target.value)}
                className="bg-background border border-borderSubtle rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none" />
            </div>
            {statementClient && statementMonth && (
              <button onClick={() => handleExport(true)}
                className="flex items-center gap-2 bg-background border border-borderSubtle hover:border-primary/40 text-textMain px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                <Download size={13} /> Export This Client
              </button>
            )}
          </div>

          {!statementClient ? (
            <div className="p-12 text-center text-textMuted text-sm">Pick a client to see their monthly statement.</div>
          ) : statementLoading ? (
            <div className="p-12 text-center text-textMuted text-sm">Loading...</div>
          ) : statement && (
            <div className="bg-surface border border-borderSubtle rounded-3xl overflow-hidden">
              <div className="px-6 py-4 border-b border-borderSubtle flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-sm font-black text-textMain uppercase tracking-widest">{selectedClientName}</h2>
                  <p className="text-[11px] text-textMuted mt-0.5">{new Date(statementMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
                </div>
                {statement.hasBilled && (
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    {statement.hasUnbilled ? 'Partially Billed' : 'Fully Billed'}
                  </span>
                )}
              </div>

              {statement.days.length === 0 ? (
                <div className="p-10 text-center text-textMuted text-sm">No Coffee/Tea logged for this client in this month.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-borderSubtle text-[10px] font-black text-textMuted uppercase tracking-widest">
                      <th className="text-left px-6 py-3">Date</th>
                      <th className="text-center px-3 py-3">☕ Coffee</th>
                      <th className="text-center px-3 py-3">🍵 Tea</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.days.map(d => (
                      <tr key={d.date} className="border-b border-borderSubtle last:border-0">
                        <td className="px-6 py-2.5 font-bold text-textMain">{new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                        <td className="px-3 py-2.5 text-center">{d.coffee || '—'}</td>
                        <td className="px-3 py-2.5 text-center">{d.tea || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary/5 font-black text-textMain">
                      <td className="px-6 py-3">Total</td>
                      <td className="px-3 py-3 text-center">{statement.totalCoffee}</td>
                      <td className="px-3 py-3 text-center">{statement.totalTea}</td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {statement.days.length > 0 && (
                <div className="px-6 py-5 border-t border-borderSubtle space-y-3">
                  {statement.missingRates.length > 0 ? (
                    <p className="text-[11px] text-orange-400 font-bold bg-orange-500/5 border border-orange-500/20 rounded-xl px-3 py-2.5">
                      Set a rate for {statement.missingRates.join(', ')} (top-right "Rates" button) before generating an invoice.
                    </p>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-textMuted">Estimated Total</span>
                      <span className="text-xl font-black text-primary">₹{statement.estimatedTotal.toLocaleString()}</span>
                    </div>
                  )}
                  <button onClick={() => setConfirmInvoice(true)}
                    disabled={!statement.hasUnbilled || statement.missingRates.length > 0}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed">
                    <Receipt size={14} /> {statement.hasUnbilled ? 'Generate Invoice for This Month' : 'Already Fully Invoiced'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rates Modal — exactly two fields, never an open catalog */}
      <AnimatePresence>
        {isRatesOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-borderSubtle rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-textMain uppercase tracking-tight">Rates</h2>
                  <p className="text-xs text-textMuted mt-1">Set once — never asked for during daily entry</p>
                </div>
                <button onClick={() => setIsRatesOpen(false)} className="text-textMuted hover:text-textMain"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                {['Coffee', 'Tea'].map(item => (
                  <div key={item} className="flex items-center gap-3 bg-background border border-borderSubtle rounded-xl px-4 py-3">
                    <span className="flex-1 text-sm font-bold text-textMain">{item === 'Coffee' ? '☕' : '🍵'} {item}</span>
                    <span className="text-textMuted text-xs">₹</span>
                    <input type="number" min="0" step="0.01" value={rates[item]}
                      onChange={e => setRates(r => ({ ...r, [item]: e.target.value }))}
                      onBlur={e => { if (e.target.value !== '') handleSaveRate(item, e.target.value); }}
                      placeholder="0.00"
                      className="w-24 bg-surface border border-borderSubtle rounded-lg px-2 py-1.5 text-sm text-right focus:border-primary focus:outline-none" />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Generate Invoice Confirmation */}
      <AnimatePresence>
        {confirmInvoice && statement && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-primary/40 rounded-[32px] p-10 max-w-sm w-full shadow-2xl text-center">
              <div className="w-20 h-20 rounded-[28px] bg-primary/10 text-primary flex items-center justify-center mx-auto mb-8 shadow-inner shadow-primary/20">
                <Receipt size={40} />
              </div>
              <h3 className="text-2xl font-black text-textMain mb-3 uppercase tracking-tight">Generate Invoice</h3>
              <p className="text-sm text-textMuted mb-10 leading-relaxed font-medium">
                Standalone, no-GST invoice for <span className="text-primary font-bold">{selectedClientName}</span> —
                {' '}{new Date(statementMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}, totalling{' '}
                <span className="text-primary font-bold">₹{statement.estimatedTotal.toLocaleString()}</span>. It'll appear under Billing.
              </p>
              <div className="flex gap-4">
                <button onClick={handleGenerateInvoice}
                  className="flex-1 bg-primary text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95">
                  Confirm
                </button>
                <button onClick={() => setConfirmInvoice(false)}
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
