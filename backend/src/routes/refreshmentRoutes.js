const express = require('express');
const {
  getDailyEntries,
  saveDailyEntries,
  getDashboardSummary,
  getPendingSummary,
  getPricing,
  upsertPricing,
  generateRefreshmentInvoice,
  getRefreshmentLogs,
  deleteRefreshmentLog,
  getReports,
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
 
// Dashboard / pending / reports
router.get('/dashboard', getDashboardSummary);
router.get('/pending', getPendingSummary);
router.get('/reports', getReports);
 
// Pricing catalog
router.route('/pricing')
  .get(getPricing)
  .put(upsertPricing);
 
// Billing
router.post('/generate-invoice', generateRefreshmentInvoice);
 
// Import / export
router.post('/import', importRefreshmentLogs);
router.get('/export', exportRefreshmentLogs);
 
// Logs list + delete
router.route('/')
  .get(getRefreshmentLogs);
 
router.delete('/:id', deleteRefreshmentLog);
 
module.exports = router;
 