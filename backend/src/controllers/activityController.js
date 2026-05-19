const Activity = require('../models/Activity');

exports.getActivities = async (req, res) => {
  try {
    let query = Activity.find().sort('-createdAt');
    if (req.query.limit !== 'all') {
      query = query.limit(parseInt(req.query.limit) || 5);
    }
    const activities = await query;
    res.status(200).json({ success: true, count: activities.length, data: activities });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.createActivity = async (req, res) => {
  try {
    const activity = await Activity.create(req.body);
    res.status(201).json({ success: true, data: activity });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.clearAllActivities = async (req, res) => {
  try {
    await Activity.deleteMany({});
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
