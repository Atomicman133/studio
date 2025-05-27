
"use client";

import * as React from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, UserCheck, FileSearch, AlertTriangle, ShieldCheck, ShieldOff, CalendarCheck2, Loader2, Mail, Download, Link as LinkIcon } from "lucide-react";
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { addYears, isBefore, isAfter, format, differenceInDays, isValid as isValidDate, isEqual, subYears } from "date-fns";
import { RANKS, STAFF_QUERY_KEY } from "../staff/staff-schema";
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import { addLetterheadAndFooter, addPageNumbers, resetLetterheadCache } from '@/lib/utils';
import { LinkTrainingLogsDialog } from "./components/link-training-logs-dialog";
import { TRAINING_LOGS_QUERY_KEY, convertLogTimestamps } from "../training/page";


const HEADER_IMAGE_URL = "/AAFCLetterhead-Header.png";
const FOOTER_IMAGE_URL = "/AAFCLetterhead-Footer.png";


async function fetchLocalTrainingLogs(): Promise<TrainingLog[]> {
  const collectionRef = collection(db, 'trainingLogs');
  const q = query(collectionRef, orderBy('completionDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertLogTimestamps(doc.data()),
  })) as TrainingLog[];
}


const processComplianceReports = (
  staffList: StaffMember[],
  trainingLogs: TrainingLog[]
): StaffComplianceReport[] => {
  console.log(`[ComplianceDebug] processComplianceReports called. Staff: ${staffList.length}, Logs: ${trainingLogs.length}`);
  if (trainingLogs.length > 0) {
    console.log("[ComplianceDebug] Sample training logs received:", trainingLogs.slice(0, 3).map(l => ({name: l.staffName, sn: l.serviceNumber, course: l.courseName})));
  }


  return staffList.map((staff) => {
    const staffServiceNumber = staff.serviceNumber; // Use the direct service number from staff
    console.log(`[ComplianceDebug] Processing staff: ${staff.firstName} ${staff.lastName} (SN: ${staffServiceNumber})`);

    if (!staffServiceNumber) {
      console.warn(`[ComplianceDebug] Staff member ${staff.firstName} ${staff.lastName} (Rank: ${staff.rank}, ID: ${staff.id}) is missing a service number. Compliance check will be incomplete.`);
    }
    
    const memberLogs = trainingLogs.filter(log =>
        log.serviceNumber && staffServiceNumber && log.serviceNumber === staffServiceNumber
    );
    console.log(`[ComplianceDebug] Found ${memberLogs.length} logs for SN: ${staffServiceNumber}.`);
    if (memberLogs.length > 0) {
        console.log(`[ComplianceDebug] Sample memberLogs for ${staff.firstName} ${staff.lastName}:`, memberLogs.slice(0,3).map(l => ({course: l.courseName, date: l.completionDate})));
    }


    const criteriaChecks: ComplianceCriterionCheck[] = COMPLIANCE_CRITERIA_CONFIG.map(criterion => {
      console.log(`[ComplianceDebug]   Checking criterion: "${criterion.name}" for ${staff.firstName} ${staff.lastName}`);
      const relevantLogs = memberLogs
        .filter(log => {
            const isRelevant = criterion.identifier(log);
            // console.log(`[ComplianceDebug]     Log "${log.courseName}" (SN: ${log.serviceNumber}) relevance for "${criterion.name}": ${isRelevant}`);
            return isRelevant;
        })
        .sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime());
      
      console.log(`[ComplianceDebug]     Found ${relevantLogs.length} relevant logs for "${criterion.name}".`);


      let isMet = false;
      let details = "Missing";
      let selectedLog: TrainingLog | undefined = undefined;

      if (relevantLogs.length > 0) {
        selectedLog = relevantLogs[0];
        console.log(`[ComplianceDebug]       Using latest relevant log for "${criterion.name}": ${selectedLog.courseName}, completed: ${selectedLog.completionDate}`);
        const completionDate = new Date(selectedLog.completionDate);

        if (!isValidDate(completionDate)) {
          details = "Invalid completion date in record.";
          console.log(`[ComplianceDebug]         Invalid completion date for log: ${selectedLog.courseName}`);
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (criterion.yearsToExpire) {
            const expiryDate = addYears(completionDate, criterion.yearsToExpire);
            // A qualification is valid IF today IS BEFORE the expiry date.
            // Example: Completed 1st Jan 2020, 3 years expiry. Expires ON 1st Jan 2023.
            // Valid up to and including 31st Dec 2022.
            // If today is 31st Dec 2022, isBefore(today, expiryDate) is true.
            if (isBefore(today, expiryDate)) {
              isMet = true;
              details = `Completed: ${format(completionDate, 'dd/MM/yy')}. Valid until: ${format(expiryDate, 'dd/MM/yy')}.`;
            } else {
              details = `Out of Date. Last completed: ${format(completionDate, 'dd/MM/yy')}. Expired on: ${format(expiryDate, 'dd/MM/yy')}.`;
            }
          } else { // No expiry, just check for existence
            isMet = true;
            details = `Completed: ${format(completionDate, 'dd/MM/yy')}`;
          }
        }
      } else {
        console.log(`[ComplianceDebug]       No relevant logs found for "${criterion.name}", marking as Missing.`);
      }
      console.log(`[ComplianceDebug]     Criterion "${criterion.name}" result: isMet=${isMet}, details="${details}"`);
      return {
        key: criterion.key,
        name: criterion.name,
        isMet,
        details,
        relevantLog: selectedLog,
      };
    });

    const isCompliant = criteriaChecks.every(c => c.isMet);
    console.log(`[ComplianceDebug] Overall compliance for ${staff.firstName} ${staff.lastName}: ${isCompliant}`);

    return {
      staffMemberId: staff.id || `${staff.lastName}, ${staff.firstName}_${staff.rank}_${staff.serviceNumber || 'NO_SN'}`,
      staffMemberName: `${staff.firstName} ${staff.lastName}`,
      staffMemberRank: staff.rank,
      squadron: staff.squadron || "N/A",
      isCompliant,
      criteriaChecks,
      email: staff.email,
      staffServiceNumberActual: staff.serviceNumber, 
    };
  })
  .sort((a,b) => {
    const squadronCompare = (a.squadron || "ZZZ").localeCompare(b.squadron || "ZZZ");
    if (squadronCompare !== 0) {
        return squadronCompare;
    }

    const rankOrder = RANKS;
    const rankAIndex = rankOrder.indexOf(a.staffMemberRank as typeof RANKS[number]);
    const rankBIndex = rankOrder.indexOf(b.staffMemberRank as typeof RANKS[number]);

    const effectiveRankAIndex = rankAIndex === -1 ? Infinity : rankAIndex;
    const effectiveRankBIndex = rankBIndex === -1 ? Infinity : rankBIndex;

    if (effectiveRankAIndex !== effectiveRankBIndex) {
        return effectiveRankAIndex - effectiveRankBIndex;
    }

    const lastNameCompare = a.staffMemberName.localeCompare(b.staffMemberName);
    return lastNameCompare;
  });
};


