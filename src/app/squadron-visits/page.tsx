
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ClipboardList, Edit3, Info, ListChecks, Loader2, AlertTriangle, Download } from "lucide-react";
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
import type { SquadronVisit, VisitActionItem } from "./squadron-visit-schema";
import { SquadronVisitForm } from "./components/squadron-visit-form";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';


const VISITS_QUERY_KEY = 'squadronVisits';

// Helper to convert Firestore Timestamps to JS Dates
const convertVisitTimestamps = (data: any): SquadronVisit => {
  return {
    ...data,
    visitDate: data.visitDate instanceof Timestamp ? data.visitDate.toDate() : data.visitDate,
    actionItems: data.actionItems?.map((item: any) => ({
      ...item,
      id: item.id || crypto.randomUUID(), // Ensure action item ID exists locally
      dueDate: item.dueDate instanceof Timestamp ? item.dueDate.toDate() : item.dueDate,
    })) || [],
  };
};

// --- Fetch Visits ---
async function fetchVisits(): Promise<SquadronVisit[]> {
  const collectionRef = collection(db, 'squadronVisits');
  const q = query(collectionRef, orderBy('visitDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertVisitTimestamps(doc.data()),
  })) as SquadronVisit[];
}

// --- Add Visit ---
async function addVisit(newVisitData: Omit<SquadronVisit, 'id'>): Promise<string> {
  const collectionRef = collection(db, 'squadronVisits');
  const dataToSave = {
    ...newVisitData,
    visitDate: Timestamp.fromDate(newVisitData.visitDate),
    actionItems: newVisitData.actionItems?.map(item => ({
      ...item,
      id: item.id || crypto.randomUUID(),
      dueDate: item.dueDate ? Timestamp.fromDate(item.dueDate) : null,
    })) || [],
  };
  const docRef = await addDoc(collectionRef, dataToSave);
  return docRef.id;
}

// --- Update Visit ---
async function updateVisit(updatedVisit: SquadronVisit): Promise<void> {
  if (!updatedVisit.id) throw new Error("Visit ID is required for update.");
  const docRef = doc(db, 'squadronVisits', updatedVisit.id);
  const { id, ...dataToUpdate } = updatedVisit;
  const dataToSave = {
    ...dataToUpdate,
    visitDate: Timestamp.fromDate(dataToUpdate.visitDate),
    actionItems: dataToUpdate.actionItems?.map(item => ({
      ...item,
      id: item.id || crypto.randomUUID(),
      dueDate: item.dueDate ? Timestamp.fromDate(item.dueDate) : null,
    })) || [],
  };
  await updateDoc(docRef, dataToSave);
}

// --- Delete Visit ---
async function deleteVisit(visitId: string): Promise<void> {
  if (!visitId) throw new Error("Visit ID is required for deletion.");
  await deleteDoc(doc(db, 'squadronVisits', visitId));
}


const ViewCheckboxItem = ({ checked, label }: { checked?: boolean, label: string }) => (
  <div className="flex items-center space-x-2 my-1">
    <Checkbox id={`view-${label.replace(/\s+/g, '-')}`} checked={checked} disabled className="cursor-default" />
    <label htmlFor={`view-${label.replace(/\s+/g, '-')}`} className="text-sm font-normal text-muted-foreground cursor-default">
      {label}
    </label>
  </div>
);

