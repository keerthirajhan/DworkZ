const express = require('express');
const {
  getDailyEntries,
  saveDailyEntries,
  getPendingSummary,
  getClientStatement,
  getPricing,
  upsertPricing,
  generateRefreshmentInvoice,
  deleteRefreshmentLog,
  importRefreshmentLogs,
  exportRefreshmentLogs
} = require('../controllers/refreshmentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'staff'));

// Daily entry — the core everyday workflow
router.route('/daily')
  .get(getDailyEntries)
  .post(saveDailyEntries);

// Who needs billing (lightweight list, not a dashboard)
router.get('/pending', getPendingSummary);

// Client monthly statement — the day-by-day breakdown + invoice launch point
router.get('/statement', getClientStatement);

// Rates (Coffee/Tea only, never an open catalog)
router.route('/pricing')
  .get(getPricing)
  .put(upsertPricing);

// Billing
router.post('/generate-invoice', generateRefreshmentInvoice);

// Import / export
router.post('/import', importRefreshmentLogs);
router.get('/export', exportRefreshmentLogs);

router.delete('/:id', deleteRefreshmentLog);

module.exports = router;
