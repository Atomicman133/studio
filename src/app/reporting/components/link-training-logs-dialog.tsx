
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
import { collection, getDocs, query, writeBatch, doc, Timestamp, orderBy, limit } from "firebase/firestore";
import type { TrainingLog } from "@/app/training/training-schema";
import { convertLogTimestamps, TRAINING_LOGS_QUERY_KEY } from "@/app/training/training-schema"; // Updated import
import type { StaffMember } from "@/app/staff/staff-schema";
import type { StaffComplianceReport } from "../reporting-schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { STAFF_QUERY_KEY, RANKS } from "@/app/staff/staff-schema"; // Import RANKS from staff-schema

const UNLINKED_TRAINING_LOGS_QUERY_KEY_PREFIX = "unlinkedTrainingLogsForStaff";


async function fetchUnlinkedTrainingLogs(
  staffMemberReport: StaffComplianceReport
): Promise<TrainingLog[]> {
  const logsCollectionRef = collection(db, "trainingLogs");
  const currentStaffServiceNumber = staffMemberReport.staffServiceNumberActual;

  console.log(`[Linker-Debug] Fetching for: ${staffMemberReport.staffMemberName}, Target SN: ${currentStaffServiceNumber}`);
  console.log(`[Linker-Debug] Target Name for matching: ${staffMemberReport.staffMemberName}, Target Rank: ${staffMemberReport.staffMemberRank}`);

  // Fetch a broad set of logs (e.g., all or recent, then filter client-side)
  // For debugging, fetch all logs (up to a limit for performance)
  // In production, you might want a more targeted initial query if possible,
  // e.g., based on a partial last name if your data supports it and it's indexed.
  const q = query(logsCollectionRef, orderBy("completionDate", "desc"), limit(500)); // Fetch recent 500 logs for now
  
  console.log("[Linker-Debug] Fetching ALL training logs (limit 500 for debug)...");
  const querySnapshot = await getDocs(q);
  const allFetchedLogs: TrainingLog[] = querySnapshot.docs.map(docSnap => ({
    id: docSnap.id, ...convertLogTimestamps(docSnap.data())
  } as TrainingLog));
  
  console.log("[Linker-Debug] Total logs fetched from Firestore (before any filtering):", allFetchedLogs.length);

  const potentialLogs: TrainingLog[] = [];

  // Client-side filtering
  for (const log of allFetchedLogs) {
    console.log(`[Linker-Debug] Client-side considering log: ID=${log.id}, Name="${log.staffName}", SN="${log.serviceNumber || 'None'}", Rank="${log.rank}"`);

    // 1. Skip if already correctly linked to the current staff member
    if (log.serviceNumber && currentStaffServiceNumber && log.serviceNumber === currentStaffServiceNumber) {
      console.log(`[Linker-Debug] Skipping log ID ${log.id} - already linked to current staff SN ${currentStaffServiceNumber}`);
      continue;
    }

    // 2. Try to match by name and rank
    const staffFirstName = staffMemberReport.staffMemberName.split(" ")[0];
    const staffLastName = staffMemberReport.staffMemberName.split(" ").slice(1).join(" ");

    if (areNamesAndRankMatchingForDialog(log.staffName, log.rank, staffLastName, staffFirstName, staffMemberReport.staffMemberRank)) {
       console.log(`[Linker-Debug] Log ID ${log.id} (${log.staffName}) IS a potential name/rank match for ${staffMemberReport.staffMemberName}.`);
      potentialLogs.push(log);
    } else {
      // console.log(`[Linker-Debug] Log ID ${log.id} (${log.staffName}) is NOT a name/rank match for ${staffMemberReport.staffMemberName}.`);
    }
  }
  
  console.log(`[Linker-Debug] Found ${potentialLogs.length} potential logs for ${staffMemberReport.staffMemberName} after all client-side filtering.`);
  return potentialLogs;
}

