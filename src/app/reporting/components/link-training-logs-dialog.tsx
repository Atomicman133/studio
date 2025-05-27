
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where, writeBatch, doc, Timestamp } from "firebase/firestore";
import type { TrainingLog } from "@/app/training/training-schema";
import { convertLogTimestamps, TRAINING_LOGS_QUERY_KEY } from "@/app/training/page";
import type { StaffComplianceReport } from "../reporting-schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { STAFF_QUERY_KEY } from "@/app/staff/staff-schema";

const UNLINKED_TRAINING_LOGS_QUERY_KEY_PREFIX = "unlinkedTrainingLogsForStaff";


async function fetchUnlinkedTrainingLogs(
  staffNameForQuery: string, // Expected: "LastName, FirstName" (target from report)
  currentStaffServiceNumber?: string
): Promise<TrainingLog[]> {
  const logsCollectionRef = collection(db, "trainingLogs");

  // Prepare target names for precise client-side comparison
  const targetNameParts = staffNameForQuery.split(",").map(p => p.trim());
  const targetLastNameUpper = targetNameParts[0].toUpperCase();
  const targetFirstNameUpper = targetNameParts.length > 1 ? targetNameParts[1].toUpperCase() : "";

  // Firestore query: Broadly fetch logs starting with the target's last name (uppercase)
  const lastNameForFirestoreQuery = targetLastNameUpper;
  const q = query(
    logsCollectionRef,
    where("staffName", ">=", lastNameForFirestoreQuery),
    where("staffName", "<=", lastNameForFirestoreQuery + "\uf8ff")
  );

  const querySnapshot = await getDocs(q);
  const potentialLogs: TrainingLog[] = [];

  const parseNameAndMatch = (
    logStaffNameField: string | undefined | null,
    targetLNUpper: string,
    targetFNUpper: string
  ): boolean => {
    if (!logStaffNameField) return false;
    const normalizedLogName = logStaffNameField.toUpperCase().trim().replace(/\s+/g, " ");
    
    console.log(`[Linker-Debug] Matching: LogName="${normalizedLogName}" vs TargetLN="${targetLNUpper}", TargetFN="${targetFNUpper}"`);

    // Scenario 1: Log name is "LastName, FirstName" (e.g., "CORRY, GREGORY")
    if (normalizedLogName.includes(",")) {
      const parts = normalizedLogName.split(",").map(p => p.trim());
      if (parts.length >= 1) { // Must have at least a last name part
        const logLN = parts[0];
        const logFN = parts.length > 1 ? parts[1] : "";

        if (logLN === targetLNUpper) {
          if (targetFNUpper === "" || logFN === "" || logFN === targetFNUpper || (logFN && targetFNUpper && (logFN.startsWith(targetFNUpper) || targetFNUpper.startsWith(logFN)))) {
            console.log(`[Linker-Debug] Matched Scenario 1 (L, F): LogName="${normalizedLogName}" matched TargetLN="${targetLNUpper}", TargetFN="${targetFNUpper}"`);
            return true;
          }
        }
      }
    }

    // Scenario 2: Log name is "FirstName LastName" (e.g., "GREGORY CORRY") or just "LastName"
    const spaceParts = normalizedLogName.split(" ");
    if (spaceParts.length > 0) {
      const logLN = spaceParts[spaceParts.length - 1]; // Last word is assumed LN
      const logFN = spaceParts.slice(0, -1).join(" "); // Everything else is FN

      if (logLN === targetLNUpper) {
        if (targetFNUpper === "" || logFN === "" || logFN === targetFNUpper || (logFN && targetFNUpper && (logFN.startsWith(targetFNUpper) || targetFNUpper.startsWith(logFN)))) {
          console.log(`[Linker-Debug] Matched Scenario 2 (F L): LogName="${normalizedLogName}" matched TargetLN="${targetLNUpper}", TargetFN="${targetFNUpper}"`);
          return true;
        }
      }
    }
    
    console.log(`[Linker-Debug] No match for LogName="${normalizedLogName}" against TargetLN="${targetLNUpper}", TargetFN="${targetFNUpper}"`);
    return false;
  };

  querySnapshot.docs.forEach(docSnap => {
    const logData = { id: docSnap.id, ...convertLogTimestamps(docSnap.data()) } as TrainingLog;
    console.log(`[Linker-Debug] Firestore fetched log for linking consideration: "${logData.staffName}", SN: ${logData.serviceNumber}, ID: ${logData.id}`);

    // Skip if already linked to the CURRENT staff member
    if (logData.serviceNumber && currentStaffServiceNumber && logData.serviceNumber === currentStaffServiceNumber) {
      console.log(`[Linker-Debug] Skipping log ID ${logData.id} - already linked to current staff SN ${currentStaffServiceNumber}`);
      return;
    }

    if (parseNameAndMatch(logData.staffName, targetLastNameUpper, targetFirstNameUpper)) {
      potentialLogs.push(logData);
    }
  });

  console.log(`[Linker-Debug] Found ${potentialLogs.length} potential logs for ${staffNameForQuery}`);
  return potentialLogs;
}


