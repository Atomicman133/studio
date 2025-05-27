
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
import { convertLogTimestamps, TRAINING_LOGS_QUERY_KEY } from "@/app/training/page"; 
import type { StaffComplianceReport } from "../reporting-schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { STAFF_QUERY_KEY } from "@/app/staff/staff-schema";

const UNLINKED_TRAINING_LOGS_QUERY_KEY_PREFIX = "unlinkedTrainingLogsForStaff";

// Helper function to parse various name formats from log.staffName
// and compare against target names (case-insensitive).
const parseNameAndMatch = (
  logStaffNameField: string | undefined | null,
  targetLastNameUpper: string,
  targetFirstNameUpper: string
): boolean => {
  if (!logStaffNameField) return false;

  const logNameTrimmed = logStaffNameField.trim();
  if (!logNameTrimmed) return false;

  // Attempt 1: "LastName, FirstName" format
  if (logNameTrimmed.includes(",")) {
    const parts = logNameTrimmed.split(",").map(p => p.trim());
    if (parts.length === 2) {
      const logLastName = parts[0].toUpperCase();
      const logFirstName = parts[1].toUpperCase();
      if (logLastName === targetLastNameUpper && (targetFirstNameUpper === "" || logFirstName === targetFirstNameUpper)) {
        return true;
      }
    }
  }

  // Attempt 2: "FirstName LastName" format (or just "Name" if one word)
  const spaceParts = logNameTrimmed.split(/\s+/).map(p => p.trim()); // Split by any whitespace
  if (spaceParts.length > 0) {
    const logLastName = spaceParts[spaceParts.length - 1].toUpperCase();
    const logFirstName = spaceParts.slice(0, -1).join(" ").toUpperCase();
    
    if (logLastName === targetLastNameUpper && (targetFirstNameUpper === "" || logFirstName === targetFirstNameUpper)) {
      return true;
    }
    // Handle case where targetFirstName might be empty and log has only one name part which matches targetLastName
    if (targetFirstNameUpper === "" && spaceParts.length === 1 && logLastName === targetLastNameUpper) {
        return true;
    }
  }
  return false;
};


async function fetchUnlinkedTrainingLogs(
  staffNameForQuery: string, // Expected: "LastName, FirstName" (target from report)
  currentStaffServiceNumber?: string
): Promise<TrainingLog[]> {
  const logsCollectionRef = collection(db, "trainingLogs");

  // Prepare target names for comparison
  const targetNameParts = staffNameForQuery.split(",").map(p => p.trim());
  const targetLastNameUpper = targetNameParts[0].toUpperCase();
  const targetFirstNameUpper = targetNameParts.length > 1 ? targetNameParts[1].toUpperCase() : "";

  // Broad Firestore query: staffName starts with lastNameForFirestoreQuery (uppercase)
  // This should catch "CORRY, ..." if lastNameForFirestoreQuery is "CORRY"
  // Also helps if stored as "Corry, ..." due to Firestore's range behavior with \uf8ff
  const q = query(
    logsCollectionRef,
    where("staffName", ">=", targetLastNameUpper), // Use targetLastNameUpper directly for prefix
    where("staffName", "<=", targetLastNameUpper + "\uf8ff")
  );

  const querySnapshot = await getDocs(q);
  const potentialLogs: TrainingLog[] = [];

  querySnapshot.docs.forEach(docSnap => {
    const logData = { id: docSnap.id, ...convertLogTimestamps(docSnap.data()) } as TrainingLog;

    // Primary Skip: If this log is ALREADY linked to the CURRENT staff member, ignore it.
    if (logData.serviceNumber && currentStaffServiceNumber && logData.serviceNumber === currentStaffServiceNumber) {
      return;
    }

    // Client-side precise, case-insensitive name match using the new helper
    if (parseNameAndMatch(logData.staffName, targetLastNameUpper, targetFirstNameUpper)) {
      potentialLogs.push(logData);
    }
  });

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
    // Ensure queryKey is unique per staff member to avoid stale data across dialog openings
    queryKey: [`${UNLINKED_TRAINING_LOGS_QUERY_KEY_PREFIX}_${staffMemberReport.staffMemberId}`, formattedStaffNameForQuery],
    queryFn: () => fetchUnlinkedTrainingLogs(
        formattedStaffNameForQuery, // This is "LastName, FirstName"
        staffServiceNumberForLinking
    ),
    enabled: open && !!staffServiceNumberForLinking, // Only run query if dialog is open and service number exists
  });

  React.useEffect(() => {
    if (open) {
      refetch(); // Refetch when dialog opens
      setSelectedLogIds(new Set()); // Clear previous selections
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
      queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });
      onLogsLinked(); // Callback to parent
      onOpenChange(false); // Close dialog
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
            The system searches for logs matching the name (e.g., "{formattedStaffNameForQuery}" or "{staffMemberReport.staffMemberName}") that are not currently linked to this service number. Matching is case-insensitive.
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
            <p className="py-8 text-center text-muted-foreground">No unlinked training logs found matching name "{staffMemberReport.staffMemberName}" or "{formattedStaffNameForQuery}".</p>
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

