const Proposal = require('../models/Proposal');
const Client = require('../models/Client');

// @desc    Create a proposal
// @route   POST /api/v1/proposals
// @access  Private
exports.createProposal = async (req, res, next) => {
  try {
    const proposal = await Proposal.create(req.body);

    // Update client status
    await Client.findByIdAndUpdate(req.body.client, { status: 'Proposal Sent' });

    res.status(201).json({ success: true, data: proposal });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all proposals for a client
// @route   GET /api/v1/proposals/client/:clientId
// @access  Private
exports.getClientProposals = async (req, res, next) => {
  try {
    const proposals = await Proposal.find({ client: req.params.clientId });
    res.status(200).json({ success: true, count: proposals.length, data: proposals });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
