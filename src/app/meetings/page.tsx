"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, CalendarPlus, FileText, Loader2, AlertTriangle, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { CreateMeetingForm } from "./components/create-meeting-form";
import type { Meeting, CreateMeetingFormData } from "./meeting-schema";
import { getAuth } from "firebase/auth";
import Link from "next/link";

const MEETINGS_QUERY_KEY = 'meetings_v2';

const convertMeetingTimestamps = (data: any): Meeting => {
  return {
    ...data,
    dateTime: data.dateTime instanceof Timestamp ? data.dateTime.toDate() : data.dateTime,
  };
};

async function fetchMeetings(): Promise<Meeting[]> {
  const meetingsCollectionRef = collection(db, 'meetings');
  const q = query(meetingsCollectionRef, orderBy('dateTime', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...convertMeetingTimestamps(doc.data()),
  })) as Meeting[];
}

export default function MeetingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const { data: meetingsList = [], isLoading: isLoadingMeetings, error: errorMeetings } = useQuery<Meeting[], Error>({
    queryKey: [MEETINGS_QUERY_KEY],
    queryFn: fetchMeetings,
  });

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  const handleCreateMeeting = async (formData: CreateMeetingFormData) => {
    setIsCreating(true);
    try {
      const [hours, minutes] = formData.meetingTime.split(':').map(Number);
      const combinedDateTime = new Date(formData.meetingDate);
      combinedDateTime.setHours(hours, minutes, 0, 0);

      const newMeeting: Omit<Meeting, "id"> = {
        title: formData.title,
        dateTime: combinedDateTime,
        location: formData.location || "",
        status: "Draft",
        creatorId: currentUser?.uid || "",
        invitees: formData.invitees,
        agendaItems: [],
        attendeesPresentEmails: [],
        adhocAttendees: [],
        minutesCompiled: false,
      };

      const docRef = await addDoc(collection(db, 'meetings'), {
        ...newMeeting,
        dateTime: Timestamp.fromDate(combinedDateTime),
      });

      // Call API to send invites
      const res = await fetch("/api/meetings/send-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: docRef.id }),
      });

      if (!res.ok) {
        throw new Error("Failed to send invitations.");
      }

      toast({ title: "Meeting Created", description: "Meeting created and invites sent." });
      queryClient.invalidateQueries({ queryKey: [MEETINGS_QUERY_KEY] });
      setIsCreateOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Something went wrong." });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">Manage upcoming meetings, agendas, and minutes.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} size="lg">
          <CalendarPlus className="mr-2 h-5 w-5" />
          Create Meeting
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
           <CardTitle className="text-xl flex items-center gap-2"><FileText className="h-5 w-5" /> All Meetings</CardTitle>
           <CardDescription>View and manage all meetings across the squadron.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMeetings ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
               <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
               <p className="text-muted-foreground">Loading meetings...</p>
             </div>
          ) : errorMeetings ? (
             <div className="text-destructive text-center py-12">Error: {errorMeetings.message}</div>
          ) : meetingsList.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-md">
               <CalendarPlus className="h-12 w-12 text-muted-foreground mb-4" />
               <h3 className="text-lg font-semibold text-muted-foreground mb-1">No Meetings Found</h3>
               <p className="text-sm text-muted-foreground">Create a new meeting to get started.</p>
             </div>
          ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Title</TableHead>
                   <TableHead>Date & Time</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Invitees</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {meetingsList.map((meeting) => (
                   <TableRow key={meeting.id}>
                     <TableCell className="font-medium">{meeting.title}</TableCell>
                     <TableCell>{format(meeting.dateTime, "PPP p")}</TableCell>
                     <TableCell>
                       <Badge variant={meeting.status === "Draft" ? "secondary" : meeting.status === "Completed" ? "default" : "outline"}>
                         {meeting.status}
                       </Badge>
                     </TableCell>
                     <TableCell>
                       <div className="flex items-center text-sm text-muted-foreground">
                         <Users className="mr-1 h-4 w-4" /> {meeting.invitees?.length || 0}
                       </div>
                     </TableCell>
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
                           <DropdownMenuItem asChild>
                             <Link href={`/meetings/${meeting.id}/agenda`}>View Agenda</Link>
                           </DropdownMenuItem>
                           {meeting.status !== "Completed" && (
                             <DropdownMenuItem asChild>
                               <Link href={`/meetings/${meeting.id}/conduct`}>Conduct Meeting</Link>
                             </DropdownMenuItem>
                           )}
                           <DropdownMenuSeparator />
                           <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Meeting</DialogTitle>
            <DialogDescription>
              Schedule a meeting and invite attendees. They will receive an email to view and contribute to the agenda.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <CreateMeetingForm onSubmit={handleCreateMeeting} onCancel={() => setIsCreateOpen(false)} isSubmitting={isCreating} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}