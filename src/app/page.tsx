
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, PieChart as PieChartIcon, ListTodo, UserCheck, Loader2, CalendarClock } from "lucide-react";
import { addYears, isBefore, differenceInDays, format, addDays, isAfter, isValid as isValidDate, parseISO } from "date-fns";

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
  // Fetch meetings where dateTime is in the future, order by soonest first, limit to e.g., 5
  const q = query(
    scheduledMeetingsCollectionRef, 
    where('dateTime', '>=', Timestamp.now()), 
    orderBy('dateTime', 'asc'),
    // limit(5) // Optional: limit the number of meetings shown on dashboard
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
        const completionDate = new Date(selectedLog.completionDate);
        if (!isValidDate(completionDate)) {
          details = "Invalid completion date in record.";
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (criterion.yearsToExpire) {
            const expiryDate = addYears(completionDate, criterion.yearsToExpire);
            // Check if 'today' is strictly BEFORE 'expiryDate'.
            // If completion is 1st Jan 2020, and it's valid for 3 years, it expires ON 1st Jan 2023.
            // So it's valid up to and including 31st Dec 2022.
            // isBefore(today, expiryDate) means valid IF today is 31st Dec 2022 for a 1st Jan 2023 expiry.
            if (isBefore(today, expiryDate)) { 
              isMet = true;
              details = `Completed: ${format(completionDate, "dd/MM/yyyy")}. Valid until ${format(expiryDate, 'dd/MM/yyyy')}.`;
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

    const isCompliant = criteriaChecks.every(c => c.isMet);
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
    queryKey: ['dashboardScheduledMeetings'], // Unique key for dashboard fetch
    queryFn: fetchDashboardScheduledMeetings,
    enabled: commonEnabledCondition,
  });

  const [complianceData, setComplianceData] = React.useState<{ compliant: number; nonCompliant: number } | null>(null);
  const [expiringAccomplishments, setExpiringAccomplishments] = React.useState<ExpiringAccomplishment[]>([]);
  const [upcomingActionItems, setUpcomingActionItems] = React.useState<UpcomingActionItem[]>([]);

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth");
    }
  }, [user, authLoading, router]);

  const processedReports = React.useMemo(() => {
    if (staffList && staffList.length > 0 && trainingLogs && trainingLogs.length > 0) {
      return processComplianceReportsForDashboard(staffList, trainingLogs);
    }
    return []; // Return empty array if data is not ready
  }, [staffList, trainingLogs]);

  React.useEffect(() => {
    if (processedReports.length > 0) {
      const compliantCount = processedReports.filter(r => r.isCompliant).length;
      const nonCompliantCount = processedReports.length - compliantCount;
      setComplianceData(prevData => {
        if (prevData && prevData.compliant === compliantCount && prevData.nonCompliant === nonCompliantCount) {
          return prevData;
        }
        return { compliant: compliantCount, nonCompliant: nonCompliantCount };
      });
    } else if (staffList.length > 0) { // If staff exists but no reports (e.g. no logs), show 0%
        setComplianceData({ compliant: 0, nonCompliant: staffList.length});
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
    return expiring.sort((a,b) => a.daysLeft - b.daysLeft).slice(0, 5); // Show top 5
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
    return actions.sort((a,b) => a.daysLeft - b.daysLeft).slice(0, 5); // Show top 5
  }, [audits, visits]);

  React.useEffect(() => {
    setUpcomingActionItems(prev => {
        if (JSON.stringify(prev) === JSON.stringify(calculatedUpcomingActionItems)) return prev;
        return calculatedUpcomingActionItems;
    });
  }, [calculatedUpcomingActionItems]);

  const pieData = complianceData
    ? [
        { name: 'Compliant', value: complianceData.compliant, fill: "hsl(var(--chart-1))" },
        { name: 'Non-Compliant', value: complianceData.nonCompliant, fill: "hsl(var(--destructive))" },
      ].filter(item => item.value > 0) // Filter out zero values for cleaner pie chart
    : [];

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
                <div className="text-2xl font-bold mb-2">
                  {((complianceData.compliant / (complianceData.compliant + complianceData.nonCompliant || 1)) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  {complianceData.compliant} of {complianceData.compliant + complianceData.nonCompliant} staff are compliant.
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
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
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
                  {scheduledMeetings.slice(0,5).map((meeting) => ( // Display top 5 upcoming
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
    </div>
  );
}
