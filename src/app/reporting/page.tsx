
"use client";

import * as React from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, UserCheck, FileSearch, AlertTriangle, ShieldCheck, ShieldOff, CalendarCheck2, Loader2, Mail } from "lucide-react";
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
import { useQuery } from '@tanstack/react-query'; 
import { db } from '@/lib/firebase/config'; 
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore'; 
import { addYears, isBefore, isAfter, format, differenceInDays, isValid as isValidDate, isEqual, subYears } from "date-fns";
import { RANKS } from "../staff/staff-schema";
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";


// --- Fetch Training Logs (copied from training page for this component's scope) ---
const TRAINING_LOGS_QUERY_KEY = 'trainingLogsReporting'; 
const convertLogTimestamps = (data: any): TrainingLog => {
  return {
    ...data,
    completionDate: data.completionDate instanceof Timestamp ? data.completionDate.toDate() : data.completionDate,
  };
};
async function fetchTrainingLogs(): Promise<TrainingLog[]> {
  const collectionRef = collection(db, 'trainingLogs');
  const q = query(collectionRef, orderBy('completionDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertLogTimestamps(doc.data()),
  })) as TrainingLog[];
}
// --- End Fetch Training Logs ---


const getStaffIdentifier = (staffMember: StaffMember): string => {
  if (!staffMember.serviceNumber) {
    console.warn(`Staff member ${staffMember.firstName} ${staffMember.lastName} is missing a service number.`);
    return `${staffMember.lastName}, ${staffMember.firstName}_${staffMember.rank}_MISSING_SN`;
  }
  return `${staffMember.lastName}, ${staffMember.firstName}_${staffMember.rank}_${staffMember.serviceNumber}`;
};

const getTrainingLogStaffIdentifier = (log: TrainingLog, staffList: StaffMember[]): string => {
  const matchedStaff = staffList.find(sm =>
    sm.rank === log.rank &&
    `${sm.lastName}, ${sm.firstName}` === log.staffName &&
    sm.squadron === log.squadron 
  );

  if (matchedStaff) {
    return getStaffIdentifier(matchedStaff);
  }

  console.warn(`Could not find exact staff match for training log: ${log.staffName}, ${log.rank}. Using log details as fallback identifier.`);
  return `${log.staffName}_${log.rank}_${log.squadron || 'UNKNOWN_SQN'}_FALLBACK_ID`;
};


