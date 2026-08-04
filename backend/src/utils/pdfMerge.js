const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

// The three static brochure pages (Meeting Room/Cabins, Cafeteria/Lobby,
// Amenities) live as a pre-built PDF asset on disk. They are never
// regenerated — this module only ever reads them and appends them onto a
// dynamically generated first page.
const BROCHURE_PDF_PATH = path.join(__dirname, '..', 'assets', 'brochure', 'dworkz-brochure.pdf');

// Cache the brochure bytes in memory for the process lifetime — it's a
// ~4.5MB static file that never changes, no reason to re-read it from disk
// on every proposal sent.
let cachedBrochureBytes = null;

function getBrochureBytes() {
  if (!cachedBrochureBytes) {
    cachedBrochureBytes = fs.readFileSync(BROCHURE_PDF_PATH);
  }
  return cachedBrochureBytes;
}

/**
 * Appends the three static brochure pages after a dynamically generated
 * proposal PDF buffer (e.g. Puppeteer's page.pdf() output).
 *
 * @param {Buffer} dynamicPdfBuffer - The already-generated dynamic first
 *   page. Existing generation logic is untouched — this only runs *after*
 *   that PDF already exists.
 * @returns {Promise<Buffer>} The merged, multi-page PDF as a Buffer, ready
 *   to use anywhere the original buffer was used (email attachment,
 *   storage, download).
 */
async function appendBrochurePages(dynamicPdfBuffer) {
  const [dynamicDoc, brochureDoc] = await Promise.all([
    PDFDocument.load(dynamicPdfBuffer),
    PDFDocument.load(getBrochureBytes())
  ]);

  const merged = await PDFDocument.create();

  const dynamicPages = await merged.copyPages(dynamicDoc, dynamicDoc.getPageIndices());
  dynamicPages.forEach(page => merged.addPage(page));

  const brochurePages = await merged.copyPages(brochureDoc, brochureDoc.getPageIndices());
  brochurePages.forEach(page => merged.addPage(page));

  const mergedBytes = await merged.save();
  return Buffer.from(mergedBytes);
}

module.exports = { appendBrochurePages };
