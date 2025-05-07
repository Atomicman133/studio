
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, FileText, CalendarPlus, Users as UsersIconLucide, ListTodo, DownloadCloud, Edit3, Info } from "lucide-react";
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
import type { Meeting } from "./meeting-schema";
import { MeetingForm } from "./components/meeting-form";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const initialMeetings: Meeting[] = [
  {
    id: "m1",
    title: "Weekly Sync",
    date: new Date("2024-07-01T10:00:00Z"),
    attendees: "John Doe, Jane Smith",
    agenda: "1. Project Updates\n2. Blockers\n3. Next Steps",
    discussionPoints: "Discussed progress on Project Phoenix. Jane needs access to new API.",
    decisionsMade: "Grant Jane API access. John to follow up on deployment.",
    actionItemsText: "- John: Follow up on deployment (ASAP)\n- Jane: Integrate new API (by EOW)"
  },
  {
    id: "m2",
    title: "Q3 Planning",
    date: new Date("2024-06-15T14:00:00Z"),
    attendees: "Alice Brown, Bob Green, Charlie Black",
    agenda: "1. Review Q2 Performance\n2. Q3 Goals\n3. Resource Allocation",
    discussionPoints: "Q2 targets mostly met. Discussed new initiatives for Q3.",
    decisionsMade: "Finalize Q3 roadmap by end of week.",
    actionItemsText: "- Alice: Draft Q3 roadmap (by EOD Wednesday)"
  }
];


export default function MeetingsPage() {
  const [meetingsList, setMeetingsList] = React.useState<Meeting[]>(initialMeetings);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingMeeting, setEditingMeeting] = React.useState<Meeting | null>(null);
  const [meetingToDelete, setMeetingToDelete] = React.useState<Meeting | null>(null);
  const [viewingMeeting, setViewingMeeting] = React.useState<Meeting | null>(null);


  const handleAddMeeting = (data: Meeting) => {
    const newMeeting = { ...data, id: crypto.randomUUID() };
    setMeetingsList((prev) => [newMeeting, ...prev]); // Add to top
    setIsFormOpen(false);
  };

  const handleUpdateMeeting = (data: Meeting) => {
    setMeetingsList((prev) =>
      prev.map((meeting) => (meeting.id === data.id ? data : meeting))
    );
    setIsFormOpen(false);
    setEditingMeeting(null);
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
    if (meetingToDelete) {
      setMeetingsList((prev) => prev.filter((meeting) => meeting.id !== meetingToDelete.id));
      setMeetingToDelete(null);
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
                <CardTitle className="text-2xl">Meeting Logger</CardTitle>
                <CardDescription>Record and document meeting minutes, action items, and decisions efficiently.</CardDescription>
                </div>
            </div>
            <Button onClick={openFormForNew} size="lg" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" /> Log New Meeting
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {meetingsList.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Meetings Logged Yet</h3>
                <p className="text-muted-foreground mb-4">Click &quot;Log New Meeting&quot; to get started.</p>
             </div>
          ) : (
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
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                           <DropdownMenuItem onClick={() => handleViewDetails(meeting)}>
                            <Info className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(meeting)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setMeetingToDelete(meeting)}
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
         {meetingsList.length > 0 && (
          <CardFooter className="text-xs text-muted-foreground">
            Showing {meetingsList.length} of {meetingsList.length} meeting logs.
          </CardFooter>
        )}
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeForm(); else setIsFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMeeting ? "Edit Meeting Log" : "Log New Meeting"}
            </DialogTitle>
            <DialogDescription>
              {editingMeeting
                ? "Update the details of the meeting."
                : "Fill in the form to log a new meeting."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-1">
            <div className="py-4 pr-4">
                <MeetingForm
                onSubmit={editingMeeting ? handleUpdateMeeting : handleAddMeeting}
                defaultValues={editingMeeting || undefined}
                onCancel={closeForm}
                isEditing={!!editingMeeting}
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
                        <div>
                            <h3 className="font-semibold text-sm mb-1">Agenda</h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingMeeting.agenda}</p>
                        </div>
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
                <DialogFooter className="pt-4">
                    <Button variant="outline" onClick={() => {
                      if (viewingMeeting) {
                        handleEdit(viewingMeeting);
                      }
                    }}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewDialog}>Close</Button>
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
                This action cannot be undone. This will permanently delete the meeting log for &quot;<strong>{meetingToDelete.title}</strong>&quot; held on {format(meetingToDelete.date, "PP")}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMeetingToDelete(null)}>
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
                <ListTodo className="h-6 w-6 text-primary/80" />
                <div>
                    <CardTitle className="text-xl">Planned Features</CardTitle>
                    <CardDescription>Future enhancements for the Meeting Logger.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center">
              <CalendarPlus className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Create new meeting records with date, time, attendees, and agenda. (Implemented)
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
              <DownloadCloud className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Attach relevant documents or files to meeting records.
            </li>
            <li className="flex items-center">
              <DownloadCloud className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Search, filter, and export meeting minutes and action item lists.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

