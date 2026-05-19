const express = require('express');
const router = express.Router();
const { sendProposal, sendInvoice, getEmailHistory } = require('../controllers/emailController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/send-proposal', protect, sendProposal);
router.post('/send-invoice', protect, sendInvoice);
router.get('/history/:clientId', protect, getEmailHistory);

module.exports = router;
