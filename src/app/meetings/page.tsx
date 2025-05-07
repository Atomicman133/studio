"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, FileText, CalendarPlus, Users as UsersIconLucide, ListTodo, Download, Edit3, Info, Paperclip, Loader2, AlertTriangle } from "lucide-react";
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
  DialogFooter,
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
import type { Meeting, MeetingFormData } from "./meeting-schema"; // MeetingFormData for form
import { MeetingForm } from "./components/meeting-form";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import jsPDF from 'jspdf';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { convertFileToDataUrl } from "@/lib/utils";


const MEETINGS_QUERY_KEY = 'meetings';

// Helper to convert Firestore Timestamps to JS Dates in meeting data
const convertMeetingTimestamps = (data: any): Meeting => {
  return {
    ...data,
    date: data.date instanceof Timestamp ? data.date.toDate() : data.date,
  };
};

// --- Fetch Meetings ---
async function fetchMeetings(): Promise<Meeting[]> {
  const meetingsCollectionRef = collection(db, 'meetings');
  const q = query(meetingsCollectionRef, orderBy('date', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...convertMeetingTimestamps(doc.data()),
  })) as Meeting[];
}

// --- Add Meeting ---
async function addMeeting(newMeetingData: Omit<Meeting, 'id'>): Promise<string> {
  const meetingsCollectionRef = collection(db, 'meetings');
  const dataToSave = {
    ...newMeetingData,
    date: Timestamp.fromDate(newMeetingData.date), // Convert JS Date to Firestore Timestamp
  };
  const docRef = await addDoc(meetingsCollectionRef, dataToSave);
  return docRef.id;
}

// --- Update Meeting ---
async function updateMeeting(updatedMeeting: Meeting): Promise<void> {
  if (!updatedMeeting.id) throw new Error("Meeting ID is required for update.");
  const meetingDocRef = doc(db, 'meetings', updatedMeeting.id);
  const { id, ...dataToUpdate } = updatedMeeting;
  const dataToSave = {
    ...dataToUpdate,
    date: Timestamp.fromDate(dataToUpdate.date),
  };
  await updateDoc(meetingDocRef, dataToSave);
}

// --- Delete Meeting ---
async function deleteMeeting(meetingId: string): Promise<void> {
  if (!meetingId) throw new Error("Meeting ID is required for deletion.");
  const meetingDocRef = doc(db, 'meetings', meetingId);
  await deleteDoc(meetingDocRef);
}


