import jsPDF from "jspdf";
import { format } from "date-fns";
import { addLetterheadAndFooter, addPageNumbers, resetLetterheadCache } from "@/lib/utils";
import type { Meeting } from "@/app/meetings/meeting-schema";

const HEADER_IMAGE_URL = "/AAFCLetterhead-Header.png";
const FOOTER_IMAGE_URL = "/AAFCLetterhead-Footer.png";

export async function generateAgendaPdfBase64(meeting: Meeting): Promise<{ base64: string; filename: string }> {
  const doc = new jsPDF();
  resetLetterheadCache();
  const meetingDate = format(meeting.dateTime, "yyyy-MM-dd");
  const filename = `agenda_${meeting.title.replace(/\s+/g, '_')}_${meetingDate}.pdf`;

  const margin = 15;
  let yPos = margin;
  const lineSpacing = 7;
  const sectionSpacing = 10;
  const indent = 5;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxLineWidth = pageWidth - (margin * 2);
  let headerHeight = 0;
  let footerHeight = 0;
  
  const setPageLayout = async () => {
    const { headerHeight: hh, footerHeight: fh } = await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
    headerHeight = hh;
    footerHeight = fh;
    yPos = margin + headerHeight + 5;
  };
  await setPageLayout();

  const checkPageBreak = async (neededHeight: number) => {
      if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin - footerHeight) {
          addPageNumbers(doc, footerHeight, margin);
          doc.addPage();
          await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
          yPos = margin + headerHeight + 5;
      }
  };
  
  const addText = async (text: string, isBold = false, customIndent = 0, fontSize = 10) => {
    if (!text || text.trim() === "") return;
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, maxLineWidth - customIndent - margin); 
    await checkPageBreak(lines.length * (lineSpacing * 0.8) + (isBold ? lineSpacing * 0.5 : 0));
    doc.text(lines, margin + customIndent, yPos);
    yPos += lines.length * (lineSpacing * 0.8) + (lineSpacing * 0.3);
  };

  await addText(`Meeting Agenda: ${meeting.title}`, true, 0, 16);
  yPos += sectionSpacing * 0.5;
  await addText(`Date: ${format(meeting.dateTime, "PPP")}`, false, 0, 12);
  await addText(`Time: ${format(meeting.dateTime, "p")}`, false, 0, 12);
  if (meeting.location) await addText(`Location: ${meeting.location}`, false, 0, 12);
  yPos += sectionSpacing;

  if (meeting.agendaItems && meeting.agendaItems.length > 0) {
    await addText("Agenda Items:", true, 0, 14);
    yPos += sectionSpacing * 0.2;
    for (const [index, item] of meeting.agendaItems.entries()) {
      await checkPageBreak(lineSpacing * 3 + 10);
      await addText(`${index + 1}. ${item.description}`, true, indent, 11);
      if (item.submitterName) await addText(`Submitted by: ${item.submitterName}`, false, indent + 5, 9);
      yPos += lineSpacing * 0.3;
    }
  } else {
    await addText("No specific agenda items listed.", false, indent);
  }
  
  addPageNumbers(doc, footerHeight, margin);
  
  // Return base64 without the data:application/pdf;base64, prefix
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1];

  return { base64, filename };
}

export async function generateMinutesPdfBase64(meeting: Meeting, compiledText: string): Promise<{ base64: string; filename: string }> {
  const doc = new jsPDF();
  resetLetterheadCache();
  const meetingDate = format(meeting.dateTime, "yyyy-MM-dd");
  const filename = `minutes_${meeting.title.replace(/\s+/g, '_')}_${meetingDate}.pdf`;

  const margin = 15;
  let yPos = margin;
  const lineSpacing = 7;
  const sectionSpacing = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxLineWidth = pageWidth - (margin * 2);
  let headerHeight = 0;
  let footerHeight = 0;
  
  const setPageLayout = async () => {
    const { headerHeight: hh, footerHeight: fh } = await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
    headerHeight = hh;
    footerHeight = fh;
    yPos = margin + headerHeight + 5;
  };
  await setPageLayout();

  const checkPageBreak = async (neededHeight: number) => {
      if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin - footerHeight) {
          addPageNumbers(doc, footerHeight, margin);
          doc.addPage();
          await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
          yPos = margin + headerHeight + 5;
      }
  };
  
  const addText = async (text: string, isBold = false, customIndent = 0, fontSize = 10) => {
    if (!text || text.trim() === "") return;
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, maxLineWidth - customIndent - margin); 
    await checkPageBreak(lines.length * (lineSpacing * 0.8) + (isBold ? lineSpacing * 0.5 : 0));
    doc.text(lines, margin + customIndent, yPos);
    yPos += lines.length * (lineSpacing * 0.8) + (lineSpacing * 0.3);
  };

  await addText(`Meeting Minutes: ${meeting.title}`, true, 0, 16);
  yPos += sectionSpacing * 0.5;
  await addText(`Date: ${format(meeting.dateTime, "PPP")}`, false, 0, 12);
  
  yPos += sectionSpacing;

  // Render compiled text from AI
  const paragraphs = compiledText.split('\n');
  for (const para of paragraphs) {
    if (para.trim()) {
      // Very basic markdown handling for PDF: if it starts with # or ** make it bold
      let isBold = false;
      let cleanText = para;
      if (para.startsWith('#')) {
        isBold = true;
        cleanText = para.replace(/^#+\s*/, '');
      } else if (para.includes('**')) {
        // Just remove the bold markers, our basic addText doesn't support inline bold
        cleanText = para.replace(/\*\*/g, '');
      }
      
      await addText(cleanText, isBold, 0, isBold ? 12 : 10);
    } else {
      yPos += lineSpacing * 0.5; // blank line
    }
  }

  addPageNumbers(doc, footerHeight, margin);
  
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1];

  return { base64, filename };
}

