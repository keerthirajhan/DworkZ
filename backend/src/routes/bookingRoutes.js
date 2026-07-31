const express = require('express');
const {
  getBookings,
  getTodayBookings,
  createBooking,
  updateBooking,
  getArchivedBookings,
  cancelBooking,
  restoreBooking,
  deleteBookingPermanent,
  deleteBookingsBulkPermanent
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();
const { createPublicBooking } = require('../controllers/bookingController');

// Public route for external website integration
router.post('/public', createPublicBooking);

router.use(protect);

router
  .route('/')
  .get(getBookings)
  .post(createBooking);

router.get('/today', getTodayBookings);

router.route('/:id')
  .put(authorize('admin', 'staff'), updateBooking)
  .delete(cancelBooking);

router.delete('/:id/permanent', authorize('admin'), deleteBookingPermanent);
router.put('/:id/restore', authorize('admin', 'staff'), restoreBooking);

module.exports = router;
