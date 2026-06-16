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
    const today = new Date();
    today.setHours(0,0,0,0);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const next24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Fetch all alert data concurrently in one round-trip to database
    const [
      unpaidInvoices,
      awaitingSignatures,
      newBookings,
      imminentBookings,
      recentCancellations,
      activeInventoryItems,
      newLeads,
      activeVisitors
    ] = await Promise.all([
      Invoice.find({ 
        isArchived: { $ne: true }, 
        status: { $in: ['Pending', 'Overdue'] } 
      }).populate('clientId', 'name companyName').sort('dueDate'),
      Client.find({
        isArchived: { $ne: true },
        status: 'Awaiting Signature'
      }),
      Booking.find({
        status: 'Confirmed',
        createdAt: { $gte: yesterday }
      }).populate('client', 'companyName'),
      Booking.find({
        date: { $gte: today, $lte: next24h },
        status: 'Confirmed'
      }).populate('client', 'companyName'),
      Booking.find({
        status: 'Cancelled',
        createdAt: { $gte: yesterday } // Use createdAt/updatedAt to capture cancelled today
      }).populate('client', 'companyName'),
      Inventory.find({ isArchived: { $ne: true } }),
      Client.find({
        isArchived: { $ne: true },
        status: 'New Lead'
      }).sort('-createdAt').limit(5),
      Visitor.find({
        status: 'Checked In',
        isArchived: { $ne: true }
      })
    ]);

    // 1. Process Unpaid Invoices
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

    // 2. Process Awaiting Signatures
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

    // 3. Process New Bookings
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

    // 4. Process Upcoming Meetings
    imminentBookings.forEach(booking => {
      if (!alerts.some(a => a.id === `new-book-${booking._id}`)) {
        alerts.push({
          id: `imminent-${booking._id}`,
          title: 'Upcoming Meeting',
          desc: `Reminder: ${booking.client?.companyName || booking.clientName} at ${booking.startTime} today`,
          type: 'booking',
          color: 'text-blue-500',
          actionLink: '/bookings',
          createdAt: booking.date,
          displayDate: booking.date
        });
      }
    });

    // 5. Process Recent Cancellations
    recentCancellations.forEach(booking => {
      alerts.push({
        id: `cancel-${booking._id}`,
        title: 'Meeting Cancelled',
        desc: `${booking.client?.companyName || booking.clientName} cancelled their booking for ${new Date(booking.date).toLocaleDateString()}`,
        type: 'booking',
        color: 'text-rose-500',
        actionLink: '/bookings',
        createdAt: booking.updatedAt || booking.createdAt,
        isUrgent: true
      });
    });

    // 6. Process Low Stock Items
    const lowStockItems = activeInventoryItems.filter(item => {
      if (item.purchasedQuantity <= 0) return false;
      return (item.inHandQuantity / item.purchasedQuantity) <= 0.25;
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

    // 7. Process New Leads
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

    // 8. Process Active Visitors
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
