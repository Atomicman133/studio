"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Gavel, FileSignature, UserX, Archive, ShieldAlert, Edit3, Info, UploadCloud, ListChecks, MessageSquareText, Loader2, AlertTriangle, Download } from "lucide-react";
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';

const ACTIONS_QUERY_KEY = 'disciplineActions';
const CONVERSATIONS_QUERY_KEY = 'recordsOfConversation';

// --- Helper to convert Firestore Timestamps to JS Dates ---
const convertActionTimestamps = (data: any): DisciplineAction => ({
  ...data,
  dateOfIncident: data.dateOfIncident instanceof Timestamp ? data.dateOfIncident.toDate() : data.dateOfIncident,
});

const convertConversationTimestamps = (data: any): RecordOfConversation => ({
  ...data,
  interviewDate: data.interviewDate instanceof Timestamp ? data.interviewDate.toDate() : data.interviewDate,
});


// --- Discipline Action Firestore Functions ---
async function fetchDisciplineActions(): Promise<DisciplineAction[]> {
  const collectionRef = collection(db, 'disciplineActions');
  const q = query(collectionRef, orderBy('dateOfIncident', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...convertActionTimestamps(doc.data()) })) as DisciplineAction[];
}

async function addDisciplineAction(newData: Omit<DisciplineAction, 'id'>): Promise<string> {
  const collectionRef = collection(db, 'disciplineActions');
  const dataToSave = { ...newData, dateOfIncident: Timestamp.fromDate(newData.dateOfIncident) };
  const docRef = await addDoc(collectionRef, dataToSave);
  return docRef.id;
}

async function updateDisciplineAction(updatedData: DisciplineAction): Promise<void> {
  if (!updatedData.id) throw new Error("ID is required for update.");
  const docRef = doc(db, 'disciplineActions', updatedData.id);
  const { id, ...dataToUpdate } = updatedData;
  await updateDoc(docRef, { ...dataToUpdate, dateOfIncident: Timestamp.fromDate(dataToUpdate.dateOfIncident) });
}

async function deleteDisciplineAction(id: string): Promise<void> {
  if (!id) throw new Error("ID is required for deletion.");
  await deleteDoc(doc(db, 'disciplineActions', id));
}

