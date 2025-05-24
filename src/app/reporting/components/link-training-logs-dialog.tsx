
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
import { collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
import type { TrainingLog } from "@/app/training/training-schema";
import { convertLogTimestamps, TRAINING_LOGS_QUERY_KEY } from "@/app/training/page"; // Import TRAINING_LOGS_QUERY_KEY
import type { StaffComplianceReport } from "../reporting-schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { STAFF_QUERY_KEY } from "@/app/staff/staff-schema"; // Import STAFF_QUERY_KEY

const UNLINKED_TRAINING_LOGS_QUERY_KEY_PREFIX = "unlinkedTrainingLogsForStaff";

interface LinkTrainingLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMemberReport: StaffComplianceReport;
  onLogsLinked: () => void;
}

async function fetchUnlinkedTrainingLogs(
  staffNameForQuery: string, // Expected: "LASTNAME, FirstName" (case-insensitive target)
  staffRankForQuery: string, // For potential additional filtering if needed, but mainly for display or cross-referencing
  currentStaffServiceNumber?: string // Actual service number of the staff member we are linking TO
): Promise<TrainingLog[]> {
  const logsCollectionRef = collection(db, "trainingLogs");

  const nameParts = staffNameForQuery.split(",").map(p => p.trim());
  const lastNameQueryPart = nameParts[0].toUpperCase(); // For Firestore prefix query
  const firstNameQueryPart = nameParts.length > 1 ? nameParts[1].toUpperCase() : "";

  // Broad Firestore query: staffName starts with lastNameQueryPart (case-sensitive)
  const q = query(
    logsCollectionRef,
    where("staffName", ">=", lastNameQueryPart),
    where("staffName", "<=", lastNameQueryPart + "\uf8ff")
  );

  const querySnapshot = await getDocs(q);
  const potentialLogs: TrainingLog[] = [];

  querySnapshot.docs.forEach(docSnap => {
    const logData = { id: docSnap.id, ...convertLogTimestamps(docSnap.data()) } as TrainingLog;

    // Primary Skip: If this log is ALREADY linked to the CURRENT staff member, ignore it.
    if (logData.serviceNumber && currentStaffServiceNumber && logData.serviceNumber === currentStaffServiceNumber) {
      return;
    }

    // Client-side precise, case-insensitive name match
    const logNameField = logData.staffName || ""; // "LASTNAME, FirstName"
    const logNameParts = logNameField.split(",").map(p => p.trim());
    const logLastName = logNameParts[0].toUpperCase();
    const logFirstName = logNameParts.length > 1 ? logNameParts[1].toUpperCase() : "";

    if (
      logLastName === lastNameQueryPart &&
      (firstNameQueryPart === "" || logFirstName === firstNameQueryPart)
    ) {
      // Log's name matches the target staff member's name (case-insensitive)
      // AND it's either not linked to anyone, OR it's linked to someone ELSE (potential mislink)
      // OR it's the one we are trying to link TO (covered by primary skip)
      potentialLogs.push(logData);
    }
  });

  return potentialLogs;
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

  // staffMemberReport.staffMemberName is "FirstName LastName"
  // We need "LastName, FirstName" for the query
  const nameParts = staffMemberReport.staffMemberName.split(" ");
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0] || "";
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : "";
  const formattedStaffNameForQuery = `${lastName}, ${firstName}`.trim();
  const staffServiceNumberForLinking = staffMemberReport.staffServiceNumberActual; // Use the actual service number


  const { data: potentialLogs = [], isLoading, error, refetch } = useQuery<TrainingLog[], Error>({
    queryKey: [`${UNLINKED_TRAINING_LOGS_QUERY_KEY_PREFIX}_${staffMemberReport.staffMemberId}`, formattedStaffNameForQuery],
    queryFn: () => fetchUnlinkedTrainingLogs(
        formattedStaffNameForQuery,
        staffMemberReport.staffMemberRank,
        staffServiceNumberForLinking
    ),
    enabled: open && !!staffServiceNumberForLinking, // Only enable if we have a service number to link to
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
      // Invalidate queries that supply data to the ReportingPage
      queryClient.invalidateQueries({ queryKey: [TRAINING_LOGS_QUERY_KEY] }); // Key for training logs on Reporting Page
      queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });          // Key for staff list on Reporting Page
      onLogsLinked(); // Callback to ReportingPage, can trigger additional logic if needed
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Training Logs for {staffMemberReport.staffMemberRank} {staffMemberReport.staffMemberName}</DialogTitle>
          <DialogDescription>
            Select training logs below that belong to this staff member (SN: {staffServiceNumberForLinking || "N/A"}).
            The system searches for logs matching "{formattedStaffNameForQuery}" that are not currently linked to this service number.
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
            <p className="py-8 text-center text-muted-foreground">No unlinked training logs found matching name "{formattedStaffNameForQuery}".</p>
          )}
          {!isLoading && !error && staffServiceNumberForLinking && potentialLogs.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Link</TableHead>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Stored Name</TableHead>
                  <TableHead>Completion Date</TableHead>
                  <TableHead>Current SN</TableHead>
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
                    <TableCell>{format(log.completionDate, "dd/MM/yyyy")}</TableCell>
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
