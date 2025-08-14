// src/utils/downloadWishlistPDF.js
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Capture a DOM node and download it as a paginated A4 PDF.
 * - targetEl: HTMLElement to capture
 * - fileName: 'Wishlist.pdf' (default)
 */
export async function downloadWishlistPDF(targetEl, fileName = "Wishlist.pdf") {
  if (!targetEl) throw new Error("Missing target element for PDF capture.");

  // Make sure images can be captured (CORS)
  // In your UI, set <img crossOrigin="anonymous" /> and serve with proper CORS headers.
  const canvas = await html2canvas(targetEl, {
    scale: 2,              // sharper output
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    ignoreElements: (el) =>
      el?.dataset?.html2canvasIgnore === "true" ||
      el?.getAttribute?.("data-html2canvas-ignore") === "true",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();  // 210mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Add first page
  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Add more pages as needed (shift the same tall image up with negative y)
  while (heightLeft > 0) {
    position = heightLeft - imgHeight; // negative offset
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(fileName);
}