// Specific name/rank matching for the dialog context
const areNamesAndRankMatchingForDialog = (
  logStaffNameField: string | undefined | null,
  logRank: typeof RANKS[number] | undefined | null,
  targetStaffLastName: string,
  targetStaffFirstName: string,
  targetStaffRank: typeof RANKS[number]
): boolean => {
  if (!logStaffNameField || !logRank) {
    // console.log(`[Linker-Debug-NameMatch] Early exit: Log name or rank missing. LogName: ${logStaffNameField}, LogRank: ${logRank}`);
    return false;
  }
  if (logRank !== targetStaffRank) {
    // console.log(`[Linker-Debug-NameMatch] Rank mismatch: LogRank="${logRank}" vs TargetRank="${targetStaffRank}"`);
    return false;
  }

  const normalizedTargetFirstName = targetStaffFirstName.toUpperCase().trim();
  const normalizedTargetLastName = targetStaffLastName.toUpperCase().trim();
  const normalizedLogStaffName = logStaffNameField.toUpperCase().trim().replace(/\s+/g, " ");

  // console.log(`[Linker-Debug-NameMatch] Comparing Log: "${normalizedLogStaffName}" (Rank: ${logRank}) WITH Target: "${normalizedTargetFirstName} ${normalizedTargetLastName}" (Rank: ${targetStaffRank})`);

  // Try "LastName, FirstName" format from log
  if (normalizedLogStaffName.includes(",")) {
    const parts = normalizedLogStaffName.split(",").map(p => p.trim());
    if (parts.length >= 1) { // Must have at least a last name part
      const logParsedLastName = parts[0];
      const logParsedFirstName = parts.length > 1 ? parts[1] : ""; // Handle cases like "LASTNAME,"

      // console.log(`[Linker-Debug-NameMatch] Parsed Log (L,F): LN="${logParsedLastName}", FN="${logParsedFirstName}"`);
      if (logParsedLastName === normalizedTargetLastName && (logParsedFirstName === normalizedTargetFirstName || logParsedFirstName === "" || normalizedTargetFirstName === "")) {
        // console.log(`[Linker-Debug-NameMatch] Matched Scenario 1 (L, F)`);
        return true;
      }
    }
  }

  // Try "FirstName LastName" format from log
  const spaceParts = normalizedLogStaffName.split(" ");
  if (spaceParts.length > 0) {
    const logParsedLastName = spaceParts[spaceParts.length - 1];
    const logParsedFirstName = spaceParts.slice(0, -1).join(" ");
    // console.log(`[Linker-Debug-NameMatch] Parsed Log (F L): LN="${logParsedLastName}", FN="${logParsedFirstName}"`);
    if (logParsedLastName === normalizedTargetLastName && (logParsedFirstName === normalizedTargetFirstName || logParsedFirstName === "" || normalizedTargetFirstName === "")) {
       // console.log(`[Linker-Debug-NameMatch] Matched Scenario 2 (F L)`);
      return true;
    }
  }
  // console.log(`[Linker-Debug-NameMatch] No match.`);
  return false;
};


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

  const staffServiceNumberForLinking = staffMemberReport.staffServiceNumberActual;


  const { data: potentialLogs = [], isLoading, error, refetch } = useQuery<TrainingLog[], Error>({
    // Ensure queryKey reflects the actual dependency, staffMemberReport object itself.
    queryKey: [`${UNLINKED_TRAINING_LOGS_QUERY_KEY_PREFIX}_${staffMemberReport.staffMemberId}`], 
    queryFn: () => fetchUnlinkedTrainingLogs(staffMemberReport),
    enabled: open && !!staffServiceNumberForLinking, // Also enable if SN exists, even if we match by name
    staleTime: 0, // Ensure fresh fetch when dialog opens
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    if (open && (staffMemberReport.staffMemberId || staffMemberReport.staffServiceNumberActual)) { // Check if staffMemberReport is available
      console.log("[Linker-Debug] Dialog opened for:", staffMemberReport.staffMemberName, "SN:", staffServiceNumberForLinking, "Refetching potential logs...");
      refetch();
      setSelectedLogIds(new Set());
    }
  }, [open, staffMemberReport, staffServiceNumberForLinking, refetch]);

  const linkMutation = useMutation<void, Error, {logIdsToLink: string[], targetServiceNumber: string, targetStaffName: string, targetRank: typeof RANKS[number]}>({
    mutationFn: async ({ logIdsToLink, targetServiceNumber, targetStaffName, targetRank }) => {
      // The primary action now is to update staffName and rank on the log.
      // Service number is updated if the target staff has one and the log doesn't, or if they differ.
      const batch = writeBatch(db);
      logIdsToLink.forEach(logId => {
        const logRef = doc(db, "trainingLogs", logId);
        const updates: Partial<TrainingLog> = {
          staffName: targetStaffName, // "LastName, FirstName"
          rank: targetRank,
        };
        // Only update serviceNumber if the target staff has one and it's different or missing on the log
        const currentLog = potentialLogs.find(p => p.id === logId);
        if (targetServiceNumber && (!currentLog?.serviceNumber || currentLog.serviceNumber !== targetServiceNumber)) {
          updates.serviceNumber = targetServiceNumber;
        }
        batch.update(logRef, updates);
      });
      await batch.commit();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Selected training logs updated and linked." });
      queryClient.invalidateQueries({ queryKey: [TRAINING_LOGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['safetyAuditsDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['squadronVisitsDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardScheduledMeetings']});
      onLogsLinked(); // This should trigger re-calculation on the reporting page
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
    // Prepare target staffName in "LastName, FirstName" format
    const nameParts = staffMemberReport.staffMemberName.split(" ");
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length-1] : nameParts[0];
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : "";
    const formattedTargetStaffName = `${lastName}, ${firstName}`;

    linkMutation.mutate({
        logIdsToLink: Array.from(selectedLogIds),
        targetServiceNumber: staffServiceNumberForLinking || "", // Pass empty string if no SN
        targetStaffName: formattedTargetStaffName,
        targetRank: staffMemberReport.staffMemberRank
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Link Training Logs for {staffMemberReport.staffMemberRank} {staffMemberReport.staffMemberName}</DialogTitle>
          <DialogDescription>
            Select training logs below that may belong to this staff member (SN: {staffServiceNumberForLinking || "N/A"}).
            Linking will update the log&apos;s stored Staff Name and Rank to match this member. If this member has a Service Number, it will also be added/updated on the log.
            The system searches for logs that are not currently linked to this service number and attempts to match by name.
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
          {!isLoading && !error && potentialLogs.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No unlinked training logs found potentially matching &quot;{staffMemberReport.staffMemberName}&quot; by name/rank.</p>
          )}
          {!isLoading && !error && potentialLogs.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Link</TableHead>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Stored Staff Name in Log</TableHead>
                  <TableHead>Stored Rank in Log</TableHead>
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
                    <TableCell>{log.rank}</TableCell>
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
          <Button onClick={handleLinkSelected} disabled={linkMutation.isPending || selectedLogIds.size === 0}>
            {linkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Link Selected Logs ({selectedLogIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
