

"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Gavel, FileSignature, UserX, Archive, ShieldAlert, Edit3, Info, UploadCloud, ListChecks, MessageSquareText } from "lucide-react";
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
import type { DisciplineAction, RecordOfConversation } from "./discipline-schema";
import { DisciplineActionForm } from "./components/discipline-action-form";
import { RecordOfConversationForm } from "./components/record-of-conversation-form";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export const initialDisciplineActions: DisciplineAction[] = [
  {
    id: "da1",
    staffName: "John Doe", 
    dateOfIncident: new Date("2024-05-10"),
    typeOfAction: "Informal Discussion",
    incidentDescription: "Late arrival to parade night without prior notification.",
    policyBreached: "Squadron Standing Orders - Punctuality",
    outcome: "Counseled on importance of punctuality and communication.",
  },
  {
    id: "da2",
    staffName: "Jane Smith", 
    dateOfIncident: new Date("2024-03-15"),
    typeOfAction: "Formal Warning",
    incidentDescription: "Failure to follow safety procedures during a fieldcraft exercise, resulting in minor equipment damage.",
    policyBreached: "AAFC WHS Manual - Section 4.2",
    sanctionsApplied: "Temporary removal from supervising field activities until re-assessment.",
    appealProcessNotes: "No appeal lodged."
  },
];

export const initialRecordsOfConversation: RecordOfConversation[] = [
    {
        id: "roc1",
        referenceNumber: "CEA2024/003",
        interviewingOfficerName: "FLTLT Robert Wing",
        interviewingOfficerPosition: "Wing XSO",
        interviewDate: new Date("2024-07-01"),
        interviewTime: "10:00",
        interviewType: "In Person",
        subject: "Cadet Welfare Concern - CPL Bloggs",
        personsPresent: "FLTLT Wing, PLTOFF Smith (SQN CO)",
        conversationWithName: "PLTOFF Smith",
        conversationWithDeptUnitFirm: "123 Squadron",
        background: "Follow-up to an email regarding CPL Bloggs's disengagement from activities.",
        conversation: "Discussed potential underlying issues, strategies for re-engagement, and available support resources. PLTOFF Smith outlined steps already taken.",
        actionsTaken: "Wing XSO to provide contact for specialist support services. SQN CO to arrange a low-pressure chat with CPL Bloggs.",
        followUp: "Check-in with SQN CO in 2 weeks."
    }
]

