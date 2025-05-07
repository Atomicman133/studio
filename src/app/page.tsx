
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CalendarClock, CheckCircle2, PieChart as PieChartIcon, ListTodo, UserCheck, Users } from "lucide-react";
import { addYears, isBefore, differenceInDays, format, addDays, isAfter } from "date-fns";

import type { StaffMember } from "./staff/staff-schema";
import { initialStaff, RANKS } from "./staff/page";
import type { TrainingLog } from "./training/training-schema";
import { initialTrainingLogs } from "./training/page";
import { COMPLIANCE_CRITERIA_CONFIG, type StaffComplianceReport, type ComplianceCriterionCheck } from "./reporting/reporting-schema";
import type { Meeting } from "./meetings/meeting-schema";
import { initialMeetings } from "./meetings/page";
import type { SafetyAudit, AuditFinding } from "./audits/audit-schema";
import { initialAudits } from "./audits/page";
import type { SquadronVisit, VisitActionItem } from "./squadron-visits/squadron-visit-schema";
import { initialSquadronVisits } from "./squadron-visits/page";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"; 


// Helper function from reporting page (adapted)
const getStaffIdentifier = (staffMember: StaffMember): string => {
  return `${staffMember.lastName}, ${staffMember.firstName}_${staffMember.rank}_${staffMember.serviceNumber}`;
};

const getTrainingLogStaffIdentifier = (log: TrainingLog): string => {
  const matchedStaff = initialStaff.find(sm => sm.rank === log.rank && `${sm.lastName}, ${sm.firstName}` === log.staffName);
  if (matchedStaff) {
    return getStaffIdentifier(matchedStaff);
  }
  // Fallback if no exact match on service number, use name and rank as a less reliable key
  return `${log.staffName}_${log.rank}_UNKNOWN_SN`;
};

const processComplianceReportsForDashboard = (
  staffList: StaffMember[],
  trainingLogs: TrainingLog[]
): StaffComplianceReport[] => {
  return staffList.map((staff) => {
    const staffId = getStaffIdentifier(staff);
    const memberLogs = trainingLogs.filter(log => getTrainingLogStaffIdentifier(log) === staffId);

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
        if (criterion.yearsToExpire) {
          const expiryDate = addYears(completionDate, criterion.yearsToExpire);
          if (isBefore(new Date(), expiryDate)) {
            isMet = true;
            details = `Completed: ${format(completionDate, "PP")}, Expires: ${format(expiryDate, "PP")}`;
          } else {
            details = `Expired: ${format(expiryDate, "PP")} (Completed: ${format(completionDate, "PP")})`;
          }
        } else { // For criteria without expiry, e.g., WWCC, Psych, CoC if they are one-time checks.
          // Note: Some of these *do* have real-world expiries not captured by yearsToExpire (e.g. WWCC has its own expiry date)
          // This simplified model assumes they are 'met' if a log exists.
          isMet = true;
          details = `Completed: ${format(completionDate, "PP")}`;
        }
      }
      return { key: criterion.key, name: criterion.name, isMet, details, relevantLog: selectedLog };
    });

    const isCompliant = criteriaChecks.every(c => c.isMet);
    return {
      staffMemberId: staff.id || staffId,
      staffMemberName: `${staff.firstName} ${staff.lastName}`,
      staffMemberRank: staff.rank,
      squadron: staff.squadron || "N/A",
      isCompliant,
      criteriaChecks,
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
  source: string; // e.g., "Audit", "Squadron Visit"
  sourceId: string; // ID of the audit or visit
  daysLeft: number;
}

const chartConfig = {
  compliant: { label: "Compliant", color: "hsl(var(--chart-1))" }, // Use a green/blueish theme color
  nonCompliant: { label: "Non-Compliant", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;


export default function DashboardPage() {
  const [complianceData, setComplianceData] = React.useState<{ compliant: number; nonCompliant: number } | null>(null);
  const [expiringAccomplishments, setExpiringAccomplishments] = React.useState<ExpiringAccomplishment[]>([]);
  const [upcomingActionItems, setUpcomingActionItems] = React.useState<UpcomingActionItem[]>([]);

  React.useEffect(() => {
    // Process Compliance Data
    const reports = processComplianceReportsForDashboard(initialStaff, initialTrainingLogs);
    const compliantCount = reports.filter(r => r.isCompliant).length;
    const nonCompliantCount = reports.length - compliantCount;
    setComplianceData({ compliant: compliantCount, nonCompliant: nonCompliantCount });

    // Process Expiring Accomplishments
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);
    const expiring: ExpiringAccomplishment[] = [];

    initialTrainingLogs.forEach(log => {
      COMPLIANCE_CRITERIA_CONFIG.forEach(criterion => {
        if (criterion.identifier(log) && criterion.yearsToExpire) {
          const completionDate = new Date(log.completionDate);
          const expiryDate = addYears(completionDate, criterion.yearsToExpire);
          if (isAfter(expiryDate, today) && isBefore(expiryDate, thirtyDaysFromNow)) {
            const staffMember = initialStaff.find(s => s.rank === log.rank && `${s.lastName}, ${s.firstName}` === log.staffName && s.squadron === log.squadron);
            expiring.push({
              staffName: staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : log.staffName,
              staffRank: log.rank,
              squadron: log.squadron,
              courseName: `${criterion.name} (${log.courseName})`,
              expiryDate: expiryDate,
              daysLeft: differenceInDays(expiryDate, today)
            });
          }
        }
      });
    });
    setExpiringAccomplishments(expiring.sort((a,b) => a.daysLeft - b.daysLeft));

    // Process Upcoming Action Items
    const fourteenDaysFromNow = addDays(today, 14);
    const actions: UpcomingActionItem[] = [];

    initialAudits.forEach(audit => {
      audit.findings?.forEach(finding => {
        if (finding.dueDate && (finding.status === "Open" || finding.status === "In Progress")) {
          const dueDate = new Date(finding.dueDate);
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

    initialSquadronVisits.forEach(visit => {
      visit.actionItems?.forEach(item => {
        if (item.dueDate && (item.status === "Open" || item.status === "In Progress")) {
          const dueDate = new Date(item.dueDate);
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
    setUpcomingActionItems(actions.sort((a,b) => a.daysLeft - b.daysLeft));

  }, []);

  const pieData = complianceData
    ? [
        { name: 'Compliant', value: complianceData.compliant, fill: "hsl(var(--chart-1))" },
        { name: 'Non-Compliant', value: complianceData.nonCompliant, fill: "hsl(var(--destructive))" },
      ]
    : [];

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
            {complianceData ? (
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
                        // label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                        //   const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        //   const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        //   const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                        //   return ( (pieData[index].value > 0) ?
                        //     <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="10px">
                        //       {`${(percent * 100).toFixed(0)}%`}
                        //     </text> : null
                        //   );
                        // }}
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
              <p className="text-muted-foreground">Loading compliance data...</p>
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

    </div>
  );
}

