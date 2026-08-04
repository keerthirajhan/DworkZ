const Notification = require('../models/Notification');

// @desc    Get logged-in client's notifications
// @route   GET /api/v1/notifications
// @access  Client Portal (JWT)
exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ client: req.clientPortal.id })
      .sort('-createdAt')
      .limit(100); // reasonable cap for a notification dropdown/page

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Mark a single notification as read
// @route   PATCH /api/v1/notifications/:id/read
// @access  Client Portal (JWT)
exports.markAsRead = async (req, res) => {
  try {
    // Scoped to req.clientPortal.id so a client can only ever mark their
    // own notifications — findOneAndUpdate with both filters means a
    // mismatched id simply returns null rather than touching someone
    // else's record.
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, client: req.clientPortal.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Mark all of the logged-in client's notifications as read
// @route   PATCH /api/v1/notifications/read-all
// @access  Client Portal (JWT)
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { client: req.clientPortal.id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/v1/notifications/:id
// @access  Client Portal (JWT)
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      client: req.clientPortal.id
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
