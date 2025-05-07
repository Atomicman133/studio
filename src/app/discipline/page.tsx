
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Gavel, FileSignature, UserX, Archive, ShieldAlert, Edit3, Info, UploadCloud } from "lucide-react";
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
import type { DisciplineAction } from "./discipline-schema";
import { DisciplineActionForm } from "./components/discipline-action-form";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const initialDisciplineActions: DisciplineAction[] = [
  {
    id: "da1",
    staffName: "CDTWOFF Example",
    dateOfIncident: new Date("2024-05-10"),
    typeOfAction: "Informal Discussion",
    incidentDescription: "Late arrival to parade night without prior notification.",
    policyBreached: "Squadron Standing Orders - Punctuality",
    outcome: "Counseled on importance of punctuality and communication.",
  },
  {
    id: "da2",
    staffName: "SGT Other Example",
    dateOfIncident: new Date("2024-03-15"),
    typeOfAction: "Formal Warning",
    incidentDescription: "Failure to follow safety procedures during a fieldcraft exercise, resulting in minor equipment damage.",
    policyBreached: "AAFC WHS Manual - Section 4.2",
    sanctionsApplied: "Temporary removal from supervising field activities until re-assessment.",
    appealProcessNotes: "No appeal lodged."
  },
];

export default function DisciplinePage() {
  const [actionsList, setActionsList] = React.useState<DisciplineAction[]>(initialDisciplineActions);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAction, setEditingAction] = React.useState<DisciplineAction | null>(null);
  const [actionToDelete, setActionToDelete] = React.useState<DisciplineAction | null>(null);
  const [viewingAction, setViewingAction] = React.useState<DisciplineAction | null>(null);


  const handleAddAction = (data: DisciplineAction) => {
    const newAction = { ...data, id: crypto.randomUUID() };
    setActionsList((prev) => [newAction, ...prev]);
    setIsFormOpen(false);
  };

  const handleUpdateAction = (data: DisciplineAction) => {
    setActionsList((prev) =>
      prev.map((action) => (action.id === data.id ? data : action))
    );
    setIsFormOpen(false);
    setEditingAction(null);
  };

  const handleEdit = (action: DisciplineAction) => {
    setEditingAction(action);
    setViewingAction(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (action: DisciplineAction) => {
    setViewingAction(action);
    setEditingAction(null);
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (actionToDelete) {
      setActionsList((prev) => prev.filter((action) => action.id !== actionToDelete.id));
      setActionToDelete(null);
    }
  };

  const openFormForNew = () => {
    setEditingAction(null);
    setViewingAction(null);
    setIsFormOpen(true);
  };
  
  const closeForm = () => {
    setEditingAction(null);
    setIsFormOpen(false);
  };

  const closeViewDialog = () => {
    setViewingAction(null);
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
              <Gavel className="h-8 w-8 text-primary hidden sm:block" />
              <div>
                <CardTitle className="text-2xl">Discipline Actions</CardTitle>
                <CardDescription>Record conversations, document breaches of conduct, and manage disciplinary processes.</CardDescription>
              </div>
            </div>
            <Button onClick={openFormForNew} size="lg" className="w-full sm:w-auto">
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
                           <DropdownMenuItem onClick={() => handleViewDetails(action)}>
                            <Info className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(action)}>
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

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeForm(); else setIsFormOpen(true);
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
                onCancel={closeForm}
                isEditing={!!editingAction}
                />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {viewingAction && (
         <Dialog open={!!viewingAction} onOpenChange={closeViewDialog}>
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
                    <Button variant="outline" onClick={() => { handleEdit(viewingAction); }}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewDialog}>Close</Button>
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
                    <CardDescription>Future enhancements for Discipline Actions.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center">
              <FileSignature className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Securely record details of informal discussions and formal disciplinary actions. (Implemented)
            </li>
            <li className="flex items-center">
              <UserX className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Categorize incidents and breaches according to squadron/AAFC policy. (Partially implemented by policy field)
            </li>
            <li className="flex items-center">
               <UploadCloud className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Attach supporting documents, witness statements, and other evidence.
            </li>
            <li className="flex items-center">
              <ShieldAlert className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Track outcomes, sanctions, and appeal processes. (Implemented)
            </li>
            <li className="flex items-center">
              <Archive className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Maintain a confidential and auditable record of all disciplinary matters.
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
