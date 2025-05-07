
"use client";

import * as React from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, UserCheck, FileSearch, AlertTriangle, ShieldCheck, ShieldOff, CalendarCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { StaffComplianceReport, ComplianceCriterionCheck } from "./reporting-schema";
import { COMPLIANCE_CRITERIA_CONFIG } from "./reporting-schema";
import type { TrainingLog } from "../training/training-schema";
import type { StaffMember } from "../staff/staff-schema";
import { initialTrainingLogs } from "../training/page"; // Using example data
import { initialStaff } from "../staff/page"; // Using example data
import { addYears, isBefore, format, differenceInDays, subDays } from "date-fns";

// Helper to normalize staff name from TrainingLog ("Smith, Jane") to match StaffMember ("Jane Smith") for easier comparison
// This is a simplified approach. Ideally, a unique staff ID would be used.
const getStaffIdentifier = (staffMember: StaffMember): string => {
  return `${staffMember.lastName}, ${staffMember.firstName}_${staffMember.rank}_${staffMember.serviceNumber}`;
};

const getTrainingLogStaffIdentifier = (log: TrainingLog): string => {
  // Assuming log.staffName is "LastName, FirstName"
  // This will require training logs to have a service number, or a less reliable match.
  // For now, let's assume we can fetch staff by name and rank from logs if service number isn't in TrainingLog.
  // The provided initialTrainingLogs don't have serviceNumber, so we'll match on rank and name for now.
  // This part is tricky without a consistent ID.
  // Let's find the StaffMember that matches the log's rank and name.
  const matchedStaff = initialStaff.find(sm => sm.rank === log.rank && `${sm.lastName}, ${sm.firstName}` === log.staffName);
  if (matchedStaff) {
    return getStaffIdentifier(matchedStaff);
  }
  // Fallback if no direct match by service number (if it were available)
  return `${log.staffName}_${log.rank}_UNKNOWN_SN`;
};


