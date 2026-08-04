const express = require('express');
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');
const { protectClientPortal } = require('../middlewares/clientPortalMiddleware');

const router = express.Router();

// Every notification route is Client Portal-only: a client can only ever
// see/modify their own notifications, and there is no admin-facing
// notification inbox in this feature (admin actions are the *source* of
// client notifications, not a recipient of them).
router.use(protectClientPortal);

router.get('/', getMyNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
