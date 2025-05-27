
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, FileText, CalendarPlus, Users as UsersIconLucide, ListTodo, Download, Edit3, Info, Paperclip, Loader2, AlertTriangle, BookOpenCheck, LayoutDashboard } from "lucide-react";
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
import type { Meeting, MeetingFormData, ScheduledMeeting, AgendaFormData as FullAgendaFormData, AgendaItem } from "./meeting-schema";
import { MeetingForm } from "./components/meeting-form";
import { AgendaForm } from "./components/agenda-form"; // New form
import { format, parse } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import jsPDF from 'jspdf';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, orderBy, where } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { convertFileToDataUrl, addLetterheadAndFooter, addPageNumbers, resetLetterheadCache } from "@/lib/utils";


const MEETINGS_QUERY_KEY = 'meetings';
const SCHEDULED_MEETINGS_QUERY_KEY = 'scheduledMeetings'; // New key
const HEADER_IMAGE_URL = "/AAFCLetterhead-Header.png";
const FOOTER_IMAGE_URL = "/AAFCLetterhead-Footer.png";

// Helper to convert Firestore Timestamps to JS Dates in meeting data
const convertMeetingTimestamps = (data: any): Meeting => {
  return {
    ...data,
    date: data.date instanceof Timestamp ? data.date.toDate() : data.date,
  };
};

// Helper to convert Firestore Timestamps to JS Dates in scheduled meeting data
const convertScheduledMeetingTimestamps = (data: any): ScheduledMeeting => {
  return {
    ...data,
    dateTime: data.dateTime instanceof Timestamp ? data.dateTime.toDate() : data.dateTime,
  };
};


// --- Fetch Logged Meetings ---
async function fetchMeetings(): Promise<Meeting[]> {
  const meetingsCollectionRef = collection(db, 'meetings');
  const q = query(meetingsCollectionRef, orderBy('date', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...convertMeetingTimestamps(doc.data()),
  })) as Meeting[];
}

// --- Add Logged Meeting ---
async function addMeeting(newMeetingData: Omit<Meeting, 'id'>): Promise<string> {
  const meetingsCollectionRef = collection(db, 'meetings');
  const dataToSave = {
    ...newMeetingData,
    date: Timestamp.fromDate(newMeetingData.date),
  };
  const docRef = await addDoc(meetingsCollectionRef, dataToSave);
  return docRef.id;
}

// --- Update Logged Meeting ---
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

// --- Delete Logged Meeting ---
async function deleteMeeting(meetingId: string): Promise<void> {
  if (!meetingId) throw new Error("Meeting ID is required for deletion.");
  const meetingDocRef = doc(db, 'meetings', meetingId);
  await deleteDoc(meetingDocRef);
}

// --- Fetch Scheduled Meetings (Upcoming) ---
async function fetchScheduledMeetings(): Promise<ScheduledMeeting[]> {
  const scheduledMeetingsCollectionRef = collection(db, 'scheduledMeetings');
  const q = query(scheduledMeetingsCollectionRef, where('dateTime', '>=', Timestamp.now()), orderBy('dateTime', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...convertScheduledMeetingTimestamps(doc.data()),
  })) as ScheduledMeeting[];
}

// --- Add Scheduled Meeting ---
async function addScheduledMeeting(newScheduledMeetingData: Omit<ScheduledMeeting, 'id'>): Promise<string> {
  const scheduledMeetingsCollectionRef = collection(db, 'scheduledMeetings');
  const dataToSave = {
    ...newScheduledMeetingData,
    dateTime: Timestamp.fromDate(newScheduledMeetingData.dateTime),
  };
  const docRef = await addDoc(scheduledMeetingsCollectionRef, dataToSave);
  return docRef.id;
}


