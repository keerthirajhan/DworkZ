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

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // PERFORMANCE FIX (Bug: Client Management / Dashboard load lag): this
    // previously ran one separate Booking.find() PER CLIENT inside
    // Promise.all — an N+1 query pattern. It looked parallel (all N
    // queries fire concurrently), but it's still N round-trips to MongoDB,
    // so the endpoint got linearly slower as the client base grew, and it
    // sits directly on the Dashboard's critical path (one of its 4
    // parallel calls). Replaced with a single aggregation query that
    // computes every client's utilized hours for the month in one
    // round-trip, regardless of how many clients there are.
    const clientIds = clients.map(c => c._id);
    const utilizationAgg = await Booking.aggregate([
      { $match: { client: { $in: clientIds }, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: '$client', utilizedHours: { $sum: '$duration' } } }
    ]);
    const utilizedByClient = new Map(utilizationAgg.map(u => [u._id.toString(), u.utilizedHours || 0]));

    const utilizationData = clients.map(client => ({
      id: client._id,
      client: client.companyName || client.name,
      utilized: utilizedByClient.get(client._id.toString()) || 0,
      allowed: ALLOWED_HOURS,
      rate: HOURLY_RATE
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
