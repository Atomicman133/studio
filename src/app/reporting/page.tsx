"use client";

import * as React from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, UserCheck, FileSearch, AlertTriangle, ShieldCheck, ShieldOff, CalendarCheck2, Loader2 } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"; // Keep for Trigger/Content if needed elsewhere, but not for wrapping TRs
import type { StaffComplianceReport, ComplianceCriterionCheck } from "./reporting-schema";
import { COMPLIANCE_CRITERIA_CONFIG } from "./reporting-schema";
import type { TrainingLog } from "../training/training-schema";
import type { StaffMember } from "../staff/staff-schema";
import { useStaff } from "@/hooks/useStaffData"; // Import hook to fetch staff data
import { useQuery } from '@tanstack/react-query'; // Import useQuery for training logs
import { db } from '@/lib/firebase/config'; // Import db config
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore'; // Import Firestore functions
import { addYears, isBefore, isAfter, format, differenceInDays, isValid as isValidDate, subYears } from "date-fns"; // Import date-fns functions
import { RANKS } from "../staff/staff-schema";


// --- Fetch Training Logs (copied from training page for this component's scope) ---
const TRAINING_LOGS_QUERY_KEY = 'trainingLogsReporting'; // Use a unique key if needed
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
  // Ensure serviceNumber exists, fallback if necessary but log a warning.
  if (!staffMember.serviceNumber) {
    console.warn(`Staff member ${staffMember.firstName} ${staffMember.lastName} is missing a service number.`);
    // Fallback identifier - less reliable
    return `${staffMember.lastName}, ${staffMember.firstName}_${staffMember.rank}_MISSING_SN`;
  }
  return `${staffMember.lastName}, ${staffMember.firstName}_${staffMember.rank}_${staffMember.serviceNumber}`;
};

const getTrainingLogStaffIdentifier = (log: TrainingLog, staffList: StaffMember[]): string => {
  // Prioritize matching based on available StaffMember data
  const matchedStaff = staffList.find(sm =>
    sm.rank === log.rank &&
    `${sm.lastName}, ${sm.firstName}` === log.staffName &&
    sm.squadron === log.squadron // Add squadron match for robustness if available
  );

  if (matchedStaff) {
    return getStaffIdentifier(matchedStaff);
  }

  // Fallback if no exact match found in the current staff list
  console.warn(`Could not find exact staff match for training log: ${log.staffName}, ${log.rank}. Using log details as fallback identifier.`);
  return `${log.staffName}_${log.rank}_${log.squadron || 'UNKNOWN_SQN'}_FALLBACK_ID`;
};


