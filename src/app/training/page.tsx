
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, GraduationCap, ListChecks, BarChartHorizontalBig, UserCog, Trophy, Edit3, Info, UploadCloud } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { TrainingLog } from "./training-schema";
import { TrainingLogForm } from "./components/training-log-form";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const initialTrainingLogs: TrainingLog[] = [
  {
    id: "t1",
    staffName: "Jane Smith",
    courseName: "Officer Development Course",
    completionDate: new Date("2023-11-20"),
    qualificationAchieved: "ODC Certificate",
  },
  {
    id: "t2",
    staffName: "John Doe",
    courseName: "Range Safety Officer Training",
    completionDate: new Date("2024-02-10"),
    instructorQualification: "Certified RSO",
    achievementDetails: "Top score in practical assessment."
  },
];

export default function TrainingPage() {
  const [trainingLogsList, setTrainingLogsList] = React.useState<TrainingLog[]>(initialTrainingLogs);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingLog, setEditingLog] = React.useState<TrainingLog | null>(null);
  const [logToDelete, setLogToDelete] = React.useState<TrainingLog | null>(null);
  const [viewingLog, setViewingLog] = React.useState<TrainingLog | null>(null);

  const handleAddLog = (data: TrainingLog) => {
    const newLog = { ...data, id: crypto.randomUUID() };
    setTrainingLogsList((prev) => [newLog, ...prev]);
    setIsFormOpen(false);
  };

  const handleUpdateLog = (data: TrainingLog) => {
    setTrainingLogsList((prev) =>
      prev.map((log) => (log.id === data.id ? data : log))
    );
    setIsFormOpen(false);
    setEditingLog(null);
  };

  const handleEdit = (log: TrainingLog) => {
    setEditingLog(log);
    setViewingLog(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (log: TrainingLog) => {
    setViewingLog(log);
    setEditingLog(null);
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (logToDelete) {
      setTrainingLogsList((prev) => prev.filter((log) => log.id !== logToDelete.id));
      setLogToDelete(null);
    }
  };

  const openFormForNew = () => {
    setEditingLog(null);
    setViewingLog(null);
    setIsFormOpen(true);
  };
  
  const closeForm = () => {
    setEditingLog(null);
    setIsFormOpen(false);
  };

  const closeViewDialog = () => {
    setViewingLog(null);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary hidden sm:block" />
              <div>
                <CardTitle className="text-2xl">Training Overview</CardTitle>
                <CardDescription>Record staff training, qualifications, accomplishments, and generate reports.</CardDescription>
              </div>
            </div>
            <Button onClick={openFormForNew} size="lg" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" /> Log Training Record
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {trainingLogsList.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Training Records Yet</h3>
                <p className="text-muted-foreground mb-4">Click &quot;Log Training Record&quot; to get started.</p>
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Course/Training</TableHead>
                  <TableHead>Completion Date</TableHead>
                  <TableHead className="hidden md:table-cell">Qualification</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingLogsList.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.staffName}</TableCell>
                    <TableCell>{log.courseName}</TableCell>
                    <TableCell>{format(log.completionDate, "PP")}</TableCell>
                    <TableCell className="hidden md:table-cell">{log.qualificationAchieved || log.instructorQualification || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewDetails(log)}>
                            <Info className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(log)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setLogToDelete(log)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
         {trainingLogsList.length > 0 && (
          <CardFooter className="text-xs text-muted-foreground">
            Showing {trainingLogsList.length} of {trainingLogsList.length} training records.
          </CardFooter>
        )}
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeForm(); else setIsFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingLog ? "Edit Training Record" : "Log New Training Record"}
            </DialogTitle>
            <DialogDescription>
              {editingLog
                ? "Update the details of the training record."
                : "Fill in the form to add a new training record."}
            </DialogDescription>
          </DialogHeader>
           <ScrollArea className="max-h-[70vh] p-1">
            <div className="py-4 pr-4">
            <TrainingLogForm
              onSubmit={editingLog ? handleUpdateLog : handleAddLog}
              defaultValues={editingLog || undefined}
              onCancel={closeForm}
              isEditing={!!editingLog}
            />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

       {viewingLog && (
         <Dialog open={!!viewingLog} onOpenChange={closeViewDialog}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{viewingLog.courseName}</DialogTitle>
                    <DialogDescription>
                        Training for {viewingLog.staffName}, completed on {format(viewingLog.completionDate, "PPP")}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1 pr-4">
                    <div className="space-y-4 py-4">
                        <div>
                            <h3 className="font-semibold text-sm mb-1">Staff Member</h3>
                            <p className="text-sm text-muted-foreground">{viewingLog.staffName}</p>
                        </div>
                         {viewingLog.qualificationAchieved && (
                            <div>
                                <h3 className="font-semibold text-sm mb-1">Qualification Achieved</h3>
                                <p className="text-sm text-muted-foreground">{viewingLog.qualificationAchieved}</p>
                            </div>
                        )}
                        {viewingLog.instructorQualification && (
                            <div>
                                <h3 className="font-semibold text-sm mb-1">Instructor Qualification</h3>
                                <p className="text-sm text-muted-foreground">{viewingLog.instructorQualification}</p>
                            </div>
                        )}
                        {viewingLog.achievementDetails && (
                             <div>
                                <h3 className="font-semibold text-sm mb-1">Achievements/Awards</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingLog.achievementDetails}</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4">
                    <Button variant="outline" onClick={() => handleEdit(viewingLog)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewDialog}>Close</Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}


      {logToDelete && (
        <AlertDialog open={!!logToDelete} onOpenChange={() => setLogToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the training record for <strong>{logToDelete.staffName} - {logToDelete.courseName}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setLogToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      <Card className="shadow-sm mt-8">
        <CardHeader>
             <div className="flex items-center gap-3">
                <ListChecks className="h-6 w-6 text-primary/80" />
                <div>
                    <CardTitle className="text-xl">Planned Features</CardTitle>
                    <CardDescription>Future enhancements for Training Overview.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center">
              <ListChecks className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Log completed training courses, workshops, and qualifications for each staff member. (Implemented)
            </li>
            <li className="flex items-center">
              <UserCog className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Track instructor qualifications and endorsements. (Partially implemented)
            </li>
            <li className="flex items-center">
              <Trophy className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Record significant achievements, awards, and recognitions. (Implemented)
            </li>
            <li className="flex items-center">
               <UploadCloud className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Upload and manage training certificates and supporting documentation.
            </li>
            <li className="flex items-center">
              <BarChartHorizontalBig className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Generate reports on training completion, qualification status, and skill gaps.
            </li>
             <li className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary/70 flex-shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              Integration with Staff Management module for selecting staff.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
