const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Booking = require('../models/Booking');
const Visitor = require('../models/Visitor');
const logActivity = require('../utils/activityLogger');
const emailService = require('../services/emailService');
const invoiceTemplate = require('../templates/invoiceTemplate');

// Helper to convert number to words (Simplified for INR)
const numberToWords = (num) => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n) => {
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit !== 0 ? ' ' + a[digit] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
    return inWords(Math.floor(num)) + 'Only';
  };

  return 'INR ' + inWords(Math.floor(num));
};

// @desc    Get all active invoices
exports.getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ isArchived: { $ne: true } }).sort('-dateGenerated')
      .populate({
        path: 'clientId',
        select: 'companyName name contactEmail contactPhone billingDetails planType workspaceType'
      })
      .populate('bookingId')
      .populate('visitorId');
    res.status(200).json({ success: true, count: invoices.length, data: invoices });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// @desc    Get all archived invoices
exports.getArchivedInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ isArchived: true }).sort('-archivedAt')
      .populate({
        path: 'clientId',
        select: 'companyName name contactEmail contactPhone billingDetails planType workspaceType'
      })
      .populate('bookingId')
      .populate('visitorId');
    res.status(200).json({ success: true, count: invoices.length, data: invoices });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// @desc    Generate monthly tax invoices
