const emailService = require('../services/emailService');
const Client = require('../models/Client');
const proposalTemplate = require('../templates/proposalTemplate');
const proposalPdfTemplate = require('../templates/proposalPdfTemplate');
const invoiceTemplate = require('../templates/invoiceTemplate');
const agreementTemplate = require('../templates/agreementTemplate');
const { appendBrochurePages } = require('../utils/pdfMerge');

// @desc    Send Proposal Email
// @route   POST /api/v1/email/send-proposal
// @access  Private
exports.sendProposal = async (req, res) => {
  const { clientId, customSubject, customMessage, pdfHtml, pricing } = req.body;

  try {
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    // 1. Prepare Template Data (Use pricing from request if available, otherwise fallback to client defaults)
    const templateData = {
      name: client.name,
      companyName: client.companyName,
      workspaceType: pricing?.workspaceType || client.workspaceType,
      seats: pricing?.seats || client.seats,
      planType: pricing?.planType || client.planType,
      totalPrice: pricing?.totalPrice || client.rentAmount,
      customMessage: customMessage || ''
    };

    // 2. Generate Email Body
    const emailHtml = proposalTemplate(templateData);

    // 3. Generate PDF Buffer
    let finalPdfBuffer;
    try {
      if (pdfHtml && pdfHtml !== "") {
        finalPdfBuffer = await emailService.generatePDF(pdfHtml, `Proposal_${client.companyName}.pdf`);
      } else {
        const pdfHtmlContent = proposalPdfTemplate(templateData);
        finalPdfBuffer = await emailService.generatePDF(pdfHtmlContent, `Proposal_${client.companyName}.pdf`);
      }

      // Automatically append the three static brochure pages after the
      // dynamically generated first page. This is the only proposal-send
      // path that generates its PDF server-side (the wizard's own jsPDF
      // output is merged separately, on the frontend, before it's ever
      // POSTed here) — so this is where the actual emailed attachment
      // needs the same merge applied.
      finalPdfBuffer = await appendBrochurePages(finalPdfBuffer);
    } catch (pdfErr) {
      console.error('PDF Generation failed, sending email without attachment:', pdfErr);
    }

    // 4. Send Email via SendGrid with PDF Attachment
    await emailService.sendEmail({
      to: client.contactEmail,
      subject: customSubject || 'Workspace Proposal from DworkZ',
      html: emailHtml,
      attachment: finalPdfBuffer,
      attachmentName: `Proposal_${client.companyName.replace(/\s+/g, '_')}.pdf`,
      clientId: client._id,
      type: 'Proposal'
    });

    // 5. Update Client Status in Pipeline and Save Price
    client.status = 'Proposal Sent';
    client.rentAmount = templateData.totalPrice; // Update price based on proposal
    client.seats = templateData.seats;
    client.workspaceType = templateData.workspaceType;
    client.planType = templateData.planType;
    client.proposalCreated = true;
    client.proposalSent = true;
    client.proposalSentDate = Date.now();
    await client.save();

    res.status(200).json({ success: true, message: 'Proposal email sent successfully', data: client });
  } catch (error) {
    console.error('Send Proposal Controller Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Send Invoice Email
// @route   POST /api/v1/email/send-invoice
// @access  Private
exports.sendInvoice = async (req, res) => {
  const { clientId, invoiceData } = req.body;

  try {
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    // Generate Invoice PDF logic would go here
    const pdfBuffer = await emailService.generatePDF(invoiceData.pdfHtml, `Invoice_${invoiceData.invoiceNumber}.pdf`);

    const emailHtml = invoiceTemplate({
      name: client.name,
      invoiceNumber: invoiceData.invoiceNumber,
      period: invoiceData.period,
      amount: invoiceData.amount,
      dueDate: invoiceData.dueDate,
      status: invoiceData.status,
      ctaLink: `http://localhost:5173/invoices/${invoiceData.id}`
    });

    await emailService.sendEmail({
      to: client.contactEmail,
      subject: `Invoice ${invoiceData.invoiceNumber} from DworkZ`,
      html: emailHtml,
      attachment: pdfBuffer,
      attachmentName: `Invoice_${invoiceData.invoiceNumber}.pdf`,
      clientId: client._id,
      type: 'Invoice'
    });

    res.status(200).json({ success: true, message: 'Invoice email sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get Email History
// @route   GET /api/v1/email/history/:clientId
// @access  Private
exports.getEmailHistory = async (req, res) => {
  try {
    const history = await emailService.getClientHistory(req.params.clientId);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
