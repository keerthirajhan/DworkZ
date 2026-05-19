const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Booking = require('../models/Booking');
const Client = require('../models/Client');
const Inventory = require('../models/Inventory');
const Visitor = require('../models/Visitor');

// @desc    Get dynamic smart alerts for the notification bell
// @route   GET /api/v1/alerts
// @access  Private
exports.getSmartAlerts = async (req, res, next) => {
  try {
    const alerts = [];

    // 1. Payment Reminders (Pending / Overdue Invoices)
    const unpaidInvoices = await Invoice.find({ 
      isArchived: { $ne: true }, 
      status: { $in: ['Pending', 'Overdue'] } 
    }).populate('clientId', 'name companyName').sort('dueDate');

    unpaidInvoices.forEach(inv => {
      const isOverdue = new Date(inv.dueDate) < new Date();
      alerts.push({
        id: `inv-${inv._id}`,
        title: isOverdue ? 'Payment Overdue' : 'Payment Pending',
        desc: `${inv.clientId?.companyName || 'Unknown'} owes ₹${inv.totalAmount.toLocaleString()} for ${inv.invoiceId}`,
        type: 'payment',
        color: isOverdue ? 'text-rose-500' : 'text-orange-500',
        actionLink: '/billing',
        createdAt: inv.createdAt
      });
    });

    // 2. Client Notifications (Awaiting Signatures)
    const awaitingSignatures = await Client.find({
      isArchived: { $ne: true },
      status: 'Awaiting Signature'
    });

    awaitingSignatures.forEach(client => {
      alerts.push({
        id: `sig-${client._id}`,
        title: 'Signature Required',
        desc: `${client.companyName} needs to sign the agreement.`,
        type: 'client',
        color: 'text-blue-500',
        actionLink: `/clients/${client._id}`,
        createdAt: client.createdAt
      });
    });

    // 3. New Bookings (Created in last 24 hours)
    const today = new Date();
    today.setHours(0,0,0,0);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newBookings = await Booking.find({
      status: 'Confirmed',
      createdAt: { $gte: yesterday }
    }).populate('client', 'companyName');

    newBookings.forEach(booking => {
      alerts.push({
        id: `new-book-${booking._id}`,
        title: 'New Booking',
        desc: `${booking.client?.companyName || booking.clientName} booked ${booking.roomName} for ${new Date(booking.date).toLocaleDateString()}`,
        type: 'booking',
        color: 'text-emerald-500',
        actionLink: '/bookings',
        createdAt: booking.createdAt
      });
    });

    // 4. Upcoming Meetings (Next 24 hours - Reminder)
    const next24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const imminentBookings = await Booking.find({
      date: { $gte: today, $lte: next24h },
      status: 'Confirmed'
    }).populate('client', 'companyName');

    imminentBookings.forEach(booking => {
      // Avoid duplicating if it was already added as "New Booking"
      if (!alerts.some(a => a.id === `new-book-${booking._id}`)) {
        alerts.push({
          id: `imminent-${booking._id}`,
          title: 'Upcoming Meeting',
          desc: `Reminder: ${booking.client?.companyName || booking.clientName} at ${booking.startTime} today`,
          type: 'booking',
          color: 'text-blue-500',
          actionLink: '/bookings',
          createdAt: booking.date, // Use date for sorting imminent ones
          displayDate: booking.date
        });
      }
    });

    // 5. Recent Cancellations (last 24 hours)
    const recentCancellations = await Booking.find({
      status: 'Cancelled',
      updatedAt: { $gte: yesterday }
    }).populate('client', 'companyName');

    recentCancellations.forEach(booking => {
      alerts.push({
        id: `cancel-${booking._id}`,
        title: 'Meeting Cancelled',
        desc: `${booking.client?.companyName || booking.clientName} cancelled their booking for ${new Date(booking.date).toLocaleDateString()}`,
        type: 'booking',
        color: 'text-rose-500',
        actionLink: '/bookings',
        createdAt: booking.updatedAt,
        isUrgent: true
      });
    });

    // 5. Low Stock Alerts
    const lowStockItems = await Inventory.find({
      isArchived: { $ne: true },
      inHandQuantity: { $lt: 5 }
    });

    lowStockItems.forEach(item => {
      alerts.push({
        id: `stock-${item._id}`,
        title: 'Low Stock Alert',
        desc: `${item.itemName} has only ${item.inHandQuantity} units left.`,
        type: 'inventory',
        color: 'text-rose-500',
        actionLink: '/inventory',
        createdAt: item.updatedAt || item.createdAt
      });
    });

    // 6. New Lead Notifications
    const newLeads = await Client.find({
      isArchived: { $ne: true },
      status: 'New Lead'
    }).sort('-createdAt').limit(5);

    newLeads.forEach(lead => {
      alerts.push({
        id: `lead-${lead._id}`,
        title: 'New Lead',
        desc: `${lead.name} (${lead.companyName}) joined the pipeline.`,
        type: 'client',
        color: 'text-primary',
        actionLink: '/leads',
        createdAt: lead.createdAt
      });
    });

    // 7. Active Visitors
    const activeVisitors = await Visitor.find({
      status: 'Checked In',
      isArchived: { $ne: true }
    });

    activeVisitors.forEach(v => {
      alerts.push({
        id: `vis-${v._id}`,
        title: 'Visitor In House',
        desc: `${v.name} is visiting ${v.personToVisit}.`,
        type: 'visitor',
        color: 'text-emerald-500',
        actionLink: '/visitors',
        createdAt: v.timeIn
      });
    });

    // Sort by createdAt descending
    alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
