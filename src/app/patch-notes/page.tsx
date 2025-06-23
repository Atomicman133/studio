
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Newspaper } from "lucide-react";
import jsPDF from 'jspdf';
import { addLetterheadAndFooter, addPageNumbers, resetLetterheadCache } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

const patchNotesData = [
  {
    version: "0.1.6",
    date: "Current",
    title: "New 'RXO / RXI' Regional Dashboard",
    sections: [
      {
        title: "New 'RXO / RXI' Module (/rxo-rxi)",
        items: [
          "Created a new dashboard page designed for regional staff (RXO/RXI).",
          "Displays staff compliance breakdowns for each defined region: North, South, East, West, and Headquarters.",
          "Each region has its own interactive pie chart showing Compliant, Partially Compliant, and Non-Compliant staff numbers.",
          "Clicking a segment of a regional chart opens a dialog with the detailed records for those staff members.",
          "The dialog allows for exporting the filtered regional compliance list to a PDF.",
        ],
      },
       {
        title: "Navigation & Code Refinements",
        items: [
          "Added 'RXO / RXI' to the main sidebar navigation.",
          "Centralized the main compliance processing logic into a new utility file (`src/lib/compliance-processing.ts`) to be shared between the main dashboard and the new regional dashboard.",
        ],
      },
    ],
  },
  {
    version: "0.1.5",
    date: "Previous Update",
    title: "Version History & Cross-Origin Fix",
    sections: [
      {
        title: "New 'Patch Notes' Module (/patch-notes)",
        items: [
          "Created a dedicated page to display a history of application updates and improvements.",
          "Added functionality to export the complete patch notes as a PDF document.",
          "Integrated a 'Patch Notes' link into the main sidebar navigation for easy access.",
        ],
      },
      {
        title: "Configuration Fix",
        items: [
          "Updated Next.js configuration (`next.config.ts`) to include necessary `allowedDevOrigins` to resolve cross-origin request errors in the Firebase Studio development environment.",
        ],
      },
    ],
  },
  {
    version: "0.1.3",
    date: "Previous Update",
    title: "Dashboard Interactivity & Reports Module",
    sections: [
      {
        title: "Dashboard Enhancements",
        items: [
          "Interactive Compliance Pie Chart: Clicking segments now opens a dialog with relevant staff data.",
          "PDF Export from Compliance Dialog: Added ability to download the filtered staff list from the interactive pie chart dialog.",
        ],
      },
      {
        title: "New 'Reports' Module (/reports)",
        items: [
          "Introduced a dedicated page for generating custom reports.",
          "Supports 'OIC Level by Unit' and 'Specific Compliance Item by Unit' reports.",
          "Allows export of generated reports to PDF and CSV.",
          "Optimized PDF generation using dynamic imports for jsPDF libraries.",
        ],
      },
      {
        title: "Staff Management & Training Module Refactor",
        items: [
          "'Training Overview' Page Removed: Functionality merged or moved to improve performance and reduce redundancy.",
          "'Import Accomplishments' Moved to Staff Management: Centralized CSV import for training records, positions, and ranks.",
          "Navigation Updated: Removed 'Training Overview' link from sidebar.",
        ],
      },
    ],
  },
  {
    version: "0.1.2",
    date: "Previous Update",
    title: "Compliance Logic Update",
    sections: [
      {
        title: "Enhanced Youth Safety Compliance",
        items: [
           "'WHS Annual Awareness - Level 2' (completed within 12 months) now recognized as valid for the 'Defence Youth Safety Annual Awareness Training' requirement.",
        ],
      },
    ],
  },
  {
    version: "0.1.1",
    date: "Previous Update",
    title: "Process Improvement",
    sections: [
      {
        title: "Versioning Practice Established",
        items: [
          "Established practice of incrementing app version in `package.json` with each significant update.",
        ],
      },
    ],
  },
  {
    version: "0.1.0",
    date: "Initial Version",
    title: "Initial Application Release",
    sections: [
       {
        title: "Core Features",
        items: [
            "Dashboard with initial metrics.",
            "Meeting Records module with PDF export.",
            "Professional Development Plans (PDPs) module.",
            "Discipline Actions & Conversations module with PDF exports.",
            "Safety Audits module with PDF export.",
            "Squadron Visits module with PDF export.",
            "Compliance Reporting module with individual staff PDF export and email generation.",
            "Staff Management module with CSV import for profiles.",
            "Authentication, User Profile, and Settings pages.",
        ]
       }
    ]
  }
];