const processComplianceReports = (
  staffList: StaffMember[],
  trainingLogs: TrainingLog[]
): StaffComplianceReport[] => {
  
  return staffList.map((staff) => {
    const staffId = getStaffIdentifier(staff);
    const memberLogs = trainingLogs.filter(log => getTrainingLogStaffIdentifier(log) === staffId);

    const criteriaChecks: ComplianceCriterionCheck[] = COMPLIANCE_CRITERIA_CONFIG.map(criterion => {
      const relevantLogs = memberLogs
        .filter(log => criterion.identifier(log))
        .sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime()); // Most recent first

      let isMet = false;
      let details = "Missing";
      let selectedLog: TrainingLog | undefined = undefined;

      if (relevantLogs.length > 0) {
        selectedLog = relevantLogs[0]; // Consider the most recent relevant log
        const completionDate = new Date(selectedLog.completionDate);
        if (criterion.yearsToExpire) {
          const expiryDate = addYears(completionDate, criterion.yearsToExpire);
          if (isBefore(new Date(), expiryDate)) {
            isMet = true;
            details = `Completed: ${format(completionDate, "PP")}, Expires: ${format(expiryDate, "PP")}`;
          } else {
            details = `Expired: ${format(expiryDate, "PP")} (Completed: ${format(completionDate, "PP")})`;
          }
        } else {
          // For items without explicit expiry, existence of a log means it's met
          isMet = true;
          details = `Completed: ${format(completionDate, "PP")}`;
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
      staffMemberId: staff.id || staffId, // Use staff.id if available
      staffMemberName: `${staff.firstName} ${staff.lastName}`,
      staffMemberRank: staff.rank,
      squadron: memberLogs.length > 0 ? memberLogs[0].squadron : (staff as any).squadron || "N/A", // staff.squadron if available from StaffMember
      isCompliant,
      criteriaChecks,
    };
  })
  .sort((a,b) => { // Sort by squadron, then rank, then name
    if (a.squadron.localeCompare(b.squadron) !== 0) {
        return a.squadron.localeCompare(b.squadron);
    }
    const rankOrder = ["OFFCDT", "PLTOFF", "FLGOFF", "FLTLT", "SQNLDR"]; // Assuming RANKS constant
    const rankAIndex = rankOrder.indexOf(a.staffMemberRank);
    const rankBIndex = rankOrder.indexOf(b.staffMemberRank);
    if (rankAIndex !== rankBIndex) {
        return rankBIndex - rankAIndex; // Higher rank first
    }
    return a.staffMemberName.localeCompare(b.staffMemberName);
  });
};


export default function ReportingPage() {
  const [complianceReports, setComplianceReports] = React.useState<StaffComplianceReport[]>([]);
  const [openCollapsible, setOpenCollapsible] = React.useState<string | null>(null);

  React.useEffect(() => {
    // In a real app, staffList and trainingLogsList would be fetched from a backend
    const reports = processComplianceReports(initialStaff, initialTrainingLogs);
    setComplianceReports(reports);
  }, []);

  const toggleCollapsible = (staffMemberId: string) => {
    setOpenCollapsible(prev => (prev === staffMemberId ? null : staffMemberId));
  };
  
  const getOverallStatusIcon = (isCompliant: boolean) => {
    return isCompliant ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />;
  };

  const getDaysToExpiry = (completionDate: Date, yearsToExpire: number): number | null => {
    const expiryDate = addYears(completionDate, yearsToExpire);
    if (isBefore(new Date(), expiryDate)) {
      return differenceInDays(expiryDate, new Date());
    }
    return null; // Expired or not applicable
  };
  
  const getExpiryWarningBadge = (criterion: ComplianceCriterionCheck): React.ReactNode => {
    if (!criterion.isMet || !criterion.relevantLog || !COMPLIANCE_CRITERIA_CONFIG.find(c => c.key === criterion.key)?.yearsToExpire) {
      return null;
    }
    const config = COMPLIANCE_CRITERIA_CONFIG.find(c => c.key === criterion.key)!;
    const daysLeft = getDaysToExpiry(new Date(criterion.relevantLog.completionDate), config.yearsToExpire!);

    if (daysLeft !== null) {
      if (daysLeft <= 30) { // Expiring within 30 days
        return <Badge variant="destructive" className="ml-2 text-xs">Expires in {daysLeft}d</Badge>;
      } else if (daysLeft <= 90) { // Expiring within 90 days
        return <Badge variant="secondary" className="ml-2 text-xs">Expires in {daysLeft}d</Badge>;
      }
    }
    return null;
  };


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
        <CardContent>
          {complianceReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserCheck className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Staff Data Available</h3>
              <p className="text-muted-foreground">Ensure staff members and training logs are populated.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[75vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead> {/* For expand icon */}
                  <TableHead>Squadron</TableHead>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Overall Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceReports.map((report) => (
                  <Collapsible key={report.staffMemberId} asChild open={openCollapsible === report.staffMemberId} onOpenChange={() => toggleCollapsible(report.staffMemberId)}>
                    <>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="w-9 p-0">
                                {openCollapsible === report.staffMemberId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                <span className="sr-only">Toggle details</span>
                              </Button>
                          </CollapsibleTrigger>
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
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell /> {/* Empty cell for alignment under expand icon */}
                          <TableCell colSpan={3} className="p-0">
                            <div className="p-4 bg-muted/30 dark:bg-muted/20">
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
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
            </ScrollArea>
          )}
        </CardContent>
        {complianceReports.length > 0 && (
          <CardFooter className="text-xs text-muted-foreground">
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
                {criterion.yearsToExpire ? ` (valid for ${criterion.yearsToExpire} years from completion).` : ` (checked for existence).`}
                <br />
                <span className="text-xs italic">Identified if training log's course name or qualification contains keywords like: 
                {
                 criterion.key === 'firstAid' ? '"First Aid", "HLTAID..."' :
                 criterion.key === 'wwcc' ? '"Working With Children Check", "WWCC"' :
                 criterion.key === 'codeOfConduct' ? '"Code of Conduct", "Behavioural Policy Acceptance"' :
                 criterion.key === 'psychAssessment' ? '"Psychological Assessment"' :
                 criterion.key === 'policeClearance' ? '"National Police Clearance", "Police Check", "NPC"' :
                 criterion.key === 'youthSafety' ? '"Defence Youth Safety", "DYSAT"' : ''
                }
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Note: For items with expiry, the system uses the completion date of the most recent relevant training log. Items without specified expiry are considered 'current' if any relevant log exists. This system relies on accurate and consistently named training log entries.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
