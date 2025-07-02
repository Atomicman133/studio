
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type jsPDF from 'jspdf';
import type { TrainingLog } from "@/app/training/training-schema"; // Added for OIC Level calculation

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function convertFileToDataUrl(file: File): Promise<{ name: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, dataUrl: reader.result as string });
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// Letterhead and Footer Utilities
let headerImageBase64: string | null = null;
let footerImageBase64: string | null = null;
let headerImageDimensions: { width: number; height: number } | null = null;
let footerImageDimensions: { width: number; height: number } | null = null;

const LETTERHEAD_MAX_HEIGHT_RATIO = 0.15; // Max 15% of page height for letterhead image
const FOOTER_MAX_HEIGHT_RATIO = 0.10;    // Max 10% of page height for footer image

async function loadImageAsBase64(imageUrl: string): Promise<{ base64: string; dimensions: { width: number; height: number } }> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image ${imageUrl}: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(image, 0, 0);
        resolve({ base64: canvas.toDataURL(blob.type), dimensions: { width: image.width, height: image.height } });
      };
      image.onerror = (e) => reject(new Error(`Image load error for ${imageUrl}: ${e}`));
      image.src = URL.createObjectURL(blob);
    });
  } catch (error) {
    console.error(`Error loading image ${imageUrl}:`, error);
    throw error;
  }
}

export async function addLetterheadAndFooter(
  doc: jsPDF,
  headerImageUrl?: string,
  footerImageUrl?: string,
  margin: number = 15
): Promise<{ headerHeight: number; footerHeight: number }> {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  let effectiveHeaderHeight = 0;
  let effectiveFooterHeight = 0;

  // Add Header
  if (headerImageUrl) {
    try {
      if (!headerImageBase64 || !headerImageDimensions) {
        const loadedHeader = await loadImageAsBase64(headerImageUrl);
        headerImageBase64 = loadedHeader.base64;
        headerImageDimensions = loadedHeader.dimensions;
      }
      if (headerImageBase64 && headerImageDimensions) {
        const aspectRatio = headerImageDimensions.width / headerImageDimensions.height;
        let imgWidth = pageWidth - 2 * margin;
        let imgHeight = imgWidth / aspectRatio;
        const maxHeaderHeight = pageHeight * LETTERHEAD_MAX_HEIGHT_RATIO;
        if (imgHeight > maxHeaderHeight) {
          imgHeight = maxHeaderHeight;
          imgWidth = imgHeight * aspectRatio;
        }
        const xPosition = (pageWidth - imgWidth) / 2;
        doc.addImage(headerImageBase64, headerImageBase64.split(',')[0].split('/')[1].split(';')[0].toUpperCase(), xPosition, margin, imgWidth, imgHeight);
        effectiveHeaderHeight = imgHeight;
      }
    } catch (e) {
      console.warn(`Could not load or add header image from ${headerImageUrl}. Error: ${(e as Error).message}`);
      doc.setFontSize(8).setTextColor(150).text(`Header image not found or error: ${headerImageUrl}`, margin, margin + 5);
      effectiveHeaderHeight = 10; // Placeholder height
    }
  }

  // Add Footer
  if (footerImageUrl) {
    try {
      if (!footerImageBase64 || !footerImageDimensions) {
        const loadedFooter = await loadImageAsBase64(footerImageUrl);
        footerImageBase64 = loadedFooter.base64;
        footerImageDimensions = loadedFooter.dimensions;
      }
      if (footerImageBase64 && footerImageDimensions) {
        const aspectRatio = footerImageDimensions.width / footerImageDimensions.height;
        let imgWidth = pageWidth - 2 * margin;
        let imgHeight = imgWidth / aspectRatio;
        const maxFooterHeight = pageHeight * FOOTER_MAX_HEIGHT_RATIO;

        if (imgHeight > maxFooterHeight) {
          imgHeight = maxFooterHeight;
          imgWidth = imgHeight * aspectRatio;
        }
        const xPosition = (pageWidth - imgWidth) / 2;
        doc.addImage(footerImageBase64, footerImageBase64.split(',')[0].split('/')[1].split(';')[0].toUpperCase(), xPosition, pageHeight - margin - imgHeight, imgWidth, imgHeight);
        effectiveFooterHeight = imgHeight;
      }
    } catch (e) {
      console.warn(`Could not load or add footer image from ${footerImageUrl}. Error: ${(e as Error).message}`);
      doc.setFontSize(8).setTextColor(150).text(`Footer image not found or error: ${footerImageUrl}`, margin, pageHeight - margin - 5);
      effectiveFooterHeight = 10; // Placeholder height
    }
  }

  return { headerHeight: effectiveHeaderHeight, footerHeight: effectiveFooterHeight };
}

export function addPageNumbers(doc: jsPDF, footerImageActualHeight: number, margin: number = 15) {
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(100); 

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageNumText = `Page ${i} of ${pageCount}`;
    const textWidth = doc.getStringUnitWidth(pageNumText) * doc.getFontSize() / doc.internal.scaleFactor;
    const x = (doc.internal.pageSize.getWidth() - textWidth) / 2;
    // Position page number just above where the footer image ends, or a bit higher if no footer image
    const y = doc.internal.pageSize.getHeight() - margin - (footerImageActualHeight > 0 ? footerImageActualHeight : 0) - 3; 
    doc.text(pageNumText, x, y);
  }
}

export function resetLetterheadCache() {
  headerImageBase64 = null;
  footerImageBase64 = null;
  headerImageDimensions = null;
  footerImageDimensions = null;
}

export function calculateOICLevel(logs: TrainingLog[]): number | null {
  let maxLevel = null;
  const oicPattern = /\b(?:Activity\s+)?OIC Level\s*(\d+)\b/i;
  const historicalPattern = /historical/i;

  for (const log of logs) {
    const sourcesToSearch = [log.courseName, log.qualificationAchieved];
    for (const source of sourcesToSearch) {
      if (source) {
        // If the source string contains "Historical", skip this source
        if (historicalPattern.test(source)) {
          continue;
        }

        const match = source.match(oicPattern);
        if (match && match[1]) {
          const level = parseInt(match[1], 10);
          if (!isNaN(level)) {
            if (maxLevel === null || level > maxLevel) {
              maxLevel = level;
            }
          }
        }
      }
    }
  }
  return maxLevel;
}

export function getRegionForSquadron(squadronName?: string | null): string {
    if (!squadronName) return 'Headquarters';

    const sqnLower = squadronName.toLowerCase();

    // North
    if (['704', '711', '721', '723'].some(num => sqnLower.includes(num))) {
        return 'North';
    }
    // South
    if (['702', '705', '713', '714'].some(num => sqnLower.includes(num))) {
        return 'South';
    }
    // East
    if (['701', '712', '709', '715'].some(num => sqnLower.includes(num))) {
        return 'East';
    }
    // West
    if (['703', '707', '708', '710'].some(num => sqnLower.includes(num))) {
        return 'West';
    }
    
    // Headquarters is the default for anything else, including "7 Wing"
    return 'Headquarters';
}
