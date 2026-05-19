const Client = require('../models/Client');
const axios = require('axios');
const Proposal = require('../models/Proposal');
const Agreement = require('../models/Agreement');
const Invoice = require('../models/Invoice');
const Inventory = require('../models/Inventory');
const Activity = require('../models/Activity');
const logActivity = require('../utils/activityLogger');
const emailService = require('../services/emailService');
const agreementTemplate = require('../templates/agreementTemplate');



exports.getClients = async (req, res, next) => {
  try {
    const clients = await Client.find({ isArchived: false });
    res.status(200).json({ success: true, count: clients.length, data: clients });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get single client
// @route   GET /api/v1/clients/:id
// @access  Private
exports.getClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id).populate({
      path: 'userId',
      select: 'name email role'
    });

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    res.status(200).json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Create new client / lead
// @route   POST /api/v1/clients
// @access  Private (Admin/Staff)
exports.createClient = async (req, res, next) => {
  try {
    const client = await Client.create({
      ...req.body,
      lastActionBy: req.user.name,
      lastActionAt: Date.now()
    });

    await logActivity({
      title: 'Client Created',
      desc: `New lead/client created for ${client.companyName}`,
      type: 'client',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-emerald-500'
    });

    global.io?.emit('bookingUpdated');
    res.status(201).json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update client
// @route   PUT /api/v1/clients/:id
// @access  Private (Admin/Staff)
exports.updateClient = async (req, res, next) => {
  try {
    console.log(`[DEBUG] Updating Client ${req.params.id} with:`, req.body);
    const client = await Client.findByIdAndUpdate(req.params.id, {
      ...req.body,
      lastActionBy: req.user.name,
      lastActionAt: Date.now()
    }, {
      new: true,
      runValidators: false 
    });

    await logActivity({
      title: 'Client Updated',
      desc: `Updated profile for ${client.companyName}`,
      type: 'client',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-blue-500'
    });

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    global.io?.emit('bookingUpdated');
    res.status(200).json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Archive client (Soft Delete)
// @route   DELETE /api/v1/clients/:id
// @access  Private (Admin/Staff)
exports.deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, {
      isArchived: true,
      archivedAt: Date.now(),
      lastActionBy: req.user.name,
      lastActionAt: Date.now()
    }, { new: true });

    await logActivity({
      title: 'Client Archived',
      desc: `Archived ${client.companyName}`,
      type: 'client',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-rose-500'
    });

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get archived clients
// @route   GET /api/v1/clients/archived
// @access  Private (Admin/Staff)
exports.getArchivedClients = async (req, res, next) => {
  try {
    const clients = await Client.find({ isArchived: true }).sort('-archivedAt');
    res.status(200).json({ success: true, count: clients.length, data: clients });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Permanently delete client
// @route   DELETE /api/v1/clients/:id/permanent
// @access  Private (Admin only)
exports.deleteClientPermanently = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized. Admin role required.' });
    }
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });
    res.status(200).json({ success: true, message: 'Client permanently deleted.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};



// @desc    Create/Save Proposal Data for a Lead
// @route   POST /api/v1/clients/:id/proposal/create
// @access  Private (Admin/Staff)
exports.createProposal = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });
    
    // Save pricing and workspace details and set proposalCreated
    client.pricingDetails = {
      pricePerSeat: req.body.pricePerSeat,
      totalPrice: req.body.totalPrice,
      discount: req.body.discount || 0
    };
    client.rentAmount = req.body.totalPrice; // Sync rentAmount for UI logic
    client.planType = req.body.proposedPlan || client.planType;
    client.workspaceType = req.body.workspaceType || client.workspaceType;
    client.workspaceDetails = req.body.workspaceDetails || client.workspaceDetails;
    client.seats = req.body.seats || client.seats;
    client.proposalCreated = true;
    
    if (req.body.pdfBase64) {
      client.proposalPDFUrl = req.body.pdfBase64;
    }
    
    // Also create a history record in Proposal model
    await Proposal.create({
      client: client._id,
      proposedPlan: client.planType,
      proposedRent: client.rentAmount,
      workspaceType: client.workspaceType,
      workspaceDetails: client.workspaceDetails,
      status: 'Created'
    });

    await client.save();
    
    res.status(200).json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Send Proposal Email with PDF Attachment
// @route   POST /api/v1/clients/:id/proposal/send
// @access  Private (Admin/Staff)
exports.sendProposal = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const { emailContent, pdfBase64 } = req.body;

    // Use the centralized emailService (SendGrid)
    await emailService.sendEmail({
      to: client.contactEmail,
      subject: emailContent.subject || `Workspace Proposal from DworkZ`,
      html: emailContent.body.replace(/\n/g, '<br/>'),
      attachment: Buffer.from(pdfBase64.split('base64,')[1], 'base64'),
      attachmentName: `Proposal_${client.companyName.replace(/\s+/g, '_')}.pdf`,
      clientId: client._id,
      type: 'Proposal'
    });

    // 4. Update Client Status & Timeline
    client.proposalSent = true;
    client.proposalSentDate = new Date();
    client.status = 'Proposal Sent';
    client.proposalPDFUrl = pdfBase64; // Store the PDF base64 data for later viewing
    client.lastActionBy = req.user.name;
    client.lastActionAt = Date.now();
    
    // Add to notes
    client.notes.unshift({
      content: `Proposal sent to ${client.contactEmail} on ${new Date().toLocaleDateString()}`
    });

    await logActivity({
      title: 'Proposal Sent',
      desc: `Professional Proposal sent to ${client.companyName}`,
      type: 'client',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-primary'
    });

    await client.save();

    res.status(200).json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update Proposal Status
// @route   PUT /api/v1/clients/:id/proposals/:propId/status
// @access  Private (Admin/Staff)
exports.updateProposalStatus = async (req, res, next) => {
  try {
    const proposal = await Proposal.findByIdAndUpdate(req.params.propId, req.body, { new: true });
    if (!proposal) return res.status(404).json({ success: false, error: 'Proposal not found' });
    
    const client = await Client.findById(proposal.client);
    
    if (req.body.status === 'Accepted') {
      client.status = 'Agreement Pending';
      await Activity.create({ title: 'Proposal Accepted', desc: `${client.name} accepted the proposal`, type: 'client', color: 'bg-emerald-500' });
    } else if (req.body.status === 'Rejected') {
      client.status = 'Lead';
      await Activity.create({ title: 'Proposal Rejected', desc: `${client.name} rejected. Reason: ${req.body.rejectionReason}`, type: 'client', color: 'bg-rose-500' });
    }
    
    await client.save();
    res.status(200).json({ success: true, data: proposal });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Generate Agreement
// @route   POST /api/v1/clients/:id/agreements
// @access  Private (Admin/Staff)
exports.generateAgreement = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    // Automatically move client to 'Agreement Pending' state ONLY if not already Active
    if (client.status !== 'Active') {
      client.status = 'Agreement Pending';
      await client.save();
    }

    const agreement = new Agreement({
      client: client._id,
      proposal: req.body.proposalId,
      draftPDFUrl: req.body.draftPDFUrl,
      status: 'Pending Signature'
    });
    await agreement.save();
    
    res.status(201).json({ success: true, data: agreement });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Sign Agreement
// @route   POST /api/v1/clients/:id/agreements/:agrId/sign
// @access  Private (Admin/Staff)
exports.signAgreement = async (req, res, next) => {
  try {
    const { agreementPDFUrl, signatureImageUrl, signedBy, deviceInfo } = req.body;
    
    // Generate a simple deterministic hash for audit trail
    const hashInput = `${req.params.agrId}-${req.ip}-${new Date().toISOString()}`;
    const auditHash = Buffer.from(hashInput).toString('base64').slice(0, 32);

    const agreement = await Agreement.findByIdAndUpdate(req.params.agrId, {
      status: 'Signed',
      agreementPDFUrl: agreementPDFUrl || '',
      signatureData: {
        ipAddress: req.ip,
        timestamp: new Date(),
        hash: auditHash,
        signatureImageUrl: signatureImageUrl || '',
        signedBy: signedBy || 'Unknown',
        deviceInfo: deviceInfo || 'Unknown Device'
      }
    }, { new: true });
    
    const client = await Client.findById(agreement.client);
    client.status = 'Awaiting Activation';
    if (agreementPDFUrl) client.agreementPDFUrl = agreementPDFUrl;
    await client.save();
    
    await Activity.create({ 
      title: 'Agreement Digitally Signed', 
      desc: `${signedBy || client.name} signed the agreement via Digital Signature Portal. Audit Hash: ${auditHash.slice(0, 8)}...`, 
      type: 'client', 
      color: 'bg-emerald-500' 
    });
    
    global.io?.emit('bookingUpdated');
    res.status(200).json({ success: true, data: agreement });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete Agreement
// @route   DELETE /api/v1/clients/:id/agreements/:agrId
// @access  Private (Admin)
exports.deleteAgreement = async (req, res, next) => {
  try {
    const agreement = await Agreement.findByIdAndUpdate(req.params.agrId, { status: 'Archived' }, { new: true });
    if (!agreement) return res.status(404).json({ success: false, error: 'Agreement not found' });
    
    res.status(200).json({ success: true, data: agreement });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all proposals for a client
// @route   GET /api/v1/clients/:id/proposals
// @access  Private (Admin/Staff)
exports.getProposals = async (req, res, next) => {
  try {
    const proposals = await Proposal.find({ client: req.params.id }).sort('-createdAt');
    res.status(200).json({ success: true, count: proposals.length, data: proposals });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all agreements for a client
// @route   GET /api/v1/clients/:id/agreements
// @access  Private (Admin/Staff)
exports.getAgreements = async (req, res, next) => {
  try {
    const agreements = await Agreement.find({ client: req.params.id }).sort('-createdAt');
    res.status(200).json({ success: true, count: agreements.length, data: agreements });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/v1/clients/stats
// @access  Private (Admin/Staff)
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Aggregate counts for CRM Pipeline (excluding archived)
    const baseQuery = { isArchived: { $ne: true } };
    
    const leads = await Client.countDocuments({ ...baseQuery, status: { $in: ['New Lead', 'Contacted', 'Negotiation', 'Proposal Sent', 'Awaiting Signature'] } });
    const proposalsSent = await Client.countDocuments({ ...baseQuery, status: 'Proposal Sent' });
    const awaitingSignature = await Client.countDocuments({ ...baseQuery, status: 'Awaiting Signature' });
    
    // Calculate total revenue from ALL Paid invoices (Members + Guests)
    const paidInvoices = await Invoice.find({ isArchived: { $ne: true }, status: 'Paid' });
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    
    const activeMembers = await Client.find({ ...baseQuery, status: 'Active' });
    const activeClients = activeMembers.length;
    
    // Calculate occupancy rate (active clients / 40 capacity)
    const occupancyRate = Math.min(100, (activeClients / 40) * 100).toFixed(1);

    // Calculate Pending Receivables (Unpaid Invoices)
    const pendingInvoices = await Invoice.find({ isArchived: { $ne: true }, status: { $in: ['Pending', 'Overdue'] } });
    const pendingReceivable = pendingInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    // Calculate Pending Payables (Inventory bought on Credit)
    const creditInventory = await Inventory.find({ isArchived: { $ne: true }, paymentStatus: 'Credit' });
    const pendingPayable = creditInventory.reduce((sum, item) => sum + (item.totalCost || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        activeClients,
        leads,
        proposalsSent,
        awaitingSignature,
        occupancyRate,
        pendingReceivable,
        pendingPayable
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
// @desc    Send agreement to client email
// @route   POST /api/v1/clients/:id/agreements/:agrId/send
// @access  Private (Admin/Staff)
exports.sendAgreementEmail = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    const agreement = await Agreement.findById(req.params.agrId);
    
    if (!client || !agreement) {
      return res.status(404).json({ success: false, error: 'Client or Agreement not found' });
    }

    // 1. Prepare Template Data
    const templateData = {
      name: client.name,
      companyName: client.companyName,
      ctaLink: `http://localhost:5173/agreement/sign/${agreement._id}`, // Public sign link
    };

    // 2. Generate Email Body
    const emailHtml = agreementTemplate(templateData);

    // 3. Prepare Attachment (Draft or Final)
    const docUrl = agreement.agreementPDFUrl || agreement.draftPDFUrl;
    let attachmentBuffer = null;
    
    // If it's a local file path, read it; if it's a data URI, convert it; 
    // otherwise, generate it from the template for simplicity in this demo
    if (docUrl && docUrl.startsWith('data:application/pdf;base64,')) {
      attachmentBuffer = Buffer.from(docUrl.split('base64,')[1], 'base64');
    } else {
      // Fallback: Generate a clean PDF for the attachment
      attachmentBuffer = await emailService.generatePDF(emailHtml, `Agreement_${client.companyName}.pdf`);
    }

    // 4. Send Email via SendGrid
    await emailService.sendEmail({
      to: client.contactEmail,
      subject: `Action Required: Workspace Agreement for ${client.companyName}`,
      html: emailHtml,
      attachment: attachmentBuffer,
      attachmentName: `Agreement_${client.companyName.replace(/\s+/g, '_')}.pdf`,
      clientId: client._id,
      type: 'Agreement'
    });
    
    // 5. Update Agreement Sent Status
    await Agreement.findByIdAndUpdate(req.params.agrId, { isSentToClient: true });

    // 6. Automatically move client to 'Awaiting Activation'
    if (client.status === 'Agreement Pending' || client.status === 'Proposal Sent' || client.status === 'New Lead') {
      await Client.findByIdAndUpdate(req.params.id, { 
        status: 'Awaiting Activation',
        lastActionBy: req.user.name,
        lastActionAt: Date.now()
      });
    }

    await logActivity({
      title: 'Agreement Sent',
      desc: `Legal Agreement dispatched to ${client.companyName}`,
      type: 'client',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-indigo-500'
    });

    res.status(200).json({ 
      success: true, 
      message: `Agreement successfully sent to ${client.contactEmail}` 
    });
  } catch (err) {
    console.error('Send Agreement Email Error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};
// @desc    Mark Proposal as Manually Sent (Offline)
// @route   POST /api/v1/clients/:id/proposal/mark-sent
// @access  Private (Admin/Staff)
exports.markProposalSent = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const { pdfBase64 } = req.body;

    // Skip Email sending logic - just update state
    client.proposalSent = true;
    client.proposalSentDate = new Date();
    client.status = 'Proposal Sent';
    if (pdfBase64) client.proposalPDFUrl = pdfBase64; 
    client.lastActionBy = req.user.name;
    client.lastActionAt = Date.now();
    
    client.notes.unshift({
      content: `Proposal marked as MANUALLY SENT (Offline) on ${new Date().toLocaleDateString()}`
    });

    await logActivity({
      title: 'Proposal Mark Sent',
      desc: `Proposal for ${client.companyName} marked as manually sent outside the app`,
      type: 'client',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-slate-500'
    });

    await client.save();
    res.status(200).json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Mark Agreement as Manually Sent (Offline)
// @route   POST /api/v1/clients/:id/agreements/:agrId/mark-sent
// @access  Private (Admin/Staff)
exports.markAgreementSent = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    const agreement = await Agreement.findById(req.params.agrId);
    
    if (!client || !agreement) {
      return res.status(404).json({ success: false, error: 'Client or Agreement not found' });
    }

    // 1. Update Agreement Sent Status
    await Agreement.findByIdAndUpdate(req.params.agrId, { isSentToClient: true });

    // 2. Automatically move client to 'Awaiting Activation' from any pre-activation stage
    const preActivationStatuses = [
      'Agreement Pending', 'Awaiting Signature', 'Proposal Sent',
      'Negotiation', 'New Lead', 'Converted'
    ];
    const statusUpdate = { lastActionBy: req.user.name, lastActionAt: Date.now() };
    if (preActivationStatuses.includes(client.status)) {
      statusUpdate.status = 'Awaiting Activation';
    }
    await Client.findByIdAndUpdate(req.params.id, statusUpdate);

    await logActivity({
      title: 'Agreement Mark Sent',
      desc: `Agreement for ${client.companyName} marked as manually sent via external email`,
      type: 'client',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-slate-500'
    });

    res.status(200).json({ success: true, message: 'Agreement marked as sent manually.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get public proposal data (No Auth)
// @route   GET /api/v1/clients/public/proposal/:id
// @access  Public
exports.getPublicProposal = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id).select('name companyName workspaceType seats planType rentAmount contactEmail');
    if (!client) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }
    res.status(200).json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Invalid proposal link' });
  }
};

// @desc    Activate a client (Move from Awaiting Activation / Converted to Active)
// @route   POST /api/v1/clients/:id/activate
// @access  Private (Admin/Staff)
exports.activateClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    client.status = 'Active';
    client.onboardingDate = Date.now();
    client.lastActionBy = req.user.name;
    client.lastActionAt = Date.now();

    // GENERATE INITIAL PAID INVOICE TO REFLECT IN TOTAL REVENUE
    const invoiceId = `DW-INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    if (client.rentAmount > 0) {
      const baseAmount = client.rentAmount;
      const cgstAmount = Math.round(baseAmount * 0.09);
      const sgstAmount = Math.round(baseAmount * 0.09);
      const totalAmount = baseAmount + cgstAmount + sgstAmount;

      await Invoice.create({
        invoiceId,
        clientId: client._id,
        isGuest: false,
        billingPeriod: `Onboarding - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        baseAmount,
        cgstAmount,
        sgstAmount,
        totalAmount,
        status: 'Paid',
        dueDate: new Date(),
        sent: true,
        sentDate: new Date()
      });
    }

    await logActivity({
      title: 'Client Activated',
      desc: `${client.companyName} is now an ACTIVE member. Revenue generation started.`,
      type: 'client',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-emerald-500'
    });

    await client.save();
    global.io?.emit('bookingUpdated');
    res.status(200).json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Cancel a client's plan
// @route   POST /api/v1/clients/:id/cancel
// @access  Private (Admin/Staff)
exports.cancelPlan = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    client.status = 'Inactive';
    client.cancelledAt = Date.now();
    client.cancellationReason = req.body.reason || 'User cancelled';
    client.lastActionBy = req.user.name;
    client.lastActionAt = Date.now();

    await logActivity({
      title: 'Plan Cancelled',
      desc: `${client.companyName} membership cancelled. Reason: ${client.cancellationReason}`,
      type: 'client',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-rose-500'
    });

    await client.save();
    res.status(200).json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Upgrade or downgrade a client's plan
// @route   POST /api/v1/clients/:id/upgrade
// @access  Private (Admin/Staff)
exports.upgradePlan = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const { newRentAmount, planType, workspaceDetails, generateInvoice, invoiceAmount } = req.body;

    const oldRent = client.rentAmount;
    client.rentAmount = newRentAmount;
    if (planType) client.planType = planType;
    if (workspaceDetails) client.workspaceDetails = workspaceDetails;
    client.lastActionBy = req.user.name;
    client.lastActionAt = Date.now();

    // If requested, generate a prorated invoice for the difference
    if (generateInvoice && invoiceAmount > 0) {
      const invoiceId = `DW-INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const baseAmount = Number(invoiceAmount);
      const cgstAmount = Math.round(baseAmount * 0.09);
      const sgstAmount = Math.round(baseAmount * 0.09);
      const totalAmount = baseAmount + cgstAmount + sgstAmount;

      await Invoice.create({
        invoiceId,
        clientId: client._id,
        isGuest: false,
        billingPeriod: `Plan Upgrade - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        baseAmount,
        cgstAmount,
        sgstAmount,
        totalAmount,
        status: 'Paid',
        dueDate: new Date(),
        sent: true,
        sentDate: new Date()
      });
    }

    await logActivity({
      title: 'Plan Adjusted',
      desc: `${client.companyName} plan changed. Rent: ₹${oldRent} -> ₹${newRentAmount}`,
      type: 'client',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-blue-500'
    });

    await client.save();
    res.status(200).json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
