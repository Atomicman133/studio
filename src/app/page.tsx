
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, PieChart as PieChartIcon, ListTodo, UserCheck, Loader2, CalendarClock, Download } from "lucide-react";
import { addYears, isBefore, differenceInDays, format, addDays, isAfter, isValid as isValidDate, parseISO, startOfDay } from "date-fns";

import type { StaffMember } from "./staff/staff-schema";
import type { TrainingLog } from "./training/training-schema";
import { COMPLIANCE_CRITERIA_CONFIG, type StaffComplianceReport, type ComplianceCriterionCheck } from "./reporting/reporting-schema";
import type { ScheduledMeeting } from "./meetings/meeting-schema"; // For scheduled meetings
import type { SafetyAudit } from "./audits/audit-schema";
import type { SquadronVisit, VisitActionItem } from "./squadron-visits/squadron-visit-schema";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useStaff } from "@/hooks/useStaffData";
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { addLetterheadAndFooter, addPageNumbers, resetLetterheadCache } from '@/lib/utils';


// --- Fetch Training Logs ---
async function fetchTrainingLogs(): Promise<TrainingLog[]> {
  const collectionRef = collection(db, 'trainingLogs');
  const q = query(collectionRef, orderBy('completionDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    completionDate: (doc.data().completionDate as Timestamp).toDate(),
    serviceNumber: doc.data().serviceNumber || undefined,
  })) as TrainingLog[];
}

// --- Fetch Audits ---
async function fetchAudits(): Promise<SafetyAudit[]> {
  const auditsCollectionRef = collection(db, 'safetyAudits');
  const q = query(auditsCollectionRef, orderBy('auditDate', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
     const data = doc.data();
     return {
        id: doc.id,
        ...data,
        auditDate: (data.auditDate as Timestamp).toDate(),
        findings: data.findings?.map((finding: any) => ({
          ...finding,
          id: finding.id || crypto.randomUUID(),
          dueDate: finding.dueDate instanceof Timestamp ? finding.dueDate.toDate() : finding.dueDate,
        })) || [],
      }
  }) as SafetyAudit[];
}

// --- Fetch Squadron Visits ---
async function fetchVisits(): Promise<SquadronVisit[]> {
  const collectionRef = collection(db, 'squadronVisits');
  const q = query(collectionRef, orderBy('visitDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        visitDate: (data.visitDate as Timestamp).toDate(),
        actionItems: data.actionItems?.map((item: any) => ({
        ...item,
        id: item.id || crypto.randomUUID(),
        dueDate: item.dueDate instanceof Timestamp ? item.dueDate.toDate() : item.dueDate,
        })) || [],
    }
  }) as SquadronVisit[];
}

// --- Fetch Scheduled Meetings (Upcoming) ---
async function fetchDashboardScheduledMeetings(): Promise<ScheduledMeeting[]> {
  const scheduledMeetingsCollectionRef = collection(db, 'scheduledMeetings');
  const q = query(
    scheduledMeetingsCollectionRef, 
    where('dateTime', '>=', Timestamp.now()), 
    orderBy('dateTime', 'asc'),
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      dateTime: (data.dateTime as Timestamp).toDate(),
    }
  }) as ScheduledMeeting[];
}


