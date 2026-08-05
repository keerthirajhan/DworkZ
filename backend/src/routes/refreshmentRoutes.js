const express = require('express');
const {
  getRefreshmentLogs,
  getPendingSummary,
  createRefreshmentLog,
  deleteRefreshmentLog,
  generateRefreshmentInvoice
} = require('../controllers/refreshmentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('admin', 'staff'), getRefreshmentLogs)
  .post(authorize('admin', 'staff'), createRefreshmentLog);

router.get('/pending', authorize('admin', 'staff'), getPendingSummary);
router.post('/generate-invoice', authorize('admin', 'staff'), generateRefreshmentInvoice);
router.delete('/:id', authorize('admin', 'staff'), deleteRefreshmentLog);

module.exports = router;
