const express = require('express');
const {
  getInvoices,
  generateInvoices,
  sendInvoice,
  markInvoiceSent,
  markAsPaid,
  updateInvoice,
  deleteInvoice,
  getArchivedInvoices,
  deleteInvoicePermanent
} = require('../controllers/invoiceController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getInvoices);
router.get('/archived', getArchivedInvoices);
router.post('/generate', generateInvoices);
router.post('/guest/:bookingId', require('../controllers/invoiceController').generateGuestInvoice);
router.post('/visitor/:visitorId', require('../controllers/invoiceController').generateVisitorInvoice);
router.post('/:id/send', sendInvoice);
router.post('/:id/mark-sent', markInvoiceSent);
router.post('/:id/mark-paid', markAsPaid);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);
router.delete('/:id/permanent', deleteInvoicePermanent);

module.exports = router;