// --- Record of Conversation Firestore Functions ---
async function fetchRecordsOfConversation(): Promise<RecordOfConversation[]> {
  const collectionRef = collection(db, 'recordsOfConversation');
  const q = query(collectionRef, orderBy('interviewDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...convertConversationTimestamps(doc.data()) })) as RecordOfConversation[];
}

async function addRecordOfConversation(newData: Omit<RecordOfConversation, 'id'>): Promise<string> {
  const collectionRef = collection(db, 'recordsOfConversation');
  const dataToSave = { ...newData, interviewDate: Timestamp.fromDate(newData.interviewDate) };
  const docRef = await addDoc(collectionRef, dataToSave);
  return docRef.id;
}

async function updateRecordOfConversation(updatedData: RecordOfConversation): Promise<void> {
  if (!updatedData.id) throw new Error("ID is required for update.");
  const docRef = doc(db, 'recordsOfConversation', updatedData.id);
  const { id, ...dataToUpdate } = updatedData;
  await updateDoc(docRef, { ...dataToUpdate, interviewDate: Timestamp.fromDate(dataToUpdate.interviewDate) });
}

async function deleteRecordOfConversation(id: string): Promise<void> {
  if (!id) throw new Error("ID is required for deletion.");
  await deleteDoc(doc(db, 'recordsOfConversation', id));
}


export default function DisciplinePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // --- React Query for Discipline Actions ---
  const { data: actionsList = [], isLoading: isLoadingActions, error: errorActions } = useQuery<DisciplineAction[], Error>({
    queryKey: [ACTIONS_QUERY_KEY],
    queryFn: fetchDisciplineActions,
  });
  const addActionMutation = useAddMutation(addDisciplineAction, [ACTIONS_QUERY_KEY], "Discipline action recorded.");
  const updateActionMutation = useUpdateMutation(updateDisciplineAction, [ACTIONS_QUERY_KEY], "Discipline action updated.");
  const deleteActionMutation = useDeleteMutation(deleteDisciplineAction, [ACTIONS_QUERY_KEY], "Discipline action deleted.");

  // --- React Query for Records of Conversation ---
  const { data: conversationsList = [], isLoading: isLoadingConversations, error: errorConversations } = useQuery<RecordOfConversation[], Error>({
    queryKey: [CONVERSATIONS_QUERY_KEY],
    queryFn: fetchRecordsOfConversation,
  });
  const addConversationMutation = useAddMutation(addRecordOfConversation, [CONVERSATIONS_QUERY_KEY], "Record of conversation created.");
  const updateConversationMutation = useUpdateMutation(updateRecordOfConversation, [CONVERSATIONS_QUERY_KEY], "Record of conversation updated.");
  const deleteConversationMutation = useDeleteMutation(deleteRecordOfConversation, [CONVERSATIONS_QUERY_KEY], "Record of conversation deleted.");

  // --- Generic Mutation Hooks (to reduce boilerplate) ---
  function useAddMutation<TData extends { id?: string }, TVariables extends Omit<TData, 'id'>>(
    mutationFn: (data: TVariables) => Promise<string>,
    queryKey: string[],
    successMessage: string
  ) {
    return useMutation<string, Error, TVariables>({
      mutationFn,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
        toast({ title: "Success", description: successMessage });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: err.message });
      },
    });
  }

  function useUpdateMutation<TData extends { id?: string }>(
    mutationFn: (data: TData) => Promise<void>,
    queryKey: string[],
    successMessage: string
  ) {
    return useMutation<void, Error, TData>({
      mutationFn,
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.setQueryData<TData[]>(queryKey, (oldData) =>
          oldData?.map((item) => (item.id === variables.id ? variables : item))
        );
        toast({ title: "Success", description: successMessage });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: err.message });
      },
    });
  }

 function useDeleteMutation(
    mutationFn: (id: string) => Promise<void>,
    queryKey: string[],
    successMessage: string
  ) {
    return useMutation<void, Error, string>({
      mutationFn,
      onSuccess: (_, id) => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.setQueryData<Array<{id?: string}>>(queryKey, (oldData) =>
          oldData?.filter((item) => item.id !== id)
        );
        toast({ title: "Success", description: successMessage });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: err.message });
      },
    });
  }


  const [isActionFormOpen, setIsActionFormOpen] = React.useState(false);
  const [editingAction, setEditingAction] = React.useState<DisciplineAction | null>(null);
  const [actionToDelete, setActionToDelete] = React.useState<DisciplineAction | null>(null);
  const [viewingAction, setViewingAction] = React.useState<DisciplineAction | null>(null);

  const [isConversationFormOpen, setIsConversationFormOpen] = React.useState(false);
  const [editingConversation, setEditingConversation] = React.useState<RecordOfConversation | null>(null);
  const [conversationToDelete, setConversationToDelete] = React.useState<RecordOfConversation | null>(null);
  const [viewingConversation, setViewingConversation] = React.useState<RecordOfConversation | null>(null);


  // Discipline Action Handlers
  const handleAddAction = (data: DisciplineAction) => {
    const { id, ...newData } = data;
    addActionMutation.mutate(newData);
    setIsActionFormOpen(false);
  };

  const handleUpdateAction = (data: DisciplineAction) => {
    if (editingAction && editingAction.id) {
      updateActionMutation.mutate({ ...data, id: editingAction.id });
    }
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
    if (actionToDelete && actionToDelete.id) {
      deleteActionMutation.mutate(actionToDelete.id);
    }
    setActionToDelete(null);
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
    const {id, ...newData} = data;
    addConversationMutation.mutate(newData);
    setIsConversationFormOpen(false);
  };

  const handleUpdateConversation = (data: RecordOfConversation) => {
    if (editingConversation && editingConversation.id) {
      updateConversationMutation.mutate({ ...data, id: editingConversation.id });
    }
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
    if (conversationToDelete && conversationToDelete.id) {
      deleteConversationMutation.mutate(conversationToDelete.id);
    }
    setConversationToDelete(null);
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

  const handleExportDisciplineActionAsPdf = (action: DisciplineAction) => {
    const doc = new jsPDF();
    const incidentDateFormatted = format(action.dateOfIncident, "yyyy-MM-dd");
    const filename = `discipline_action_${action.staffName.replace(/\s+/g, '_')}_${incidentDateFormatted}.pdf`;

    let yPos = 15;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const indent = 5;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxLineWidth = pageWidth - (margin * 2);
    
    const addTextSection = (title: string, text?: string | null, isBold = false, customIndent = indent, titleFontSize = 12, textFontSize = 10) => {
      if (!text || text.trim() === "") return;
      if (yPos > doc.internal.pageSize.getHeight() - margin - sectionSpacing - 20) { 
        doc.addPage();
        yPos = margin;
      }
      doc.setFontSize(titleFontSize);
      doc.setFont(undefined, 'bold');
      doc.text(title, margin, yPos);
      yPos += lineSpacing;

      doc.setFontSize(textFontSize);
      doc.setFont(undefined, isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxLineWidth - customIndent);
      doc.text(lines, margin + customIndent, yPos);
      yPos += lines.length * (lineSpacing * 0.8) + (lineSpacing * 0.3); 
    };

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`Discipline Action Report`, margin, yPos);
    yPos += sectionSpacing * 1.2;

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    addTextSection("Staff Member:", action.staffName, false, 0);
    addTextSection("Date of Incident:", format(action.dateOfIncident, "PPP"), false, 0);
    addTextSection("Type of Action:", action.typeOfAction, false, 0);
    yPos += sectionSpacing * 0.5;

    addTextSection("Description of Incident/Breach:", action.incidentDescription, false, 0, 14);
    if (action.policyBreached) addTextSection("Policy/Regulation Breached:", action.policyBreached, false, 0);
    if (action.outcome) addTextSection("Outcome of Action:", action.outcome, false, 0);
    if (action.sanctionsApplied) addTextSection("Sanctions Applied:", action.sanctionsApplied, false, 0);
    if (action.appealProcessNotes) addTextSection("Appeal Process Notes:", action.appealProcessNotes, false, 0);

    doc.save(filename);
  };

  const handleExportRecordOfConversationAsPdf = (roc: RecordOfConversation) => {
    const doc = new jsPDF();
    const interviewDateFormatted = format(roc.interviewDate, "yyyy-MM-dd");
    const filename = `record_of_conversation_${roc.subject.replace(/\s+/g, '_')}_${interviewDateFormatted}.pdf`;

    let yPos = 15;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const indent = 5;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxLineWidth = pageWidth - (margin * 2);

    const addTextSection = (title: string, text?: string | null, isBold = false, customIndent = indent, titleFontSize = 12, textFontSize = 10) => {
      if (!text || text.trim() === "") return;
       if (yPos > doc.internal.pageSize.getHeight() - margin - sectionSpacing - 20) { 
        doc.addPage();
        yPos = margin;
      }
      doc.setFontSize(titleFontSize);
      doc.setFont(undefined, 'bold');
      doc.text(title, margin, yPos);
      yPos += lineSpacing;

      doc.setFontSize(textFontSize);
      doc.setFont(undefined, isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxLineWidth - customIndent);
      doc.text(lines, margin + customIndent, yPos);
      yPos += lines.length * (lineSpacing * 0.8) + (lineSpacing * 0.3);
    };

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`Record of Conversation`, margin, yPos);
    yPos += sectionSpacing;
    
    if(roc.referenceNumber) addTextSection("Reference/CEA Incident Number:", roc.referenceNumber, false, 0);
    addTextSection("Subject:", roc.subject, false, 0);
    yPos += sectionSpacing * 0.5;
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text("Interview Details", margin, yPos);
    yPos += lineSpacing * 1.5;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    addTextSection("Interviewing Officer:", roc.interviewingOfficerName, false, indent);
    addTextSection("Position:", roc.interviewingOfficerPosition, false, indent);
    addTextSection("Date of Interview:", format(roc.interviewDate, "PPP"), false, indent);
    addTextSection("Time:", roc.interviewTime, false, indent);
    addTextSection("Interview Type:", roc.interviewType, false, indent);
    if(roc.personsPresent) addTextSection("Persons Present:", roc.personsPresent, false, indent);
    yPos += sectionSpacing * 0.5;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text("Conversation With", margin, yPos);
    yPos += lineSpacing * 1.5;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    addTextSection("Name (inc. title/rank):", roc.conversationWithName, false, indent);
    if(roc.conversationWithDeptUnitFirm) addTextSection("Department/Unit/Firm (inc. address):", roc.conversationWithDeptUnitFirm, false, indent);
    if(roc.conversationWithSquadron) addTextSection("Squadron:", roc.conversationWithSquadron, false, indent);
    if(roc.conversationWithTelephone) addTextSection("Telephone:", roc.conversationWithTelephone, false, indent);
    yPos += sectionSpacing * 0.5;
    
    addTextSection("Background:", roc.background, false, 0, 14);
    addTextSection("Conversation:", roc.conversation, false, 0, 14);
    if (roc.actionsTaken) addTextSection("Actions:", roc.actionsTaken, false, 0, 14);
    if (roc.questionsAsked) addTextSection("Questions:", roc.questionsAsked, false, 0, 14);
    if (roc.followUp) addTextSection("Follow Up:", roc.followUp, false, 0, 14);

    doc.save(filename);
  };


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
                        <CardDescription>Record breaches of conduct and manage disciplinary processes.</CardDescription>
                    </div>
                    <Button onClick={openActionFormForNew} size="default" className="shrink-0" disabled={addActionMutation.isPending}>
                    {addActionMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />} Record New Action
                    </Button>
                </div>
                </CardHeader>
                <CardContent>
                {isLoadingActions && <div className="flex justify-center py-12"><Loader2 className="h-10 w-10 text-primary animate-spin" /></div>}
                {errorActions && <div className="text-destructive text-center py-12">Error loading actions: {errorActions.message}</div>}
                {!isLoadingActions && !errorActions && actionsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Gavel className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Discipline Actions Recorded</h3>
                        <p className="text-muted-foreground mb-4">Click &quot;Record New Action&quot; to get started.</p>
                    </div>
                ) : !isLoadingActions && !errorActions && (
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
                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={updateActionMutation.isPending || deleteActionMutation.isPending}>
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Options</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleViewActionDetails(action)} disabled={updateActionMutation.isPending || deleteActionMutation.isPending}>
                                    <Info className="mr-2 h-4 w-4" />
                                    View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditAction(action)} disabled={updateActionMutation.isPending || deleteActionMutation.isPending}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExportDisciplineActionAsPdf(action)} disabled={updateActionMutation.isPending || deleteActionMutation.isPending}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export as PDF
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setActionToDelete(action)}
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    disabled={updateActionMutation.isPending || deleteActionMutation.isPending}
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
                {!isLoadingActions && !errorActions && actionsList.length > 0 && (
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
                        <Button onClick={openConversationFormForNew} size="default" className="shrink-0" disabled={addConversationMutation.isPending}>
                            {addConversationMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />} New RoC
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                {isLoadingConversations && <div className="flex justify-center py-12"><Loader2 className="h-10 w-10 text-primary animate-spin" /></div>}
                {errorConversations && <div className="text-destructive text-center py-12">Error loading records: {errorConversations.message}</div>}
                {!isLoadingConversations && !errorConversations && conversationsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <MessageSquareText className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Records of Conversation</h3>
                        <p className="text-muted-foreground mb-4">Click &quot;New RoC&quot; to get started.</p>
                    </div>
                ) : !isLoadingConversations && !errorConversations && (
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
                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={updateConversationMutation.isPending || deleteConversationMutation.isPending}>
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Options</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleViewConversationDetails(roc)} disabled={updateConversationMutation.isPending || deleteConversationMutation.isPending}>
                                    <Info className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditConversation(roc)} disabled={updateConversationMutation.isPending || deleteConversationMutation.isPending}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExportRecordOfConversationAsPdf(roc)} disabled={updateConversationMutation.isPending || deleteConversationMutation.isPending}>
                                    <Download className="mr-2 h-4 w-4" /> Export as PDF
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setConversationToDelete(roc)}
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    disabled={updateConversationMutation.isPending || deleteConversationMutation.isPending}
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
                {!isLoadingConversations && !errorConversations && conversationsList.length > 0 && (
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
                  isSubmitting={editingAction ? updateActionMutation.isPending : addActionMutation.isPending}
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
                    }}
                    disabled={updateActionMutation.isPending}
                    >
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewActionDialog} disabled={updateActionMutation.isPending}>Close</Button>
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
              <AlertDialogCancel onClick={() => setActionToDelete(null)} disabled={deleteActionMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteActionConfirm}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={deleteActionMutation.isPending}
              >
                {deleteActionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
        <DialogContent className="sm:max-w-3xl">
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
                  isSubmitting={editingConversation ? updateConversationMutation.isPending : addConversationMutation.isPending}
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
                    }}
                    disabled={updateConversationMutation.isPending}
                    >
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewConversationDialog} disabled={updateConversationMutation.isPending}>Close</Button>
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
              <AlertDialogCancel onClick={() => setConversationToDelete(null)} disabled={deleteConversationMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConversationConfirm}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={deleteConversationMutation.isPending}
              >
                {deleteConversationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