const processComplianceReportsForDashboard = (
  staffList: StaffMember[],
  trainingLogs: TrainingLog[]
): StaffComplianceReport[] => {
  return staffList.map((staff) => {
    if (!staff.serviceNumber) {
      console.warn(`Dashboard: Staff member ${staff.firstName} ${staff.lastName} (Rank: ${staff.rank}, ID: ${staff.id}) is missing a service number. Compliance check will be incomplete.`);
    }
    const memberLogs = trainingLogs.filter(log =>
        log.serviceNumber && staff.serviceNumber && log.serviceNumber === staff.serviceNumber
    );

    const criteriaChecks: ComplianceCriterionCheck[] = COMPLIANCE_CRITERIA_CONFIG.map(criterion => {
      const relevantLogs = memberLogs
        .filter(log => criterion.identifier(log))
        .sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime());

      let isMet = false;
      let details = "Missing";
      let selectedLog: TrainingLog | undefined = undefined;

      if (relevantLogs.length > 0) {
        selectedLog = relevantLogs[0];
        const completionDate = startOfDay(new Date(selectedLog.completionDate));
        if (!isValidDate(completionDate)) {
          details = "Invalid completion date in record.";
        } else {
          const today = startOfDay(new Date());

          if (criterion.yearsToExpire) {
            const expiryDate = startOfDay(addYears(completionDate, criterion.yearsToExpire));
            isMet = isBefore(today, expiryDate);
            if (isMet) {
              details = `Completed: ${format(completionDate, "dd/MM/yyyy")}. Valid until ${format(addDays(expiryDate, -1), 'dd/MM/yyyy')}.`;
            } else {
              details = `Out of Date. Last completed: ${format(completionDate, 'dd/MM/yyyy')}. Expired on ${format(expiryDate, 'dd/MM/yyyy')}.`;
            }
          } else {
            isMet = true;
            details = `Completed: ${format(completionDate, "dd/MM/yyyy")}`;
          }
        }
      }
      return { key: criterion.key, name: criterion.name, isMet, details, relevantLog: selectedLog };
    });
    
    const metCount = criteriaChecks.filter(c => c.isMet).length;
    let complianceStatusText: StaffComplianceReport["complianceStatusText"] = "Not Compliant";
    if (metCount === COMPLIANCE_CRITERIA_CONFIG.length) {
      complianceStatusText = "Compliant";
    } else if (metCount >= 3) {
      complianceStatusText = "Partially Compliant";
    }

    return {
      staffMemberId: staff.id || `${staff.lastName}, ${staff.firstName}_${staff.rank}_${staff.serviceNumber || 'NO_SN'}`,
      staffMemberName: `${staff.firstName} ${staff.lastName}`,
      staffMemberRank: staff.rank,
      squadron: staff.squadron || "N/A",
      isCompliant: complianceStatusText === "Compliant", // Based on new status text
      criteriaChecks,
      email: staff.email,
      staffServiceNumberActual: staff.serviceNumber,
      complianceStatusText, // Storing the detailed status text
      complianceStatusVariant: // This will be set in the ReportingPage based on status text
        complianceStatusText === "Compliant" ? "default" :
        complianceStatusText === "Partially Compliant" ? "secondary" : "destructive",
    };
  });
};

interface ExpiringAccomplishment {
  staffName: string;
  staffRank: string;
  courseName: string;
  squadron: string;
  expiryDate: Date;
  daysLeft: number;
}

interface UpcomingActionItem {
  id: string;
  description: string;
  responsible: string;
  dueDate: Date;
  source: string;
  sourceId: string;
  daysLeft: number;
}

