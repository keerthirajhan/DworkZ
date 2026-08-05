const Invoice = require('../models/Invoice');

/**
 * Returns the next sequential invoice ID in the existing
 * "DWZ-INV-YYYY-XXXX" format used throughout invoiceController.js.
 * Factored out here so new invoice-generating code (e.g. Refreshments) can
 * reuse the same numbering scheme without duplicating the parsing logic.
 * invoiceController.js's own inline copies are left untouched — this is a
 * new, additive helper, not a refactor of already-working billing code.
 */
async function getNextInvoiceId() {
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
  return `DWZ-INV-${now.getFullYear()}-${sequence}`;
}

module.exports = { getNextInvoiceId };
