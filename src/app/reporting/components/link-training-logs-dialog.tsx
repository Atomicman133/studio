
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

async function fetchUnlinkedTrainingLogs(staffName: string, rank: string, currentServiceNumber?: string): Promise<TrainingLog[]> {
  const logsCollectionRef = collection(db, "trainingLogs");
  
  // Query for logs that match name and rank but either have no service number
  // OR have a service number that does NOT match the current staff member's service number (if provided)
  // This is a bit tricky with Firestore's OR limitations. We'll fetch two sets and combine.

  const q1Conditions = [
    where("staffName", "==", staffName),
    where("rank", "==", rank),
    where("serviceNumber", "==", null) // Logs with no service number
  ];
  const q1 = query(logsCollectionRef, ...q1Conditions);
  
  const q2Conditions = [
    where("staffName", "==", staffName),
    where("rank", "==", rank),
    // where("serviceNumber", "!=", currentServiceNumber) // This is problematic.
    // Firestore doesn't support != queries directly in a way that's efficient here.
    // We'll fetch all logs matching name/rank and filter client-side for serviceNumber mismatch.
  ];
   const q2 = query(logsCollectionRef, ...q2Conditions.filter(c => c !== undefined));


  const [querySnapshot1, querySnapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  const logsMap = new Map<string, TrainingLog>();

  querySnapshot1.docs.forEach(doc => {
    if (!logsMap.has(doc.id)) {
      logsMap.set(doc.id, { id: doc.id, ...convertLogTimestamps(doc.data()) } as TrainingLog);
    }
  });
  
  querySnapshot2.docs.forEach(doc => {
    const logData = { id: doc.id, ...convertLogTimestamps(doc.data()) } as TrainingLog;
    // Add if not already present AND ( (has no service number) OR (has a service number that is different from current staff's) )
    if (!logsMap.has(doc.id) && (!logData.serviceNumber || (currentServiceNumber && logData.serviceNumber !== currentServiceNumber))) {
        logsMap.set(doc.id, logData);
    } else if (logsMap.has(doc.id) && logData.serviceNumber && currentServiceNumber && logData.serviceNumber !== currentServiceNumber) {
        // If it was added from q1 (serviceNumber == null), but q2 reveals it has a *different* service number, keep it.
        // This case is less likely if q1 specifically fetches serviceNumber == null.
    } else if (logsMap.has(doc.id) && !logData.serviceNumber) {
        // Already added by q1, keep it.
    }
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

  const { data: potentialLogs = [], isLoading, error, refetch } = useQuery<TrainingLog[], Error>({
    queryKey: [UNLINKED_TRAINING_LOGS_QUERY_KEY, staffMemberReport.staffMemberId],
    queryFn: () => fetchUnlinkedTrainingLogs(staffMemberReport.staffMemberName, staffMemberReport.staffMemberRank, staffMemberReport.staffMemberId.split('_').pop()), // Assuming staffMemberId contains serviceNumber
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
      if (!staffMemberReport.staffMemberId) throw new Error("Staff member service number is missing.");
      const staffServiceNumber = staffMemberReport.staffMemberId.split('_').pop(); // Extract service number
      if (!staffServiceNumber) throw new Error("Could not extract service number from staff ID.");

      const batch = writeBatch(db);
      logIdsToLink.forEach(logId => {
        const logRef = doc(db, "trainingLogs", logId);
        batch.update(logRef, { serviceNumber: staffServiceNumber });
      });
      await batch.commit();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Selected training logs linked successfully." });
      onLogsLinked(); // Callback to refresh parent data
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
    linkMutation.mutate(Array.from(selectedLogIds));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Training Logs for {staffMemberReport.staffMemberRank} {staffMemberReport.staffMemberName}</DialogTitle>
          <DialogDescription>
            Select training logs below that belong to this staff member. Linking will associate them via their service number.
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
            <p className="py-8 text-center text-muted-foreground">No unlinked training logs found matching this staff member's name and rank.</p>
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