export default function MeetingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Queries for logged meetings
  const { data: meetingsList = [], isLoading: isLoadingMeetings, error: errorMeetings } = useQuery<Meeting[], Error>({
    queryKey: [MEETINGS_QUERY_KEY],
    queryFn: fetchMeetings,
    staleTime: 1000 * 60 * 5,
  });
  const addMeetingMutation = useMutation<string, Error, Omit<Meeting, 'id'>>({ mutationFn: addMeeting });
  const updateMeetingMutation = useMutation<void, Error, Meeting>({ mutationFn: updateMeeting });
  const deleteMeetingMutation = useMutation<void, Error, string>({ mutationFn: deleteMeeting });

  // Queries for scheduled meetings
  const { data: scheduledMeetingsList = [], isLoading: isLoadingScheduledMeetings, error: errorScheduledMeetings } = useQuery<ScheduledMeeting[], Error>({
    queryKey: [SCHEDULED_MEETINGS_QUERY_KEY],
    queryFn: fetchScheduledMeetings,
    staleTime: 1000 * 60 * 5,
  });
  const addScheduledMeetingMutation = useMutation<string, Error, Omit<ScheduledMeeting, 'id'>>({
    mutationFn: addScheduledMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SCHEDULED_MEETINGS_QUERY_KEY] });
      // Potentially update dashboard query too if it uses a different key
      queryClient.invalidateQueries({ queryKey: ['dashboardScheduledMeetings'] }); // Example
      toast({ title: "Success", description: "Meeting scheduled successfully." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: `Failed to schedule meeting: ${err.message}` });
    }
  });


  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingMeeting, setEditingMeeting] = React.useState<Meeting | null>(null);
  const [meetingToDelete, setMeetingToDelete] = React.useState<Meeting | null>(null);
  const [viewingMeeting, setViewingMeeting] = React.useState<Meeting | null>(null);

  const [isAgendaFormOpen, setIsAgendaFormOpen] = React.useState(false);


  const handleAddOrUpdateMeeting = async (formData: MeetingFormData) => {
      let meetingData: Partial<Meeting> = {
        title: formData.title,
        date: formData.date,
        attendees: formData.attendees,
        agendaNotes: formData.agendaNotes,
        discussionPoints: formData.discussionPoints,
        decisionsMade: formData.decisionsMade,
        actionItemsText: formData.actionItemsText,
      };

      // Handle file upload
      if (formData.agendaDocumentFile) {
        try {
          const { name, dataUrl } = await convertFileToDataUrl(formData.agendaDocumentFile);
          meetingData.agendaDocumentFileName = name;
          meetingData.agendaDocumentDataUrl = dataUrl;
        } catch (error) {
          console.error("Error converting file:", error);
          toast({ variant: "destructive", title: "File Error", description: "Could not process agenda document."});
          return;
        }
      } else if (formData.agendaDocumentFileName === undefined && editingMeeting) {
        // This means the user explicitly removed an existing file
        meetingData.agendaDocumentFileName = undefined;
        meetingData.agendaDocumentDataUrl = undefined;
      }


      if (editingMeeting && editingMeeting.id) {
        updateMeetingMutation.mutate({ ...editingMeeting, ...meetingData } as Meeting);
      } else {
        addMeetingMutation.mutate(meetingData as Omit<Meeting, 'id'>);
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
  const openFormForNew = () => {
    setEditingMeeting(null);
    setViewingMeeting(null);
    setIsFormOpen(true);
  };
  const closeForm = () => {
    setEditingMeeting(null);
    setIsFormOpen(false);
  };
  const closeViewDialog = () => {
    setViewingMeeting(null);
  };
  const handleExportMinutesAsPdf = async (meeting: Meeting) => {
    const doc = new jsPDF();
    resetLetterheadCache();
    const meetingDate = format(meeting.date, "yyyy-MM-dd");
    const filename = `meeting_minutes_${meeting.title.replace(/\s+/g, '_')}_${meetingDate}.pdf`;
    
    const margin = 15;
    let yPos = margin;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const indent = 5;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - margin * 2;
    let headerHeight = 0;
    let footerHeight = 0;

    const setPageLayout = async () => {
      const heights = await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
      headerHeight = heights.headerHeight;
      footerHeight = heights.footerHeight;
      yPos = margin + headerHeight + 5;
    };
    await setPageLayout();

    const checkPageBreak = async (neededHeight: number) => {
        if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin - footerHeight) {
            addPageNumbers(doc, footerHeight, margin);
            doc.addPage();
            await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
            yPos = margin + headerHeight + 5;
        }
    };

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    await checkPageBreak(sectionSpacing + 18);
    doc.text(`Meeting Minutes: ${meeting.title}`, margin, yPos);
    yPos += lineSpacing;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    await checkPageBreak(lineSpacing);
    doc.text(`Date: ${format(meeting.date, "PPP")}`, margin, yPos);
    yPos += sectionSpacing * 1.5;

    const addTextSection = async (title: string, text?: string | null, isBold = false, customIndent = indent, titleFontSize = 12, textFontSize = 10) => {
      if (!text || text.trim() === "") return;
      doc.setFontSize(titleFontSize);
      doc.setFont(undefined, 'bold');
      await checkPageBreak(lineSpacing * 2 + titleFontSize + textFontSize);
      doc.text(title, margin, yPos);
      yPos += lineSpacing;

      doc.setFontSize(textFontSize);
      doc.setFont(undefined, isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxLineWidth - customIndent);
      await checkPageBreak(lines.length * (lineSpacing * 0.8));
      doc.text(lines, margin + customIndent, yPos);
      yPos += lines.length * (lineSpacing * 0.8) + (lineSpacing * 0.3);
    };

    await addTextSection("Attendees:", meeting.attendees, false, 0);
    yPos += sectionSpacing * 0.5;

    if (meeting.agendaDocumentFileName) {
      await addTextSection("Agenda Document:", meeting.agendaDocumentFileName + " (Attached or referenced)", false, 0);
      yPos += sectionSpacing * 0.5;
    }
    if (meeting.agendaNotes) {
      await addTextSection("Agenda Notes:", meeting.agendaNotes, false, 0, 14);
      yPos += sectionSpacing * 0.5;
    }
    if (meeting.discussionPoints) {
      await addTextSection("Discussion Points:", meeting.discussionPoints, false, 0, 14);
      yPos += sectionSpacing * 0.5;
    }
    if (meeting.decisionsMade) {
      await addTextSection("Decisions Made:", meeting.decisionsMade, false, 0, 14);
      yPos += sectionSpacing * 0.5;
    }
    if (meeting.actionItemsText) {
      await addTextSection("Action Items:", meeting.actionItemsText, false, 0, 14);
    }

    addPageNumbers(doc, footerHeight, margin);
    doc.save(filename);
  };

  // --- Re-add mutation handlers for logged meetings to avoid undefined errors ---
  addMeetingMutation.onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: [MEETINGS_QUERY_KEY] });
    setIsFormOpen(false);
    toast({ title: "Success", description: "Meeting record added." });
  };
  addMeetingMutation.onError = (err: Error) => { // Explicitly type err
    toast({ variant: "destructive", title: "Error", description: `Failed to add meeting: ${err.message}` });
  };
  updateMeetingMutation.onSuccess = (_, variables) => {
    queryClient.invalidateQueries({ queryKey: [MEETINGS_QUERY_KEY] });
    queryClient.setQueryData<Meeting[]>([MEETINGS_QUERY_KEY], (oldData) =>
        oldData?.map((m) => (m.id === variables.id ? variables : m))
    );
    setIsFormOpen(false);
    setEditingMeeting(null);
    toast({ title: "Success", description: "Meeting record updated." });
  };
  updateMeetingMutation.onError = (err: Error) => { // Explicitly type err
    toast({ variant: "destructive", title: "Error", description: `Failed to update meeting: ${err.message}` });
  };
  deleteMeetingMutation.onSuccess = (_, meetingId) => {
    queryClient.invalidateQueries({ queryKey: [MEETINGS_QUERY_KEY] });
    queryClient.setQueryData<Meeting[]>([MEETINGS_QUERY_KEY], (oldData) =>
        oldData?.filter((m) => m.id !== meetingId)
    );
    setMeetingToDelete(null);
    toast({ title: "Success", description: "Meeting record deleted." });
  };
  deleteMeetingMutation.onError = (err: Error) => { // Explicitly type err
    toast({ variant: "destructive", title: "Error", description: `Failed to delete meeting: ${err.message}` });
    setMeetingToDelete(null);
  };
  // --- End re-add mutation handlers ---


  const handleExportAgendaAsPdf = async (agendaData: FullAgendaFormData) => {
    const doc = new jsPDF();
    resetLetterheadCache();
    const meetingDate = format(agendaData.meetingDate, "yyyy-MM-dd");
    const filename = `agenda_${agendaData.meetingTitle.replace(/\s+/g, '_')}_${meetingDate}.pdf`;

    const margin = 15;
    let yPos = margin;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const indent = 5;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - (margin * 2);
    let headerHeight = 0;
    let footerHeight = 0;
    
    const setPageLayout = async () => {
      const { headerHeight: hh, footerHeight: fh } = await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
      headerHeight = hh;
      footerHeight = fh;
      yPos = margin + headerHeight + 5;
    };
    await setPageLayout();

    const checkPageBreak = async (neededHeight: number) => {
        if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin - footerHeight) {
            addPageNumbers(doc, footerHeight, margin);
            doc.addPage();
            await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
            yPos = margin + headerHeight + 5;
        }
    };
    
    const addText = async (text: string, isBold = false, customIndent = 0, fontSize = 10) => {
      if (!text || text.trim() === "") return;
      doc.setFontSize(fontSize);
      doc.setFont(undefined, isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxLineWidth - customIndent - margin); // ensure text stays within margins
      await checkPageBreak(lines.length * (lineSpacing * 0.8) + (isBold ? lineSpacing * 0.5 : 0));
      doc.text(lines, margin + customIndent, yPos);
      yPos += lines.length * (lineSpacing * 0.8) + (lineSpacing * 0.3);
    };

    await addText(`Meeting Agenda: ${agendaData.meetingTitle}`, true, 0, 16);
    yPos += sectionSpacing * 0.5;
    await addText(`Date: ${format(agendaData.meetingDate, "PPP")}`, false, 0, 12);
    await addText(`Time: ${agendaData.meetingTime}`, false, 0, 12);
    if (agendaData.meetingLocation) await addText(`Location: ${agendaData.meetingLocation}`, false, 0, 12);
    if (agendaData.meetingObjective) {
      yPos += sectionSpacing * 0.3;
      await addText("Objective:", true, 0, 12);
      await addText(agendaData.meetingObjective, false, indent, 10);
    }
    yPos += sectionSpacing;

    if (agendaData.agendaItems && agendaData.agendaItems.length > 0) {
      await addText("Agenda Items:", true, 0, 14);
      yPos += sectionSpacing * 0.2;
      for (const [index, item] of agendaData.agendaItems.entries()) {
        await checkPageBreak(lineSpacing * 3 + 10); // Estimate space
        await addText(`${index + 1}. ${item.description}`, true, indent, 11);
        if (item.presenter) await addText(`Presenter: ${item.presenter}`, false, indent + 5, 9);
        if (item.timeAllocation) await addText(`Time: ${item.timeAllocation}`, false, indent + 5, 9);
        yPos += lineSpacing * 0.3;
      }
    } else {
      await addText("No specific agenda items listed.", false, indent);
    }
    
    addPageNumbers(doc, footerHeight, margin);
    doc.save(filename);
  };

  const handleScheduleAndExportAgenda = async (data: FullAgendaFormData) => {
    // 1. Parse date and time to create a combined dateTime for Firestore
    const [hours, minutes] = data.meetingTime.split(':').map(Number);
    const combinedDateTime = new Date(data.meetingDate);
    combinedDateTime.setHours(hours, minutes, 0, 0);

    const scheduledMeetingPayload: Omit<ScheduledMeeting, 'id'> = {
      title: data.meetingTitle,
      dateTime: combinedDateTime,
      location: data.meetingLocation,
      objective: data.meetingObjective,
    };

    try {
      await addScheduledMeetingMutation.mutateAsync(scheduledMeetingPayload);
      // 2. Generate and export Agenda PDF
      await handleExportAgendaAsPdf(data);
      setIsAgendaFormOpen(false); // Close dialog on success
    } catch (error) {
      // Error handling is done by the mutation's onError
      console.error("Error in scheduling or exporting agenda:", error);
    }
  };


  return (
    <div className="space-y-6">
      {/* Section for Creating Agendas and Scheduling New Meetings */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
              <BookOpenCheck className="h-8 w-8 text-primary hidden sm:block" />
              <div>
                <CardTitle className="text-2xl">Schedule & Prepare Meetings</CardTitle>
                <CardDescription>Create agendas for upcoming meetings and add them to the schedule.</CardDescription>
              </div>
            </div>
            <Button onClick={() => setIsAgendaFormOpen(true)} size="lg" className="w-full sm:w-auto" disabled={addScheduledMeetingMutation.isPending}>
              {addScheduledMeetingMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CalendarPlus className="mr-2 h-5 w-5" />}
              New Agenda / Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingScheduledMeetings && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading scheduled meetings...</p>
            </div>
          )}
          {errorScheduledMeetings && !isLoadingScheduledMeetings && (
            <div className="text-destructive text-center py-12">Error: {errorScheduledMeetings.message}</div>
          )}
          {!isLoadingScheduledMeetings && !errorScheduledMeetings && scheduledMeetingsList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarPlus className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Upcoming Meetings Scheduled</h3>
              <p className="text-muted-foreground">Click "New Agenda / Schedule" to plan a meeting.</p>
            </div>
          )}
          {!isLoadingScheduledMeetings && !errorScheduledMeetings && scheduledMeetingsList.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead className="hidden lg:table-cell">Objective</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledMeetingsList.map((sMeeting) => (
                  <TableRow key={sMeeting.id}>
                    <TableCell className="font-medium">{sMeeting.title}</TableCell>
                    <TableCell>{format(sMeeting.dateTime, "PPP p")}</TableCell>
                    <TableCell className="hidden md:table-cell">{sMeeting.location || "N/A"}</TableCell>
                    <TableCell className="hidden lg:table-cell truncate max-w-xs">{sMeeting.objective || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {!isLoadingScheduledMeetings && !errorScheduledMeetings && scheduledMeetingsList.length > 0 && (
            <CardFooter className="text-xs text-muted-foreground">
                Showing {scheduledMeetingsList.length} upcoming meeting(s).
            </CardFooter>
        )}
      </Card>

      {/* Existing Section for Logged Meeting Records */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary hidden sm:block" />
                <div>
                <CardTitle className="text-2xl">Logged Meeting Records</CardTitle>
                <CardDescription>Record and document past meeting minutes, action items, and decisions.</CardDescription>
                </div>
            </div>
            <Button onClick={openFormForNew} size="lg" className="w-full sm:w-auto" disabled={addMeetingMutation.isPending}>
              {addMeetingMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
              Log New Meeting Record
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingMeetings && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading meeting records...</p>
            </div>
          )}
          {errorMeetings && !isLoadingMeetings && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
              <h3 className="text-xl font-semibold text-destructive mb-2">Error Loading Meeting Records</h3>
              <p className="text-destructive mb-4">{errorMeetings.message}</p>
            </div>
          )}
          {!isLoadingMeetings && !errorMeetings && meetingsList.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Meeting Records Logged Yet</h3>
                <p className="text-muted-foreground mb-4">Click &quot;Log New Meeting Record&quot; to get started.</p>
             </div>
          ) : !isLoadingMeetings && !errorMeetings && (
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
         {!isLoadingMeetings && !errorMeetings && meetingsList.length > 0 && (
          <CardFooter className="text-xs text-muted-foreground">
            Showing {meetingsList.length} of {meetingsList.length} logged meeting records.
          </CardFooter>
        )}
      </Card>

      {/* Dialog for New Agenda & Scheduling */}
      <Dialog open={isAgendaFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) setIsAgendaFormOpen(false); else setIsAgendaFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Schedule New Meeting & Create Agenda</DialogTitle>
            <DialogDescription>
              Define the meeting details and agenda items. Core details will be scheduled. Agenda will be used for PDF export.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-1">
            <div className="py-4 pr-4">
                <AgendaForm
                  onSubmit={handleScheduleAndExportAgenda}
                  onCancel={() => setIsAgendaFormOpen(false)}
                  isSubmitting={addScheduledMeetingMutation.isPending}
                />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>


      {/* Dialog for Logging/Editing Past Meetings */}
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
              Schedule new meetings, define agenda items, and export agendas to PDF. (Implemented)
            </li>
            <li className="flex items-center">
              <FileText className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Log past meeting records with date, attendees, agenda notes, and optional agenda document. (Implemented)
            </li>
            <li className="flex items-center">
              <UsersIconLucide className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Manage attendee lists (Currently text based).
            </li>
            <li className="flex items-center">
              <ListTodo className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Document discussion points, decisions made, and assign action items (Currently text based).
            </li>
            <li className="flex items-center">
              <Download className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Export logged meeting minutes (PDF export implemented) and action item lists.
            </li>
             <li className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary/70 flex-shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              Integration with Staff Management for selecting attendees from a list.
            </li>
             <li className="flex items-center">
                <LayoutDashboard className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
                Display upcoming scheduled meetings on the main dashboard. (Implemented)
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

