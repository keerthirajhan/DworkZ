const express = require('express');
const router = express.Router();
const {
  clientPortalLogin,
  setupPortalCredentials,
  changePortalPassword,
  getMyProfile,
  getMyBookings,
  createMyBooking,
  cancelMyBooking,
  deleteMyBooking
} = require('../controllers/clientPortalController');
const { protectClientPortal } = require('../middlewares/clientPortalMiddleware');
const { protect, authorize } = require('../middlewares/authMiddleware');

// ─── PUBLIC ─────────────────────────────────────────────────────────────────
router.post('/login', clientPortalLogin);

// ─── ADMIN ONLY: Setup credentials for a client ─────────────────────────────
router.post('/admin/setup/:clientId', protect, authorize('admin', 'staff'), setupPortalCredentials);

// ─── CLIENT PORTAL (JWT-protected) ──────────────────────────────────────────
router.get('/me', protectClientPortal, getMyProfile);
router.post('/change-password', protectClientPortal, changePortalPassword);
router.get('/bookings', protectClientPortal, getMyBookings);
router.post('/bookings', protectClientPortal, createMyBooking);
router.put('/bookings/:bookingId/cancel', protectClientPortal, cancelMyBooking);
router.delete('/bookings/:bookingId', protectClientPortal, deleteMyBooking);

module.exports = router;