const discussionSectionsConfig = [
    {
      value: "staffing", title: "Staffing",
      items: [
        { name: "staffingListReviewed", label: "Current staff list reviewed and up to date" },
        { name: "staffingVacanciesDiscussed", label: "Vacant positions identified and discussed" },
        { name: "staffingInductionVerified", label: "Staff induction and onboarding process verified" },
        { name: "staffingPerformanceIssuesAddressed", label: "Recent or pending staff performance issues addressed" },
        { name: "staffingWellbeingCheckConducted", label: "Staff wellbeing check conducted" },
      ] as const,
      notesField: "staffingSectionNotes" as keyof SquadronVisit,
      textField: { name: "staffingSuccessionPlanningNotes" as keyof SquadronVisit, label: "Succession Planning Notes" },
    },
    {
      value: "training", title: "Training / Personal Development",
      items: [
        { name: "trainingScheduleCurrent", label: "Cadet training schedule is current and implemented" },
        { name: "trainingStaffCurrencyMaintained", label: "Staff currency and competency maintained" },
        { name: "trainingCadetPdpReviewed", label: "Cadet personal development plans reviewed" },
        { name: "trainingCourseParticipationConfirmed", label: "Staff and cadet participation in courses confirmed" },
        { name: "trainingRecordsUpToDate", label: "Records of training and attendance up to date" },
      ] as const,
      notesField: "trainingSectionNotes" as keyof SquadronVisit,
    },
     {
      value: "discipline", title: "Disciplinary Issues",
      items: [
        { name: "disciplineMattersDiscussed", label: "Any ongoing or recent disciplinary matters discussed" },
        { name: "disciplineProceduresFollowed", label: "Discipline procedures are being followed in accordance with policy" },
        { name: "disciplineSupportProvided", label: "Support provided for managing behaviour or welfare concerns" },
        { name: "disciplineRecordKeepingObserved", label: "Recordkeeping and confidentiality observed" },
      ] as const,
      notesField: "disciplineSectionNotes" as keyof SquadronVisit,
    },
    {
      value: "activities", title: "Upcoming Activities",
      items: [
        { name: "activitiesCalendarReviewed", label: "Squadron activity calendar reviewed" },
        { name: "activitiesExternalApprovalsFlagged", label: "External activities requiring approvals/discussion flagged" },
        { name: "activitiesPlannedEventsNoted", label: "Planned courses, bivouacs, community events noted" },
        { name: "activitiesContingencyPlanningChecked", label: "Contingency planning checked" },
        { name: "activitiesEngagementEvaluated", label: "Cadet and staff engagement with activities evaluated" },
      ] as const,
      notesField: "activitiesSectionNotes" as keyof SquadronVisit,
    },
    {
      value: "issues", title: "Known Issues",
      items: [
        { name: "issuesEquipmentShortages", label: "Equipment or uniform shortages reported" },
        { name: "issuesFacilityConcerns", label: "Facility/venue concerns raised" },
        { name: "issuesItAdminSupplyProblems", label: "IT, admin, or supply problems flagged" },
        { name: "issuesUnresolvedSupportRequests", label: "Any unresolved regional support requests discussed" },
        { name: "issuesEscalationRequestsNoted", label: "Requests for escalation noted" },
      ] as const,
      notesField: "issuesSectionNotes" as keyof SquadronVisit,
    },
    {
      value: "safety", title: "Safety",
      items: [
        { name: "safetyRiskRegisterReviewed", label: "WHS Risk Register reviewed" },
        { name: "safetyIssuesAddressed", label: "Safety issues raised by staff or cadets addressed" },
        { name: "safetyIncidentReportsChecked", label: "Incident reports (recent) checked and follow-up confirmed" },
        { name: "safetyFirstAidPpeEmergencyProcedures", label: "First aid kits, PPE, and emergency procedures in place" },
        { name: "safetyVehicleEquipmentCompliance", label: "Vehicle and equipment safety compliance confirmed" },
      ] as const,
      notesField: "safetySectionNotes" as keyof SquadronVisit,
    },
];


