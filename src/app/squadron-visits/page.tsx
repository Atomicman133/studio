
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ClipboardList, Edit3, Info, ListChecks } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox"; // For displaying boolean fields


export const initialSquadronVisits: SquadronVisit[] = [
  {
    id: "sv1",
    squadronName: "123 Squadron",
    visitDate: new Date("2024-07-15"),
    rxoName: "FLTLT Jane Doe (Wing RXO)",
    coName: "SQNLDR John Smith",
    staffingListReviewed: true,
    staffingVacanciesDiscussed: true,
    staffingSuccessionPlanningNotes: "Discussed potential for PLTOFF Alice to step into AdminO role.",
    trainingScheduleCurrent: true,
    generalComments: "Overall a productive visit. Squadron is tracking well.",
    actionItems: [
      { id: "act1", description: "Follow up on AdminO succession plan with CO.", responsible: "RXO", dueDate: new Date("2024-07-22"), status: "Open" }
    ]
  },
  {
    id: "sv2",
    squadronName: "456 Squadron",
    visitDate: new Date("2024-06-20"),
    rxoName: "FLTLT Jane Doe (Wing RXO)",
    coName: "FLTLT Robert Brown",
    staffingListReviewed: true,
    safetyRiskRegisterReviewed: false,
    safetySectionNotes: "Risk register needs urgent update post-recent field exercise.",
    generalComments: "Key focus on safety compliance.",
    actionItems: [
      { id: "act2", description: "SQN CO to update Risk Register and submit to Wing.", responsible: "456 SQN CO", dueDate: new Date("2024-07-05"), status: "Completed" },
      { id: "act3", description: "RXO to confirm receipt of updated Risk Register.", responsible: "RXO", dueDate: new Date("2024-07-10"), status: "In Progress" }
    ]
  },
];

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
  const [visitList, setVisitList] = React.useState<SquadronVisit[]>(initialSquadronVisits);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingVisit, setEditingVisit] = React.useState<SquadronVisit | null>(null);
  const [visitToDelete, setVisitToDelete] = React.useState<SquadronVisit | null>(null);
  const [viewingVisit, setViewingVisit] = React.useState<SquadronVisit | null>(null);

  const handleAddVisit = (data: SquadronVisit) => {
    const newVisit = { 
      ...data, 
      id: crypto.randomUUID(),
      actionItems: data.actionItems?.map(f => ({...f, id: crypto.randomUUID()}))
    };
    setVisitList((prev) => [newVisit, ...prev]);
    setIsFormOpen(false);
  };

  const handleUpdateVisit = (data: SquadronVisit) => {
    setVisitList((prev) =>
      prev.map((visit) => (visit.id === data.id ? {
        ...data,
        actionItems: data.actionItems?.map(f => f.id ? f : {...f, id: crypto.randomUUID()})
      } : visit))
    );
    setIsFormOpen(false);
    setEditingVisit(null);
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
    if (visitToDelete) {
      setVisitList((prev) => prev.filter((visit) => visit.id !== visitToDelete.id));
      setVisitToDelete(null);
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
            <Button onClick={openFormForNew} size="lg" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" /> New Visit Record
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {visitList.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Visits Recorded Yet</h3>
                <p className="text-muted-foreground mb-4">Click &quot;New Visit Record&quot; to get started.</p>
             </div>
          ) : (
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
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Options</DropdownMenuLabel>
                           <DropdownMenuItem onClick={() => handleViewDetails(visit)}>
                            <Info className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(visit)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setVisitToDelete(visit)}
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
         {visitList.length > 0 && (
          <CardFooter className="text-xs text-muted-foreground">
            Showing {visitList.length} of {visitList.length} squadron visit records.
          </CardFooter>
        )}
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeForm(); else setIsFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-4xl"> {/* Wider for the form */}
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
                    }}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewDialog}>Close</Button>
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
              <AlertDialogCancel onClick={() => setVisitToDelete(null)}>
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
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
