const express = require('express');
const { getRevenueReport, getClientReport, getPipelineReport, getInventoryReport, getBookingReport } = require('../controllers/reportsController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'staff', 'manager'));

router.get('/revenue', getRevenueReport);
router.get('/clients', getClientReport);
router.get('/pipeline', getPipelineReport);
router.get('/inventory', getInventoryReport);
router.get('/bookings', getBookingReport);

module.exports = router;