export default function MeetingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: meetingsList = [], isLoading, error } = useQuery<Meeting[], Error>({
    queryKey: [MEETINGS_QUERY_KEY],
    queryFn: fetchMeetings,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const addMeetingMutation = useMutation<string, Error, Omit<Meeting, 'id'>>({
    mutationFn: addMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEETINGS_QUERY_KEY] });
      setIsFormOpen(false);
      toast({ title: "Success", description: "Meeting record added." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: `Failed to add meeting: ${err.message}` });
    }
  });

  const updateMeetingMutation = useMutation<void, Error, Meeting>({
    mutationFn: updateMeeting,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [MEETINGS_QUERY_KEY] });
      queryClient.setQueryData<Meeting[]>([MEETINGS_QUERY_KEY], (oldData) =>
         oldData?.map((m) => (m.id === variables.id ? variables : m))
       );
      setIsFormOpen(false);
      setEditingMeeting(null);
      toast({ title: "Success", description: "Meeting record updated." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: `Failed to update meeting: ${err.message}` });
    }
  });

  const deleteMeetingMutation = useMutation<void, Error, string>({
    mutationFn: deleteMeeting,
    onSuccess: (_, meetingId) => {
      queryClient.invalidateQueries({ queryKey: [MEETINGS_QUERY_KEY] });
      queryClient.setQueryData<Meeting[]>([MEETINGS_QUERY_KEY], (oldData) =>
         oldData?.filter((m) => m.id !== meetingId)
       );
      setMeetingToDelete(null);
      toast({ title: "Success", description: "Meeting record deleted." });
    },
     onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: `Failed to delete meeting: ${err.message}` });
      setMeetingToDelete(null);
    }
  });


  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingMeeting, setEditingMeeting] = React.useState<Meeting | null>(null);
  const [meetingToDelete, setMeetingToDelete] = React.useState<Meeting | null>(null);
  const [viewingMeeting, setViewingMeeting] = React.useState<Meeting | null>(null);


  const handleAddOrUpdateMeeting = async (formData: MeetingFormData) => {
    let processedAgendaDocumentInfo: Partial<Pick<Meeting, 'agendaDocumentFileName' | 'agendaDocumentDataUrl'>> = {};

    if (formData.agendaDocumentFile) {
        try {
            const { name, dataUrl } = await convertFileToDataUrl(formData.agendaDocumentFile);
            processedAgendaDocumentInfo = { agendaDocumentFileName: name, agendaDocumentDataUrl: dataUrl };
        } catch (err) {
            console.error("Error converting agenda document file:", err);
            toast({ variant: "destructive", title: "File Error", description: "Could not process agenda document." });
            return; 
        }
    } else if (formData.agendaDocumentFileName === undefined && editingMeeting) {
        // This case signifies explicit removal of an existing document during edit
        processedAgendaDocumentInfo = { agendaDocumentFileName: undefined, agendaDocumentDataUrl: undefined };
    }

    const meetingDataPayload: Meeting = {
      // Base fields from form
      title: formData.title,
      date: formData.date,
      attendees: formData.attendees,
      agendaNotes: formData.agendaNotes,
      discussionPoints: formData.discussionPoints,
      decisionsMade: formData.decisionsMade,
      actionItemsText: formData.actionItemsText,
      // Initialize agenda fields, prioritizing new/removed info, then existing, then undefined
      agendaDocumentFileName: processedAgendaDocumentInfo.hasOwnProperty('agendaDocumentFileName')
        ? processedAgendaDocumentInfo.agendaDocumentFileName
        : (editingMeeting ? editingMeeting.agendaDocumentFileName : undefined),
      agendaDocumentDataUrl: processedAgendaDocumentInfo.hasOwnProperty('agendaDocumentDataUrl')
        ? processedAgendaDocumentInfo.agendaDocumentDataUrl
        : (editingMeeting ? editingMeeting.agendaDocumentDataUrl : undefined),
      id: editingMeeting ? editingMeeting.id : undefined, // Include ID if editing
    };
    
    if (editingMeeting && editingMeeting.id) {
        updateMeetingMutation.mutate(meetingDataPayload as Meeting); // Cast because ID is now included
    } else {
        const { id, ...newMeetingData } = meetingDataPayload; // Exclude ID for new meeting
        addMeetingMutation.mutate(newMeetingData);
    }
  };


  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setViewingMeeting(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (meeting: Meeting) => {
    setViewingMeeting(meeting);
    setEditingMeeting(null);
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (meetingToDelete && meetingToDelete.id) {
      deleteMeetingMutation.mutate(meetingToDelete.id);
    }
  };

  const handleExportMinutesAsPdf = (meeting: Meeting) => {
    const doc = new jsPDF();
    const meetingDate = format(meeting.date, "yyyy-MM-dd");
    const filename = `meeting_minutes_${meeting.title.replace(/\s+/g, '_')}_${meetingDate}.pdf`;

    let yPos = 15;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const indent = 5;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxLineWidth = pageWidth - (margin * 2);

    const addTextSection = (title: string, text?: string) => {
      if (!text || text.trim() === "") return;
      if (yPos > doc.internal.pageSize.getHeight() - margin - sectionSpacing - 20) { // Added buffer for section
        doc.addPage();
        yPos = margin;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(title, margin, yPos);
      yPos += lineSpacing;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(text, maxLineWidth - indent);
      doc.text(lines, margin + indent, yPos);
      yPos += lines.length * (lineSpacing * 0.8) + sectionSpacing * 0.7;
    };

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`Meeting Minutes: ${meeting.title}`, margin, yPos);
    yPos += sectionSpacing * 1.2;

    addTextSection("Date:", format(meeting.date, "PPP p"));
    addTextSection("Attendees:", meeting.attendees);

    if (meeting.agendaDocumentFileName) {
      addTextSection("Agenda Document:", `${meeting.agendaDocumentFileName} (Uploaded)`);
    }
    addTextSection("Agenda Notes:", meeting.agendaNotes);
    addTextSection("Discussion Points:", meeting.discussionPoints);
    addTextSection("Decisions Made:", meeting.decisionsMade);
    addTextSection("Action Items:", meeting.actionItemsText);

    doc.save(filename);
  };

  const openFormForNew = () => {
    setEditingMeeting(null);
    setViewingMeeting(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingMeeting(null);
    setIsFormOpen(false);
  }

  const closeViewDialog = () => {
    setViewingMeeting(null);
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary hidden sm:block" />
                <div>
                <CardTitle className="text-2xl">Meeting Records</CardTitle>
                <CardDescription>Record and document meeting minutes, action items, and decisions efficiently.</CardDescription>
                </div>
            </div>
            <Button onClick={openFormForNew} size="lg" className="w-full sm:w-auto" disabled={addMeetingMutation.isPending}>
              {addMeetingMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
              Log New Meeting Record
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading meeting records...</p>
            </div>
          )}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
              <h3 className="text-xl font-semibold text-destructive mb-2">Error Loading Meetings</h3>
              <p className="text-destructive mb-4">{error.message}</p>
            </div>
          )}
          {!isLoading && !error && meetingsList.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Meeting Records Yet</h3>
                <p className="text-muted-foreground mb-4">Click &quot;Log New Meeting Record&quot; to get started.</p>
             </div>
          ) : !isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Attendees</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetingsList.map((meeting) => (
                  <TableRow key={meeting.id}>
                    <TableCell className="font-medium">{meeting.title}</TableCell>
                    <TableCell>{format(meeting.date, "PP")}</TableCell>
                    <TableCell className="hidden md:table-cell truncate max-w-xs">{meeting.attendees}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={updateMeetingMutation.isPending || deleteMeetingMutation.isPending}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                           <DropdownMenuItem onClick={() => handleViewDetails(meeting)} disabled={updateMeetingMutation.isPending || deleteMeetingMutation.isPending}>
                            <Info className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(meeting)} disabled={updateMeetingMutation.isPending || deleteMeetingMutation.isPending}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportMinutesAsPdf(meeting)} disabled={updateMeetingMutation.isPending || deleteMeetingMutation.isPending}>
                            <Download className="mr-2 h-4 w-4" />
                            Export as PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setMeetingToDelete(meeting)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            disabled={updateMeetingMutation.isPending || deleteMeetingMutation.isPending}
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
         {!isLoading && !error && meetingsList.length > 0 && (
          <CardFooter className="text-xs text-muted-foreground">
            Showing {meetingsList.length} of {meetingsList.length} meeting records.
          </CardFooter>
        )}
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeForm(); else setIsFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMeeting ? "Edit Meeting Record" : "Log New Meeting Record"}
            </DialogTitle>
            <DialogDescription>
              {editingMeeting
                ? "Update the details of the meeting."
                : "Fill in the form to log a new meeting record."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-1">
            <div className="py-4 pr-4">
                <MeetingForm
                  onSubmit={handleAddOrUpdateMeeting}
                  defaultValues={editingMeeting || undefined}
                  onCancel={closeForm}
                  isEditing={!!editingMeeting}
                  isSubmitting={editingMeeting ? updateMeetingMutation.isPending : addMeetingMutation.isPending}
                />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {viewingMeeting && (
         <Dialog open={!!viewingMeeting} onOpenChange={closeViewDialog}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{viewingMeeting.title}</DialogTitle>
                    <DialogDescription>
                        Meeting held on {format(viewingMeeting.date, "PPP")}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1 pr-4">
                    <div className="space-y-4 py-4">
                        <div>
                            <h3 className="font-semibold text-sm mb-1">Attendees</h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingMeeting.attendees}</p>
                        </div>
                        {viewingMeeting.agendaDocumentFileName && viewingMeeting.agendaDocumentDataUrl && (
                           <div>
                                <h3 className="font-semibold text-sm mb-1">Agenda Document</h3>
                                <a href={viewingMeeting.agendaDocumentDataUrl} download={viewingMeeting.agendaDocumentFileName} className="text-primary hover:underline flex items-center text-sm">
                                    <Paperclip className="mr-1 h-4 w-4 flex-shrink-0" /> {viewingMeeting.agendaDocumentFileName}
                                </a>
                            </div>
                        )}
                        {viewingMeeting.agendaNotes && (
                          <div>
                              <h3 className="font-semibold text-sm mb-1">Agenda Notes</h3>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingMeeting.agendaNotes}</p>
                          </div>
                        )}
                        {viewingMeeting.discussionPoints && (
                            <div>
                                <h3 className="font-semibold text-sm mb-1">Discussion Points</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingMeeting.discussionPoints}</p>
                            </div>
                        )}
                        {viewingMeeting.decisionsMade && (
                            <div>
                                <h3 className="font-semibold text-sm mb-1">Decisions Made</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingMeeting.decisionsMade}</p>
                            </div>
                        )}
                        {viewingMeeting.actionItemsText && (
                            <div>
                                <h3 className="font-semibold text-sm mb-1">Action Items</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingMeeting.actionItemsText}</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => {
                      if (viewingMeeting) {
                        handleEdit(viewingMeeting);
                      }
                    }}
                    disabled={updateMeetingMutation.isPending}
                    >
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewDialog} disabled={updateMeetingMutation.isPending}>Close</Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}

      {meetingToDelete && (
        <AlertDialog open={!!meetingToDelete} onOpenChange={() => setMeetingToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the meeting record for &quot;<strong>{meetingToDelete.title}</strong>&quot; held on {format(meetingToDelete.date, "PP")}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMeetingToDelete(null)} disabled={deleteMeetingMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={deleteMeetingMutation.isPending}
              >
                {deleteMeetingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Card className="shadow-sm mt-8">
        <CardHeader>
            <div className="flex items-center gap-3">
                <ListTodo className="h-6 w-6 text-primary/80" />
                <div>
                    <CardTitle className="text-xl">Planned Features</CardTitle>
                    <CardDescription>Future enhancements for Meeting Records.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center">
              <CalendarPlus className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Create new meeting records with date, time, attendees, agenda notes and optional agenda document. (Implemented)
            </li>
            <li className="flex items-center">
              <UsersIconLucide className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Manage attendee lists and track attendance. (Partially implemented: attendees as text)
            </li>
            <li className="flex items-center">
              <ListTodo className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Document discussion points, decisions made, and assign action items with due dates and responsible persons. (Partially implemented: text fields)
            </li>
            <li className="flex items-center">
              <Download className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Attach relevant documents or files to meeting records (Agenda implemented).
            </li>
            <li className="flex items-center">
              <Download className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Search, filter, and export meeting minutes (PDF export implemented) and action item lists.
            </li>
             <li className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary/70 flex-shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              Integration with Staff Management for selecting attendees from a list.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