const processComplianceReports = (
  staffList: StaffMember[],
  trainingLogs: TrainingLog[]
): StaffComplianceReport[] => {

  return staffList.map((staff) => {
    const staffId = getStaffIdentifier(staff);
    const memberLogs = trainingLogs.filter(log => getTrainingLogStaffIdentifier(log, staffList) === staffId);

    const criteriaChecks: ComplianceCriterionCheck[] = COMPLIANCE_CRITERIA_CONFIG.map(criterion => {
      const relevantLogs = memberLogs
        .filter(log => criterion.identifier(log))
        .sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime());

      let isMet = false; 
      let details = "Missing";
      let selectedLog: TrainingLog | undefined = undefined;

      if (relevantLogs.length > 0) {
        selectedLog = relevantLogs[0]; 
        const completionDate = new Date(selectedLog.completionDate);

        if (!isValidDate(completionDate)) {
          details = "Invalid completion date in record.";
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0); 

          if (criterion.yearsToExpire) {
            const expiryDate = addYears(completionDate, criterion.yearsToExpire);
             if (isBefore(today, expiryDate)) {
              isMet = true;
              details = `Completed: ${format(completionDate, 'dd/MM/yyyy')}. Valid until ${format(subYears(expiryDate,0), 'dd/MM/yyyy')}.`;
            } else {
              details = `Out of Date. Completed: ${format(completionDate, 'dd/MM/yyyy')}. Expired on ${format(expiryDate, 'dd/MM/yyyy')}.`;
            }
          } else {
            isMet = true; 
            details = `Completed: ${format(completionDate, 'dd/MM/yyyy')}`;
          }
        }
      }
      return {
        key: criterion.key,
        name: criterion.name,
        isMet,
        details,
        relevantLog: selectedLog,
      };
    });

    const isCompliant = criteriaChecks.every(c => c.isMet);

    return {
      staffMemberId: staff.id || staffId,
      staffMemberName: `${staff.firstName} ${staff.lastName}`,
      staffMemberRank: staff.rank,
      squadron: staff.squadron || "N/A",
      isCompliant,
      criteriaChecks,
      email: staff.email, // Add email for mailing
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
    queryFn: fetchTrainingLogs,
  });
  const { toast } = useToast();

  const [complianceReports, setComplianceReports] = React.useState<StaffComplianceReport[]>([]);
  const [openCollapsible, setOpenCollapsible] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isLoadingStaff && !isLoadingLogs && staffList.length > 0 && trainingLogs) {
      const reports = processComplianceReports(staffList, trainingLogs);
      setComplianceReports(reports);
    } else if (!isLoadingStaff && !isLoadingLogs) {
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
     return null;
  };

  const getExpiryWarningBadge = (criterion: ComplianceCriterionCheck): React.ReactNode => {
    if (!criterion.isMet || !criterion.relevantLog) return null;

    const config = COMPLIANCE_CRITERIA_CONFIG.find(c => c.key === criterion.key);

    if (!config || !config.yearsToExpire || !isValidDate(new Date(criterion.relevantLog.completionDate))) return null;

    const daysLeft = getDaysToExpiry(new Date(criterion.relevantLog.completionDate), config.yearsToExpire);

    if (daysLeft !== null && daysLeft >= 0) {
        if (daysLeft <= 30) {
            return <Badge variant="destructive" className="ml-2 text-xs">Expires in {daysLeft}d</Badge>;
        } else if (daysLeft <= 90) {
            return <Badge variant="secondary" className="ml-2 text-xs">Expires in {daysLeft}d</Badge>;
        }
    }
    return null;
  };

  const generateComplianceReportPdf = (report: StaffComplianceReport): jsPDF => {
    const doc = new jsPDF();
    const filename = `compliance_report_${report.staffMemberRank}_${report.staffMemberName.replace(/\s+/g, '_')}.pdf`;
    
    let yPos = 15;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const indent = 5;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - margin * 2;

    const checkPageBreak = (neededHeight: number) => {
      if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPos = margin;
      }
    };

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    checkPageBreak(sectionSpacing);
    doc.text(`Compliance Report: ${report.staffMemberRank} ${report.staffMemberName}`, margin, yPos);
    yPos += lineSpacing;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    checkPageBreak(lineSpacing);
    doc.text(`Squadron: ${report.squadron}`, margin, yPos);
    yPos += lineSpacing;
    checkPageBreak(lineSpacing);
    doc.text(`Overall Status: ${report.isCompliant ? "Compliant" : "Not Compliant"}`, margin, yPos);
    yPos += sectionSpacing * 1.5;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    checkPageBreak(lineSpacing);
    doc.text("Compliance Details:", margin, yPos);
    yPos += lineSpacing * 1.2;

    report.criteriaChecks.forEach(criterion => {
      checkPageBreak(lineSpacing * 3); // Estimate for a criterion
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(criterion.name, margin, yPos);
      yPos += lineSpacing * 0.8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(criterion.isMet ? 0 : 200); // Black for met, reddish for not met
      const statusText = criterion.isMet ? "Met" : "Not Met";
      const detailLines = doc.splitTextToSize(`Status: ${statusText} (${criterion.details})`, maxLineWidth - indent);
      doc.text(detailLines, margin + indent, yPos);
      doc.setTextColor(0); // Reset color
      yPos += detailLines.length * (lineSpacing * 0.7) + (lineSpacing * 0.3);
    });
    
    return doc;
  };

  const handleEmailComplianceReport = (report: StaffComplianceReport) => {
    if (report.isCompliant) {
      toast({ title: "Information", description: `${report.staffMemberName} is compliant. No email sent.` });
      return;
    }

    const pdfDoc = generateComplianceReportPdf(report);
    pdfDoc.save(`compliance_report_${report.staffMemberName.replace(/\s+/g, '_')}.pdf`);


    const nonCompliantItems = report.criteriaChecks.filter(c => !c.isMet)
      .map(c => `  - ${c.name}: ${c.details}`)
      .join("\n");

    const subject = `Action Required: Compliance Update for ${report.staffMemberName}`;
    const body = `Dear ${report.staffMemberName},\n\nThis email is to inform you about your current compliance status. The following items require your attention:\n\n${nonCompliantItems}\n\nPlease take the necessary measures to address these items. For your reference, a detailed compliance report has been generated and downloaded to your computer (it's named: compliance_report_${report.staffMemberName.replace(/\s+/g, '_')}.pdf). Please attach this PDF if you are forwarding this email or replying.\n\nIf you require assistance or have any questions, please contact your direct supervisor.\n\nRegards,\nSquadron Management System`;

    const mailtoLink = `mailto:${report.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.location.href = mailtoLink;

    toast({
      title: "Compliance Report Downloaded",
      description: "Please attach the downloaded PDF to the email that has been opened.",
      duration: 10000,
    });
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
                  {complianceReports.map((report) => (
                    <React.Fragment key={report.staffMemberId}>
                      <TableRow
                        onClick={() => toggleCollapsible(report.staffMemberId)}
                        className="cursor-pointer hover:bg-muted/50 data-[state=open]:bg-muted/10"
                        data-state={openCollapsible === report.staffMemberId ? "open" : "closed"}
                      >
                        <TableCell>
                          <Button variant="ghost" size="sm" className="w-9 p-0" aria-expanded={openCollapsible === report.staffMemberId}>
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
                        <TableCell className="text-right">
                          {!report.isCompliant && (
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
                   ? ` (valid if completed within the last ${criterion.yearsToExpire} years, check is exclusive of expiry date - expires *on* the date shown).`
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
            Note: For items with expiry, the system uses the completion date of the most recent relevant training log. Items without specified expiry are considered 'met' if any relevant log exists. This system relies on accurate and consistently named training log entries. Matching staff members between Training Logs and Staff Management relies on Rank, Name, and Squadron matching.
          </p>
        </CardContent>
      </Card>
    </div>
  );

}

