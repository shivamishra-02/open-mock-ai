const pdfParse = require("pdf-parse");

/**
 * Extract plain text from a PDF buffer.
 * @param {Buffer} buffer - The uploaded PDF file buffer
 * @returns {string} - Extracted plain text
 */
async function extractTextFromPDF(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text
    .replace(/\s{3,}/g, "\n") // collapse excessive whitespace
    .trim();

  if (!text || text.length < 50) {
    throw new Error("Could not extract meaningful text from the PDF. Please ensure it's not a scanned image.");
  }

  return text;
}

module.exports = { extractTextFromPDF };