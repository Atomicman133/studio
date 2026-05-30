
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
    version: "0.2.8",
    date: "Current",
    title: "Transactional Compliance Emailing & Dynamic Advisory Guidelines",
    sections: [
      {
        title: "Compliance Emailing Integration",
        items: [
          "Integrated complete transactional email sending using NodeMailer and secure SMTP (Gmail App Passwords), replacing manual clipboard copying.",
          "Configured secure, zero-leak environment isolation using .env.local locally and apphosting.yaml + GCP Secret Manager in the production App Hosting environment.",
          "Dynamically append personalized, step-by-step instructions into the email body based on which items are outstanding for a member (First Aid/CPR, WWCC, Code of Conduct, Adult Behaviour, Police Check).",
          "Optimized workflow by removing the local PDF auto-download upon opening the dialog—generating the PDF report strictly in-memory and attaching it directly at the moment of sending.",
        ],
      },
      {
        title: "Compliance & Advisory Rules",
        items: [
          "Converted 'Provide Cardiopulmonary Resuscitation' (CPR) and 'Code of Conduct - Signed' to soft advisory requirements. Staff missing only these items are marked as Compliant overall.",
          "Added yellow caution advisory badges (e.g., '⚠️ CPR') in the staff lists and detail panels to highlight missing advisory items without blocking compliance status.",
          "Enabled compliance email dispatch buttons for staff members with only advisory warnings, allowing you to email them reminders.",
        ],
      },
      {
        title: "Dashboard Enhancements",
        items: [
          "Added real-time name search and squadron unit dropdown filters to the 'Expiring Accomplishments (Next 30 Days)' dashboard widget.",
          "Wrapped the accomplishments table in a scrollable, max-height bound list to ensure clean scrolling for long lists of upcoming expirations.",
        ],
      },
    ],
  },
  {
    version: "0.2.7",
    date: "Previous Update",
    title: "Enhanced Compliance Logic & Automated Data Purging",
    sections: [
      {
        title: "Staff Management & Data Integrity",
        items: [
          "Enhanced 'Accomplishment' CSV import to automatically delete staff members and all their associated records if the 'ChangeType' column is 'Resign' or 'Discharge'.",
          "Added a 'Purge Discharged' button to the Staff Management page. This allows for a manual scan and deletion of staff who are either marked as 'Pending Discharge' or have a discharge-related accomplishment.",
          "Improved feedback during imports to more accurately report why a record was skipped, especially for deletions where the staff member could not be found.",
        ],
      },
      {
        title: "Compliance & Reporting Overhaul",
        items: [
          "Split 'Code of Conduct' and 'Adult Behaviour Policy Training' into two separate compliance checks with distinct validity periods (3 years and 1 year, respectively).",
          "Updated the 'Provide Cardiopulmonary Resuscitation' check to be an advisory item. It no longer marks a member as non-compliant but instead displays a specific warning if not met.",
          "Refined 'Defence Youth Protection' logic to allow 'CIV' rank members to be compliant with the 'Awareness Course', while other ranks require the 'Officers and Instructors' course.",
          "Renamed the 'Mandatory Training Compliance' report to 'Overall Compliance by Unit' and updated it to check against all current mandatory criteria.",
        ],
      },
      {
          title: "UI/UX Enhancements",
          items: [
              "Added a prominent 'Beta Feature' warning banner to the Meetings, Discipline Actions, Safety Audits, and Squadron Visits pages to inform users of their current development status.",
          ],
      },
      {
        title: "Bug Fixes & Stability",
        items: [
          "Resolved multiple critical runtime errors, including `purgeStaffMutation is not defined` and `prevId is not defined`, to improve application stability.",
          "Fixed an issue where the manual 'Purge Discharged' function would fail if the training log data had not been previously loaded, by ensuring data is fetched on-demand.",
        ],
      },
    ],
  },
  {
    version: "0.2.6",
    date: "Previous Update",
    title: "Enhanced Data Integrity & Automated Staff Deletion",
    sections: [
      {
        title: "Staff Management & Data Integrity",
        items: [
          "Introduced an automated deletion process during \"Accomplishment\" CSV imports. Staff members with a `ChangeType` of \"Resign\" or \"Discharge\" will now have their profile and all associated training records permanently removed from the system.",
          "Added a \"Purge Discharged\" button to the Staff Management page. This allows for a manual scan and deletion of staff members who either have a \"Pending Discharge\" status or have a discharge-related accomplishment record.",
          "Improved feedback during the Accomplishment import process to more accurately report when a staff member marked for deletion in the CSV could not be found in the database.",
        ],
      },
      {
        title: "Compliance Logic Updates",
        items: [
          "The compliance status has been simplified to be strictly binary: 'Compliant' or 'Not Compliant'. The 'Partially Compliant' category has been removed across all dashboards and reports.",
          "Updated the 'Defence Youth Protection' requirement: its validity period is now 3 years, and the only recognized course is \"Defence Youth Protection Officers and Instructors\".",
          "The \"Mandatory Training Compliance\" report in the 'Generate Reports' section has been renamed to \"Overall Compliance by Unit\" and now checks against all mandatory compliance criteria.",
        ],
      },
      {
        title: "Bug Fixes & Stability",
        items: [
          "Resolved a build failure caused by a missing closing brace in the authentication form component.",
          "Fixed a runtime error (`prevId is not defined`) on the Compliance page that prevented the details section from expanding.",
          "Corrected an issue where the manual \"Purge Discharged\" function would fail if the data cache had not been previously populated.",
          "Addressed multiple console errors related to invalid HTML structure and component rendering to improve overall application stability.",
        ],
      },
    ],
  },
  {
    version: "0.2.5",
    date: "Previous Update",
    title: "Simplified Compliance & Enhanced Reporting",
    sections: [
      {
        title: "Compliance System Overhaul",
        items: [
          "Simplified compliance status to be strictly binary: 'Compliant' or 'Not Compliant'. The 'Partially Compliant' category has been removed across all dashboards and reports for clarity.",
          "Updated the 'Defence Youth Protection' requirement: its validity period is now 3 years, and the only recognized course is 'Defence Youth Protection Officers and Instructors'.",
        ],
      },
      {
        title: "Reporting Enhancements",
        items: [
          "Added a new 'Mandatory Training Compliance' report to the 'Generate Reports' section. This report checks for completion of 'Organisational Understanding Workshop' or both 'Initial & Uniform Mandatory Training'.",
          "The Attendance Reporting feature on the 'RXO / RXI' page now includes a pop-up dialog to filter out members with less than 20% attendance, allowing for more relevant reports.",
          "The detailed XLS attendance export format has been significantly improved with chronologically sorted, abbreviated, and more descriptive column headers for activities.",
        ],
      },
      {
        title: "Security & User Experience",
        items: [
          "Implemented a mandatory disclaimer dialog on the login screen. Users must read and accept the terms before proceeding to log in via email or Google.",
        ],
      },
      {
        title: "Bug Fixes & Stability",
        items: [
          "Resolved an issue where the PDF export for the new Mandatory Training report would be cut off on long lists.",
          "Fixed a build failure caused by a missing closing brace in the authentication form component.",
          "Addressed a bug where the login disclaimer would not appear for Google sign-in attempts.",
          "Corrected several console errors related to invalid HTML structure and component rendering to improve stability.",
        ],
      },
    ],
  },
  {
    version: "0.2.4",
    date: "Previous Update",
    title: "Enhanced CSV Import & Data Integrity",
    sections: [
      {
        title: "Accomplishment Import Overhaul",
        items: [
          "Re-engineered the 'Import Accomplishment' CSV function to use a hash-based de-duplication system.",
          "A unique hash is now generated from the `staffName`, `courseName`, and `completionDate` for each training record.",
          "The system now checks for the existence of this hash before creating a new training log, providing a much more accurate method for preventing duplicate entries.",
          "Added a 'hash' field to the training log database schema to support this new system.",
        ],
      },
      {
        title: "Bug Fixes",
        items: [
          "Addressed and resolved a series of critical server-side `Firebase admin initialization failed` errors by implementing a robust, cached initialization pattern for the Firebase Admin SDK.",
          "Fixed a JSX parsing error in the `training/page.tsx` component caused by a missing closing parenthesis in a toast notification.",
          "Corrected a race condition on the `reporting/page.tsx` where compliance reports could be processed before all necessary data was loaded, leading to empty or incorrect results.",
          "Removed obsolete AI assistant functionality and related files that were causing issues and were no longer required.",
        ],
      },
    ],
  },
  {
    version: "0.2.3",
    date: "Previous Update",
    title: "AI-Powered Attendance Reporting & Export Enhancements",
    sections: [
      {
        title: "New Attendance Reporting Feature",
        items: [
          "Added a new 'Attendance Reporting' tab to the 'RXO / RXI' dashboard.",
          "Users can upload a standard attendance CSV report for automated processing and analysis.",
        ],
      },
      {
        title: "AI-Powered Classification",
        items: [
          "Integrated a new Genkit AI flow to intelligently classify free-text attendance comments (e.g., 'Dr Appt', 'No Show').",
          "The AI categorizes absences as 'Leave', 'Sick', or 'Absent', providing more accurate and nuanced reporting.",
          "The AI processing is done in a single batch request, ensuring fast report generation even for large files.",
        ],
      },
      {
        title: "Enhanced Reporting & Export",
        items: [
          "Added a downloadable 'Summary Report' in PDF format, which includes color-coded attendance percentages for each member.",
          "Added a downloadable 'Detailed Report' as a formatted Excel (.xls) file.",
          "The detailed report provides a grid view of all activities, with cells color-coded for Present (Green), Leave (Yellow), Sick (Blue), and Absent (Red).",
          "Report headers in the detailed export are now formatted to be more compact and are displayed vertically for improved readability.",
          "Corrected the attendance percentage calculation in the detailed report to be based only on 'Present' status versus all other eligible activities.",
        ],
      },
      {
        title: "Bug Fixes",
        items: [
          "Fixed a runtime error in the attendance generator caused by a missing component import (`ScrollArea`).",
          "Resolved several 'use server' runtime errors related to incorrect exports from the AI flow module.",
          "Fixed multiple critical PDF generation errors ('Will not be able to print row 0', 'Maximum call stack size exceeded') by pivoting the detailed report export from PDF to a more robust and suitable Excel format.",
        ],
      },
    ],
  },
  {
    version: "0.2.2",
    date: "Previous Update",
    title: "Staff Status Management & OIC Calculation Refinements",
    sections: [
      {
        title: "Feature Enhancements",
        items: [
          "Added a 'Status' field to staff profiles with options: 'Active', 'UAL' (Unauthorized Absence), and 'Pending Discharge'.",
          "Compliance reports now default to showing only 'Active' staff. 'UAL' and 'Pending Discharge' staff are hidden unless directly searched for.",
          "Exported PDF profiles for 'UAL' or 'Pending Discharge' staff now display a prominent red watermark at the top to clearly indicate their status.",
        ],
      },
      {
        title: "Logic Improvements",
        items: [
          "The OIC Level calculation now correctly excludes training records marked as 'Historical' or that contain 'Held in C1' in their details, ensuring a more accurate reflection of current qualifications.",
        ],
      },
    ],
  },
  {
    version: "0.2.1",
    date: "Previous Update",
    title: "Improved Compliance Reporting Workflow",
    sections: [
      {
        title: "Feature Enhancement",
        items: [
          "The 'Email Compliance Report' button in the 'Compliance' section has been updated.",
          "Instead of downloading a `.eml` file, the feature now downloads the staff member's PDF compliance report directly.",
          "After the download, a dialog box appears displaying the suggested email recipient, subject, and body, with a button to copy the content to the clipboard.",
          "This provides a more universal workflow that is not dependent on a user's local email client configuration.",
        ],
      },
    ],
  },
  {
    version: "0.2.0",
    date: "Previous Update",
    title: "Search Functionality & Stability Fixes",
    sections: [
      {
        title: "New Features",
        items: [
          "Added search functionality to the 'Staff Management' page, allowing users to filter staff by name, rank, service number, squadron, or role.",
          "Added search functionality to the 'Compliance' page to quickly find and review a specific staff member's compliance status.",
        ],
      },
      {
        title: "Bug Fixes & Stability",
        items: [
          "Fixed multiple critical server startup failures caused by subtle type errors and typos in UI components (`Alert`, `Menubar`).",
          "Resolved a hydration error caused by invalid HTML nesting in the `Alert` component.",
          "Fixed a runtime crash on the Staff Management page caused by a missing icon import (`FileSearch`).",
        ],
      },
    ],
  },
  {
    version: "0.1.9",
    date: "Previous Update",
    title: "UI Fixes & Stability Improvements",
    sections: [
      {
        title: "Bug Fixes",
        items: [
          "Fixed the alignment of the regional compliance pie charts on the 'RXO / RXI' dashboard to ensure they are visually centered and consistent.",
          "Resolved a scrolling issue in the Staff Management details dialog, making both the 'Service History' and 'Training Records' sections independently scrollable.",
        ],
      },
    ],
  },
  {
    version: "0.1.8",
    date: "Previous Update",
    title: "Accomplishment Import Bug Fix",
    sections: [
      {
        title: "CSV Import Fix",
        items: [
          "Fixed a bug in the accomplishment CSV import where rank changes to 'Actual - Civilian' were incorrectly being rejected as invalid.",
          "The rank parser now correctly recognizes 'Actual - Civilian' and maps it to the 'CIV' rank, ensuring these records are processed successfully.",
        ],
      },
    ],
  },
  {
    version: "0.1.7",
    date: "Previous Update",
    title: "Accomplishment Import & Stability Fix",
    sections: [
      {
        title: "Large CSV Import Handling",
        items: [
          "Reworked the accomplishment CSV import process to handle large datasets (e.g., 12,000+ records) without crashing.",
          "The import now processes records in batches of 490 operations to comply with Firestore's transaction limits.",
          "Added more detailed toast notifications to show the progress of large imports.",
        ],
      },
      {
        title: "Bug Fixes",
        items: [
           "Fixed a server startup crash caused by a component naming conflict in `src/app/training/components/training-log-form.tsx`.",
           "Resolved a Javascript error (`staffUpdates is not defined`) that occurred during the accomplishment CSV import.",
        ],
      },
    ],
  },
  {
    version: "0.1.6",
    date: "Previous Update",
    title: "Regional (RXO/RXI) Dashboards & Reporting",
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
          "Restructured the main sidebar: 'Prof. Development', 'Discipline Actions', 'Safety Audits', and 'Squadron Visits' are now grouped as a submenu under 'RXO / RXI'.",
          "Centralized the `getRegionForSquadron` logic into a shared utility file (`src/lib/utils.ts`) for consistent use across the application.",
          "Fixed a bug where the 'RXO / RXI' menu item was both a link and a trigger, causing instability. It now correctly functions only as a trigger for its submenu."
        ],
      },
      {
        title: "Reporting Enhancements",
        items: [
            "Updated the 'Reports' page to allow generating reports by entire region (North, South, East, West, HQ) in addition to individual squadrons.",
        ]
      },
      {
        title: "Bug Fixes",
        items: [
          "Fixed an issue where staff were incorrectly assigned to the 'Headquarters' region due to strict squadron name matching. The logic now correctly identifies squadron numbers.",
          "Resolved a runtime error (`Cannot access 'regionalData' before initialization`) on the RXO/RXI page."
        ]
      }
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
