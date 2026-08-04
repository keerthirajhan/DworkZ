const Client = require('../models/Client');
const Booking = require('../models/Booking');

// @desc    Get meeting room utilization stats
// @route   GET /api/v1/utilization
// @access  Private
exports.getUtilization = async (req, res, next) => {
  try {
    // We define a standard quota (e.g., 12 hours) and hourly overage rate (e.g., 500 INR)
    const ALLOWED_HOURS = 12;
    const HOURLY_RATE = 500;

    // Get all active + converted clients (lead-converted clients carry
    // status: 'Converted', not 'Active' — both count as billable occupants,
    // matching the aggregation logic in clientController.js)
    const clients = await Client.find({ status: { $in: ['Active', 'Converted'] } });

    // Calculate utilization for each client
    const utilizationData = await Promise.all(clients.map(async (client) => {
      // Find all bookings for this client in the current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const bookings = await Booking.find({
        client: client._id,
        createdAt: { $gte: startOfMonth }
      });

      const utilizedHours = bookings.reduce((sum, b) => sum + (b.duration || 0), 0);
      
      return {
        id: client._id,
        client: client.companyName || client.name,
        utilized: utilizedHours,
        allowed: ALLOWED_HOURS,
        rate: HOURLY_RATE
      };
    }));

    res.status(200).json({
      success: true,
      data: utilizationData
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};
