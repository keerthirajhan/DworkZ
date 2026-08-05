const RefreshmentLog = require('../models/RefreshmentLog');
const RefreshmentPricing = require('../models/RefreshmentPricing');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const logActivity = require('../utils/activityLogger');
const { getNextInvoiceId } = require('../utils/invoiceIdGenerator');
 
// Normalizes any date input down to a UTC-midnight Date representing just
// the calendar day — daily entries are keyed by day, not by exact
// timestamp, so "revisit and correct today's numbers" upserts correctly
// instead of creating a second row for the same day.
function toDayKey(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
 
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start of week
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
  return monday;
}
 
// ─────────────────────────────────────────────────────────────────────────
// DAILY ENTRY — the core everyday workflow
// ─────────────────────────────────────────────────────────────────────────
 
// @desc    Get the daily-entry grid for a given date: every active client,
//          with whatever's already logged for that day pre-filled.
// @route   GET /api/v1/refreshments/daily?date=YYYY-MM-DD
// @access  Private (Staff)
exports.getDailyEntries = async (req, res) => {
  try {
    const dayKey = toDayKey(req.query.date);
 
    const clients = await Client.find({ status: { $in: ['Active', 'Converted'] }, isArchived: { $ne: true } })
      .select('companyName')
      .sort('companyName');
 
    const logs = await RefreshmentLog.find({ date: dayKey, isArchived: { $ne: true } });
 
    const entries = clients.map(c => {
      const clientLogs = logs.filter(l => l.client.toString() === c._id.toString());
      const coffeeLog = clientLogs.find(l => l.itemName === 'Coffee');
      const teaLog = clientLogs.find(l => l.itemName === 'Tea');
      const otherLogs = clientLogs.filter(l => l.itemName !== 'Coffee' && l.itemName !== 'Tea');
      const anyLog = coffeeLog || teaLog || otherLogs[0];
 
      return {
        client: { _id: c._id, companyName: c.companyName },
        coffee: coffeeLog?.quantity || 0,
        tea: teaLog?.quantity || 0,
        other: otherLogs.map(l => ({ itemName: l.itemName, quantity: l.quantity })),
        notes: anyLog?.notes || '',
        locked: clientLogs.some(l => l.invoiceGenerated) // any part of today already billed
      };
    });
 
    res.status(200).json({ success: true, date: dayKey, data: entries });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
 
// @desc    Save a full day's consumption in one batch — the main daily
//          action. Re-saving the same day updates existing numbers rather
//          than duplicating them; setting a quantity to 0 removes that
//          (unbilled) entry.
// @route   POST /api/v1/refreshments/daily
// @access  Private (Staff)
exports.saveDailyEntries = async (req, res) => {
  try {
    const { date, entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, error: 'No entries provided.' });
    }
 
    const dayKey = toDayKey(date);
    let savedCount = 0;
    let skippedLocked = 0;
 
    for (const entry of entries) {
      if (!entry.clientId) continue;
 
      const items = [
        { itemName: 'Coffee', quantity: Number(entry.coffee) || 0 },
        { itemName: 'Tea', quantity: Number(entry.tea) || 0 },
        ...(Array.isArray(entry.other) ? entry.other
          .filter(o => o.itemName && o.itemName.trim())
          .map(o => ({ itemName: o.itemName.trim(), quantity: Number(o.quantity) || 0 })) : [])
      ];
 
      for (const item of items) {
        const existing = await RefreshmentLog.findOne({
          client: entry.clientId, date: dayKey, itemName: item.itemName
        });
 
        // Never touch an already-invoiced entry — that number is locked in
        // on a real invoice; correcting it belongs on the invoice, not here.
        if (existing?.invoiceGenerated) {
          if (item.quantity !== existing.quantity) skippedLocked++;
          continue;
        }
 
        if (item.quantity <= 0) {
          if (existing) await existing.deleteOne();
          continue;
        }
 
        if (existing) {
          existing.quantity = item.quantity;
          existing.notes = entry.notes || '';
          existing.loggedBy = req.user.name;
          await existing.save();
        } else {
          await RefreshmentLog.create({
            client: entry.clientId,
            itemName: item.itemName,
            quantity: item.quantity,
            date: dayKey,
            notes: entry.notes || '',
            loggedBy: req.user.name
          });
        }
        savedCount++;
      }
    }
 
    await logActivity({
      title: 'Refreshments Logged',
      desc: `Daily refreshment entries saved for ${dayKey.toDateString()} (${savedCount} item lines)`,
      type: 'client',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-orange-500'
    });
 
    res.status(200).json({
      success: true,
      message: skippedLocked > 0
        ? `Saved. ${skippedLocked} item(s) were skipped because that day is already invoiced.`
        : 'Saved.'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
 
// ─────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────
 
// @desc    At-a-glance dashboard numbers
// @route   GET /api/v1/refreshments/dashboard
// @access  Private (Staff)
exports.getDashboardSummary = async (req, res) => {
  try {
    const todayKey = toDayKey(new Date());
    const monthStart = new Date(Date.UTC(todayKey.getUTCFullYear(), todayKey.getUTCMonth(), 1));
 
    const [todayLogs, monthLogs, pendingClientIds] = await Promise.all([
      RefreshmentLog.find({ date: todayKey, isArchived: { $ne: true } }),
      RefreshmentLog.find({ date: { $gte: monthStart }, isArchived: { $ne: true } }),
      RefreshmentLog.distinct('client', { invoiceGenerated: false, isArchived: { $ne: true } })
    ]);
 
    const todayCoffee = todayLogs.filter(l => l.itemName === 'Coffee').reduce((s, l) => s + l.quantity, 0);
    const todayTea = todayLogs.filter(l => l.itemName === 'Tea').reduce((s, l) => s + l.quantity, 0);
    const monthTotal = monthLogs.reduce((s, l) => s + l.quantity, 0);
 
    res.status(200).json({
      success: true,
      data: {
        todayCoffee,
        todayTea,
        monthTotal,
        pendingClientsCount: pendingClientIds.length
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
 
// @desc    Unbilled totals grouped by client, with an estimated amount
//          using current pricing (actual billed amount is only locked in
//          when the invoice is generated).
// @route   GET /api/v1/refreshments/pending
// @access  Private (Staff)
exports.getPendingSummary = async (req, res) => {
  try {
    const logs = await RefreshmentLog.find({ invoiceGenerated: false, isArchived: { $ne: true } })
      .populate('client', 'companyName');
    const pricing = await RefreshmentPricing.find({});
    const priceMap = new Map(pricing.map(p => [p.itemName, p.unitPrice]));
 
    const byClient = new Map();
    for (const log of logs) {
      if (!log.client) continue;
      const key = log.client._id.toString();
      if (!byClient.has(key)) {
        byClient.set(key, { client: log.client, logCount: 0, estimatedAmount: 0, missingPricing: new Set(), byItem: {} });
      }
      const entry = byClient.get(key);
      entry.logCount++;
      entry.byItem[log.itemName] = (entry.byItem[log.itemName] || 0) + log.quantity;
      const rate = priceMap.get(log.itemName);
      if (rate === undefined) {
        entry.missingPricing.add(log.itemName);
      } else {
        entry.estimatedAmount += rate * log.quantity;
      }
    }
 
    const data = Array.from(byClient.values()).map(e => ({
      client: e.client,
      logCount: e.logCount,
      estimatedAmount: Number(e.estimatedAmount.toFixed(2)),
      byItem: e.byItem,
      missingPricing: Array.from(e.missingPricing)
    }));
 
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
 
// ─────────────────────────────────────────────────────────────────────────
// PRICING (small, rarely-touched catalog — never part of daily entry)
// ─────────────────────────────────────────────────────────────────────────
 
// @desc    Get the pricing catalog
// @route   GET /api/v1/refreshments/pricing
// @access  Private (Staff)
exports.getPricing = async (req, res) => {
  try {
    const pricing = await RefreshmentPricing.find({}).sort('itemName');
    res.status(200).json({ success: true, data: pricing });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
 
// @desc    Set/update the price for an item (creates it if it doesn't exist
//          yet — covers new "Other" item names the first time they're used)
// @route   PUT /api/v1/refreshments/pricing
// @access  Private (Staff)
exports.upsertPricing = async (req, res) => {
  try {
    const { itemName, unitPrice } = req.body;
    if (!itemName || unitPrice === undefined || Number(unitPrice) < 0) {
      return res.status(400).json({ success: false, error: 'itemName and a non-negative unitPrice are required.' });
    }
    const pricing = await RefreshmentPricing.findOneAndUpdate(
      { itemName: itemName.trim() },
      { unitPrice: Number(unitPrice) },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true, data: pricing });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
 
// ─────────────────────────────────────────────────────────────────────────
// BILLING
// ─────────────────────────────────────────────────────────────────────────
 
// @desc    Generate a standalone Refreshments invoice from a client's
//          unbilled logs. Resolves + locks in pricing at this point.
// @route   POST /api/v1/refreshments/generate-invoice
// @access  Private (Staff)
exports.generateRefreshmentInvoice = async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) return res.status(400).json({ success: false, error: 'clientId is required.' });
 
    const clientDoc = await Client.findById(clientId);
    if (!clientDoc) return res.status(404).json({ success: false, error: 'Client not found' });
 
    const logs = await RefreshmentLog.find({ client: clientId, invoiceGenerated: false, isArchived: { $ne: true } });
    if (logs.length === 0) {
      return res.status(400).json({ success: false, error: 'No pending refreshment charges for this client.' });
    }
 
    const pricing = await RefreshmentPricing.find({});
    const priceMap = new Map(pricing.map(p => [p.itemName, p.unitPrice]));
 
    const missing = [...new Set(logs.filter(l => !priceMap.has(l.itemName)).map(l => l.itemName))];
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Set a price for ${missing.join(', ')} in Refreshments Pricing before generating this invoice.`
      });
    }
 
    let baseAmount = 0;
    for (const log of logs) {
      const rate = priceMap.get(log.itemName);
      log.unitPrice = rate;
      log.amount = Number((rate * log.quantity).toFixed(2));
      baseAmount += log.amount;
    }
    baseAmount = Number(baseAmount.toFixed(2));
 
    const invoiceId = await getNextInvoiceId();
    const now = new Date();
 
    // Standalone invoice, always separate from rent billing, no GST — per
    // the Refreshments billing requirements.
    const invoice = await Invoice.create({
      invoiceId,
      clientId,
      billingPeriod: 'Refreshments',
      baseAmount,
      overageAmount: 0,
      totalAmount: baseAmount,
      dueDate: now,
      status: 'Pending'
    });
 
    for (const log of logs) {
      log.invoiceGenerated = true;
      log.invoice = invoice._id;
      await log.save();
    }
 
    await logActivity({
      title: 'Refreshments Invoice Generated',
      desc: `Invoice ${invoiceId} generated for ${clientDoc.companyName} — ${logs.length} item(s), ₹${baseAmount}`,
      type: 'payment',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-orange-500'
    });
 
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
 
// ─────────────────────────────────────────────────────────────────────────
// LOGS — filterable list, delete
// ─────────────────────────────────────────────────────────────────────────
 
// @desc    Get logs with optional filters
// @route   GET /api/v1/refreshments?client=&date=&month=YYYY-MM&item=&status=billed|pending
// @access  Private (Staff)
exports.getRefreshmentLogs = async (req, res) => {
  try {
    const query = { isArchived: { $ne: true } };
    if (req.query.client) query.client = req.query.client;
    if (req.query.item) query.itemName = req.query.item;
    if (req.query.status === 'billed') query.invoiceGenerated = true;
    if (req.query.status === 'pending') query.invoiceGenerated = false;
 
    if (req.query.date) {
      query.date = toDayKey(req.query.date);
    } else if (req.query.month) {
      const [year, month] = req.query.month.split('-').map(Number);
      query.date = {
        $gte: new Date(Date.UTC(year, month - 1, 1)),
        $lt: new Date(Date.UTC(year, month, 1))
      };
    }
 
    const logs = await RefreshmentLog.find(query)
      .populate('client', 'companyName')
      .sort('-date');
 
    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
 
// @desc    Delete an unbilled refreshment log
// @route   DELETE /api/v1/refreshments/:id
// @access  Private (Staff)
exports.deleteRefreshmentLog = async (req, res) => {
  try {
    const log = await RefreshmentLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, error: 'Refreshment log not found' });
 
    if (log.invoiceGenerated) {
      return res.status(400).json({ success: false, error: 'This entry has already been invoiced and cannot be deleted.' });
    }
 
    await log.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
 
// ─────────────────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────────────────
 
// @desc    Bundled report data — kept as one call rather than many small
//          endpoints to keep this simple.
// @route   GET /api/v1/refreshments/reports
// @access  Private (Staff)
exports.getReports = async (req, res) => {
  try {
    const todayKey = toDayKey(new Date());
    const weekStart = startOfWeek(todayKey);
    const monthStart = new Date(Date.UTC(todayKey.getUTCFullYear(), todayKey.getUTCMonth(), 1));
 
    const [todayLogs, weekLogs, monthLogs, pendingClientIds, billedInvoiceCount] = await Promise.all([
      RefreshmentLog.find({ date: todayKey, isArchived: { $ne: true } }),
      RefreshmentLog.find({ date: { $gte: weekStart }, isArchived: { $ne: true } }),
      RefreshmentLog.find({ date: { $gte: monthStart }, isArchived: { $ne: true } }).populate('client', 'companyName'),
      RefreshmentLog.distinct('client', { invoiceGenerated: false, isArchived: { $ne: true } }),
      Invoice.countDocuments({ billingPeriod: 'Refreshments', isArchived: { $ne: true } })
    ]);
 
    const sumQty = (logs) => logs.reduce((s, l) => s + l.quantity, 0);
    const byItemQty = (logs, item) => logs.filter(l => l.itemName === item).reduce((s, l) => s + l.quantity, 0);
 
    const topClientsMap = new Map();
    for (const log of monthLogs) {
      if (!log.client) continue;
      const key = log.client._id.toString();
      if (!topClientsMap.has(key)) topClientsMap.set(key, { companyName: log.client.companyName, totalQty: 0 });
      topClientsMap.get(key).totalQty += log.quantity;
    }
    const topClients = Array.from(topClientsMap.values()).sort((a, b) => b.totalQty - a.totalQty).slice(0, 5);
 
    res.status(200).json({
      success: true,
      data: {
        today: { totalQty: sumQty(todayLogs), coffee: byItemQty(todayLogs, 'Coffee'), tea: byItemQty(todayLogs, 'Tea') },
        thisWeek: { totalQty: sumQty(weekLogs), coffee: byItemQty(weekLogs, 'Coffee'), tea: byItemQty(weekLogs, 'Tea') },
        thisMonth: { totalQty: sumQty(monthLogs), coffee: byItemQty(monthLogs, 'Coffee'), tea: byItemQty(monthLogs, 'Tea') },
        topClients,
        pendingInvoicesCount: pendingClientIds.length,
        billedInvoicesCount: billedInvoiceCount
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
 
// ─────────────────────────────────────────────────────────────────────────
// IMPORT / EXPORT
// ─────────────────────────────────────────────────────────────────────────
 
// @desc    Bulk-import consumption rows (parsed client-side from a CSV/
//          Excel export, posted here as plain JSON rows) — for staff who
//          track things in Excel some days and need to bring it in here.
// @route   POST /api/v1/refreshments/import
// @access  Private (Staff)
exports.importRefreshmentLogs = async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No rows to import.' });
    }
 
    const clients = await Client.find({}).select('companyName');
    const clientByName = new Map(clients.map(c => [c.companyName.trim().toLowerCase(), c]));
 
    let imported = 0;
    const errors = [];
 
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +1 for header row, +1 for 1-indexing
      const clientMatch = clientByName.get((row.client || '').trim().toLowerCase());
 
      if (!clientMatch) {
        errors.push(`Row ${rowNum}: no client matching "${row.client}"`);
        continue;
      }
      if (!row.item || !row.quantity || Number(row.quantity) <= 0) {
        errors.push(`Row ${rowNum}: item and a positive quantity are required`);
        continue;
      }
 
      const dayKey = toDayKey(row.date);
      const itemName = row.item.trim();
      const quantity = Number(row.quantity);
 
      const existing = await RefreshmentLog.findOne({ client: clientMatch._id, date: dayKey, itemName });
      if (existing?.invoiceGenerated) {
        errors.push(`Row ${rowNum}: ${clientMatch.companyName} / ${itemName} on that day is already invoiced, skipped`);
        continue;
      }
 
      if (existing) {
        existing.quantity = quantity;
        existing.notes = row.notes || existing.notes;
        await existing.save();
      } else {
        await RefreshmentLog.create({
          client: clientMatch._id,
          itemName,
          quantity,
          date: dayKey,
          notes: row.notes || '',
          loggedBy: req.user.name
        });
      }
      imported++;
    }
 
    res.status(200).json({ success: true, imported, errorCount: errors.length, errors: errors.slice(0, 20) });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
 
// @desc    Export consumption as CSV text
// @route   GET /api/v1/refreshments/export?scope=all|date|client|month&date=&client=&month=
// @access  Private (Staff)
exports.exportRefreshmentLogs = async (req, res) => {
  try {
    const { scope, date, client, month, status } = req.query;
    const query = { isArchived: { $ne: true } };
 
    if (scope === 'date' && date) query.date = toDayKey(date);
    if (scope === 'client' && client) query.client = client;
    if (scope === 'month' && month) {
      const [year, m] = month.split('-').map(Number);
      query.date = { $gte: new Date(Date.UTC(year, m - 1, 1)), $lt: new Date(Date.UTC(year, m, 1)) };
    }
    if (status === 'billed') query.invoiceGenerated = true;
    if (status === 'pending') query.invoiceGenerated = false;
 
    const logs = await RefreshmentLog.find(query).populate('client', 'companyName').sort('-date');
 
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const header = ['Date', 'Client', 'Item', 'Quantity', 'Notes', 'Invoice Status'].map(escapeCsv).join(',');
    const rows = logs.map(l => [
      l.date.toISOString().split('T')[0],
      l.client?.companyName || 'Unknown',
      l.itemName,
      l.quantity,
      l.notes || '',
      l.invoiceGenerated ? 'Billed' : 'Pending'
    ].map(escapeCsv).join(','));
 
    const csv = [header, ...rows].join('\n');
 
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="refreshments-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};