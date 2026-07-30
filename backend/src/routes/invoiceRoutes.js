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
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getInvoices);
router.get('/archived', authorize('admin', 'staff'), getArchivedInvoices);
router.post('/generate', authorize('admin', 'staff'), generateInvoices);
router.post('/guest/:bookingId', authorize('admin', 'staff'), require('../controllers/invoiceController').generateGuestInvoice);
router.post('/visitor/:visitorId', authorize('admin', 'staff'), require('../controllers/invoiceController').generateVisitorInvoice);
router.post('/:id/send', authorize('admin', 'staff'), sendInvoice);
router.post('/:id/mark-sent', authorize('admin', 'staff'), markInvoiceSent);
router.post('/:id/mark-paid', authorize('admin', 'staff'), markAsPaid);
router.put('/:id', authorize('admin', 'staff'), updateInvoice);
router.delete('/:id', authorize('admin', 'staff'), deleteInvoice);
router.delete('/:id/permanent', authorize('admin'), deleteInvoicePermanent);

module.exports = router;