
"use client";

import * as React from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, UserCheck, FileSearch, AlertTriangle, ShieldCheck, ShieldOff, ShieldAlert, CalendarCheck2, Loader2, Mail, Download, Link as LinkIcon, RefreshCw, BarChart3, Search, Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StaffComplianceReport, ComplianceCriterionCheck } from "./reporting-schema";
import { COMPLIANCE_CRITERIA_CONFIG } from "./reporting-schema";
import type { TrainingLog } from "../training/training-schema";
import type { StaffMember } from "../staff/staff-schema";
import { useStaff } from "@/hooks/useStaffData";
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, Timestamp, writeBatch, doc } from 'firebase/firestore';
import { addYears, isBefore, format, differenceInDays, isValid as isValidDate, startOfDay, addDays } from "date-fns";
import { RANKS, STAFF_QUERY_KEY } from "../staff/staff-schema";
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import { addLetterheadAndFooter, addPageNumbers, resetLetterheadCache } from '@/lib/utils';
import { LinkTrainingLogsDialog } from "./components/link-training-logs-dialog";
import { TRAINING_LOGS_QUERY_KEY, convertLogTimestamps as convertTrainingLogTimestampsForPage } from "../training/training-schema";
import { processComplianceReports } from "@/lib/compliance-processing";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


const HEADER_IMAGE_URL = "/AAFCLetterhead-Header.png";
const FOOTER_IMAGE_URL = "/AAFCLetterhead-Footer.png";


async function fetchLocalTrainingLogs(): Promise<TrainingLog[]> {
  const collectionRef = collection(db, 'trainingLogs');
  const q = query(collectionRef, orderBy('completionDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...convertTrainingLogTimestampsForPage(docSnap.data()),
  })) as TrainingLog[];
}

function isConfidentMatchForAutoLink(log: TrainingLog, staff: StaffMember): boolean {
  if (!log.staffName || !log.rank || !staff.firstName || !staff.lastName || !staff.rank) {
    return false;
  }
  const logNameUpper = log.staffName.toUpperCase().trim();
  const staffFullNameUpper = `${staff.firstName} ${staff.lastName}`.toUpperCase().trim();
  const staffLastNameFirstNameUpper = `${staff.lastName}, ${staff.firstName}`.toUpperCase().trim();
  const nameMatch = logNameUpper === staffFullNameUpper || logNameUpper === staffLastNameFirstNameUpper;
  const rankMatch = log.rank === staff.rank;
  return nameMatch && rankMatch;
}