interface LinkTrainingLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMemberReport: StaffComplianceReport;
  onLogsLinked: () => void;
}


export function LinkTrainingLogsDialog({
  open,
  onOpenChange,
  staffMemberReport,
  onLogsLinked,
}: LinkTrainingLogsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLogIds, setSelectedLogIds] = React.useState<Set<string>>(new Set());

  // Transform name for dialog display and initial query formatting
  const namePartsForDialog = staffMemberReport.staffMemberName.split(" ");
  const lastNameForDialog = namePartsForDialog.length > 1 ? namePartsForDialog[namePartsForDialog.length - 1] : namePartsForDialog[0] || "";
  const firstNameForDialog = namePartsForDialog.length > 1 ? namePartsForDialog.slice(0, -1).join(" ") : "";
  const formattedStaffNameForQuery = `${lastNameForDialog}, ${firstNameForDialog}`.trim(); // "LastName, FirstName"
  const staffServiceNumberForLinking = staffMemberReport.staffServiceNumberActual;


  const { data: potentialLogs = [], isLoading, error, refetch } = useQuery<TrainingLog[], Error>({
    queryKey: [`${UNLINKED_TRAINING_LOGS_QUERY_KEY_PREFIX}_${staffMemberReport.staffMemberId}`, formattedStaffNameForQuery],
    queryFn: () => fetchUnlinkedTrainingLogs(
        formattedStaffNameForQuery,
        staffServiceNumberForLinking
    ),
    enabled: open && !!staffServiceNumberForLinking,
  });

  React.useEffect(() => {
    if (open) {
      refetch();
      setSelectedLogIds(new Set());
    }
  }, [open, refetch]);

  const linkMutation = useMutation<void, Error, string[]>({
    mutationFn: async (logIdsToLink) => {
      if (!staffServiceNumberForLinking) throw new Error("Target staff member's service number is missing. Cannot link logs.");

      const batch = writeBatch(db);
      logIdsToLink.forEach(logId => {
        const logRef = doc(db, "trainingLogs", logId);
        batch.update(logRef, { serviceNumber: staffServiceNumberForLinking });
      });
      await batch.commit();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Selected training logs linked successfully." });
      queryClient.invalidateQueries({ queryKey: [TRAINING_LOGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] }); // Invalidate staff to re-fetch for compliance
      queryClient.invalidateQueries({ queryKey: ['safetyAuditsDashboard'] }); // Example, adjust as needed
      queryClient.invalidateQueries({ queryKey: ['squadronVisitsDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardScheduledMeetings']});
      onLogsLinked();
      onOpenChange(false);
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: `Failed to link logs: ${err.message}` });
    },
  });

  const handleToggleLogSelection = (logId: string) => {
    setSelectedLogIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const handleLinkSelected = () => {
    if (selectedLogIds.size === 0) {
      toast({ variant: "default", title: "No Logs Selected", description: "Please select at least one log to link." });
      return;
    }
    if (!staffServiceNumberForLinking) {
      toast({ variant: "destructive", title: "Error", description: "Cannot link logs: Target staff member's service number is missing." });
      return;
    }
    linkMutation.mutate(Array.from(selectedLogIds));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Link Training Logs for {staffMemberReport.staffMemberRank} {staffMemberReport.staffMemberName}</DialogTitle>
          <DialogDescription>
            Select training logs below that may belong to this staff member (SN: {staffServiceNumberForLinking || "N/A"}).
            The system searches for logs matching the name (e.g., &quot;{formattedStaffNameForQuery}&quot; or &quot;{staffMemberReport.staffMemberName}&quot;) in various formats (case-insensitive) that are not currently linked to this service number.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] border rounded-md p-2">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Finding potential logs...</p>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center py-8 text-destructive">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p>Error finding logs: {error.message}</p>
            </div>
          )}
          {!isLoading && !error && !staffServiceNumberForLinking && (
             <p className="py-8 text-center text-destructive">Cannot search for logs: Staff member service number is missing.</p>
          )}
          {!isLoading && !error && staffServiceNumberForLinking && potentialLogs.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No unlinked training logs found potentially matching &quot;{staffMemberReport.staffMemberName}&quot; or &quot;{formattedStaffNameForQuery}&quot;.</p>
          )}
          {!isLoading && !error && staffServiceNumberForLinking && potentialLogs.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Link</TableHead>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Stored Staff Name in Log</TableHead>
                  <TableHead>Completion Date</TableHead>
                  <TableHead>Current SN in Log</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {potentialLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedLogIds.has(log.id!)}
                        onCheckedChange={() => handleToggleLogSelection(log.id!)}
                        aria-label={`Select log ${log.courseName}`}
                      />
                    </TableCell>
                    <TableCell>{log.courseName}</TableCell>
                    <TableCell>{log.staffName}</TableCell>
                    <TableCell>{log.completionDate && format(new Date(log.completionDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{log.serviceNumber || "None"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={linkMutation.isPending}>Cancel</Button>
          <Button onClick={handleLinkSelected} disabled={linkMutation.isPending || selectedLogIds.size === 0 || !staffServiceNumberForLinking}>
            {linkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Link Selected Logs ({selectedLogIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    