const processComplianceReports = (
  staffList: StaffMember[],
  trainingLogs: TrainingLog[]
): StaffComplianceReport[] => {

  return staffList.map((staff) => {
    const staffId = getStaffIdentifier(staff);
    // Filter logs associated with this specific staff member
    const memberLogs = trainingLogs.filter(log => getTrainingLogStaffIdentifier(log, staffList) === staffId);

    const criteriaChecks: ComplianceCriterionCheck[] = COMPLIANCE_CRITERIA_CONFIG.map(criterion => {
      const relevantLogs = memberLogs
        .filter(log => criterion.identifier(log))
        .sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime());

      let isMet = false; // Default to Not Met
      let details = "Missing";
      let selectedLog: TrainingLog | undefined = undefined;

      if (relevantLogs.length > 0) {
        selectedLog = relevantLogs[0];
        const completionDate = new Date(selectedLog.completionDate); // Ensure it's a Date object

        if (!isValidDate(completionDate)) {
          details = "Invalid completion date in record.";
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Start of today for consistent comparison

          if (criterion.yearsToExpire) {
              // Standard expiry logic for items WITH expiry years
              const expiryDate = addYears(completionDate, criterion.yearsToExpire);
              const expiryDateStartOfDay = new Date(expiryDate);
              expiryDateStartOfDay.setHours(0, 0, 0, 0);

               // Check if today is strictly AFTER the expiry date
               if (isAfter(today, expiryDateStartOfDay)) {
                   // Expired
                   // isMet remains false
                  details = `Expired: ${format(expiryDate, "PP")} (Completed: ${format(completionDate, "PP")})`;
               } else {
                  // Not expired (today is on or before the expiry date)
                  isMet = true;
                  details = `Completed: ${format(completionDate, "PP")}, Expires: ${format(expiryDate, "PP")}`;
               }
          } else {
            // Logic for non-expiring items (WWCC, CoC, Psych)
            isMet = true; // If a valid log exists, it's met
            details = `Completed: ${format(completionDate, "PP")}`;
          }
        }
      }
      // If relevantLogs.length === 0, isMet remains false and details remains "Missing"

      return {
        key: criterion.key,
        name: criterion.name,
        isMet, // Use the calculated isMet value
        details,
        relevantLog: selectedLog,
      };
    });

    const isCompliant = criteriaChecks.every(c => c.isMet);

    return {
      staffMemberId: staff.id || staffId,
      staffMemberName: `${staff.firstName} ${staff.lastName}`,
      staffMemberRank: staff.rank,
      squadron: staff.squadron || "N/A", // Use squadron from staff profile for consistency
      isCompliant,
      criteriaChecks,
    };
  })
  .sort((a,b) => {
    const squadronCompare = (a.squadron || "ZZZ").localeCompare(b.squadron || "ZZZ"); // Sort "Unassigned" last
    if (squadronCompare !== 0) {
        return squadronCompare;
    }

    const rankOrder = RANKS;
    const rankAIndex = rankOrder.indexOf(a.staffMemberRank as typeof RANKS[number]);
    const rankBIndex = rankOrder.indexOf(b.staffMemberRank as typeof RANKS[number]);

     // Handle cases where rank might not be in RANKS (shouldn't happen with validation)
    const effectiveRankAIndex = rankAIndex === -1 ? Infinity : rankAIndex;
    const effectiveRankBIndex = rankBIndex === -1 ? Infinity : rankBIndex;

     // Sort numerically ascending index (higher rank first)
    if (effectiveRankAIndex !== effectiveRankBIndex) {
        return effectiveRankAIndex - effectiveRankBIndex;
    }

    // If ranks are the same, sort by name
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

  const [complianceReports, setComplianceReports] = React.useState<StaffComplianceReport[]>([]);
  const [openCollapsible, setOpenCollapsible] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Only process when both staff and logs data are available and not loading
    if (!isLoadingStaff && !isLoadingLogs && staffList.length > 0 && trainingLogs) { // Ensure trainingLogs is defined
      const reports = processComplianceReports(staffList, trainingLogs);
      setComplianceReports(reports);
    } else if (!isLoadingStaff && !isLoadingLogs) {
      // If loading is finished but data is empty or incomplete, clear reports
      setComplianceReports([]);
    }
  }, [staffList, trainingLogs, isLoadingStaff, isLoadingLogs]); // Depend on fetched data and loading states


  const toggleCollapsible = (staffMemberId: string) => {
    setOpenCollapsible(prev => (prev === staffMemberId ? null : staffMemberId));
  };

  const getOverallStatusIcon = (isCompliant: boolean) => {
    return isCompliant ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />;
  };

  const getDaysToExpiry = (completionDate: Date, yearsToExpire: number): number | null => {
    if (!isValidDate(completionDate)) return null;
    const expiryDate = addYears(completionDate, yearsToExpire);
    if (!isValidDate(expiryDate)) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const expiryDateStartOfDay = new Date(expiryDate);
    expiryDateStartOfDay.setHours(0, 0, 0, 0); // Start of expiry day

    // Return days left only if it's not expired yet (valid ON expiry day)
     if (isAfter(today, expiryDateStartOfDay)) {
         return null; // Return null if expired
     }
     return differenceInDays(expiryDateStartOfDay, today); // Days remaining including today
  };

  const getExpiryWarningBadge = (criterion: ComplianceCriterionCheck): React.ReactNode => {
     // No badge if not met or no relevant log
    if (!criterion.isMet || !criterion.relevantLog) return null;

    // Find config for the criterion
    const config = COMPLIANCE_CRITERIA_CONFIG.find(c => c.key === criterion.key);

    // No badge if no expiry years configured or completion date is invalid
    if (!config || !config.yearsToExpire || !isValidDate(new Date(criterion.relevantLog.completionDate))) return null;

    // Calculate days left based on completion date and configured years
    const daysLeft = getDaysToExpiry(new Date(criterion.relevantLog.completionDate), config.yearsToExpire);

    // Only show badge if not expired yet (daysLeft is not null and >= 0)
    if (daysLeft !== null && daysLeft >= 0) {
        if (daysLeft <= 30) {
            return <Badge variant="destructive" className="ml-2 text-xs">Expires in {daysLeft}d</Badge>;
        } else if (daysLeft <= 90) {
            return <Badge variant="secondary" className="ml-2 text-xs">Expires in {daysLeft}d</Badge>;
        }
    }

    return null; // No badge if expired or calculation failed
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
            <ScrollArea className="h-[calc(100vh-300px)] border rounded-md"> {/* Ensure ScrollArea has a defined height */}
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Squadron</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Overall Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceReports.map((report) => (
                      <React.Fragment key={report.staffMemberId}>
                         {/* Trigger Row */}
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleCollapsible(report.staffMemberId)}>
                          <TableCell>
                               {/* Using a button visually looks like a trigger */}
                               <Button variant="ghost" size="sm" className="w-9 p-0" data-state={openCollapsible === report.staffMemberId ? 'open' : 'closed'}>
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
                        </TableRow>
                         {/* Content Row - Conditionally Rendered */}
                         {openCollapsible === report.staffMemberId && (
                           <TableRow className="bg-muted/50 dark:bg-muted/30">
                              <TableCell colSpan={4}> {/* Use colSpan */}
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
                  criterion.key === 'firstAid' ? '"First Aid", "HLTAID"' : // Removed trailing ...
                  criterion.key === 'wwcc' ? '"Working With Children Check", "WWCC"' :
                  criterion.key === 'codeOfConduct' ? '"Code of Conduct", "Behavioural Policy Acceptance", "CoC"' :
                  criterion.key === 'psychAssessment' ? '"Psychological Assessment", "Psych Assessment"' :
                  criterion.key === 'policeClearance' ? '"National Police Clearance", "Police Check", "NPC"' :
                  criterion.key === 'youthSafety' ? '"Defence Youth Safety", "DYSAT"' : ''
                 }
                 </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Note: For items with expiry, the system uses the completion date of the most recent relevant training log and compares it against the current date. Items without specified expiry are considered 'met' if any relevant log exists. This system relies on accurate and consistently named training log entries. Matching staff members between Training Logs and Staff Management relies on Rank, Name, and Squadron matching.
          </p>
        </CardContent>
      </Card>
    </div>
  );

}
