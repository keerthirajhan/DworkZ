import { PDFDocument } from 'pdf-lib';

// The three static brochure pages (Meeting Room/Cabins, Cafeteria/Lobby,
// Amenities) live as a single pre-built PDF in /public so it's served as a
// static asset with zero backend involvement — see
// frontend/public/assets/brochure/dworkz-brochure.pdf. They are never
// regenerated; this file merges them onto the end of the dynamically
// generated first page.
const BROCHURE_PDF_URL = '/assets/brochure/dworkz-brochure.pdf';

// Cache the fetched brochure bytes for the lifetime of the page — it's a
// ~4.5MB static asset that never changes, no reason to re-fetch it on
// every proposal generated in the same session.
let cachedBrochureBytes = null;

async function getBrochureBytes() {
  if (cachedBrochureBytes) return cachedBrochureBytes;
  const res = await fetch(BROCHURE_PDF_URL);
  if (!res.ok) {
    throw new Error(`Could not load the brochure asset (${res.status}). Check that ${BROCHURE_PDF_URL} exists in /public.`);
  }
  cachedBrochureBytes = await res.arrayBuffer();
  return cachedBrochureBytes;
}

/**
 * Appends the three static brochure pages after a dynamically generated
 * proposal page.
 *
 * @param {string} dynamicPdfDataUri - The data URI produced by jsPDF's
 *   `doc.output('datauristring')` for the dynamic first page — the existing
 *   generation logic (pricing, client details, terms) is untouched; this
 *   function only runs *after* that page already exists.
 * @returns {Promise<string>} A data URI for the merged, multi-page PDF, in
 *   the same `data:application/pdf;base64,...` shape the rest of the app
 *   already expects (preview iframe, email attachment, stored
 *   proposalPDFUrl) — so nothing downstream needs to change.
 */
export async function appendBrochurePages(dynamicPdfDataUri) {
  const [brochureBytes, dynamicDoc] = await Promise.all([
    getBrochureBytes(),
    PDFDocument.load(dataUriToBytes(dynamicPdfDataUri))
  ]);

  const brochureDoc = await PDFDocument.load(brochureBytes);

  const merged = await PDFDocument.create();

  const dynamicPages = await merged.copyPages(dynamicDoc, dynamicDoc.getPageIndices());
  dynamicPages.forEach(page => merged.addPage(page));

  const brochurePages = await merged.copyPages(brochureDoc, brochureDoc.getPageIndices());
  brochurePages.forEach(page => merged.addPage(page));

  const mergedBytes = await merged.save();
  return bytesToDataUri(mergedBytes);
}

function dataUriToBytes(dataUri) {
  const base64 = dataUri.split('base64,')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToDataUri(bytes) {
  let binary = '';
  const chunkSize = 0x8000; // avoid call-stack limits on String.fromCharCode with large arrays
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return `data:application/pdf;base64,${btoa(binary)}`;
}
