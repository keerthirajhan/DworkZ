const express = require('express');
const {
  getClients,
  getClient,
  getPublicProposal,
  createClient,
  updateClient,
  deleteClient,
  restoreClient,
  createProposal,
  sendProposal,
  generateAgreement,
  signAgreement,
  getAgreements,
  getProposals,
  updateProposalStatus,
  sendAgreementEmail,
  markProposalSent,
  markAgreementSent,
  deleteAgreement,
  getDashboardStats,
  getArchivedClients,
  deleteClientPermanently,
  activateClient,
  cancelPlan,
  upgradePlan
} = require('../controllers/clientController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes (No authentication needed for clients viewing documents)
router.get('/public/proposal/:id', getPublicProposal);

// Apply protection middleware to all other client routes
router.use(protect);

router.get('/stats', authorize('admin', 'staff'), getDashboardStats);
router.get('/archived', authorize('admin', 'staff'), getArchivedClients);

router
  .route('/')
  .get(authorize('admin', 'staff'), getClients)
  .post(authorize('admin', 'staff'), createClient);

router
  .route('/:id')
  .get(authorize('admin', 'staff'), getClient)
  .put(authorize('admin', 'staff'), updateClient)
  .patch(authorize('admin', 'staff'), updateClient)
  .delete(authorize('admin', 'staff'), deleteClient); // Archive action allowed for staff

router.delete('/:id/permanent', authorize('admin'), deleteClientPermanently);
router.put('/:id/restore', authorize('admin', 'staff'), restoreClient);

router.post('/:id/proposals', authorize('admin', 'staff'), createProposal);
router.get('/:id/proposals', authorize('admin', 'staff'), getProposals);
router.put('/:id/proposals/:propId/status', authorize('admin', 'staff'), updateProposalStatus);
router.post('/:id/proposal/send', authorize('admin', 'staff'), sendProposal);
router.post('/:id/proposal/mark-sent', authorize('admin', 'staff'), markProposalSent);
router.post('/:id/agreements', authorize('admin', 'staff'), generateAgreement);
router.get('/:id/agreements', authorize('admin', 'staff'), getAgreements);
router.post('/:id/agreements/:agrId/sign', authorize('admin', 'staff'), signAgreement);
router.post('/:id/agreements/:agrId/send', authorize('admin', 'staff'), sendAgreementEmail);
router.post('/:id/agreements/:agrId/mark-sent', authorize('admin', 'staff'), markAgreementSent);
router.delete('/:id/agreements/:agrId', authorize('admin'), deleteAgreement);
router.post('/:id/activate', authorize('admin', 'staff'), activateClient);
router.post('/:id/cancel', authorize('admin', 'staff'), cancelPlan);
router.post('/:id/upgrade', authorize('admin', 'staff'), upgradePlan);

module.exports = router;
