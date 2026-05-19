const express = require('express');
const { createProposal, getClientProposals } = require('../controllers/proposalController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', createProposal);
router.get('/client/:clientId', getClientProposals);

module.exports = router;
