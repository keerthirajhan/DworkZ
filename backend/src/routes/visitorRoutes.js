const express = require('express');
const { 
  getVisitors, 
  createVisitor, 
  checkOutVisitor, 
  sendOTP, 
  verifyOTP, 
  archiveVisitor, 
  getArchivedVisitors, 
  deleteVisitorPermanently 
} = require('../controllers/visitorController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// --- PUBLIC ROUTES (Kiosk / Visitors) ---
router.post('/kiosk-send-otp', sendOTP);
router.post('/kiosk-verify-otp', verifyOTP);
router.post('/', createVisitor);

// --- PROTECTED ROUTES (Admin / Staff) ---
router.use(protect);

router.get('/', authorize('admin', 'staff'), getVisitors);
router.get('/archived', authorize('admin', 'staff'), getArchivedVisitors);
router.put('/:id/checkout', authorize('admin', 'staff'), checkOutVisitor);
router.put('/:id/archive', authorize('admin', 'staff'), archiveVisitor);
router.delete('/:id/permanent', authorize('admin'), deleteVisitorPermanently);

module.exports = router;
