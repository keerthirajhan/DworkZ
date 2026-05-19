const Activity = require('../models/Activity');

/**
 * Logs an activity to the database
 * @param {Object} options - Activity details
 * @param {string} options.title - Short title of the action
 * @param {string} options.desc - Detailed description
 * @param {string} options.type - Category (client, payment, booking, inventory, visitor, system)
 * @param {string} options.user - User ID who performed the action
 * @param {string} options.userName - User Name for display
 * @param {string} options.color - Tailwind color class for UI (default: bg-primary)
 */
const logActivity = async ({ title, desc, type, user, userName, color }) => {
  try {
    await Activity.create({
      title,
      desc,
      type: type || 'system',
      performedBy: user,
      performedByName: userName || 'System',
      color: color || 'bg-primary'
    });
    console.log(`[ACTIVITY LOG] ${title}: ${desc} by ${userName || 'System'}`);
  } catch (err) {
    console.error('[ACTIVITY LOG ERROR]', err.message);
  }
};

module.exports = logActivity;
