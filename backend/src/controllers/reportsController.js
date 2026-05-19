const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const Inventory = require('../models/Inventory');
const Booking = require('../models/Booking');
const Visitor = require('../models/Visitor');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Revenue & Financial Report
// @route   GET /api/v1/reports/revenue
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getRevenueReport = async (req, res) => {
  try {
    const [invoices, inventoryItems] = await Promise.all([
      Invoice.find({ isArchived: { $ne: true } }).populate('clientId', 'companyName'),
      Inventory.find({ isArchived: { $ne: true }, paymentStatus: 'Credit' })
    ]);

    const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
    const pending = invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
    const overdue = invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
    const payables = inventoryItems.reduce((s, i) => s + (i.totalCost || i.unitPrice * i.purchasedQuantity), 0);

    // Monthly revenue for last 12 months
    const now = new Date();
    const monthlyData = [];
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const monthPaid = invoices.filter(i => {
        if (i.status !== 'Paid' || !i.createdAt) return false;
        const id = new Date(i.createdAt);
        return id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear();
      }).reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
      monthlyData.push({ label, amount: monthPaid });
    }

    // Invoice status breakdown
    const statusBreakdown = {
      Paid: invoices.filter(i => i.status === 'Paid').length,
      Pending: invoices.filter(i => i.status === 'Pending').length,
      Overdue: invoices.filter(i => i.status === 'Overdue').length,
    };

    // Top 5 paying clients
    const clientRevMap = {};
    invoices.filter(i => i.status === 'Paid' && i.clientId).forEach(i => {
      const name = i.clientId?.companyName || 'Unknown';
      clientRevMap[name] = (clientRevMap[name] || 0) + (Number(i.totalAmount) || 0);
    });
    const topClients = Object.entries(clientRevMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    res.status(200).json({
      success: true,
      data: { totalRevenue, pending, overdue, payables, monthlyData, statusBreakdown, topClients, totalInvoices: invoices.length }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Client & Occupancy Report
// @route   GET /api/v1/reports/clients
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getClientReport = async (req, res) => {
  try {
    const clients = await Client.find({ isArchived: { $ne: true } });

    const active = clients.filter(c => c.status === 'Active');
    const inactive = clients.filter(c => c.status === 'Inactive');
    const rejected = clients.filter(c => c.status === 'Rejected');
    const leads = clients.filter(c => ['New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Awaiting Signature', 'Awaiting Activation'].includes(c.status));

    // Workspace type distribution
    const workspaceBreakdown = {};
    active.forEach(c => {
      const type = c.workspaceType || 'Unknown';
      workspaceBreakdown[type] = (workspaceBreakdown[type] || 0) + 1;
    });

    // Plan type distribution
    const planBreakdown = {};
    active.forEach(c => {
      const plan = c.planType || 'Unknown';
      planBreakdown[plan] = (planBreakdown[plan] || 0) + 1;
    });

    // Churn list (inactive/rejected with reason)
    const churnList = [...inactive, ...rejected].map(c => ({
      name: c.companyName,
      status: c.status,
      reason: c.rejectionReason || c.cancellationReason || 'Not specified',
      date: c.cancelledAt || c.updatedAt
    })).slice(0, 20);

    // Monthly onboarding trend (last 12 months)
    const now = new Date();
    const onboardingTrend = [];
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const count = active.filter(c => {
        if (!c.onboardingDate) return false;
        const od = new Date(c.onboardingDate);
        return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
      }).length;
      onboardingTrend.push({ label, count });
    }

    // Active clients list
    const activeList = active.map(c => ({
      id: c._id,
      name: c.name,
      company: c.companyName,
      workspace: c.workspaceType,
      plan: c.planType,
      rent: c.rentAmount,
      onboarded: c.onboardingDate
    }));

    res.status(200).json({
      success: true,
      data: {
        totals: { active: active.length, inactive: inactive.length, leads: leads.length, rejected: rejected.length },
        workspaceBreakdown,
        planBreakdown,
        churnList,
        onboardingTrend,
        activeList
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Sales Pipeline Report
// @route   GET /api/v1/reports/pipeline
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getPipelineReport = async (req, res) => {
  try {
    const clients = await Client.find({ isArchived: { $ne: true } });

    const stages = ['New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Awaiting Signature', 'Awaiting Activation', 'Active'];
    const funnel = stages.map(stage => ({
      stage,
      count: clients.filter(c => c.status === stage).length
    }));

    // Lead source breakdown
    const sourceMap = {};
    clients.forEach(c => {
      const src = c.source || 'Unknown';
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });
    const sourceBreakdown = Object.entries(sourceMap).map(([source, count]) => ({ source, count }));

    // Conversion rate
    const totalLeads = clients.length;
    const converted = clients.filter(c => c.status === 'Active').length;
    const conversionRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : 0;

    // Priority breakdown
    const priorityMap = { Hot: 0, Warm: 0, Cold: 0 };
    clients.forEach(c => { if (priorityMap[c.priority] !== undefined) priorityMap[c.priority]++; });

    // Pending follow-ups
    const now = new Date();
    const overdueFollowUps = clients
      .filter(c => c.nextFollowUp && new Date(c.nextFollowUp) < now && !['Active', 'Rejected', 'Archived'].includes(c.status))
      .map(c => ({ name: c.companyName, dueDate: c.nextFollowUp, status: c.status, priority: c.priority }))
      .slice(0, 20);

    res.status(200).json({
      success: true,
      data: { funnel, sourceBreakdown, conversionRate, priorityMap, overdueFollowUps, totalLeads }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Inventory Report
// @route   GET /api/v1/reports/inventory
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getInventoryReport = async (req, res) => {
  try {
    const items = await Inventory.find({ isArchived: { $ne: true } });

    const totalValue = items.reduce((s, i) => s + (i.unitPrice * i.inHandQuantity), 0);
    const totalPurchaseValue = items.reduce((s, i) => s + (i.unitPrice * i.purchasedQuantity), 0);
    const creditDues = items.filter(i => i.paymentStatus === 'Credit').reduce((s, i) => s + (i.totalCost || i.unitPrice * i.purchasedQuantity), 0);

    const lowStock = items.filter(i => i.inHandQuantity < 5 && i.inHandQuantity >= 0);
    const outOfStock = items.filter(i => i.inHandQuantity === 0);

    const allItems = items.map(i => ({
      id: i._id,
      name: i.itemName,
      vendor: i.vendorDetails,
      purchased: i.purchasedQuantity,
      inHand: i.inHandQuantity,
      unitPrice: i.unitPrice,
      totalCost: i.unitPrice * i.purchasedQuantity,
      inHandValue: i.unitPrice * i.inHandQuantity,
      paymentStatus: i.paymentStatus,
      paymentMethod: i.paymentMethod,
      purchaseDate: i.purchaseDate
    }));

    // Payment method breakdown
    const payMethodMap = {};
    items.filter(i => i.paymentStatus === 'Paid').forEach(i => {
      const m = i.paymentMethod || 'Unknown';
      payMethodMap[m] = (payMethodMap[m] || 0) + (i.unitPrice * i.purchasedQuantity);
    });

    res.status(200).json({
      success: true,
      data: {
        totalItems: items.length,
        totalValue,
        totalPurchaseValue,
        creditDues,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        lowStock: lowStock.map(i => ({ name: i.itemName, inHand: i.inHandQuantity, purchased: i.purchasedQuantity })),
        outOfStock: outOfStock.map(i => ({ name: i.itemName, vendor: i.vendorDetails })),
        payMethodBreakdown: Object.entries(payMethodMap).map(([method, amount]) => ({ method, amount })),
        allItems
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Booking & Visitor Report
// @route   GET /api/v1/reports/bookings
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getBookingReport = async (req, res) => {
  try {
    const [bookings, visitors] = await Promise.all([
      Booking.find({}),
      Visitor.find({ isArchived: { $ne: true } })
    ]);

    // Booking stats
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'Confirmed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'Cancelled').length;

    // Room usage
    const roomMap = {};
    bookings.forEach(b => {
      const room = b.roomName || b.resourceName || 'Unknown';
      roomMap[room] = (roomMap[room] || 0) + 1;
    });
    const roomUsage = Object.entries(roomMap)
      .sort((a, b) => b[1] - a[1])
      .map(([room, count]) => ({ room, count }));

    // Monthly booking trend (last 12 months)
    const now = new Date();
    const bookingTrend = [];
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const count = bookings.filter(b => {
        if (!b.date) return false;
        const bd = new Date(b.date);
        return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear();
      }).length;
      bookingTrend.push({ label, count });
    }

    // Visitor stats
    const totalVisitors = visitors.length;
    const checkedIn = visitors.filter(v => v.status === 'Checked In').length;
    const checkedOut = visitors.filter(v => v.status === 'Completed').length;

    // Monthly visitor trend
    const visitorTrend = [];
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const count = visitors.filter(v => {
        if (!v.timeIn) return false;
        const vd = new Date(v.timeIn);
        return vd.getMonth() === d.getMonth() && vd.getFullYear() === d.getFullYear();
      }).length;
      visitorTrend.push({ label, count });
    }

    // Purpose breakdown
    const purposeMap = {};
    visitors.forEach(v => {
      const p = v.purpose || 'General';
      purposeMap[p] = (purposeMap[p] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: {
        bookings: { total: totalBookings, confirmed: confirmedBookings, cancelled: cancelledBookings, roomUsage, trend: bookingTrend },
        visitors: { total: totalVisitors, checkedIn, checkedOut, trend: visitorTrend, purposeBreakdown: Object.entries(purposeMap).map(([purpose, count]) => ({ purpose, count })) }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