export default function CompliancePage() {
  const { data: staffList = [], isLoading: isLoadingStaff, error: errorStaff } = useStaff();
  const { data: trainingLogs = [], isLoading: isLoadingLogs, error: errorLogs, refetch: refetchTrainingLogs } = useQuery<TrainingLog[], Error>({
    queryKey: [TRAINING_LOGS_QUERY_KEY],
    queryFn: fetchLocalTrainingLogs,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [complianceReports, setComplianceReports] = React.useState<StaffComplianceReport[]>([]);
  const [openCollapsible, setOpenCollapsible] = React.useState<string | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = React.useState(false);
  const [selectedStaffForLinking, setSelectedStaffForLinking] = React.useState<StaffComplianceReport | null>(null);
  const [isBulkLinking, setIsBulkLinking] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // State for email content dialog
  const [isEmailContentDialogOpen, setIsEmailContentDialogOpen] = React.useState(false);
  const [emailContent, setEmailContent] = React.useState<{ to: string, subject: string; body: string } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [selectedReportForEmail, setSelectedReportForEmail] = React.useState<StaffComplianceReport | null>(null);


  React.useEffect(() => {
    console.log("[ComplianceDebug] useEffect triggered. isLoadingStaff:", isLoadingStaff, "isLoadingLogs:", isLoadingLogs, "staffList length:", staffList.length, "trainingLogs length:", trainingLogs ? trainingLogs.length : 0);
    if (!isLoadingStaff && !isLoadingLogs && staffList.length > 0 && trainingLogs) {
      const reports = processComplianceReports(staffList, trainingLogs);
      setComplianceReports(reports);
    } else if (!isLoadingStaff && !isLoadingLogs) {
      console.log("[ComplianceDebug] Staff or logs not ready, or empty. Setting empty reports.");
      setComplianceReports([]);
    }
  }, [staffList, trainingLogs, isLoadingStaff, isLoadingLogs]);

  const filteredComplianceReports = React.useMemo(() => {
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      // Search across ALL reports, regardless of status
      return complianceReports.filter(report =>
        report.staffMemberName.toLowerCase().includes(lowercasedQuery) ||
        (report.staffServiceNumberActual && report.staffServiceNumberActual.includes(lowercasedQuery)) ||
        report.squadron.toLowerCase().includes(lowercasedQuery)
      );
    }
    // If no search query, filter out UAL and Pending Discharge staff
    return complianceReports.filter(report => report.status === 'Active');
  }, [complianceReports, searchQuery]);


  const toggleCollapsible = (staffMemberId: string) => {
    setOpenCollapsible(prev => (prev === staffMemberId ? null : staffMemberId));
  };

  const getDaysToExpiry = (completionDate: Date, yearsToExpire: number): number | null => {
    if (!isValidDate(completionDate)) return null;
    const normalizedCompletionDate = startOfDay(completionDate);
    const expiryDate = startOfDay(addYears(normalizedCompletionDate, yearsToExpire));
    if (!isValidDate(expiryDate)) return null;

    const today = startOfDay(new Date());

     if (isBefore(today, expiryDate)) {
        return differenceInDays(expiryDate, today);
     }
     return 0; // Means it's expired or on the expiry date
  };

  const getExpiryWarningBadge = (criterion: ComplianceCriterionCheck): React.ReactNode => {
    if (!criterion.isMet || !criterion.relevantLog?.completionDate) return null;

    const config = COMPLIANCE_CRITERIA_CONFIG.find(c => c.key === criterion.key);

    if (!config || !config.yearsToExpire || !isValidDate(new Date(criterion.relevantLog.completionDate))) return null;

    const daysLeft = getDaysToExpiry(new Date(criterion.relevantLog.completionDate), config.yearsToExpire);

    if (daysLeft !== null && daysLeft > 0 && daysLeft <= 90) { // Only show if not expired and within 90 days
        if (daysLeft <= 30) {
            return <Badge variant="destructive" className="ml-2 text-xs">Expires in {daysLeft}d</Badge>;
        } else {
            return <Badge variant="secondary" className="ml-2 text-xs">Expires in {daysLeft}d</Badge>;
        }
    }
    return null;
  };

  const generateComplianceReportPdf = async (report: StaffComplianceReport): Promise<jsPDF> => {
    const doc = new jsPDF();
    resetLetterheadCache();

    let yPos = 15;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const indent = 5;
    const iconSize = 3;
    const iconTextSpacing = 2;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - margin * 2;
    let headerHeight = 0;
    let footerHeight = 0;

    const { headerHeight: hh, footerHeight: fh } = await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
    headerHeight = hh;
    footerHeight = fh;
    yPos = margin + headerHeight + 5;


    const checkPageBreak = async (neededHeight: number) => {
      if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin - footerHeight) {
        addPageNumbers(doc, footerHeight, margin);
        doc.addPage();
        await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
        yPos = margin + headerHeight + 5;
      }
    };
    
    // Add UAL/Pending Discharge watermark if applicable
    if (report.status === 'UAL' || report.status === 'Pending Discharge') {
      await checkPageBreak(20);
      doc.setFontSize(48);
      doc.setTextColor(255, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text(report.status.toUpperCase(), pageWidth / 2, yPos + 10, {
        align: 'center',
      });
      doc.setTextColor(0); // Reset color
      yPos += 20; // Add space after watermark
    }


    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    await checkPageBreak(sectionSpacing);
    doc.text(`Compliance Report: ${report.staffMemberRank} ${report.staffMemberName}`, margin, yPos);
    yPos += lineSpacing;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    await checkPageBreak(lineSpacing);
    doc.text(`Squadron: ${report.squadron}`, margin, yPos);
    yPos += lineSpacing;
    await checkPageBreak(lineSpacing);
    doc.text(`Service Number: ${report.staffServiceNumberActual || 'N/A'}`, margin, yPos);
    yPos += lineSpacing;
    await checkPageBreak(lineSpacing);
    doc.text(`Overall Status: ${report.complianceStatusText}`, margin, yPos);
    yPos += sectionSpacing * 1.5;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    await checkPageBreak(lineSpacing);
    doc.text("Compliance Details:", margin, yPos);
    yPos += lineSpacing * 1.2;

    for (const criterion of report.criteriaChecks) {
      await checkPageBreak(lineSpacing * 3);

      const iconX = margin;
      let iconY = yPos - (iconSize / 2) + (lineSpacing * 0.7 / 2); // Center icon with the first line of text
      doc.setLineWidth(0.5);

      if (criterion.isMet) {
        doc.setDrawColor(34, 139, 34); // Green
        // Draw Tick: \/
        doc.line(iconX, iconY + iconSize * 0.6, iconX + iconSize * 0.4, iconY + iconSize);
        doc.line(iconX + iconSize * 0.4, iconY + iconSize, iconX + iconSize, iconY + iconSize * 0.2);
      } else {
        doc.setDrawColor(220, 20, 60); // Red
        // Draw Cross: X
        doc.line(iconX, iconY, iconX + iconSize, iconY + iconSize);
        doc.line(iconX + iconSize, iconY, iconX, iconY + iconSize);
      }
      doc.setDrawColor(0); // Reset draw color to black for text

      const textX = iconX + iconSize + iconTextSpacing;
      const textMaxWidth = maxLineWidth - (iconSize + iconTextSpacing);

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(criterion.name, textX, yPos);
      yPos += lineSpacing * 0.8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const statusText = criterion.isMet ? "Met" : "Not Met";
      const detailLines = doc.splitTextToSize(`${statusText}. ${criterion.details}`, textMaxWidth - indent);

      await checkPageBreak(detailLines.length * (lineSpacing * 0.7));
      doc.text(detailLines, textX + indent, yPos);
      yPos += detailLines.length * (lineSpacing * 0.7) + (lineSpacing * 0.3);
    }
    addPageNumbers(doc, footerHeight, margin);
    return doc;
  };

  const handleExportFullComplianceSummaryPdf = async () => {
    if (complianceReports.length === 0) {
      toast({ title: "No Data", description: "No compliance data available to export." });
      return;
    }

    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF('p', 'pt', 'a4'); // Use points for better control
    resetLetterheadCache();
    const currentDate = format(new Date(), "PPP");
    const filename = `full_compliance_summary_${format(new Date(), "yyyy-MM-dd")}.pdf`;

    const pageMargin = 40; // Points
    let yPos = pageMargin;
    const lineSpacing = 12; // Points
    const sectionSpacing = 20; // Points
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let headerImgHeight = 0;
    let footerImgHeight = 0;

    const rankColWidth = 80;
    const nameColWidth = 150;
    const itemsColX = pageMargin + rankColWidth + nameColWidth + 10;


    const setupNewPage = async () => {
      const { headerHeight: hh, footerHeight: fh } = await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, pageMargin);
      headerImgHeight = hh;
      footerImgHeight = fh;
      yPos = pageMargin + headerImgHeight + 10; // Start below header
    };

    const checkPageBreak = async (neededHeight: number = lineSpacing) => {
      if (yPos + neededHeight > pageHeight - pageMargin - footerImgHeight - 20) { // Added buffer for page numbers
        addPageNumbers(doc, footerImgHeight, pageMargin);
        doc.addPage();
        await setupNewPage();
        return true;
      }
      return false;
    };

    await setupNewPage();

    // --- Report Title ---
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    await checkPageBreak(lineSpacing * 2);
    doc.text("Full Staff Compliance Summary", pageWidth / 2, yPos, { align: "center" });
    yPos += lineSpacing;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    await checkPageBreak();
    doc.text(`Generated on: ${currentDate}`, pageWidth / 2, yPos, { align: "center" });
    yPos += sectionSpacing * 1.5;
    
    const activeStaffReports = complianceReports.filter(r => r.status === 'Active');

    // --- Overall Compliance Counts ---
    const compliantCount = activeStaffReports.filter(r => r.complianceStatusText === "Compliant").length;
    const nonCompliantCount = activeStaffReports.filter(r => r.complianceStatusText === "Not Compliant").length;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    await checkPageBreak(lineSpacing);
    doc.text("Active Staff Compliance Status:", pageMargin, yPos);
    yPos += lineSpacing * 1.5;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    await checkPageBreak(lineSpacing * 3);
    doc.text(`Total Active Staff: ${activeStaffReports.length}`, pageMargin, yPos); yPos += lineSpacing;
    doc.text(`Compliant: ${compliantCount}`, pageMargin, yPos); yPos += lineSpacing;
    doc.text(`Not Compliant: ${nonCompliantCount}`, pageMargin, yPos);
    yPos += sectionSpacing;

    // --- Non-Compliance by Category ---
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    await checkPageBreak(lineSpacing);
    doc.text("Non-Compliance by Category (Active Staff):", pageMargin, yPos);
    yPos += lineSpacing * 1.5;
    doc.setFontSize(10);

    for (const criterion of COMPLIANCE_CRITERIA_CONFIG) {
        const nonCompliantForCriterion = activeStaffReports.filter(report =>
            !report.criteriaChecks.find(c => c.key === criterion.key)?.isMet
        ).length;
        if (await checkPageBreak()) {
            doc.setFontSize(14); doc.setFont(undefined, 'bold');
            doc.text("Non-Compliance by Category (Continued):", pageMargin, yPos);
            yPos += lineSpacing * 1.5; doc.setFontSize(10);
        }
        doc.text(`${criterion.name}: ${nonCompliantForCriterion} members non-compliant`, pageMargin, yPos);
        yPos += lineSpacing;
    }
    yPos += sectionSpacing;


    // --- Detailed Staff List ---
    let currentSquadron = "";
    for (const report of activeStaffReports) {
      if (report.squadron !== currentSquadron) {
        if (currentSquadron !== "") {
            yPos += sectionSpacing / 2;
        }
        if (await checkPageBreak(sectionSpacing + lineSpacing * 2.5)) { /* Page break, headers will be redrawn */ }

        currentSquadron = report.squadron;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Squadron: ${currentSquadron}`, pageMargin, yPos);
        yPos += lineSpacing * 1.5;

        // Table Headers for staff list
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        let headerX = pageMargin;
        doc.text("Rank", headerX, yPos);
        headerX += rankColWidth;
        doc.text("Name", headerX, yPos);
        headerX += nameColWidth;
        doc.text("Non-Compliant Items", headerX, yPos);
        yPos += lineSpacing * 0.8;
        doc.setDrawColor(180);
        doc.line(pageMargin, yPos - (lineSpacing / 3), pageWidth - pageMargin, yPos - (lineSpacing / 3));
        doc.setFont(undefined, 'normal');
      }

      if (await checkPageBreak(lineSpacing * 2)) { // Check if new page needed for this staff member
        // Redraw squadron and table headers if new page started
        doc.setFontSize(12); doc.setFont(undefined, 'bold');
        doc.text(`Squadron: ${currentSquadron} (Continued)`, pageMargin, yPos);
        yPos += lineSpacing * 1.5;
        doc.setFontSize(9); doc.setFont(undefined, 'bold');
        let headerX = pageMargin;
        doc.text("Rank", headerX, yPos); headerX += rankColWidth;
        doc.text("Name", headerX, yPos); headerX += nameColWidth;
        doc.text("Non-Compliant Items", headerX, yPos);
        yPos += lineSpacing * 0.8;
        doc.setDrawColor(180); doc.line(pageMargin, yPos - (lineSpacing / 3), pageWidth - pageMargin, yPos - (lineSpacing / 3));
        doc.setFont(undefined, 'normal');
      }

      doc.setFontSize(8);
      let currentX = pageMargin;
      const rankLines = doc.splitTextToSize(report.staffMemberRank, rankColWidth - 2);
      doc.text(rankLines, currentX, yPos);
      currentX += rankColWidth;

      const nameLines = doc.splitTextToSize(`${report.staffMemberName}`, nameColWidth - 2);
      doc.text(nameLines, currentX, yPos);
      currentX += nameColWidth;

      const nonCompliantItems = report.criteriaChecks.filter(c => !c.isMet).map(c => c.name);
      let itemsText = nonCompliantItems.length > 0 ? nonCompliantItems.join(", ") : "Fully Compliant";

      const itemLines = doc.splitTextToSize(itemsText, pageWidth - currentX - pageMargin);
      doc.text(itemLines, currentX, yPos);
      yPos += (Math.max(nameLines.length, itemLines.length, rankLines.length) * lineSpacing * 0.7) + (lineSpacing * 0.4);
    }

    addPageNumbers(doc, footerHeight, pageMargin);
    doc.save(filename);
    toast({
      title: "PDF Exported",
      description: `${filename} has been downloaded.`,
    });
  };


  const handleDownloadComplianceReport = async (report: StaffComplianceReport) => {
    const pdfDoc = await generateComplianceReportPdf(report);
    const pdfFileName = `compliance_report_${report.staffMemberRank}_${report.staffMemberName.replace(/\s+/g, '_')}.pdf`;
    pdfDoc.save(pdfFileName);
    toast({
      title: "PDF Downloaded",
      description: `Compliance report "${pdfFileName}" has been downloaded.`,
    });
  };


  const handleEmailComplianceReport = async (report: StaffComplianceReport) => {
    const hasUnmetCriteria = report.criteriaChecks.some(c => !c.isMet);
    if (!hasUnmetCriteria) {
      toast({ title: "Information", description: `${report.staffMemberName} is fully compliant and has no missing or expired items. No email needed.` });
      return;
    }
    if (!report.email) {
      toast({ variant: "destructive", title: "Email Error", description: `No email address found for ${report.staffMemberName}.` });
      return;
    }

    try {
      // 1. Generate and download the PDF
      const pdfDoc = await generateComplianceReportPdf(report);
      const pdfFileName = `compliance_report_${report.staffMemberRank}_${report.staffMemberName.replace(/\s+/g, '_')}.pdf`;
      pdfDoc.save(pdfFileName);
      toast({
        title: "PDF Downloaded",
        description: `Compliance report "${pdfFileName}" has been downloaded.`,
      });

      // 2. Prepare email content
      const nonCompliantItems = report.criteriaChecks.filter(c => !c.isMet)
        .map(c => `  - ${c.name}: ${c.details}`)
        .join("\n");

      // 3. Generate detailed instructions based on outstanding items
      let instructionsText = "";
      const unmetKeys = new Set(report.criteriaChecks.filter(c => !c.isMet).map(c => c.key));

      if (unmetKeys.has("firstAid") || unmetKeys.has("cpr")) {
        instructionsText += `--------------------------------------------------\n`;
        instructionsText += `First Aid Certificate / Provide Cardiopulmonary Resuscitation:\n\n`;
        instructionsText += `If you already hold a valid Provide First Aid qualification, ensure it is correctly displaying as an accomplishment in CEA. \n`;
        instructionsText += `If it is not showing, and you have completed the qualification send the completion certificate via email to your CO, and CC in perso.7wg@airforcecadets.gov.au\n\n`;
        instructionsText += `If you need to renew your first aid training first Log on to "https://www.stjohnwa.com.au/first-aid-training/first-aid-courses/details/6136-2/provide-first-aid-1-day" and then select your training centre location and date range, select a number of dates that are suitable and then send an email to perso.7wg@airforcecadets.gov.au ensuring to CC in your CO requesting booking of your first aid training at the selected training location on one of your specified dates.\n\n`;
        instructionsText += `If this is your first time obtaining a first aid qualification you will be needed to self book and pay for this training. Training will only be at AAFC expense if it is a renewal.\n\n`;
        instructionsText += `This qualification will also renew your CPR qualification at the same time.\n`;
      }

      if (unmetKeys.has("wwcc")) {
        instructionsText += `--------------------------------------------------\n`;
        instructionsText += `Working with Children Check:\n\n`;
        instructionsText += `The process for Working with Children Check (WWCC) applications changes depending on how your account is set up with the Department of Communities WA, If you have an online account or WWCC already you can submit a renewal online through their portal here "https://www.workingwithchildren.wa.gov.au/online-services" A list of staff who can approve WWCC applications can be obtained through 7WG Personell Officers.\n\n`;
        instructionsText += `Additional information on the process to apply for a WWCC in WA can be found at "https://www.wa.gov.au/organisation/department-of-communities/working-children-check-application-and-renewal-process"\n`;
      }

      if (unmetKeys.has("codeOfConduct")) {
        instructionsText += `--------------------------------------------------\n`;
        instructionsText += `Code of Conduct - Signed:\n\n`;
        instructionsText += `Navigate to "https://www.defenceyouth.gov.au/media/xmuaz4fu/section_-2_chapter_2_annex-a_youth-safe-code-of-conduct-adult.pdf" and print the PDF Code of Conduct, ensure you read the document and then sign in the presence of a witness (it need not be a special designated witness just someone not related to you) scan and then email the completed Code Of Conduct to "perso.7wg@airforcecadets.gov.au" and CC in your CO.\n`;
      }

      if (unmetKeys.has("adultBehaviourPolicy") || unmetKeys.has("youthSafety")) {
        instructionsText += `--------------------------------------------------\n`;
        instructionsText += `Adult Behaviour Policy Training / Defence Youth Protection:\n\n`;
        instructionsText += `On CEA, navigate to the online training section and complete the below courses (this can be reached from the "My Learning" Link under Quick Links on your CEA Home Page):\n\n`;
        instructionsText += `- Behaviour Policy Training - Adult (BPT-A)\n`;
        instructionsText += `- Defence Youth Protection Officer and Instructor of Cadets Course (DYPOIC)\n\n`;
        instructionsText += `If you have any trouble accessing these courses please contact Staff Officer Cadet and Adult Development (SOCAD) at SOCAD.7WG@airforcecadets.gov.au\n`;
      }

      if (unmetKeys.has("policeClearance")) {
        instructionsText += `--------------------------------------------------\n`;
        instructionsText += `National Police Check:\n\n`;
        instructionsText += `To apply for your National Police Check, obtain the form from CEA "https://cadetnetgovau.sharepoint.com.mcas.ms/sites/aafc-pers/Staff%20Documents/Forms/AllItems.aspx?id=%2Fsites%2Faafc%2Dpers%2FStaff%20Documents%2FDocuments%20required%20for%20acceptance%20as%20IOC%5FOOC%2FApplication%20Documentation%20%2D%20Member%2FNational%20Police%20Check%20Application%20Form%205021%20Dec%2023%2Epdf&parent=%2Fsites%2Faafc%2Dpers%2FStaff%20Documents%2FDocuments%20required%20for%20acceptance%20as%20IOC%5FOOC%2FApplication%20Documentation%20%2D%20Member"\n\n`;
        instructionsText += `Ensure completion of all applicable sections of the form legibly and in full (type directly into the form electronically):\n`;
        instructionsText += `a. Sections 3-5. Use Attachments B and C to the NPC form where necessary.\n`;
        instructionsText += `b. Section 8. Only the check-box next to code number 28 should be selected.\n`;
        instructionsText += `c. Section 9. This section is to be signed and dated to confirm consent to the NPC being conducted. If consent is not granted, refer to paragraph 16 below.\n`;
        instructionsText += `d. Attachment A. Using the available check-boxes, select the relevant types of identification they will be providing as part of their NPC request.\n\n`;
        instructionsText += `14. When saving NPC forms and copies of supporting identification, members are to use the PDF format and the file naming syntaxes as follows:\n`;
        instructionsText += `a. NPC Form: Primary Unit - PMKeyS - First name Surname - NPC Form\n`;
        instructionsText += `b. Identification documents: Primary Unit - PMKeyS - First name Surname - NPC ID 1 subsequent files should use sequential numbering (eg NPC ID 1, 2, 3 etc).\n\n`;
        instructionsText += `15. Members are to email the completed NPC form with copies of their supporting identification to cb-af.policecheck.renewals@defence.gov.au, noting:\n`;
        instructionsText += `a. the email subject heading syntax: Primary Unit - PMKeyS - First name Surname - NPC Submission (eg UAL - 8123456 - John Citizen - NPC Submission).\n`;
        instructionsText += `b. it is important the size of their email does not exceed 50 MB, as this may not pass through to the Defence email system. If multiple emails are required, add sequential numbering to the end of the subject syntax of each email (eg UAL - 8123456 - John Citizen - NPC Submission 1, 2 etc).\n`;
      }

      if (instructionsText) {
        instructionsText += `--------------------------------------------------\n\n`;
      }

      const subject = `Action Required: Compliance Update for ${report.staffMemberRank} ${report.staffMemberName}`;
      const body = `Dear ${report.staffMemberName},\n\nThis email is to inform you about your current compliance status. The attached report details the following items which require your attention:\n\n${nonCompliantItems}\n\nHere are the instructions to address your outstanding items:\n\n${instructionsText}Please take the necessary measures to address these items.\n\nIf you require assistance or have any questions, please contact your direct supervisor.\n\nRegards,\nSquadron Management System`;

      // 4. Set state to open the dialog
      setSelectedReportForEmail(report);
      setEmailContent({ to: report.email, subject, body });
      setIsEmailContentDialogOpen(true);

    } catch (error) {
      console.error("Error preparing compliance email content:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not prepare the email content." });
    }
  };

  const handleSendEmail = async () => {
    if (!emailContent || !selectedReportForEmail) return;

    setIsSendingEmail(true);

    try {
      // 1. Generate the PDF
      const pdfDoc = await generateComplianceReportPdf(selectedReportForEmail);
      const pdfFileName = `compliance_report_${selectedReportForEmail.staffMemberRank}_${selectedReportForEmail.staffMemberName.replace(/\s+/g, '_')}.pdf`;

      // Convert PDF arraybuffer to base64
      const pdfOutput = pdfDoc.output('arraybuffer');
      const bytes = new Uint8Array(pdfOutput);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Pdf = window.btoa(binary);

      // 2. Post to Next.js API endpoint
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailContent.to,
          subject: emailContent.subject,
          body: emailContent.body,
          pdfBase64: base64Pdf,
          filename: pdfFileName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email.');
      }

      toast({
        title: "Email Sent Successfully",
        description: `Compliance report has been emailed to ${emailContent.to}.`,
      });

      setIsEmailContentDialogOpen(false);
    } catch (error: any) {
      console.error("Failed to send email via API:", error);
      toast({
        variant: "destructive",
        title: "Send Failed",
        description: error.message || "Could not send email.",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleOpenLinkDialog = (report: StaffComplianceReport) => {
    setSelectedStaffForLinking(report);
    setIsLinkDialogOpen(true);
  };

  const handleBulkAutoLink = async () => {
    setIsBulkLinking(true);
    toast({ title: "Bulk Linking Started", description: "Attempting to auto-link unassociated training logs..." });

    try {
      const allStaff = staffList;
      const allTrainingLogs = await fetchLocalTrainingLogs(); // Ensures we have the latest logs

      if (!allStaff || allStaff.length === 0) {
        toast({ variant: "destructive", title: "No Staff Data", description: "Cannot perform bulk linking without staff data." });
        setIsBulkLinking(false);
        return;
      }
      if (!allTrainingLogs || allTrainingLogs.length === 0) {
        toast({ title: "No Training Logs", description: "No training logs found to process for bulk linking." });
        setIsBulkLinking(false);
        return;
      }

      // Filter for logs that genuinely lack a service number or have one that doesn't match any known staff
      // This is an expensive operation if staffList is large, consider optimizing if needed.
      const staffServiceNumbers = new Set(allStaff.map(s => s.serviceNumber).filter(Boolean));
      const unlinkedLogsPool = allTrainingLogs.filter(log => !log.serviceNumber || !staffServiceNumbers.has(log.serviceNumber));
      
      console.log(`[BulkLinkDebug] Found ${unlinkedLogsPool.length} logs potentially needing linking (no SN or SN not in staff list).`);

      let linkedLogsCount = 0;
      const affectedStaffIds = new Set<string>();
      const batch = writeBatch(db);

      for (const staffMember of allStaff) {
        if (!staffMember.serviceNumber || !staffMember.id) {
          console.log(`[BulkLinkDebug] Skipping staff ${staffMember.firstName} ${staffMember.lastName} due to missing service number or ID.`);
          continue;
        }

        // For each staff member, only consider logs from the pool that *don't* already have their SN
        const potentialMatchesForStaff = unlinkedLogsPool.filter(log =>
          log.serviceNumber !== staffMember.serviceNumber && // ensure we are not re-linking an already correctly linked one
          isConfidentMatchForAutoLink(log, staffMember)
        );
        
        console.log(`[BulkLinkDebug] For ${staffMember.firstName} ${staffMember.lastName} (SN: ${staffMember.serviceNumber}), found ${potentialMatchesForStaff.length} potential unlinked logs by name/rank.`);

        if (potentialMatchesForStaff.length === 1) {
          const matchedLog = potentialMatchesForStaff[0];
          // Check if this log was already assigned to another staff member in this batch, to avoid conflicts
          // This check is simplistic; a more robust solution might be needed for complex scenarios.
          if (unlinkedLogsPool.find(l => l.id === matchedLog.id)?.serviceNumber && 
              unlinkedLogsPool.find(l => l.id === matchedLog.id)?.serviceNumber !== staffMember.serviceNumber) {
            console.warn(`[BulkLinkDebug] Log ID ${matchedLog.id} was already tentatively linked to another staff member in this batch. Skipping for ${staffMember.serviceNumber}.`);
            continue;
          }

          const logRef = doc(db, "trainingLogs", matchedLog.id!);
          const updates = {
            serviceNumber: staffMember.serviceNumber,
            staffName: `${staffMember.lastName}, ${staffMember.firstName}`, // Normalize name
            rank: staffMember.rank, // Normalize rank
          };
          batch.update(logRef, updates);
          linkedLogsCount++;
          affectedStaffIds.add(staffMember.id);
          // Mark this log as "taken" in our pool to avoid re-matching if names are very similar across staff
          const poolLogIndex = unlinkedLogsPool.findIndex(l => l.id === matchedLog.id);
          if (poolLogIndex > -1) {
            unlinkedLogsPool[poolLogIndex].serviceNumber = staffMember.serviceNumber; // Tentatively mark as linked
          }
          console.log(`[BulkLinkDebug] Queued update for log ID ${matchedLog.id} to link with SN ${staffMember.serviceNumber}.`);
        } else if (potentialMatchesForStaff.length > 1) {
          console.log(`[BulkLinkDebug] Ambiguous match for ${staffMember.firstName} ${staffMember.lastName} (SN: ${staffMember.serviceNumber}) - ${potentialMatchesForStaff.length} logs found by name/rank. Skipping auto-link for this staff.`);
        }
      }

      if (linkedLogsCount > 0) {
        await batch.commit();
        toast({
          title: "Bulk Auto-Link Successful",
          description: `${linkedLogsCount} log(s) linked for ${affectedStaffIds.size} staff member(s). Compliance data will refresh.`
        });
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: [TRAINING_LOGS_QUERY_KEY] });
        queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] }); 
        // Also invalidate any queries related to compliance reports or dashboard data
        queryClient.invalidateQueries({ queryKey: ['staffComplianceReports'] }); // If this key is used
        queryClient.invalidateQueries({ queryKey: ['complianceReports'] }); // Generic key if used
        queryClient.invalidateQueries({ queryKey: ['trainingLogsDashboard'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardComplianceData'] }); // If you have a specific key for this
      } else {
        toast({ title: "Bulk Auto-Link", description: "No unambiguous matches found to automatically link." });
      }

    } catch (err: any) {
      console.error("Bulk auto-link error:", err);
      toast({ variant: "destructive", title: "Bulk Link Error", description: `An error occurred: ${err.message}` });
    } finally {
      setIsBulkLinking(false);
    }
  };


  const isLoadingAny = isLoadingStaff || isLoadingLogs;
  const errorAny = errorStaff || errorLogs;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary hidden sm:block" />
              <div>
                <CardTitle className="text-2xl">Compliance</CardTitle>
                <CardDescription>
                  Overview of staff compliance status based on training records and defined criteria.
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search staff..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full"
                        disabled={isLoadingAny}
                    />
                </div>
                 <Button onClick={handleBulkAutoLink} size="lg" variant="outline" className="w-full sm:w-auto shrink-0" disabled={isBulkLinking || isLoadingAny}>
                    {isBulkLinking ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCw className="mr-2 h-5 w-5" />}
                    Bulk Auto-Link Logs
                </Button>
                <Button onClick={handleExportFullComplianceSummaryPdf} size="lg" variant="outline" className="w-full sm:w-auto shrink-0" disabled={isBulkLinking || isLoadingAny}>
                  <Download className="mr-2 h-5 w-5" />
                  Export Full Summary
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingAny && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading compliance data...</p>
            </div>
          )}
          {errorAny && !isLoadingAny && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
              <h3 className="text-xl font-semibold text-destructive mb-2">Error Loading Data</h3>
              {errorStaff && <p className="text-destructive mb-1 text-sm">Staff error: {errorStaff.message}</p>}
              {errorLogs && <p className="text-destructive mb-1 text-sm">Training log error: {errorLogs.message}</p>}
            </div>
          )}
          {!isLoadingAny && !errorAny && complianceReports.length === 0 && (
             <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <UserCheck className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Staff Data Found</h3>
              <p className="text-muted-foreground">Add staff members in the Staff Management section.</p>
            </div>
          )}
           {!isLoadingAny && !errorAny && filteredComplianceReports.length === 0 && (
             <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <FileSearch className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Results Found</h3>
                <p className="text-muted-foreground">Your search for &quot;{searchQuery}&quot; did not match any compliance reports.</p>
             </div>
           )}
          {!isLoadingAny && !errorAny && filteredComplianceReports.length > 0 && (
            <ScrollArea className="h-[calc(100vh-300px)] border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Squadron</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Overall Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComplianceReports.map((report) => (
                    <React.Fragment key={report.staffMemberId}>
                       {/* Trigger Row */}
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50 data-[state=open]:bg-muted/10"
                        onClick={() => toggleCollapsible(report.staffMemberId)}
                        data-state={openCollapsible === report.staffMemberId ? "open" : "closed"}
                      >
                        <TableCell>
                          <Button variant="ghost" size="sm" className="w-9 p-0" aria-label="Toggle details">
                            {openCollapsible === report.staffMemberId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell>{report.squadron}</TableCell>
                        <TableCell className="font-medium">
                          {report.staffMemberRank} {report.staffMemberName}
                          {report.status !== 'Active' && <Badge variant="destructive" className="ml-2">{report.status}</Badge>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={report.complianceStatusVariant}>
                            {report.complianceStatusText === "Compliant" && <ShieldCheck className="inline h-4 w-4 mr-1" />}
                            {report.complianceStatusText === "Not Compliant" && <ShieldOff className="inline h-4 w-4 mr-1" />}
                            {report.complianceStatusText}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                           <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenLinkDialog(report);}} title="Find & Link Unassociated Logs" disabled={isBulkLinking}>
                              <LinkIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadComplianceReport(report);}} title="Download Compliance Report" disabled={isBulkLinking}>
                              <Download className="h-4 w-4" />
                          </Button>
                          {report.criteriaChecks.some(c => !c.isMet) && report.email && (
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEmailComplianceReport(report);}} title="Email Compliance Report" disabled={isBulkLinking}>
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {/* Content Row (Conditionally Rendered) */}
                      {openCollapsible === report.staffMemberId && (
                        <TableRow className="bg-muted/50 dark:bg-muted/30">
                          <TableCell colSpan={5}>
                            <div className="p-4">
                              <h4 className="font-semibold mb-2 text-base">Compliance Details:</h4>
                              <ul className="space-y-2">
                                {report.criteriaChecks.map(criterion => {
                                  const criterionConfig = COMPLIANCE_CRITERIA_CONFIG.find(c => c.key === criterion.key);
                                  
                                  if (criterionConfig?.isAdvisory) {
                                    if (!criterion.isMet) {
                                      return (
                                        <Alert key={criterion.key} className="border-amber-500/50 text-amber-700 dark:border-amber-500/60 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-500">
                                          <ShieldAlert className="h-4 w-4" />
                                          <AlertTitle>{criterion.name} - Advisory</AlertTitle>
                                          <AlertDescription>
                                            This member is not current with CPR Qualifications and is not eligible to act in the role of First Aid Officer (FAIDO) on any activity until such time as they have completed the qualification. ({criterion.details})
                                          </AlertDescription>
                                        </Alert>
                                      );
                                    } else {
                                       return (
                                         <li key={criterion.key} className="flex items-center justify-between text-sm p-2 rounded-md border bg-background">
                                            <div className="flex items-center">
                                                <CheckCircle2 className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                                                <div>
                                                    <span>{criterion.name}:</span>
                                                    <span className="ml-1 font-medium text-green-600">Met</span>
                                                    <p className="text-xs text-muted-foreground">{criterion.details}</p>
                                                </div>
                                            </div>
                                            {getExpiryWarningBadge(criterion)}
                                        </li>
                                       )
                                    }
                                  }

                                  return (
                                    <li key={criterion.key} className="flex items-center justify-between text-sm p-2 rounded-md border bg-background">
                                      <div className="flex items-center">
                                        {criterion.isMet ? <CheckCircle2 className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" /> : <XCircle className="h-5 w-5 text-destructive mr-3 flex-shrink-0" />}
                                        <div>
                                          <span>{criterion.name}:</span>
                                          <span className={`ml-1 font-medium ${criterion.isMet ? 'text-green-600' : 'text-destructive'}`}>
                                            {criterion.isMet ? "Met" : "Not Met"}
                                          </span>
                                          <p className="text-xs text-muted-foreground">{criterion.details}</p>
                                        </div>
                                      </div>
                                      {getExpiryWarningBadge(criterion)}
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
        {!isLoadingAny && !errorAny && complianceReports.length > 0 && (
          <CardFooter className="text-xs text-muted-foreground pt-4 border-t">
            {searchQuery ? `Showing ${filteredComplianceReports.length} of ${complianceReports.length} total reports.` : `Displaying ${filteredComplianceReports.length} of ${complianceReports.length} active staff reports.`}
          </CardFooter>
        )}
      </Card>

       <Card className="shadow-sm mt-8">
        <CardHeader>
             <div className="flex items-center gap-3">
                <CalendarCheck2 className="h-6 w-6 text-primary/80" />
                <div>
                    <CardTitle className="text-xl">Compliance Criteria Used</CardTitle>
                    <CardDescription>The following criteria are checked against training records:</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
            <li><strong>First Aid Certificate</strong> (valid if completed within the last 3 year(s), check is exclusive of expiry date - expires *on* the date shown).</li>
            <li>
                <strong>Provide Cardiopulmonary Resuscitation</strong> (valid if completed within the last 1 year(s), check is exclusive of expiry date - expires *on* the date shown)
                <p className="text-xs italic pl-2 mt-1">
                    (*This one should not mark a member a fully non compliant but should display an orange notation on their profile that states &quot;This member is not current with CPR Qualifications and is not eligible to act in the role of First Aid Officer (FAIDO) on any activity until such time as they have completed the qualification&quot; once the member has that valid accomplishment the warning should be removed and the item marked as MET).
                </p>
            </li>
            <li><strong>Working With Children Check</strong> (valid if completed within the last 3 year(s), check is exclusive of expiry date - expires *on* the date shown).</li>
            <li><strong>Code of Conduct - Signed</strong> (valid if completed within the last 3 year(s), check is exclusive of expiry date - expires *on* the date shown).</li>
            <li><strong>Adult Behaviour Policy Training</strong> (valid if completed within the last 1 year(s), check is exclusive of expiry date - expires *on* the date shown. Specific Accomplishment to look for is &quot;Adult Behaviour Policy Training&quot;).</li>
            <li><strong>National Police Clearance</strong> (valid if completed within the last 5 year(s), check is exclusive of expiry date - expires *on* the date shown).</li>
            <li>
                <strong>Defence Youth Protection</strong> (valid if completed within the last 3 year(s), check is exclusive of expiry date - expires *on* the date shown Additionally if the members rank is &quot;CIV&quot; then they may be marked as compliant using the accomplishment &quot;Defence Youth Protection Awareness Course&quot; however any Rank other than &quot;CIV&quot; must have &quot;Defence Youth Protection Officers and Instructors&quot; in order to be compliant validity period for all accomplishments in this rule are the same).
            </li>
        </ul>

          <p className="mt-4 text-xs text-muted-foreground">
            Note: For items with expiry, the system uses the completion date of the most recent relevant training log and compares it against the current date (normalized to start of day). Items without specified expiry are considered &apos;met&apos; if any relevant log exists. Primary matching relies on the training log&apos;s Service Number (CEA ID) matching the staff member&apos;s Service Number. If a log&apos;s Service Number is missing, name and rank matching is attempted as a fallback.
          </p>
        </CardContent>
      </Card>

      {selectedStaffForLinking && isLinkDialogOpen && (
        <LinkTrainingLogsDialog
          open={isLinkDialogOpen}
          onOpenChange={setIsLinkDialogOpen}
          staffMemberReport={selectedStaffForLinking}
          onLogsLinked={() => {
            queryClient.invalidateQueries({ queryKey: [TRAINING_LOGS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });
             // Invalidate other queries that might be affected or lead to compliance report re-calculation
            queryClient.invalidateQueries({ queryKey: ['staffComplianceReports'] });
            queryClient.invalidateQueries({ queryKey: ['complianceReports'] });
            queryClient.invalidateQueries({ queryKey: ['trainingLogsDashboard'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardComplianceData'] });

            toast({ title: "Logs Linked", description: "Compliance data will refresh."});
          }}
        />
      )}

      {emailContent && (
        <Dialog open={isEmailContentDialogOpen} onOpenChange={setIsEmailContentDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Suggested Email Content</DialogTitle>
              <DialogDescription>
                You can send this compliance email with the report PDF attached directly, or copy the content below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="email-subject">Subject</Label>
                <Input id="email-subject" readOnly value={emailContent.subject} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email-body">Body</Label>
                <Textarea id="email-body" readOnly value={emailContent.body} className="h-64 min-h-[200px] whitespace-pre-wrap" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsEmailContentDialogOpen(false)} disabled={isSendingEmail}>Close</Button>
              <Button variant="outline" disabled={isSendingEmail} onClick={() => {
                const fullEmailText = `Subject: ${emailContent.subject}\n\n${emailContent.body}`;
                navigator.clipboard.writeText(fullEmailText);
                toast({ title: "Copied to Clipboard", description: "Email subject and body have been copied." });
              }}>
                <Copy className="mr-2 h-4 w-4" /> Copy Content
              </Button>
              <Button onClick={handleSendEmail} disabled={isSendingEmail} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
