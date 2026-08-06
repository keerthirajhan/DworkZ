const RefreshmentLog = require('../models/RefreshmentLog');
const RefreshmentPricing = require('../models/RefreshmentPricing');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const logActivity = require('../utils/activityLogger');
const { getNextInvoiceId } = require('../utils/invoiceIdGenerator');

// SIMPLIFIED REDESIGN — only 3 things this module needs to do:
//   1. Log Coffee/Tea counts per client, per day.
//   2. Show a client's monthly statement (daily breakdown).
//   3. Generate a no-GST invoice from that statement.
// Reports, dashboards, generic filters, and open-ended "Other" items were
// deliberately removed — they weren't part of the actual requirement and
// were adding visual/API surface area for no real use.

function toDayKey(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// ─────────────────────────────────────────────────────────────────────────
// DAILY ENTRY
// ─────────────────────────────────────────────────────────────────────────

// @desc    Get the daily-entry grid for a given date: every active client,
//          with today's Coffee/Tea counts pre-filled if already logged.
// @route   GET /api/v1/refreshments/daily?date=YYYY-MM-DD
// @access  Private (Staff)
exports.getDailyEntries = async (req, res) => {
  try {
    const dayKey = toDayKey(req.query.date);

    const clients = await Client.find({ status: { $in: ['Active', 'Converted'] }, isArchived: { $ne: true } })
      .select('companyName')
      .sort('companyName');

    // Legacy entries from before this simplification (any itemName other
    // than Coffee/Tea) are excluded here — never shown, never editable,
    // but not deleted from the database either.
    const logs = await RefreshmentLog.find({ date: dayKey, isArchived: { $ne: true }, itemName: { $in: ['Coffee', 'Tea'] } });

    const entries = clients.map(c => {
      const clientLogs = logs.filter(l => l.client.toString() === c._id.toString());
      const coffeeLog = clientLogs.find(l => l.itemName === 'Coffee');
      const teaLog = clientLogs.find(l => l.itemName === 'Tea');

      return {
        client: { _id: c._id, companyName: c.companyName },
        coffee: coffeeLog?.quantity || 0,
        tea: teaLog?.quantity || 0,
        locked: clientLogs.some(l => l.invoiceGenerated)
      };
    });

    res.status(200).json({ success: true, date: dayKey, data: entries });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Save a full day's Coffee/Tea counts in one batch. Re-saving the
//          same day updates existing numbers rather than duplicating;
//          setting a count to 0 removes that (unbilled) entry.
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
        { itemName: 'Tea', quantity: Number(entry.tea) || 0 }
      ];

      for (const item of items) {
        const existing = await RefreshmentLog.findOne({
          client: entry.clientId, date: dayKey, itemName: item.itemName
        });

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
          existing.loggedBy = req.user.name;
          await existing.save();
        } else {
          await RefreshmentLog.create({
            client: entry.clientId,
            itemName: item.itemName,
            quantity: item.quantity,
            date: dayKey,
            loggedBy: req.user.name
          });
        }
        savedCount++;
      }
    }

    await logActivity({
      title: 'Refreshments Logged',
      desc: `Daily Coffee/Tea counts saved for ${dayKey.toDateString()} (${savedCount} entries)`,
      type: 'client',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-orange-500'
    });

    res.status(200).json({
      success: true,
      message: skippedLocked > 0
        ? `Saved. ${skippedLocked} entr${skippedLocked === 1 ? 'y was' : 'ies were'} skipped because that day is already invoiced.`
        : 'Saved.'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// PENDING CLIENTS — lightweight list so staff know who needs billing,
// without a full dashboard.
// ─────────────────────────────────────────────────────────────────────────

// @desc    Clients with any unbilled Coffee/Tea entries
// @route   GET /api/v1/refreshments/pending
// @access  Private (Staff)
exports.getPendingSummary = async (req, res) => {
  try {
    const logs = await RefreshmentLog.find({
      invoiceGenerated: false, isArchived: { $ne: true }, itemName: { $in: ['Coffee', 'Tea'] }
    }).populate('client', 'companyName');

    const byClient = new Map();
    for (const log of logs) {
      if (!log.client) continue;
      const key = log.client._id.toString();
      if (!byClient.has(key)) byClient.set(key, { client: log.client, entryCount: 0 });
      byClient.get(key).entryCount++;
    }

    res.status(200).json({ success: true, data: Array.from(byClient.values()) });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// CLIENT MONTHLY STATEMENT — the day-by-day breakdown, and the launch
// point for generating that month's invoice.
// ─────────────────────────────────────────────────────────────────────────

// @desc    A client's day-by-day Coffee/Tea breakdown for one month
// @route   GET /api/v1/refreshments/statement?client=&month=YYYY-MM
// @access  Private (Staff)
exports.getClientStatement = async (req, res) => {
  try {
    const { client, month } = req.query;
    if (!client || !month) {
      return res.status(400).json({ success: false, error: 'client and month are required.' });
    }

    const [year, m] = month.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, m - 1, 1));
    const monthEnd = new Date(Date.UTC(year, m, 1));

    const logs = await RefreshmentLog.find({
      client, itemName: { $in: ['Coffee', 'Tea'] }, isArchived: { $ne: true },
      date: { $gte: monthStart, $lt: monthEnd }
    }).sort('date');

    // Pivot into one row per day: { date, coffee, tea }
    const byDay = new Map();
    for (const log of logs) {
      const key = log.date.toISOString().split('T')[0];
      if (!byDay.has(key)) byDay.set(key, { date: key, coffee: 0, tea: 0 });
      byDay.get(key)[log.itemName.toLowerCase()] = log.quantity;
    }
    const days = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));

    const totalCoffee = logs.filter(l => l.itemName === 'Coffee').reduce((s, l) => s + l.quantity, 0);
    const totalTea = logs.filter(l => l.itemName === 'Tea').reduce((s, l) => s + l.quantity, 0);
    const hasUnbilled = logs.some(l => !l.invoiceGenerated);
    const hasBilled = logs.some(l => l.invoiceGenerated);

    const pricing = await RefreshmentPricing.find({ itemName: { $in: ['Coffee', 'Tea'] } });
    const priceMap = new Map(pricing.map(p => [p.itemName, p.unitPrice]));
    const coffeeRate = priceMap.get('Coffee') ?? null;
    const teaRate = priceMap.get('Tea') ?? null;
    const estimatedTotal = (coffeeRate !== null ? totalCoffee * coffeeRate : 0) + (teaRate !== null ? totalTea * teaRate : 0);

    res.status(200).json({
      success: true,
      data: {
        days, totalCoffee, totalTea,
        hasUnbilled, hasBilled,
        coffeeRate, teaRate,
        estimatedTotal: Number(estimatedTotal.toFixed(2)),
        missingRates: [coffeeRate === null && totalCoffee > 0 ? 'Coffee' : null, teaRate === null && totalTea > 0 ? 'Tea' : null].filter(Boolean)
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// RATES — exactly two fields (Coffee, Tea), never an open catalog.
// ─────────────────────────────────────────────────────────────────────────

// @desc    Get current Coffee/Tea rates
// @route   GET /api/v1/refreshments/pricing
// @access  Private (Staff)
exports.getPricing = async (req, res) => {
  try {
    const pricing = await RefreshmentPricing.find({ itemName: { $in: ['Coffee', 'Tea'] } });
    res.status(200).json({ success: true, data: pricing });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Set the rate for Coffee or Tea
// @route   PUT /api/v1/refreshments/pricing
// @access  Private (Staff)
exports.upsertPricing = async (req, res) => {
  try {
    const { itemName, unitPrice } = req.body;
    if (!['Coffee', 'Tea'].includes(itemName) || unitPrice === undefined || Number(unitPrice) < 0) {
      return res.status(400).json({ success: false, error: 'itemName must be Coffee or Tea, with a non-negative unitPrice.' });
    }
    const pricing = await RefreshmentPricing.findOneAndUpdate(
      { itemName },
      { unitPrice: Number(unitPrice) },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true, data: pricing });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// BILLING — one invoice per client per calendar month, no GST.
// ─────────────────────────────────────────────────────────────────────────

// @desc    Generate a no-GST invoice for a client's unbilled entries in a
//          specific month.
// @route   POST /api/v1/refreshments/generate-invoice
// @access  Private (Staff)
exports.generateRefreshmentInvoice = async (req, res) => {
  try {
    const { clientId, month } = req.body;
    if (!clientId || !month) return res.status(400).json({ success: false, error: 'clientId and month are required.' });

    const clientDoc = await Client.findById(clientId);
    if (!clientDoc) return res.status(404).json({ success: false, error: 'Client not found' });

    const [year, m] = month.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, m - 1, 1));
    const monthEnd = new Date(Date.UTC(year, m, 1));

    const logs = await RefreshmentLog.find({
      client: clientId, invoiceGenerated: false, isArchived: { $ne: true },
      itemName: { $in: ['Coffee', 'Tea'] }, date: { $gte: monthStart, $lt: monthEnd }
    });
    if (logs.length === 0) {
      return res.status(400).json({ success: false, error: 'No pending refreshment entries for this client in that month.' });
    }

    const pricing = await RefreshmentPricing.find({ itemName: { $in: ['Coffee', 'Tea'] } });
    const priceMap = new Map(pricing.map(p => [p.itemName, p.unitPrice]));

    const missing = [...new Set(logs.filter(l => !priceMap.has(l.itemName)).map(l => l.itemName))];
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Set a rate for ${missing.join(', ')} before generating this invoice.`
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
    const monthLabel = monthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    // Standalone invoice, always separate from rent, never GST — per the
    // requirement.
    const invoice = await Invoice.create({
      invoiceId,
      clientId,
      billingPeriod: `Refreshments — ${monthLabel}`,
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
      desc: `Invoice ${invoiceId} generated for ${clientDoc.companyName} — ${monthLabel}, ₹${baseAmount}`,
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
// DELETE — unbilled entries only
// ─────────────────────────────────────────────────────────────────────────

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
// IMPORT / EXPORT (kept, per explicit request)
// ─────────────────────────────────────────────────────────────────────────

// @desc    Bulk-import Coffee/Tea counts from CSV rows (parsed client-side,
//          posted here as plain JSON rows).
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
      const rowNum = i + 2;
      const clientMatch = clientByName.get((row.client || '').trim().toLowerCase());

      if (!clientMatch) {
        errors.push(`Row ${rowNum}: no client matching "${row.client}"`);
        continue;
      }

      // Only Coffee/Tea are valid — normalize case, reject anything else
      // with a clear error rather than silently accepting it.
      const rawItem = (row.item || '').trim().toLowerCase();
      const itemName = rawItem === 'coffee' ? 'Coffee' : rawItem === 'tea' ? 'Tea' : null;
      if (!itemName) {
        errors.push(`Row ${rowNum}: item must be "Coffee" or "Tea", got "${row.item}"`);
        continue;
      }
      if (!row.quantity || Number(row.quantity) <= 0) {
        errors.push(`Row ${rowNum}: a positive quantity is required`);
        continue;
      }

      const dayKey = toDayKey(row.date);
      const quantity = Number(row.quantity);

      const existing = await RefreshmentLog.findOne({ client: clientMatch._id, date: dayKey, itemName });
      if (existing?.invoiceGenerated) {
        errors.push(`Row ${rowNum}: ${clientMatch.companyName} / ${itemName} on that day is already invoiced, skipped`);
        continue;
      }

      if (existing) {
        existing.quantity = quantity;
        await existing.save();
      } else {
        await RefreshmentLog.create({
          client: clientMatch._id, itemName, quantity, date: dayKey, loggedBy: req.user.name
        });
      }
      imported++;
    }

    res.status(200).json({ success: true, imported, errorCount: errors.length, errors: errors.slice(0, 20) });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Export Coffee/Tea consumption as CSV
// @route   GET /api/v1/refreshments/export?scope=all|date|client|month&date=&client=&month=&status=
// @access  Private (Staff)
exports.exportRefreshmentLogs = async (req, res) => {
  try {
    const { scope, date, client, month, status } = req.query;
    const query = { isArchived: { $ne: true }, itemName: { $in: ['Coffee', 'Tea'] } };

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
    const header = ['Date', 'Client', 'Item', 'Quantity', 'Invoice Status'].map(escapeCsv).join(',');
    const rows = logs.map(l => [
      l.date.toISOString().split('T')[0],
      l.client?.companyName || 'Unknown',
      l.itemName,
      l.quantity,
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
