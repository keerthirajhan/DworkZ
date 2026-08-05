const RefreshmentLog = require('../models/RefreshmentLog');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const logActivity = require('../utils/activityLogger');
const { getNextInvoiceId } = require('../utils/invoiceIdGenerator');

// @desc    Get refreshment logs (optionally filtered by client)
// @route   GET /api/v1/refreshments?client=<clientId>
// @access  Private (Admin/Staff)
exports.getRefreshmentLogs = async (req, res) => {
  try {
    const query = { isArchived: { $ne: true } };
    if (req.query.client) query.client = req.query.client;

    const logs = await RefreshmentLog.find(query)
      .populate('client', 'companyName name contactEmail')
      .sort('-date');

    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Pending (unbilled) refreshment totals grouped by client
// @route   GET /api/v1/refreshments/pending
// @access  Private (Admin/Staff)
exports.getPendingSummary = async (req, res) => {
  try {
    const summary = await RefreshmentLog.aggregate([
      { $match: { invoiceGenerated: false, isArchived: { $ne: true } } },
      {
        $group: {
          _id: '$client',
          totalPending: { $sum: '$amount' },
          logCount: { $sum: 1 },
          lastDate: { $max: '$date' }
        }
      },
      { $sort: { lastDate: -1 } }
    ]);

    // Populate client details onto the aggregation result.
    const clientIds = summary.map(s => s._id);
    const clients = await Client.find({ _id: { $in: clientIds } }).select('companyName name contactEmail');
    const clientMap = new Map(clients.map(c => [c._id.toString(), c]));

    const data = summary.map(s => ({
      client: clientMap.get(s._id?.toString()) || null,
      totalPending: s.totalPending,
      logCount: s.logCount,
      lastDate: s.lastDate
    })).filter(s => s.client); // drop entries for clients that no longer exist

    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Log a refreshment consumption entry for a client
// @route   POST /api/v1/refreshments
// @access  Private (Admin/Staff)
exports.createRefreshmentLog = async (req, res) => {
  try {
    const { client, itemName, quantity, unitPrice, notes, date } = req.body;

    if (!client || !itemName || !quantity || unitPrice === undefined || unitPrice === null) {
      return res.status(400).json({ success: false, error: 'client, itemName, quantity, and unitPrice are required.' });
    }

    const clientDoc = await Client.findById(client);
    if (!clientDoc) return res.status(404).json({ success: false, error: 'Client not found' });

    const qty = Number(quantity);
    const price = Number(unitPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
      return res.status(400).json({ success: false, error: 'Quantity must be a positive number and price a non-negative number.' });
    }

    // Amount is always computed here, server-side — never trust a
    // client-posted total for something that feeds real billing.
    const amount = Number((qty * price).toFixed(2));

    const log = await RefreshmentLog.create({
      client,
      itemName: itemName.trim(),
      quantity: qty,
      unitPrice: price,
      amount,
      date: date ? new Date(date) : Date.now(),
      notes,
      loggedBy: req.user.name
    });

    await logActivity({
      title: 'Refreshment Logged',
      desc: `${qty} x ${itemName.trim()} (₹${amount}) logged for ${clientDoc.companyName}`,
      type: 'client',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-orange-500'
    });

    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete an unbilled refreshment log
// @route   DELETE /api/v1/refreshments/:id
// @access  Private (Admin/Staff)
exports.deleteRefreshmentLog = async (req, res) => {
  try {
    const log = await RefreshmentLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, error: 'Refreshment log not found' });

    // Once a log has been pulled into an invoice, it's locked — deleting it
    // would let a billed amount silently drift from what was actually
    // invoiced. Correcting a billed entry should go through a credit /
    // adjustment on the invoice itself, not a silent delete here.
    if (log.invoiceGenerated) {
      return res.status(400).json({ success: false, error: 'This entry has already been invoiced and cannot be deleted.' });
    }

    await log.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Generate a standalone Refreshments invoice from a client's
//          unbilled logs
// @route   POST /api/v1/refreshments/generate-invoice
// @access  Private (Admin/Staff)
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

    const baseAmount = Number(logs.reduce((sum, l) => sum + l.amount, 0).toFixed(2));

    const invoiceId = await getNextInvoiceId();
    const now = new Date();

    // Refreshments are billed as a standalone, one-off invoice per your
    // requirements — not folded into the client's monthly rent invoice.
    // No GST is applied to keep these simple ad-hoc consumable charges;
    // add cgstAmount/sgstAmount here later if that ever needs to change.
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

    await RefreshmentLog.updateMany(
      { _id: { $in: logs.map(l => l._id) } },
      { invoiceGenerated: true, invoice: invoice._id }
    );

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
