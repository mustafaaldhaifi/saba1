import { jsPDF } from 'jspdf';
import '../../../ARIAL-normal.js';

/** Creates a PDF document with the font configuration shared by all reports. */
export function createReportPdf(): jsPDF {
  const document = new jsPDF();
  document.setFont('ARIAL', 'normal');
  document.setFontSize(12);
  return document;
}