export default function ReportingPage() {
  const { data: staffList = [], isLoading: isLoadingStaff, error: errorStaff } = useStaff();
  const { data: trainingLogs = [], isLoading: isLoadingLogs, error: errorLogs } = useQuery<TrainingLog[], Error>({
    queryKey: [TRAINING_LOGS_QUERY_KEY],
    queryFn: fetchLocalTrainingLogs,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [complianceReports, setComplianceReports] = React.useState<StaffComplianceReport[]>([]);
  const [openCollapsible, setOpenCollapsible] = React.useState<string | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = React.useState(false);
  const [selectedStaffForLinking, setSelectedStaffForLinking] = React.useState<StaffComplianceReport | null>(null);


  React.useEffect(() => {
    console.log("[ComplianceDebug] useEffect triggered. isLoadingStaff:", isLoadingStaff, "isLoadingLogs:", isLoadingLogs, "staffList length:", staffList.length, "trainingLogs length:", trainingLogs.length);
    if (!isLoadingStaff && !isLoadingLogs && staffList.length > 0 && trainingLogs) {
      const reports = processComplianceReports(staffList, trainingLogs);
      setComplianceReports(reports);
    } else if (!isLoadingStaff && !isLoadingLogs) {
      // Handles cases where staffList might be empty or trainingLogs might be undefined/empty
      console.log("[ComplianceDebug] Staff or logs not ready, or empty. Setting empty reports.");
      setComplianceReports([]);
    }
  }, [staffList, trainingLogs, isLoadingStaff, isLoadingLogs]);


  const toggleCollapsible = (staffMemberId: string) => {
    setOpenCollapsible(prev => (prev === staffMemberId ? null : staffMemberId));
  };

  const getDaysToExpiry = (completionDate: Date, yearsToExpire: number): number | null => {
    if (!isValidDate(completionDate)) return null;
    const expiryDate = addYears(completionDate, yearsToExpire);
    if (!isValidDate(expiryDate)) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

     if (isBefore(today, expiryDate)) {
        return differenceInDays(expiryDate, today);
     }
     return 0; // Indicates expired or on expiry date
  };

  const getExpiryWarningBadge = (criterion: ComplianceCriterionCheck): React.ReactNode => {
    if (!criterion.isMet || !criterion.relevantLog) return null;

    const config = COMPLIANCE_CRITERIA_CONFIG.find(c => c.key === criterion.key);

    if (!config || !config.yearsToExpire || !isValidDate(new Date(criterion.relevantLog.completionDate))) return null;

    const daysLeft = getDaysToExpiry(new Date(criterion.relevantLog.completionDate), config.yearsToExpire);

    if (daysLeft !== null && daysLeft > 0) { // Only show if not expired AND isMet is true
        if (daysLeft <= 30) {
            return <Badge variant="destructive" className="ml-2 text-xs">Expires in {daysLeft}d</Badge>;
        } else if (daysLeft <= 90) {
            return <Badge variant="secondary" className="ml-2 text-xs">Expires in {daysLeft}d</Badge>;
        }
    }
    // Removed the "Expired" badge from here as the main status detail already covers it
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

    const setPageLayout = async () => {
      const heights = await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
      headerHeight = heights.headerHeight;
      footerHeight = heights.footerHeight;
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
    doc.text(`Overall Status: ${report.isCompliant ? "Compliant" : "Not Compliant"}`, margin, yPos);
    yPos += sectionSpacing * 1.5;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    await checkPageBreak(lineSpacing);
    doc.text("Compliance Details:", margin, yPos);
    yPos += lineSpacing * 1.2;

    for (const criterion of report.criteriaChecks) {
      await checkPageBreak(lineSpacing * 3); 

      const iconX = margin;
      const iconY = yPos - (iconSize / 2); 
      doc.setLineWidth(0.5);

      if (criterion.isMet) {
        doc.setDrawColor(0, 128, 0); 
        doc.line(iconX, iconY + iconSize * 0.6, iconX + iconSize * 0.4, iconY + iconSize);
        doc.line(iconX + iconSize * 0.4, iconY + iconSize, iconX + iconSize, iconY);
      } else {
        doc.setDrawColor(255, 0, 0); 
        doc.line(iconX, iconY, iconX + iconSize, iconY + iconSize);
        doc.line(iconX + iconSize, iconY, iconX, iconY + iconSize);
      }
      doc.setDrawColor(0); 

      const textX = iconX + iconSize + iconTextSpacing;
      const textMaxWidth = maxLineWidth - (iconSize + iconTextSpacing);

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(criterion.name, textX, yPos);
      yPos += lineSpacing * 0.8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const statusText = criterion.isMet ? "Met" : "Not Met";
      const detailLines = doc.splitTextToSize(`Status: ${statusText} (${criterion.details})`, textMaxWidth - indent);
      
      await checkPageBreak(detailLines.length * (lineSpacing * 0.7));
      doc.text(detailLines, textX + indent, yPos);
      yPos += detailLines.length * (lineSpacing * 0.7) + (lineSpacing * 0.3);
    }
    addPageNumbers(doc, footerHeight, margin);
    return doc;
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
    if (report.isCompliant) {
      toast({ title: "Information", description: `${report.staffMemberName} is compliant. No email sent.` });
      return;
    }
    if (!report.email) {
      toast({ variant: "destructive", title: "Email Error", description: `No email address found for ${report.staffMemberName}.` });
      return;
    }


    const pdfDoc = await generateComplianceReportPdf(report);
    const pdfFileName = `compliance_report_${report.staffMemberRank}_${report.staffMemberName.replace(/\s+/g, '_')}.pdf`;
    const pdfBase64 = pdfDoc.output('datauristring').split(',')[1];

    const nonCompliantItems = report.criteriaChecks.filter(c => !c.isMet)
      .map(c => `  - ${c.name}: ${c.details}`)
      .join("\n");

    const emailTo = report.email;
    const subject = `Action Required: Compliance Update for ${report.staffMemberRank} ${report.staffMemberName}`;
    const body = `Dear ${report.staffMemberName},\n\nThis email is to inform you about your current compliance status. The following items require your attention:\n\n${nonCompliantItems}\n\nPlease take the necessary measures to address these items.\n\nIf you require assistance or have any questions, please contact your direct supervisor.\n\nRegards,\nSquadron Management System`;

    const boundary = `----=_Part_Boundary_001_${Date.now().toString(36)}`;
    let emlContent = `From: Squadron Manager <noreply@squadronmanager.app>\r\n`;
    emlContent += `To: ${emailTo}\r\n`;
    emlContent += `Subject: ${subject}\r\n`;
    emlContent += `MIME-Version: 1.0\r\n`;
    emlContent += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    emlContent += `--${boundary}\r\n`;
    emlContent += `Content-Type: text/plain; charset="UTF-8"\r\n`;
    emlContent += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
    emlContent += `${body}\r\n\r\n`;
    emlContent += `--${boundary}\r\n`;
    emlContent += `Content-Type: application/pdf; name="${pdfFileName}"\r\n`;
    emlContent += `Content-Transfer-Encoding: base64\r\n`;
    emlContent += `Content-Disposition: attachment; filename="${pdfFileName}"\r\n\r\n`;
    emlContent += `${pdfBase64}\r\n\r\n`;
    emlContent += `--${boundary}--`;

    const emlFileName = `Compliance_Email_for_${report.staffMemberName.replace(/\s+/g, '_')}.eml`;
    const dataUri = `data:message/rfc822;charset=utf-8,${encodeURIComponent(emlContent)}`;

    const link = document.createElement('a');
    link.href = dataUri;
    link.download = emlFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Email File Generated",
      description: (
        <>
          An .eml file &quot;{emlFileName}&quot; has been downloaded.
          <br />
          Please open it with your email client to send the pre-composed email with the PDF report attached.
        </>
      ),
      duration: 10000,
    });
  };

  const handleOpenLinkDialog = (report: StaffComplianceReport) => {
    setSelectedStaffForLinking(report);
    setIsLinkDialogOpen(true);
  };


  const isLoadingAny = isLoadingStaff || isLoadingLogs;
  const errorAny = errorStaff || errorLogs;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileSearch className="h-8 w-8 text-primary hidden sm:block" />
            <div>
              <CardTitle className="text-2xl">Compliance Reporting</CardTitle>
              <CardDescription>
                Overview of staff compliance status based on training records and defined criteria.
              </CardDescription>
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
          {!isLoadingAny && !errorAny && complianceReports.length === 0 && staffList.length === 0 && (
             <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <UserCheck className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Staff Data Available</h3>
              <p className="text-muted-foreground">Add staff members in the Staff Management section.</p>
            </div>
          )}
           {!isLoadingAny && !errorAny && complianceReports.length === 0 && staffList.length > 0 && (
             <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <UserCheck className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Compliance Data Processed</h3>
              <p className="text-muted-foreground">Ensure training logs are available or check data processing logic.</p>
            </div>
          )}
          {!isLoadingAny && !errorAny && complianceReports.length > 0 && (
            <ScrollArea className="h-[calc(100vh-300px)] border rounded-md"> {/* Ensure ScrollArea wraps the Table */}
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
                  {complianceReports.map((report) => (
                     <React.Fragment key={report.staffMemberId}>
                        <TableRow
                        className="cursor-pointer hover:bg-muted/50 data-[state=open]:bg-muted/10"
                        onClick={() => toggleCollapsible(report.staffMemberId)}
                      >
                        <TableCell>
                          <Button variant="ghost" size="sm" className="w-9 p-0">
                            {openCollapsible === report.staffMemberId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="sr-only">Toggle details for {report.staffMemberName}</span>
                          </Button>
                        </TableCell>
                        <TableCell>{report.squadron}</TableCell>
                        <TableCell className="font-medium">
                          {report.staffMemberRank} {report.staffMemberName}
                        </TableCell>
                        <TableCell>
                          <Badge variant={report.isCompliant ? "default" : "destructive"}>
                            {report.isCompliant ? <ShieldCheck className="inline h-4 w-4 mr-1" /> : <ShieldOff className="inline h-4 w-4 mr-1" />}
                            {report.isCompliant ? "Compliant" : "Not Compliant"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenLinkDialog(report);}} title="Find & Link Unassociated Logs">
                              <LinkIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadComplianceReport(report);}} title="Download Compliance Report">
                              <Download className="h-4 w-4" />
                          </Button>
                          {!report.isCompliant && report.email && (
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEmailComplianceReport(report);}} title="Email Compliance Report">
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
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
            Displaying compliance reports for {complianceReports.length} staff member(s).
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
                 <br />
                 <span className="text-xs italic">Identified if training log's course name or qualification contains keywords like:
                 {
                  criterion.key === 'firstAid' ? '"First Aid", "HLTAID"' :
                  criterion.key === 'wwcc' ? '"Working With Children Check", "WWCC", "Working With Children - WA - Certified"' :
                  criterion.key === 'codeOfConduct' ? '"Code of Conduct", "Behavioural Policy Acceptance", "CoC"' :
                  criterion.key === 'psychAssessment' ? '"Psychological Assessment", "Psych Assessment", "Psychological Test - Completed"' :
                  criterion.key === 'policeClearance' ? '"National Police Clearance", "Police Check", "NPC"' :
                  criterion.key === 'youthSafety' ? '"Defence Youth Safety", "DYSAT", "Youth Mental Health - Awareness - Completed", "Defence Youth Protection Awareness Course - Completed Online", "Defence Youth Safety Level 3 - Leader - Completed Online"' : ''
                 }
                 </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Note: For items with expiry, the system uses the completion date of the most recent relevant training log and compares it against the current date. Items without specified expiry are considered 'met' if any relevant log exists. This system relies on accurate and consistently named training log entries. Staff member matching relies on Service Number primarily.
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
            // Also invalidate any query key specifically used by processComplianceReports if it's different
            // For example, if complianceReports itself was a query:
            // queryClient.invalidateQueries({ queryKey: ['complianceReports'] });
            toast({ title: "Logs Linked", description: "Compliance data is refreshing."});
          }}
        />
      )}
    </div>
  );
}
