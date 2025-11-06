
"use client";

import * as React from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, UserCheck, FileSearch, AlertTriangle, ShieldCheck, ShieldOff, ShieldAlert, CalendarCheck2, Loader2, Mail, Download, Link as LinkIcon, RefreshCw, BarChart3, Search, Copy } from "lucide-react";
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
    const partiallyCompliantCount = activeStaffReports.filter(r => r.complianceStatusText === "Partially Compliant").length;
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
    doc.text(`Partially Compliant: ${partiallyCompliantCount}`, pageMargin, yPos); yPos += lineSpacing;
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

    addPageNumbers(doc, footerImgHeight, pageMargin);
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
    if (report.complianceStatusText === "Compliant") {
      toast({ title: "Information", description: `${report.staffMemberName} is compliant. No email needed.` });
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

      const subject = `Action Required: Compliance Update for ${report.staffMemberRank} ${report.staffMemberName}`;
      const body = `Dear ${report.staffMemberName},\n\nThis email is to inform you about your current compliance status. The attached report details the following items which require your attention:\n\n${nonCompliantItems}\n\nPlease take the necessary measures to address these items.\n\nIf you require assistance or have any questions, please contact your direct supervisor.\n\nRegards,\nSquadron Management System`;

      // 3. Set state to open the dialog
      setEmailContent({ to: report.email, subject, body });
      setIsEmailContentDialogOpen(true);

    } catch (error) {
      console.error("Error preparing compliance email content:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not prepare the email content." });
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
                            {report.complianceStatusText === "Partially Compliant" && <ShieldAlert className="inline h-4 w-4 mr-1" />}
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
                          {report.complianceStatusText !== "Compliant" && report.email && (
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
                                {report.criteriaChecks.map(criterion => (
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
                                ))}
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
            {COMPLIANCE_CRITERIA_CONFIG.map(criterion => (
              <li key={criterion.key}>
                <strong>{criterion.name}</strong>
                 {criterion.yearsToExpire
                   ? ` (valid if completed within the last ${criterion.yearsToExpire} year(s), check is exclusive of expiry date - expires *on* the date shown).`
                   : ` (checked for existence).`
                 }
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Note: For items with expiry, the system uses the completion date of the most recent relevant training log and compares it against the current date (normalized to start of day). Items without specified expiry are considered 'met' if any relevant log exists. Primary matching relies on the training log's Service Number matching the staff member's Service Number. If a log's Service Number is missing, name and rank matching is attempted as a fallback.
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
                The compliance PDF has been downloaded. You can use the content below to send an email to {emailContent.to}.
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEmailContentDialogOpen(false)}>Close</Button>
              <Button onClick={() => {
                const fullEmailText = `Subject: ${emailContent.subject}\n\n${emailContent.body}`;
                navigator.clipboard.writeText(fullEmailText);
                toast({ title: "Copied to Clipboard", description: "Email subject and body have been copied." });
              }}>
                <Copy className="mr-2 h-4 w-4" /> Copy Content
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