exports.generateInvoices = async (req, res) => {
  try {
    const ALLOWED_HOURS = 12;
    const HOURLY_RATE = 500;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriod = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const clients = await Client.find({ status: 'Active', isArchived: { $ne: true } });
    const lastInvoice = await Invoice.findOne({}).sort({ invoiceId: -1 });
    let baseSequenceNum = 0;
    if (lastInvoice && lastInvoice.invoiceId) {
      const parts = lastInvoice.invoiceId.split('-');
      const lastSeqStr = parts[parts.length - 1];
      const lastSeq = parseInt(lastSeqStr, 10);
      if (!isNaN(lastSeq)) {
        baseSequenceNum = lastSeq;
      }
    }

    let count = 0;
    for (const client of clients) {
      // Check for any existing invoice for this period (active or archived)
      const existing = await Invoice.findOne({ clientId: client._id, billingPeriod });
      if (existing) {
        console.log(`Skipping ${client.companyName}: Record already exists for ${billingPeriod}`);
        continue;
      }

      const bookings = await Booking.find({ client: client._id, date: { $gte: startOfMonth }, status: 'Confirmed' });
      const utilizedHours = bookings.reduce((sum, b) => sum + (Number(b.duration) || 0), 0);
      
      const baseAmount = Number(client.rentAmount) || 0;
      const overageHours = Math.max(0, utilizedHours - ALLOWED_HOURS);
      
      // Use client-specific rate if available, else default to 500
      const clientRate = client.pricingDetails?.meetingRoomRate || 500;
      const overageAmount = overageHours * clientRate;
      const subTotal = baseAmount + overageAmount;
      const cgstAmount = Number((subTotal * 0.09).toFixed(2));
      const sgstAmount = Number((subTotal * 0.09).toFixed(2));
      const totalAmount = Number((subTotal + cgstAmount + sgstAmount).toFixed(2));

      // Professional Sequential ID Format: DWZ-INV-YYYY-XXXX
      const sequence = (baseSequenceNum + count + 1).toString().padStart(4, '0');
      const invoiceId = `DWZ-INV-${now.getFullYear()}-${sequence}`;

      // Intelligent Due Date: 10th of current month or 10 days from today if late
      let finalDueDate = new Date(now.getFullYear(), now.getMonth(), 10);
      if (now.getDate() > 10) {
        finalDueDate = new Date(now.getTime() + (10 * 24 * 60 * 60 * 1000));
      }

      await Invoice.create({
        invoiceId,
        clientId: client._id,
        billingPeriod,
        baseAmount,
        overageAmount,
        cgstAmount,
        sgstAmount,
        totalAmount,
        dueDate: finalDueDate
      });
      count++;
    }

    await logActivity({
      title: 'Invoices Generated',
      desc: `${count} billing invoices generated for billing period: ${billingPeriod}`,
      type: 'payment',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-emerald-500'
    });

    res.status(200).json({ success: true, message: `${count} billing invoices generated.` });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// @desc    Generate instant invoice for Guest Booking
// @route   POST /api/v1/invoices/guest/:bookingId
// @access  Private (Admin/Staff)
exports.generateGuestInvoice = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    
    // Check if invoice already exists
    const existing = await Invoice.findOne({ bookingId: booking._id });
    if (existing) {
      return res.status(200).json({ 
        success: true, 
        data: existing,
        alreadyExists: true 
      });
    }

    // Use specific rate from booking or default to 500
    const rate = booking.hourlyRate || 500;
    const duration = Number(booking.duration) || 0;
    const totalAmount = duration * rate;
    const now = new Date();

    const lastInvoice = await Invoice.findOne({}).sort({ invoiceId: -1 });
    let sequenceNum = 1;
    if (lastInvoice && lastInvoice.invoiceId) {
      const parts = lastInvoice.invoiceId.split('-');
      const lastSeqStr = parts[parts.length - 1];
      const lastSeq = parseInt(lastSeqStr, 10);
      if (!isNaN(lastSeq)) {
        sequenceNum = lastSeq + 1;
      }
    }
    const sequence = sequenceNum.toString().padStart(4, '0');
    // Professional Format: DWZ-INV-YYYY-XXXX
    const invoiceId = `DWZ-INV-${now.getFullYear()}-${sequence}`;

    const invoice = await Invoice.create({
      invoiceId,
      bookingId: booking._id,
      isGuest: true,
      billingPeriod: 'Visitor Session',
      baseAmount: totalAmount,
      overageAmount: 0,
      totalAmount, // Total is exactly baseAmount (No GST)
      dueDate: now, // Due immediately
      status: 'Pending'
    });

    // Mark booking as billed
    booking.invoiceGenerated = true;
    await booking.save();

    await logActivity({
      title: 'Guest Invoice Generated',
      desc: `Billing invoice ${invoiceId} generated for guest ${booking.clientName} (₹${totalAmount})`,
      type: 'payment',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-orange-500'
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// @desc    Deliver invoice via email
exports.sendInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('clientId');
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    if (!invoice.clientId) return res.status(400).json({ success: false, error: 'No client associated with this invoice' });

    const client = invoice.clientId;

    const emailHtml = invoiceTemplate({
      name: client.name || client.companyName,
      invoiceNumber: invoice.invoiceId,
      period: invoice.billingPeriod,
      amount: invoice.totalAmount,
      dueDate: new Date(invoice.dueDate).toLocaleDateString(),
      status: invoice.status,
      ctaLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invoices/${invoice._id}`
    });

    let pdfBuffer;
    try {
      pdfBuffer = await emailService.generatePDF(emailHtml, `Invoice_${invoice.invoiceId}.pdf`);
    } catch (e) {
      console.error('Failed to generate PDF for invoice', e);
    }

    await emailService.sendEmail({
      to: client.contactEmail,
      subject: `Invoice ${invoice.invoiceId} from DworkZ`,
      html: emailHtml,
      attachment: pdfBuffer,
      attachmentName: `Invoice_${invoice.invoiceId}.pdf`,
      clientId: client._id,
      type: 'Invoice'
    });

    invoice.sent = true;
    invoice.sentDate = Date.now();
    await invoice.save();

    await logActivity({
      title: 'Invoice Sent',
      desc: `Tax Invoice ${invoice.invoiceId} sent to ${client.companyName} via Email`,
      type: 'payment',
      user: req.user ? req.user.id : null,
      userName: req.user ? req.user.name : 'System',
      color: 'bg-primary'
    });

    res.status(200).json({ success: true, message: 'Invoice email sent successfully.' });
  } catch (error) {
    console.error('Send Invoice Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Mark Invoice as Manually Sent (Offline)
// @route   POST /api/v1/invoices/:id/mark-sent
// @access  Private (Admin/Staff)
exports.markInvoiceSent = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('clientId');
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    invoice.sent = true;
    invoice.sentDate = Date.now();
    await invoice.save();

    await logActivity({
      title: 'Invoice Mark Sent',
      desc: `Tax Invoice ${invoice.invoiceId} for ${invoice.clientId?.companyName} marked as manually sent`,
      type: 'payment',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-slate-500'
    });

    res.status(200).json({ success: true, message: 'Invoice marked as sent manually.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Mark Invoice as Paid (Collected)
// @route   POST /api/v1/invoices/:id/mark-paid
// @access  Private (Admin/Staff)
exports.markAsPaid = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('clientId');
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    invoice.status = 'Paid';
    // If not already marked as sent, mark it sent too since payment is received
    if (!invoice.sent) {
      invoice.sent = true;
      invoice.sentDate = Date.now();
    }
    await invoice.save();

    await logActivity({
      title: 'Payment Received',
      desc: `Full payment of ₹${invoice.totalAmount.toLocaleString()} collected for Invoice ${invoice.invoiceId} (${invoice.clientId?.companyName})`,
      type: 'payment',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-emerald-500'
    });

    res.status(200).json({ success: true, message: 'Invoice marked as paid successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Soft delete (archive) an invoice
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, {
      isArchived: true,
      archivedAt: Date.now()
    }, { new: true });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.status(200).json({ success: true, data: {} });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// @desc    Permanently delete an invoice
exports.deleteInvoicePermanent = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.status(200).json({ success: true, data: {} });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: invoice });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.generateVisitorInvoice = async (req, res) => {
  try {
    const { amount, applyGst, serviceDate, issueDate, numberOfDays } = req.body;
    const visitor = await Visitor.findById(req.params.visitorId);
    if (!visitor) return res.status(404).json({ success: false, error: 'Visitor not found' });
    
    // Check if invoice already exists
    const existing = await Invoice.findOne({ visitorId: visitor._id });
    if (existing) {
      return res.status(200).json({ 
        success: true, 
        data: existing,
        alreadyExists: true 
      });
    }

    const days = Math.max(1, Number(numberOfDays) || 1);
    const baseAmount = (Number(amount) || 0) * days;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let totalAmount = baseAmount;

    if (applyGst) {
      cgstAmount = Number((baseAmount * 0.09).toFixed(2));
      sgstAmount = Number((baseAmount * 0.09).toFixed(2));
      totalAmount = Number((baseAmount + cgstAmount + sgstAmount).toFixed(2));
    }

    const now = new Date();
    const finalIssueDate = issueDate ? new Date(issueDate) : now;
    const finalServiceDate = serviceDate ? new Date(serviceDate) : finalIssueDate;

    // Calculate serviceEndDate
    const finalServiceEndDate = new Date(finalServiceDate);
    finalServiceEndDate.setDate(finalServiceEndDate.getDate() + (days - 1));

    const lastInvoice = await Invoice.findOne({}).sort({ invoiceId: -1 });
    let sequenceNum = 1;
    if (lastInvoice && lastInvoice.invoiceId) {
      const parts = lastInvoice.invoiceId.split('-');
      const lastSeqStr = parts[parts.length - 1];
      const lastSeq = parseInt(lastSeqStr, 10);
      if (!isNaN(lastSeq)) {
        sequenceNum = lastSeq + 1;
      }
    }
    const sequence = sequenceNum.toString().padStart(4, '0');
    const invoiceId = `DWZ-INV-${now.getFullYear()}-${sequence}`;

    const invoice = await Invoice.create({
      invoiceId,
      visitorId: visitor._id,
      isGuest: true,
      billingPeriod: `${visitor.purpose || 'Day Pass'} Session`,
      baseAmount,
      cgstAmount,
      sgstAmount,
      overageAmount: 0,
      totalAmount,
      serviceDate: finalServiceDate,
      serviceEndDate: finalServiceEndDate,
      numberOfDays: days,
      issueDate: finalIssueDate,
      dueDate: finalIssueDate,
      status: 'Pending'
    });

    await logActivity({
      title: 'Visitor Invoice Generated',
      desc: `Billing invoice ${invoiceId} generated for visitor ${visitor.name} (₹${totalAmount})`,
      type: 'payment',
      user: req.user.id,
      userName: req.user.name,
      color: 'bg-teal-500'
    });

    visitor.invoiceGenerated = true;
    await visitor.save();

    res.status(201).json({ success: true, data: invoice });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};