export default function DisciplinePage() {
  const [actionsList, setActionsList] = React.useState<DisciplineAction[]>(initialDisciplineActions);
  const [isActionFormOpen, setIsActionFormOpen] = React.useState(false);
  const [editingAction, setEditingAction] = React.useState<DisciplineAction | null>(null);
  const [actionToDelete, setActionToDelete] = React.useState<DisciplineAction | null>(null);
  const [viewingAction, setViewingAction] = React.useState<DisciplineAction | null>(null);

  const [conversationsList, setConversationsList] = React.useState<RecordOfConversation[]>(initialRecordsOfConversation);
  const [isConversationFormOpen, setIsConversationFormOpen] = React.useState(false);
  const [editingConversation, setEditingConversation] = React.useState<RecordOfConversation | null>(null);
  const [conversationToDelete, setConversationToDelete] = React.useState<RecordOfConversation | null>(null);
  const [viewingConversation, setViewingConversation] = React.useState<RecordOfConversation | null>(null);


  // Discipline Action Handlers
  const handleAddAction = (data: DisciplineAction) => {
    const newAction = { ...data, id: crypto.randomUUID() };
    setActionsList((prev) => [newAction, ...prev]);
    setIsActionFormOpen(false);
  };

  const handleUpdateAction = (data: DisciplineAction) => {
    setActionsList((prev) =>
      prev.map((action) => (action.id === data.id ? data : action))
    );
    setIsActionFormOpen(false);
    setEditingAction(null);
  };

  const handleEditAction = (action: DisciplineAction) => {
    setEditingAction(action);
    setViewingAction(null);
    setIsActionFormOpen(true);
  };

  const handleViewActionDetails = (action: DisciplineAction) => {
    setViewingAction(action);
    setEditingAction(null);
    setIsActionFormOpen(false);
  };

  const handleDeleteActionConfirm = () => {
    if (actionToDelete) {
      setActionsList((prev) => prev.filter((action) => action.id !== actionToDelete.id));
      setActionToDelete(null);
    }
  };

  const openActionFormForNew = () => {
    setEditingAction(null);
    setViewingAction(null);
    setIsActionFormOpen(true);
  };
  
  const closeActionForm = () => {
    setEditingAction(null);
    setIsActionFormOpen(false);
  };

  const closeViewActionDialog = () => {
    setViewingAction(null);
  }

  // Record of Conversation Handlers
  const handleAddConversation = (data: RecordOfConversation) => {
    const newConversation = { ...data, id: crypto.randomUUID() };
    setConversationsList((prev) => [newConversation, ...prev]);
    setIsConversationFormOpen(false);
  };

  const handleUpdateConversation = (data: RecordOfConversation) => {
    setConversationsList((prev) =>
      prev.map((roc) => (roc.id === data.id ? data : roc))
    );
    setIsConversationFormOpen(false);
    setEditingConversation(null);
  };

  const handleEditConversation = (roc: RecordOfConversation) => {
    setEditingConversation(roc);
    setViewingConversation(null);
    setIsConversationFormOpen(true);
  };

  const handleViewConversationDetails = (roc: RecordOfConversation) => {
    setViewingConversation(roc);
    setEditingConversation(null);
    setIsConversationFormOpen(false);
  };

  const handleDeleteConversationConfirm = () => {
    if (conversationToDelete) {
      setConversationsList((prev) => prev.filter((roc) => roc.id !== conversationToDelete.id));
      setConversationToDelete(null);
    }
  };

  const openConversationFormForNew = () => {
    setEditingConversation(null);
    setViewingConversation(null);
    setIsConversationFormOpen(true);
  };
  
  const closeConversationForm = () => {
    setEditingConversation(null);
    setIsConversationFormOpen(false);
  };

  const closeViewConversationDialog = () => {
    setViewingConversation(null);
  }


  return (
    <div className="space-y-6">
      <Tabs defaultValue="disciplineActions" className="w-full">
        <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Gavel className="h-8 w-8 text-primary hidden sm:block" />
              <div>
                <CardTitle className="text-2xl">Discipline & Conversations</CardTitle>
                <CardDescription>Manage disciplinary actions and formal records of conversation.</CardDescription>
              </div>
            </div>
            <TabsList>
                <TabsTrigger value="disciplineActions">Discipline Actions</TabsTrigger>
                <TabsTrigger value="recordsOfConversation">Records of Conversation</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="disciplineActions">
            <Card className="shadow-lg">
                <CardHeader>
                <div className="flex justify-between items-start sm:items-center">
                    <div>
                        <CardTitle className="text-xl">Discipline Actions List</CardTitle>
                        <CardDescription>Record conversations, document breaches of conduct, and manage disciplinary processes.</CardDescription>
                    </div>
                    <Button onClick={openActionFormForNew} size="default" className="shrink-0">
                    <PlusCircle className="mr-2 h-5 w-5" /> Record New Action
                    </Button>
                </div>
                </CardHeader>
                <CardContent>
                {actionsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Gavel className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Discipline Actions Recorded</h3>
                        <p className="text-muted-foreground mb-4">Click &quot;Record New Action&quot; to get started.</p>
                    </div>
                ) : (
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Staff Name</TableHead>
                        <TableHead>Date of Incident</TableHead>
                        <TableHead>Type of Action</TableHead>
                        <TableHead className="hidden md:table-cell">Incident Summary</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {actionsList.map((action) => (
                        <TableRow key={action.id}>
                            <TableCell className="font-medium">{action.staffName}</TableCell>
                            <TableCell>{format(action.dateOfIncident, "PP")}</TableCell>
                            <TableCell>
                                <Badge variant={action.typeOfAction.startsWith("Formal") ? "destructive" : "secondary"}>
                                    {action.typeOfAction}
                                </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell truncate max-w-xs">{action.incidentDescription}</TableCell>
                            <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Options</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleViewActionDetails(action)}>
                                    <Info className="mr-2 h-4 w-4" />
                                    View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditAction(action)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setActionToDelete(action)}
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
                {actionsList.length > 0 && (
                <CardFooter className="text-xs text-muted-foreground">
                    Showing {actionsList.length} of {actionsList.length} discipline records.
                </CardFooter>
                )}
            </Card>
        </TabsContent>

        <TabsContent value="recordsOfConversation">
            <Card className="shadow-lg">
                 <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl">Records of Conversation List</CardTitle>
                            <CardDescription>Document formal interviews and conversations.</CardDescription>
                        </div>
                        <Button onClick={openConversationFormForNew} size="default" className="shrink-0">
                            <PlusCircle className="mr-2 h-5 w-5" /> New RoC
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                {conversationsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <MessageSquareText className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Records of Conversation</h3>
                        <p className="text-muted-foreground mb-4">Click &quot;New RoC&quot; to get started.</p>
                    </div>
                ) : (
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="hidden md:table-cell">Interviewing Officer</TableHead>
                        <TableHead className="hidden lg:table-cell">With</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {conversationsList.map((roc) => (
                        <TableRow key={roc.id}>
                            <TableCell className="font-medium truncate max-w-xs">{roc.subject}</TableCell>
                            <TableCell>{format(roc.interviewDate, "PP")}</TableCell>
                            <TableCell className="hidden md:table-cell">{roc.interviewingOfficerName}</TableCell>
                            <TableCell className="hidden lg:table-cell">{roc.conversationWithName}</TableCell>
                            <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Options</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleViewConversationDetails(roc)}>
                                    <Info className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditConversation(roc)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setConversationToDelete(roc)}
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
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
                {conversationsList.length > 0 && (
                <CardFooter className="text-xs text-muted-foreground">
                    Showing {conversationsList.length} of {conversationsList.length} records of conversation.
                </CardFooter>
                )}
            </Card>
        </TabsContent>
      </Tabs>


      {/* Dialogs for Discipline Actions */}
      <Dialog open={isActionFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeActionForm(); else setIsActionFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAction ? "Edit Discipline Action Record" : "Record New Discipline Action"}
            </DialogTitle>
            <DialogDescription>
              {editingAction
                ? "Update the details of the disciplinary action."
                : "Fill in the form to record a new disciplinary action."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-1">
            <div className="py-4 pr-4">
                <DisciplineActionForm
                onSubmit={editingAction ? handleUpdateAction : handleAddAction}
                defaultValues={editingAction || undefined}
                onCancel={closeActionForm}
                isEditing={!!editingAction}
                />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {viewingAction && (
         <Dialog open={!!viewingAction} onOpenChange={closeViewActionDialog}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Discipline Action: {viewingAction.typeOfAction}</DialogTitle>
                    <DialogDescription>
                       Regarding {viewingAction.staffName} on {format(viewingAction.dateOfIncident, "PPP")}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1 pr-4">
                    <div className="space-y-4 py-4">
                        <div>
                            <h3 className="font-semibold text-sm mb-1">Incident Description</h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingAction.incidentDescription}</p>
                        </div>
                         {viewingAction.policyBreached && (
                            <div>
                                <h3 className="font-semibold text-sm mb-1">Policy/Regulation Breached</h3>
                                <p className="text-sm text-muted-foreground">{viewingAction.policyBreached}</p>
                            </div>
                        )}
                        {viewingAction.outcome && (
                            <div>
                                <h3 className="font-semibold text-sm mb-1">Outcome</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingAction.outcome}</p>
                            </div>
                        )}
                         {viewingAction.sanctionsApplied && (
                            <div>
                                <h3 className="font-semibold text-sm mb-1">Sanctions Applied</h3>
                                <p className="text-sm text-muted-foreground">{viewingAction.sanctionsApplied}</p>
                            </div>
                        )}
                        {viewingAction.appealProcessNotes && (
                             <div>
                                <h3 className="font-semibold text-sm mb-1">Appeal Process Notes</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingAction.appealProcessNotes}</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => { 
                      if (viewingAction) {
                        handleEditAction(viewingAction); 
                      }
                    }}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewActionDialog}>Close</Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}

      {actionToDelete && (
        <AlertDialog open={!!actionToDelete} onOpenChange={() => setActionToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the disciplinary record for <strong>{actionToDelete.staffName}</strong> regarding the incident on {format(actionToDelete.dateOfIncident, "PP")}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setActionToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteActionConfirm}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Dialogs for Record of Conversation */}
      <Dialog open={isConversationFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeConversationForm(); else setIsConversationFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-3xl"> {/* Wider for RoC form */}
          <DialogHeader>
            <DialogTitle>
              {editingConversation ? "Edit Record of Conversation" : "New Record of Conversation"}
            </DialogTitle>
            <DialogDescription>
              {editingConversation
                ? "Update the details of the conversation record."
                : "Fill in the form to create a new record of conversation."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-1">
            <div className="py-4 pr-4">
                <RecordOfConversationForm
                onSubmit={editingConversation ? handleUpdateConversation : handleAddConversation}
                defaultValues={editingConversation || undefined}
                onCancel={closeConversationForm}
                isEditing={!!editingConversation}
                />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {viewingConversation && (
         <Dialog open={!!viewingConversation} onOpenChange={closeViewConversationDialog}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Record of Conversation: {viewingConversation.subject}</DialogTitle>
                    <DialogDescription>
                       Interview on {format(viewingConversation.interviewDate, "PPP")} at {viewingConversation.interviewTime} by {viewingConversation.interviewingOfficerName} ({viewingConversation.interviewingOfficerPosition})
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1 pr-4">
                    <div className="space-y-4 py-4">
                        {viewingConversation.referenceNumber && <p className="text-sm"><strong>Reference:</strong> {viewingConversation.referenceNumber}</p>}
                        <p className="text-sm"><strong>Type:</strong> {viewingConversation.interviewType}</p>
                        <p className="text-sm"><strong>With:</strong> {viewingConversation.conversationWithName}</p>
                        {viewingConversation.conversationWithDeptUnitFirm && <p className="text-sm"><strong>Department/Unit:</strong> {viewingConversation.conversationWithDeptUnitFirm}</p>}
                        {viewingConversation.conversationWithSquadron && <p className="text-sm"><strong>Squadron:</strong> {viewingConversation.conversationWithSquadron}</p>}
                        {viewingConversation.conversationWithTelephone && <p className="text-sm"><strong>Telephone:</strong> {viewingConversation.conversationWithTelephone}</p>}
                        {viewingConversation.personsPresent && <div><h3 className="font-semibold text-sm mb-1">Persons Present</h3><p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingConversation.personsPresent}</p></div>}
                        
                        <div><h3 className="font-semibold text-sm mb-1">Background</h3><p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingConversation.background}</p></div>
                        <div><h3 className="font-semibold text-sm mb-1">Conversation Details</h3><p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingConversation.conversation}</p></div>
                        {viewingConversation.actionsTaken && <div><h3 className="font-semibold text-sm mb-1">Actions Taken</h3><p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingConversation.actionsTaken}</p></div>}
                        {viewingConversation.questionsAsked && <div><h3 className="font-semibold text-sm mb-1">Questions Asked</h3><p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingConversation.questionsAsked}</p></div>}
                        {viewingConversation.followUp && <div><h3 className="font-semibold text-sm mb-1">Follow Up</h3><p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingConversation.followUp}</p></div>}
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => { 
                      if (viewingConversation) {
                        handleEditConversation(viewingConversation); 
                      }
                    }}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewConversationDialog}>Close</Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}

      {conversationToDelete && (
        <AlertDialog open={!!conversationToDelete} onOpenChange={() => setConversationToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the record of conversation: <strong>{conversationToDelete.subject}</strong> held on {format(conversationToDelete.interviewDate, "PP")}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConversationToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConversationConfirm}
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
                    <CardDescription>Future enhancements for Discipline & Conversation Management.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center">
              <FileSignature className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Securely record details of informal discussions, formal disciplinary actions and formal records of conversation. (Implemented)
            </li>
            <li className="flex items-center">
              <UserX className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Categorize incidents and breaches according to squadron/AAFC policy. (Partially implemented by policy field for actions)
            </li>
            <li className="flex items-center">
               <UploadCloud className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Attach supporting documents, witness statements, and other evidence to actions and conversations.
            </li>
            <li className="flex items-center">
              <ShieldAlert className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Track outcomes, sanctions, and appeal processes for disciplinary actions. (Implemented)
            </li>
            <li className="flex items-center">
              <Archive className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Maintain a confidential and auditable record of all disciplinary and conversation matters.
            </li>
             <li className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary/70 flex-shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              Integration with Staff Management for selecting staff.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}