export default function PatchNotesPage() {

  const handleExportPatchNotesPdf = async () => {
    const doc = new jsPDF();
    resetLetterheadCache(); // Ensure fresh letterhead images if they are dynamic
    const filename = `squadron_manager_patch_notes_${format(new Date(), "yyyy-MM-dd")}.pdf`;

    const margin = 15;
    let yPos = margin;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const indent = 5;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - (margin * 2);
    let headerImgHeight = 0;
    let footerImgHeight = 0;

    const { headerHeight, footerHeight } = await addLetterheadAndFooter(doc, "/AAFCLetterhead-Header.png", "/AAFCLetterhead-Footer.png", margin);
    headerImgHeight = headerHeight;
    footerImgHeight = footerHeight;
    yPos = margin + headerImgHeight + 5;

    const checkPageBreak = async (neededHeight: number = lineSpacing) => {
        if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin - footerImgHeight - 10) { // Buffer for page numbers
            addPageNumbers(doc, footerImgHeight, margin);
            doc.addPage();
            await addLetterheadAndFooter(doc, "/AAFCLetterhead-Header.png", "/AAFCLetterhead-Footer.png", margin);
            yPos = margin + headerImgHeight + 5;
        }
    };

    // Report Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    await checkPageBreak(sectionSpacing);
    doc.text("Squadron Manager - Patch Notes", pageWidth / 2, yPos, { align: 'center' });
    yPos += sectionSpacing;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    await checkPageBreak();
    doc.text(`Generated on: ${format(new Date(), "PPP")}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += sectionSpacing * 1.5;

    for (const release of patchNotesData) {
      await checkPageBreak(sectionSpacing + 16);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(`Version ${release.version} (${release.date})`, margin, yPos);
      yPos += lineSpacing * 0.8;
      doc.setFontSize(12);
      doc.setFont(undefined, 'italic');
      doc.text(release.title, margin, yPos);
      yPos += sectionSpacing;

      for (const section of release.sections) {
        await checkPageBreak(lineSpacing + 12);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(section.title, margin + indent, yPos);
        yPos += lineSpacing * 0.9;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        for (const item of section.items) {
          const itemLines = doc.splitTextToSize(`• ${item}`, maxLineWidth - (indent * 2));
          await checkPageBreak(itemLines.length * (lineSpacing * 0.7) + (lineSpacing * 0.3));
          doc.text(itemLines, margin + (indent * 2), yPos);
          yPos += itemLines.length * (lineSpacing * 0.7) + (lineSpacing * 0.3);
        }
        yPos += lineSpacing * 0.5;
      }
      yPos += sectionSpacing * 0.5;
      if (release !== patchNotesData[patchNotesData.length -1]) {
        await checkPageBreak(lineSpacing);
        doc.setDrawColor(200); // Light grey line
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += lineSpacing;
      }
    }

    addPageNumbers(doc, footerImgHeight, margin);
    doc.save(filename);
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Newspaper className="h-8 w-8 text-primary hidden sm:block" />
              <div>
                <CardTitle className="text-2xl">Patch Notes</CardTitle>
                <CardDescription>History of updates and improvements to the Squadron Manager application.</CardDescription>
              </div>
            </div>
            <Button onClick={handleExportPatchNotesPdf}>
              <Download className="mr-2 h-4 w-4" /> Export as PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-20rem)]"> {/* Adjust height as needed */}
            <div className="space-y-8 pr-4">
              {patchNotesData.map((release) => (
                <div key={release.version} className="border-b pb-6 mb-6 last:border-b-0 last:pb-0 last:mb-0">
                  <h2 className="text-xl font-semibold text-primary">
                    Version {release.version} <span className="text-sm font-normal text-muted-foreground">({release.date})</span>
                  </h2>
                  <p className="text-md italic text-muted-foreground mb-3">{release.title}</p>
                  {release.sections.map((section) => (
                    <div key={section.title} className="mb-3">
                      <h3 className="text-lg font-medium mb-1">{section.title}</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {section.items.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
