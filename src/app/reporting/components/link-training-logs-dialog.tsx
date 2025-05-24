
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
import { convertLogTimestamps } from "@/app/training/page";
import type { StaffComplianceReport } from "../reporting-schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const UNLINKED_TRAINING_LOGS_QUERY_KEY = "unlinkedTrainingLogs";

interface LinkTrainingLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMemberReport: StaffComplianceReport;
  onLogsLinked: () => void;
}

// Fetches unlinked logs based on name (case-insensitive for last name prefix in query, then precise client-side)
// and ensures they are not already linked to the current staff member's service number.
async function fetchUnlinkedTrainingLogs(
  staffNameFormattedForQuery: string, // Expected format: "LASTNAME, FirstName" or "LASTNAME"
  currentServiceNumber?: string
): Promise<TrainingLog[]> {
  const logsCollectionRef = collection(db, "trainingLogs");

  const nameParts = staffNameFormattedForQuery.split(",").map(p => p.trim());
  const lastNameQuery = nameParts[0].toUpperCase(); // Use uppercase for prefix query, assuming last names in DB might be uppercase
  const firstNameQuery = nameParts.length > 1 ? nameParts[1].toUpperCase() : "";

  // Broad Firestore query: staffName starts with lastNameQuery (case-sensitive, so lastNameQuery should match DB casing)
  const q = query(
    logsCollectionRef,
    where("staffName", ">=", lastNameQuery),
    where("staffName", "<=", lastNameQuery + "\uf8ff") // Standard prefix query technique
  );

  const querySnapshot = await getDocs(q);
  const potentialLogs: TrainingLog[] = [];

  querySnapshot.docs.forEach(docSnap => {
    const logData = { id: docSnap.id, ...convertLogTimestamps(docSnap.data()) } as TrainingLog;

    // Condition 1: Service number check
    // Skip if the log is already linked to the CURRENT staff member
    if (logData.serviceNumber && currentServiceNumber && logData.serviceNumber === currentServiceNumber) {
      return;
    }
    // If log has a service number but it's DIFFERENT from current staff's, it's a candidate (could be mislinked)
    // If log has NO service number, it's a prime candidate

    // Condition 2: Precise, case-insensitive name match on client-side
    const logNameField = logData.staffName || "";
    const logNameParts = logNameField.split(",").map(p => p.trim());
    const logLastName = logNameParts[0].toUpperCase();
    const logFirstName = logNameParts.length > 1 ? logNameParts[1].toUpperCase() : "";

    // Match if last names are the same (case-insensitive)
    // AND (either no first name was part of the query OR first names also match case-insensitively)
    if (logLastName === lastNameQuery && (firstNameQuery === "" || logFirstName === firstNameQuery)) {
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

  const nameParts = staffMemberReport.staffMemberName.split(" ");
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0] || "";
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : "";
  const formattedStaffNameForQuery = `${lastName.toUpperCase()}${firstName ? ', ' + firstName : ''}`.trim();
  const staffServiceNumber = staffMemberReport.staffMemberId.split('_').pop();


  const { data: potentialLogs = [], isLoading, error, refetch } = useQuery<TrainingLog[], Error>({
    queryKey: [UNLINKED_TRAINING_LOGS_QUERY_KEY, staffMemberReport.staffMemberId, formattedStaffNameForQuery],
    queryFn: () => fetchUnlinkedTrainingLogs(
        formattedStaffNameForQuery,
        staffServiceNumber
    ),
    enabled: open,
  });

  React.useEffect(() => {
    if (open) {
      refetch();
      setSelectedLogIds(new Set());
    }
  }, [open, refetch]);

  const linkMutation = useMutation<void, Error, string[]>({
    mutationFn: async (logIdsToLink) => {
      if (!staffServiceNumber) throw new Error("Could not extract service number from staff ID for linking.");

      const batch = writeBatch(db);
      logIdsToLink.forEach(logId => {
        const logRef = doc(db, "trainingLogs", logId);
        batch.update(logRef, { serviceNumber: staffServiceNumber });
      });
      await batch.commit();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Selected training logs linked successfully." });
      queryClient.invalidateQueries({ queryKey: [UNLINKED_TRAINING_LOGS_QUERY_KEY, staffMemberReport.staffMemberId, formattedStaffNameForQuery] });
      queryClient.invalidateQueries({ queryKey: ["trainingLogsReporting"] }); // Invalidate broader training log cache
      queryClient.invalidateQueries({ queryKey: ["staffComplianceReports"] }); // Invalidate compliance reports
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
    linkMutation.mutate(Array.from(selectedLogIds));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Training Logs for {staffMemberReport.staffMemberRank} {staffMemberReport.staffMemberName}</DialogTitle>
          <DialogDescription>
            Select training logs below that belong to this staff member. This searches for logs matching name "{formattedStaffNameForQuery}" that are not currently linked via Service Number.
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
            <p className="py-8 text-center text-muted-foreground">No unlinked training logs found matching staff member's name ("{formattedStaffNameForQuery}").</p>
          )}
          {!isLoading && !error && potentialLogs.length > 0 && (
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
                    <TableCell>{log.staffName}</TableCell> {/* Display stored name for verification */}
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
          <Button onClick={handleLinkSelected} disabled={linkMutation.isPending || selectedLogIds.size === 0}>
            {linkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Link Selected Logs ({selectedLogIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