const chartConfig = {
  compliant: { label: "Compliant", color: "hsl(var(--chart-1))" },
  partiallyCompliant: { label: "Partially Compliant", color: "hsl(var(--chart-2))" },
  nonCompliant: { label: "Non-Compliant", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const { data: staffList = [], isLoading: isLoadingStaff, error: errorStaff } = useStaff(); 

  const commonEnabledCondition = !!user && !authLoading && !!user.email && user.email.endsWith('@airforcecadets.gov.au');

  const { data: trainingLogs = [], isLoading: isLoadingLogs, error: errorLogs } = useQuery<TrainingLog[], Error>({
    queryKey: ['trainingLogsDashboard'],
    queryFn: fetchTrainingLogs,
    enabled: commonEnabledCondition, 
  });

  const { data: audits = [], isLoading: isLoadingAudits, error: errorAudits } = useQuery<SafetyAudit[], Error>({
    queryKey: ['safetyAuditsDashboard'],
    queryFn: fetchAudits,
    enabled: commonEnabledCondition, 
  });

  const { data: visits = [], isLoading: isLoadingVisits, error: errorVisits } = useQuery<SquadronVisit[], Error>({
    queryKey: ['squadronVisitsDashboard'],
    queryFn: fetchVisits,
    enabled: commonEnabledCondition, 
  });

  const { data: scheduledMeetings = [], isLoading: isLoadingScheduledMeetings, error: errorScheduledMeetings } = useQuery<ScheduledMeeting[], Error>({
    queryKey: ['dashboardScheduledMeetings'], 
    queryFn: fetchDashboardScheduledMeetings,
    enabled: commonEnabledCondition,
  });

  const [complianceData, setComplianceData] = React.useState<{
    compliant: number;
    partiallyCompliant: number;
    nonCompliant: number;
  } | null>(null);
  const [expiringAccomplishments, setExpiringAccomplishments] = React.useState<ExpiringAccomplishment[]>([]);
  const [upcomingActionItems, setUpcomingActionItems] = React.useState<UpcomingActionItem[]>([]);

  // State for compliance detail dialog
  const [isComplianceDetailOpen, setIsComplianceDetailOpen] = React.useState(false);
  const [selectedComplianceSegmentData, setSelectedComplianceSegmentData] = React.useState<StaffComplianceReport[]>([]);
  const [selectedComplianceSegmentTitle, setSelectedComplianceSegmentTitle] = React.useState<string>("");


  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth");
    }
  }, [user, authLoading, router]);

  const processedReports = React.useMemo(() => {
    if (staffList && staffList.length > 0 && trainingLogs && trainingLogs.length > 0) {
      return processComplianceReportsForDashboard(staffList, trainingLogs);
    }
    return [];
  }, [staffList, trainingLogs]);

  React.useEffect(() => {
    if (processedReports.length > 0) {
      const compliantCount = processedReports.filter(r => r.complianceStatusText === "Compliant").length;
      const partiallyCompliantCount = processedReports.filter(r => r.complianceStatusText === "Partially Compliant").length;
      const nonCompliantCount = processedReports.filter(r => r.complianceStatusText === "Not Compliant").length;

      setComplianceData(prevData => {
        if (
          prevData &&
          prevData.compliant === compliantCount &&
          prevData.partiallyCompliant === partiallyCompliantCount &&
          prevData.nonCompliant === nonCompliantCount
        ) {
          return prevData;
        }
        return { compliant: compliantCount, partiallyCompliant: partiallyCompliantCount, nonCompliant: nonCompliantCount };
      });
    } else if (staffList.length > 0) {
        setComplianceData(prevData => {
             if (prevData && prevData.compliant === 0 && prevData.partiallyCompliant === 0 && prevData.nonCompliant === staffList.length) return prevData;
             return { compliant: 0, partiallyCompliant: 0, nonCompliant: staffList.length};
        });
    } else {
      setComplianceData(null); 
    }
  }, [processedReports, staffList]);


  const calculatedExpiringAccomplishments = React.useMemo(() => {
    if (!staffList || !trainingLogs) return [];
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);
    const expiring: ExpiringAccomplishment[] = [];
    trainingLogs.forEach(log => {
      COMPLIANCE_CRITERIA_CONFIG.forEach(criterion => {
        if (criterion.identifier(log) && criterion.yearsToExpire) {
          const completionDate = new Date(log.completionDate);
          if (!isValidDate(completionDate)) return;
          const expiryDate = addYears(completionDate, criterion.yearsToExpire);
          if (isAfter(expiryDate, today) && isBefore(expiryDate, thirtyDaysFromNow)) {
            const staffMember = staffList.find(s => s.serviceNumber === log.serviceNumber);
            expiring.push({
              staffName: staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : log.staffName,
              staffRank: staffMember ? staffMember.rank : log.rank,
              squadron: staffMember ? staffMember.squadron || "N/A" : log.squadron,
              courseName: `${criterion.name} (${log.courseName})`,
              expiryDate: expiryDate,
              daysLeft: differenceInDays(expiryDate, today)
            });
          }
        }
      });
    });
    return expiring.sort((a,b) => a.daysLeft - b.daysLeft).slice(0, 5);
  }, [staffList, trainingLogs]);

  React.useEffect(() => {
    setExpiringAccomplishments(prev => {
        if (JSON.stringify(prev) === JSON.stringify(calculatedExpiringAccomplishments)) return prev;
        return calculatedExpiringAccomplishments;
    });
  }, [calculatedExpiringAccomplishments]);


  const calculatedUpcomingActionItems = React.useMemo(() => {
    if (!audits || !visits) return [];
    const today = new Date();
    const fourteenDaysFromNow = addDays(today, 14);
    const actions: UpcomingActionItem[] = [];

    audits.forEach(audit => {
      audit.findings?.forEach(finding => {
        if (finding.dueDate && (finding.status === "Open" || finding.status === "In Progress")) {
          const dueDate = new Date(finding.dueDate);
          if (!isValidDate(dueDate)) return;
          if (isAfter(dueDate, today) && isBefore(dueDate, fourteenDaysFromNow)) {
            actions.push({
              id: finding.id || crypto.randomUUID(),
              description: finding.description,
              responsible: finding.assignedTo || "Unassigned",
              dueDate: dueDate,
              source: `Audit: ${audit.auditTitle}`,
              sourceId: audit.id || crypto.randomUUID(),
              daysLeft: differenceInDays(dueDate, today)
            });
          }
        }
      });
    });

    visits.forEach(visit => {
      visit.actionItems?.forEach(item => {
        if (item.dueDate && (item.status === "Open" || item.status === "In Progress")) {
          const dueDate = new Date(item.dueDate);
          if (!isValidDate(dueDate)) return;
          if (isAfter(dueDate, today) && isBefore(dueDate, fourteenDaysFromNow)) {
            actions.push({
              id: item.id || crypto.randomUUID(),
              description: item.description,
              responsible: item.responsible,
              dueDate: dueDate,
              source: `Visit: ${visit.squadronName}`,
              sourceId: visit.id || crypto.randomUUID(),
              daysLeft: differenceInDays(dueDate, today)
            });
          }
        }
      });
    });
    return actions.sort((a,b) => a.daysLeft - b.daysLeft).slice(0, 5);
  }, [audits, visits]);

  React.useEffect(() => {
    setUpcomingActionItems(prev => {
        if (JSON.stringify(prev) === JSON.stringify(calculatedUpcomingActionItems)) return prev;
        return calculatedUpcomingActionItems;
    });
  }, [calculatedUpcomingActionItems]);

  const pieData = complianceData
    ? [
        { name: 'Compliant', value: complianceData.compliant, fill: chartConfig.compliant.color, statusText: 'Compliant' as StaffComplianceReport["complianceStatusText"] },
        { name: 'Partially Compliant', value: complianceData.partiallyCompliant, fill: chartConfig.partiallyCompliant.color, statusText: 'Partially Compliant' as StaffComplianceReport["complianceStatusText"] },
        { name: 'Non-Compliant', value: complianceData.nonCompliant, fill: chartConfig.nonCompliant.color, statusText: 'Not Compliant' as StaffComplianceReport["complianceStatusText"] },
      ].filter(item => item.value > 0)
    : [];

  const handlePieSegmentClick = (segmentName: StaffComplianceReport["complianceStatusText"]) => {
    const filteredData = processedReports.filter(report => report.complianceStatusText === segmentName);
    setSelectedComplianceSegmentData(filteredData);
    setSelectedComplianceSegmentTitle(`${segmentName} Staff Members (${filteredData.length})`);
    setIsComplianceDetailOpen(true);
  };
  
  const handleExportComplianceSegmentPdf = async () => {
    if (selectedComplianceSegmentData.length === 0) return;

    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable'); // For side effects

    const doc = new jsPDF();
    resetLetterheadCache();
    const filename = `${selectedComplianceSegmentTitle.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
    const margin = 15;
    let yPos = margin;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    let headerHeight = 0;
    let footerHeight = 0;
    const pageWidth = doc.internal.pageSize.getWidth();

    const { headerHeight: hh, footerHeight: fh } = await addLetterheadAndFooter(doc, "/AAFCLetterhead-Header.png", "/AAFCLetterhead-Footer.png", margin);
    headerHeight = hh;
    footerHeight = fh;
    yPos = margin + headerHeight + 5;

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(selectedComplianceSegmentTitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += sectionSpacing * 1.5;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated on: ${format(new Date(), "PPP")}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += sectionSpacing;
    
    const tableHeaders: string[] = ["Rank", "Name", "Squadron", "Service No."];
    const tableBody: (string | null)[][] = [];

    const showNonCompliantItems = selectedComplianceSegmentTitle.toLowerCase().includes("partially") || selectedComplianceSegmentTitle.toLowerCase().includes("non-compliant");
    if (showNonCompliantItems) {
      tableHeaders.push("Non-Compliant Items");
    }

    selectedComplianceSegmentData.forEach(staff => {
      const row = [
        staff.staffMemberRank,
        staff.staffMemberName,
        staff.squadron,
        staff.staffServiceNumberActual || "N/A"
      ];
      if (showNonCompliantItems) {
        const nonCompliant = staff.criteriaChecks
          .filter(c => !c.isMet)
          .map(c => c.name)
          .join(", ") || "None";
        row.push(nonCompliant);
      }
      tableBody.push(row);
    });

    (doc as any).autoTable({
      startY: yPos,
      head: [tableHeaders],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [0, 48, 143], textColor: 255 }, // Primary color
      didDrawPage: (data: any) => {
         // yPos = data.cursor.y + sectionSpacing; // update yPos for content after table
      },
    });
    
    addPageNumbers(doc, footerHeight, margin);
    doc.save(filename);
  };


  const isLoadingAnyData = isLoadingStaff || isLoadingLogs || isLoadingAudits || isLoadingVisits || isLoadingScheduledMeetings;
  const hasAnyError = errorStaff || errorLogs || errorAudits || errorVisits || errorScheduledMeetings;
  const isUserEmailInvalidForRules = user && !!user.email && !user.email.endsWith('@airforcecadets.gov.au');


  if (authLoading) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading authentication...</p>
      </div>
    );
  }
  
  if (!user && !authLoading) { 
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <p className="text-muted-foreground">Please log in to view the dashboard.</p>
        </div>
    );
  }
  
  if (user && isUserEmailInvalidForRules) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle /> Authentication Issue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2">
            You are logged in, but your email address (<strong>{user.email || "not available"}</strong>)
            does not meet the access requirements for this application (must end with @airforcecadets.gov.au).
          </p>
          <p>This may be causing the "Missing or insufficient permissions" errors from the data sources.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingAnyData && !isUserEmailInvalidForRules) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
      );
  }

  if (hasAnyError && !isUserEmailInvalidForRules) {
      return (
          <Card className="border-destructive">
              <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle /> Dashboard Error</CardTitle>
              </CardHeader>
              <CardContent>
                  <p>Failed to load necessary data for the dashboard. Please try again later.</p>
                  {errorStaff && <p className="text-xs mt-2">Staff Error: {errorStaff.message}</p>}
                  {errorLogs && <p className="text-xs mt-2">Training Log Error: {errorLogs.message}</p>}
                  {errorAudits && <p className="text-xs mt-2">Audit Error: {errorAudits.message}</p>}
                  {errorVisits && <p className="text-xs mt-2">Visit Error: {errorVisits.message}</p>}
                  {errorScheduledMeetings && <p className="text-xs mt-2">Scheduled Meetings Error: {errorScheduledMeetings.message}</p>}
              </CardContent>
          </Card>
      );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Squadron Manager Dashboard</CardTitle>
          <CardDescription>Overview of key operational metrics.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Staff Compliance</CardTitle>
            <UserCheck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {complianceData && (staffList && staffList.length > 0) ? (
              <>
                <div className="flex flex-col items-center mb-1 text-center">
                  <div className="text-xl font-bold" style={{ color: chartConfig.compliant.color }}>
                    {complianceData.compliant} Compliant
                  </div>
                  <div className="text-xl font-bold" style={{ color: chartConfig.partiallyCompliant.color }}>
                    {complianceData.partiallyCompliant} Partially Compliant
                  </div>
                  <div className="text-xl font-bold" style={{ color: chartConfig.nonCompliant.color }}>
                    {complianceData.nonCompliant} Non-Compliant
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mb-4">
                  Out of {complianceData.compliant + complianceData.partiallyCompliant + complianceData.nonCompliant} total staff.
                </p>
                <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel indicator="dot" />}
                      />
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={50}
                        strokeWidth={2}
                        labelLine={false}
                        onClick={(segmentData) => {
                          if (segmentData && segmentData.statusText) {
                            handlePieSegmentClick(segmentData.statusText);
                          }
                        }}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill as string} />
                        ))}
                      </Pie>
                       <Legend content={<ChartTooltipContent nameKey="name" hideIndicator />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </>
            ) : (
              <p className="text-muted-foreground pt-4">No compliance data available or staff list is empty.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Expiring Accomplishments (Next 30 Days)</CardTitle>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {expiringAccomplishments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead className="hidden sm:table-cell">Squadron</TableHead>
                    <TableHead>Accomplishment</TableHead>
                    <TableHead className="text-right">Expires In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiringAccomplishments.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="font-medium">{item.staffRank} {item.staffName}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{item.squadron}</TableCell>
                      <TableCell>{item.courseName}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.daysLeft <= 7 ? "destructive" : "secondary"}>
                          {item.daysLeft} day(s)
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground pt-4">No accomplishments expiring soon.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Upcoming Action Items (Next 14 Days)</CardTitle>
            <ListTodo className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {upcomingActionItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden md:table-cell">Responsible</TableHead>
                    <TableHead className="hidden sm:table-cell">Source</TableHead>
                    <TableHead className="text-right">Due In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingActionItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="hidden md:table-cell">{item.responsible}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{item.source}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.daysLeft <= 3 ? "destructive" : item.daysLeft <= 7 ? "secondary" : "outline"}>
                          {item.daysLeft} day(s)
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground pt-4">No action items due soon.</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Upcoming Scheduled Meetings</CardTitle>
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingScheduledMeetings && <p className="text-muted-foreground pt-4">Loading meetings...</p>}
            {errorScheduledMeetings && <p className="text-destructive pt-4">Error loading meetings.</p>}
            {!isLoadingScheduledMeetings && !errorScheduledMeetings && scheduledMeetings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead className="hidden sm:table-cell">Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledMeetings.slice(0,5).map((meeting) => ( 
                    <TableRow key={meeting.id}>
                      <TableCell className="font-medium">{meeting.title}</TableCell>
                      <TableCell>{format(meeting.dateTime, "PP p")}</TableCell>
                      <TableCell className="hidden sm:table-cell">{meeting.location || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              !isLoadingScheduledMeetings && !errorScheduledMeetings && <p className="text-muted-foreground pt-4">No upcoming meetings scheduled.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compliance Detail Dialog */}
      <Dialog open={isComplianceDetailOpen} onOpenChange={setIsComplianceDetailOpen}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selectedComplianceSegmentTitle}</DialogTitle>
            <DialogDescription>
              List of staff members in the selected compliance category.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] border rounded-md">
            {selectedComplianceSegmentData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Squadron</TableHead>
                    <TableHead>Service No.</TableHead>
                    {(selectedComplianceSegmentTitle.includes("Partially Compliant") || selectedComplianceSegmentTitle.includes("Non-Compliant")) && (
                       <TableHead>Non-Compliant Items</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedComplianceSegmentData.map((staff) => (
                    <TableRow key={staff.staffMemberId}>
                      <TableCell>{staff.staffMemberRank}</TableCell>
                      <TableCell>{staff.staffMemberName}</TableCell>
                      <TableCell>{staff.squadron}</TableCell>
                      <TableCell>{staff.staffServiceNumberActual || "N/A"}</TableCell>
                       {(selectedComplianceSegmentTitle.includes("Partially Compliant") || selectedComplianceSegmentTitle.includes("Non-Compliant")) && (
                        <TableCell>
                          {staff.criteriaChecks.filter(c => !c.isMet).map(c => c.name).join(", ") || "None"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="p-4 text-center text-muted-foreground">No staff members in this category.</p>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComplianceDetailOpen(false)}>Close</Button>
            <Button onClick={handleExportComplianceSegmentPdf} disabled={selectedComplianceSegmentData.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Download as PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

