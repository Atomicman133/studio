
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
import { collection, getDocs, query, where, documentId, writeBatch, doc } from "firebase/firestore";
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

async function fetchUnlinkedTrainingLogs(staffNameFormattedForQuery: string, rank: string, currentServiceNumber?: string): Promise<TrainingLog[]> {
  const logsCollectionRef = collection(db, "trainingLogs");
  
  // Query for logs that match the formatted "LastName, FirstName" and rank
  // and either have no service number OR a different service number.

  const queries = [];

  // Query 1: Logs with NO service number, matching formatted name and rank
  queries.push(
    getDocs(query(
      logsCollectionRef,
      where("staffName", "==", staffNameFormattedForQuery),
      where("rank", "==", rank),
      where("serviceNumber", "==", null)
    ))
  );
  
  // Query 2: Logs WITH a service number, matching formatted name and rank,
  // but service number is NOT EQUAL to currentServiceNumber.
  // Firestore doesn't support direct "not-equal" on one field while equality on others in a single query efficiently for this case.
  // So, we fetch all matching name/rank and then filter.
   queries.push(
    getDocs(query(
      logsCollectionRef,
      where("staffName", "==", staffNameFormattedForQuery),
      where("rank", "==", rank)
      // We will filter serviceNumber client-side for this part
    ))
  );


  const querySnapshots = await Promise.all(queries);
  const logsMap = new Map<string, TrainingLog>();

  querySnapshots.forEach((snapshot, index) => {
    snapshot.docs.forEach(doc => {
      if (!logsMap.has(doc.id)) {
        const logData = { id: doc.id, ...convertLogTimestamps(doc.data()) } as TrainingLog;
        if (index === 0) { // From query 1 (serviceNumber is null)
            logsMap.set(doc.id, logData);
        } else if (index === 1) { // From query 2 (all name/rank matches)
            // Add if it has a serviceNumber AND that serviceNumber is different from currentStaff's SN
            // OR if it has NO serviceNumber (might have been missed by query 1 if SN field just wasn't present at all vs being explicitly null)
            if ((logData.serviceNumber && currentServiceNumber && logData.serviceNumber !== currentServiceNumber) || !logData.serviceNumber) {
                 logsMap.set(doc.id, logData);
            }
        }
      }
    });
  });
  
  return Array.from(logsMap.values());
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

  // Transform staffMemberReport.staffMemberName ("FirstName LastName") to "LastName, FirstName"
  const nameParts = staffMemberReport.staffMemberName.split(" ");
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0] || ""; // Handle single names as last names
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : "";
  const formattedStaffNameForQuery = `${lastName}${firstName ? ', ' + firstName : ''}`.trim();


  const { data: potentialLogs = [], isLoading, error, refetch } = useQuery<TrainingLog[], Error>({
    queryKey: [UNLINKED_TRAINING_LOGS_QUERY_KEY, staffMemberReport.staffMemberId, formattedStaffNameForQuery], // Add formatted name to query key
    queryFn: () => fetchUnlinkedTrainingLogs(
        formattedStaffNameForQuery, 
        staffMemberReport.staffMemberRank, 
        staffMemberReport.staffMemberId.split('_').pop() // Assuming staffMemberId contains serviceNumber
    ),
    enabled: open, // Only fetch when the dialog is open
  });

  React.useEffect(() => {
    if (open) {
      refetch(); // Refetch when dialog opens
      setSelectedLogIds(new Set()); // Reset selections
    }
  }, [open, refetch]);

  const linkMutation = useMutation<void, Error, string[]>({
    mutationFn: async (logIdsToLink) => {
      const staffServiceNumber = staffMemberReport.staffMemberId.split('_').pop(); 
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
            Select training logs below that belong to this staff member. This searches for logs matching name "{formattedStaffNameForQuery}" and rank "{staffMemberReport.staffMemberRank}" that are not currently linked via Service Number.
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
            <p className="py-8 text-center text-muted-foreground">No unlinked training logs found matching this staff member's name ("{formattedStaffNameForQuery}") and rank ("{staffMemberReport.staffMemberRank}").</p>
          )}
          {!isLoading && !error && potentialLogs.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Link</TableHead>
                  <TableHead>Course Name</TableHead>
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
