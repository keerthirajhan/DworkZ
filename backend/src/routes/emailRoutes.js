const express = require('express');
const router = express.Router();
const { sendProposal, sendInvoice, getEmailHistory } = require('../controllers/emailController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/send-proposal', protect, authorize('admin', 'staff'), sendProposal);
router.post('/send-invoice', protect, authorize('admin', 'staff'), sendInvoice);
router.get('/history/:clientId', protect, authorize('admin', 'staff'), getEmailHistory);

module.exports = router;