export default function SquadronVisitsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: visitList = [], isLoading, error } = useQuery<SquadronVisit[], Error>({
    queryKey: [VISITS_QUERY_KEY],
    queryFn: fetchVisits,
  });

  const addVisitMutation = useMutation<string, Error, Omit<SquadronVisit, 'id'>>({
    mutationFn: addVisit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [VISITS_QUERY_KEY] });
      setIsFormOpen(false);
      toast({ title: "Success", description: "Squadron visit recorded." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: `Failed to record visit: ${err.message}` });
    }
  });

  const updateVisitMutation = useMutation<void, Error, SquadronVisit>({
    mutationFn: updateVisit,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [VISITS_QUERY_KEY] });
      queryClient.setQueryData<SquadronVisit[]>([VISITS_QUERY_KEY], (oldData) =>
        oldData?.map((v) => (v.id === variables.id ? variables : v))
      );
      setIsFormOpen(false);
      setEditingVisit(null);
      toast({ title: "Success", description: "Squadron visit updated." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: `Failed to update visit: ${err.message}` });
    }
  });

  const deleteVisitMutation = useMutation<void, Error, string>({
    mutationFn: deleteVisit,
    onSuccess: (_, visitId) => {
      queryClient.invalidateQueries({ queryKey: [VISITS_QUERY_KEY] });
      queryClient.setQueryData<SquadronVisit[]>([VISITS_QUERY_KEY], (oldData) =>
        oldData?.filter((v) => v.id !== visitId)
      );
      setVisitToDelete(null);
      toast({ title: "Success", description: "Squadron visit deleted." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: `Failed to delete visit: ${err.message}` });
      setVisitToDelete(null);
    }
  });


  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingVisit, setEditingVisit] = React.useState<SquadronVisit | null>(null);
  const [visitToDelete, setVisitToDelete] = React.useState<SquadronVisit | null>(null);
  const [viewingVisit, setViewingVisit] = React.useState<SquadronVisit | null>(null);

  const handleAddVisit = (data: SquadronVisit) => {
    const { id, ...newVisitData } = data;
    addVisitMutation.mutate(newVisitData);
  };

  const handleUpdateVisit = (data: SquadronVisit) => {
    if (editingVisit && editingVisit.id) {
      updateVisitMutation.mutate({ ...data, id: editingVisit.id });
    }
  };

  const handleEdit = (visit: SquadronVisit) => {
    setEditingVisit(visit);
    setViewingVisit(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (visit: SquadronVisit) => {
    setViewingVisit(visit);
    setEditingVisit(null);
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (visitToDelete && visitToDelete.id) {
      deleteVisitMutation.mutate(visitToDelete.id);
    }
  };

  const openFormForNew = () => {
    setEditingVisit(null);
    setViewingVisit(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingVisit(null);
    setIsFormOpen(false);
  };

  const closeViewDialog = () => {
    setViewingVisit(null);
  }

  const getOverallVisitStatus = (actionItems?: VisitActionItem[]): string => {
    if (!actionItems || actionItems.length === 0) return "No Actions";
    const hasOpen = actionItems.some(f => f.status === "Open" || f.status === "In Progress");
    if (hasOpen) return "Actions Pending";
    return "All Actions Addressed";
  }

  const handleExportVisitAsPdf = (visit: SquadronVisit) => {
    const doc = new jsPDF();
    const visitDateFormatted = format(visit.visitDate, "yyyy-MM-dd");
    const filename = `squadron_visit_${visit.squadronName.replace(/\s+/g, '_')}_${visitDateFormatted}.pdf`;

    let yPos = 15;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const indent = 5;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxLineWidth = pageWidth - (margin * 2);

    const checkPageBreak = (neededHeight: number) => {
        if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            yPos = margin;
        }
    };
    
    const addSectionTitle = (title: string) => {
        checkPageBreak(lineSpacing * 2);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(title, margin, yPos);
        yPos += lineSpacing * 1.5;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
    };

    const addText = (text: string, isBold = false, customIndent = indent) => {
      if (!text || text.trim() === "") return;
      checkPageBreak(lineSpacing);
      doc.setFont(undefined, isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxLineWidth - customIndent);
      doc.text(lines, margin + customIndent, yPos);
      yPos += lines.length * (lineSpacing * 0.8) + (lineSpacing * 0.3);
    };
    
    const addCheckboxItem = (label: string, checked?: boolean) => {
        addText(`${label}: ${checked ? 'Yes' : 'No'}`, false, indent + 5);
    };

    // --- PDF Header ---
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`Squadron Visit Report: ${visit.squadronName}`, margin, yPos);
    yPos += sectionSpacing;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    addText(`Visited on: ${format(visit.visitDate, "PPP")}`);
    addText(`RXO: ${visit.rxoName}`);
    addText(`Squadron CO: ${visit.coName}`);
    yPos += sectionSpacing * 0.5;

    // --- Discussion Sections ---
    discussionSectionsConfig.forEach(section => {
      addSectionTitle(section.title);
      section.items.forEach(item => {
        addCheckboxItem(item.label, visit[item.name as keyof SquadronVisit] as boolean | undefined);
      });
      if (section.textField && visit[section.textField.name as keyof SquadronVisit]) {
        addText(`${section.textField.label}:`, true);
        addText(visit[section.textField.name as keyof SquadronVisit] as string);
      }
      if (visit[section.notesField as keyof SquadronVisit]) {
        addText("Additional Notes:", true);
        addText(visit[section.notesField as keyof SquadronVisit] as string);
      }
      yPos += sectionSpacing * 0.5;
    });

    // --- General Comments ---
    if (visit.generalComments) {
      addSectionTitle("General Comments / Overall Notes");
      addText(visit.generalComments);
      yPos += sectionSpacing * 0.5;
    }

    // --- Action Items ---
    if (visit.actionItems && visit.actionItems.length > 0) {
      addSectionTitle("Action Items / Follow-Up");
      visit.actionItems.forEach((item, index) => {
        checkPageBreak(lineSpacing * 5); // Estimate space for an action item
        addText(`Action Item ${index + 1}: ${item.description}`, true, 0); // No indent for item title
        addText(`Responsible: ${item.responsible}`);
        addText(`Due Date: ${item.dueDate ? format(item.dueDate, "PPP") : "N/A"}`);
        addText(`Status: ${item.status}`);
        yPos += lineSpacing * 0.5; // Extra space between items
      });
    } else {
       addSectionTitle("Action Items / Follow-Up");
       addText("No action items recorded for this visit.");
    }

    doc.save(filename);
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-primary hidden sm:block" />
              <div>
                <CardTitle className="text-2xl">Squadron Visits</CardTitle>
                <CardDescription>Record and track squadron visit reports and action items.</CardDescription>
              </div>
            </div>
            <Button onClick={openFormForNew} size="lg" className="w-full sm:w-auto" disabled={addVisitMutation.isPending}>
              {addVisitMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
              New Visit Record
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading visit records...</p>
            </div>
          )}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
              <h3 className="text-xl font-semibold text-destructive mb-2">Error Loading Visits</h3>
              <p className="text-destructive mb-4">{error.message}</p>
            </div>
          )}
          {!isLoading && !error && visitList.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Visits Recorded Yet</h3>
                <p className="text-muted-foreground mb-4">Click &quot;New Visit Record&quot; to get started.</p>
             </div>
          ) : !isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Squadron</TableHead>
                  <TableHead>Visit Date</TableHead>
                  <TableHead className="hidden md:table-cell">RXO</TableHead>
                  <TableHead className="hidden lg:table-cell">Action Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitList.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="font-medium">{visit.squadronName}</TableCell>
                    <TableCell>{format(visit.visitDate, "PP")}</TableCell>
                    <TableCell className="hidden md:table-cell">{visit.rxoName}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                       <Badge variant={
                          getOverallVisitStatus(visit.actionItems) === "Actions Pending" ? "secondary" :
                          getOverallVisitStatus(visit.actionItems) === "All Actions Addressed" ? "default" : "outline"
                       }>
                        {getOverallVisitStatus(visit.actionItems)}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={updateVisitMutation.isPending || deleteVisitMutation.isPending}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Options</DropdownMenuLabel>
                           <DropdownMenuItem onClick={() => handleViewDetails(visit)} disabled={updateVisitMutation.isPending || deleteVisitMutation.isPending}>
                            <Info className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(visit)} disabled={updateVisitMutation.isPending || deleteVisitMutation.isPending}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportVisitAsPdf(visit)} disabled={updateVisitMutation.isPending || deleteVisitMutation.isPending}>
                            <Download className="mr-2 h-4 w-4" />
                            Export as PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setVisitToDelete(visit)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            disabled={updateVisitMutation.isPending || deleteVisitMutation.isPending}
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
         {!isLoading && !error && visitList.length > 0 && (
          <CardFooter className="text-xs text-muted-foreground">
            Showing {visitList.length} of {visitList.length} squadron visit records.
          </CardFooter>
        )}
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeForm(); else setIsFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingVisit ? "Edit Squadron Visit Record" : "New Squadron Visit Record"}
            </DialogTitle>
            <DialogDescription>
              {editingVisit
                ? "Update the details of the squadron visit."
                : "Fill in the form to record a new squadron visit."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh] p-1">
            <div className="py-4 pr-4">
                <SquadronVisitForm
                  onSubmit={editingVisit ? handleUpdateVisit : handleAddVisit}
                  defaultValues={editingVisit || undefined}
                  onCancel={closeForm}
                  isEditing={!!editingVisit}
                  isSubmitting={editingVisit ? updateVisitMutation.isPending : addVisitMutation.isPending}
                />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {viewingVisit && (
         <Dialog open={!!viewingVisit} onOpenChange={closeViewDialog}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Visit Report: {viewingVisit.squadronName}</DialogTitle>
                    <DialogDescription>
                       Visited on {format(viewingVisit.visitDate, "PPP")} by {viewingVisit.rxoName} (CO: {viewingVisit.coName}).
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1 pr-4">
                    <div className="space-y-6 py-4">
                       <Accordion type="multiple" className="w-full space-y-2" defaultValue={discussionSectionsConfig.map(s => s.value)}>
                          {discussionSectionsConfig.map(section => (
                            <AccordionItem value={section.value} key={`view-${section.value}`} className="border rounded-md shadow-sm bg-card">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline text-md font-medium">
                                {section.title}
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4 pt-0 space-y-2">
                                {section.items.map(item => (
                                  <ViewCheckboxItem key={`view-${item.name}`} checked={viewingVisit[item.name as keyof SquadronVisit] as boolean | undefined} label={item.label} />
                                ))}
                                {section.textField && viewingVisit[section.textField.name as keyof SquadronVisit] && (
                                    <div className="mt-2">
                                        <h4 className="font-semibold text-sm">{section.textField.label}:</h4>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingVisit[section.textField.name as keyof SquadronVisit] as string}</p>
                                    </div>
                                )}
                                {viewingVisit[section.notesField as keyof SquadronVisit] && (
                                    <div className="mt-2">
                                        <h4 className="font-semibold text-sm">Additional Notes:</h4>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingVisit[section.notesField as keyof SquadronVisit] as string}</p>
                                    </div>
                                )}
                                 {!section.items.some(item => viewingVisit[item.name as keyof SquadronVisit]) && !viewingVisit[section.notesField as keyof SquadronVisit] && (!section.textField || !viewingVisit[section.textField.name as keyof SquadronVisit]) && (
                                    <p className="text-sm text-muted-foreground italic">No items marked or notes for this section.</p>
                                 )}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>

                        {viewingVisit.generalComments && (
                            <div>
                                <h3 className="font-semibold text-lg mb-1">General Comments / Overall Notes</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingVisit.generalComments}</p>
                            </div>
                        )}

                        {viewingVisit.actionItems && viewingVisit.actionItems.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Action Items</h3>
                                {viewingVisit.actionItems.map((action, index) => (
                                    <Card key={action.id || index} className="mb-3 shadow-sm">
                                        <CardHeader className="pb-2 pt-3">
                                            <CardTitle className="text-sm flex justify-between">
                                                <span>Action {index + 1}: {action.description}</span>
                                                 <Badge variant={action.status === "Open" || action.status === "In Progress" ? "secondary" : "default"} className="ml-2">{action.status}</Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-xs text-muted-foreground space-y-1">
                                            <p><strong>Responsible:</strong> {action.responsible}</p>
                                            {action.dueDate && <p><strong>Due Date:</strong> {format(action.dueDate, "PPP")}</p>}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                         {(!viewingVisit.actionItems || viewingVisit.actionItems.length === 0) && (
                            <p className="text-sm text-muted-foreground">No action items recorded for this visit.</p>
                         )}
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => {
                      if (viewingVisit) {
                        handleEdit(viewingVisit);
                      }
                    }}
                    disabled={updateVisitMutation.isPending}
                    >
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewDialog} disabled={updateVisitMutation.isPending}>Close</Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}

      {visitToDelete && (
        <AlertDialog open={!!visitToDelete} onOpenChange={() => setVisitToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the visit record for <strong>{visitToDelete.squadronName}</strong> on {format(visitToDelete.visitDate, "PP")}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setVisitToDelete(null)} disabled={deleteVisitMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={deleteVisitMutation.isPending}
              >
                {deleteVisitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                    <CardTitle className="text-xl">Module Features</CardTitle>
                    <CardDescription>Functionality of the Squadron Visits module.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center">
              <ClipboardList className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Record details of squadron visits including key personnel and date. (Implemented)
            </li>
            <li className="flex items-center">
              <ListChecks className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Document discussion points across various areas like Staffing, Training, Safety etc. using checkboxes and notes. (Implemented)
            </li>
            <li className="flex items-center">
              <Pencil className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Capture general comments and overall summaries of the visit. (Implemented)
            </li>
            <li className="flex items-center">
              <PlusCircle className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Create and track action items with responsible persons, due dates, and status. (Implemented)
            </li>
             <li className="flex items-center">
              <Info className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              View detailed visit reports and edit existing records. (Implemented)
            </li>
            <li className="flex items-center">
              <Download className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Export visit reports to PDF. (Implemented)
            </li>
             <li className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary/70 flex-shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              Integration with Staff Management for selecting RXO/CO.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

