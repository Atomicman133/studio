
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Briefcase, Target, BarChart2, UserRoundCheck, FileEdit, Edit3, Info } from "lucide-react";
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
  DialogFooter
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
import type { Pdp, SMARTGoal } from "./pdp-schema";
import { PdpForm } from "./components/pdp-form";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const initialPdps: Pdp[] = [
  {
    id: "pdp1",
    staffName: "FLGOFF John Doe",
    pdpPeriod: "2024 Annual",
    goals: [
      { id: "g1", specific: "Complete Advanced Leadership Course", measurable: "Certificate of Completion", achievable: "Course available in Q3", relevant: "To improve leadership skills for Training Officer role", timeBound: "End of Q3 2024", status: "In Progress" },
      { id: "g2", specific: "Mentor 2 junior NCOs", measurable: "Feedback from NCOs, observed sessions", achievable: "Cadets available", relevant: "Develop mentorship capabilities", timeBound: "End of 2024", status: "Not Started" },
    ],
    developmentActivities: "Enroll in ALC, Schedule mentorship sessions",
    reviewDate: new Date("2024-09-30"),
    feedback: "Good progress on ALC modules.",
  },
  {
    id: "pdp2",
    staffName: "PLTOFF Alice Williams",
    pdpPeriod: "2024-2025",
    goals: [
       { id: "g3", specific: "Obtain First Aid Instructor Qualification", measurable: "Instructor Certificate", achievable: "Course scheduled for October", relevant: "To enhance squadron's first aid training capability", timeBound: "November 2024", status: "Not Started" },
    ],
    developmentActivities: "Attend First Aid Instructor course, practice teaching sessions.",
  }
];

export default function PdpsPage() {
  const [pdpList, setPdpList] = React.useState<Pdp[]>(initialPdps);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingPdp, setEditingPdp] = React.useState<Pdp | null>(null);
  const [pdpToDelete, setPdpToDelete] = React.useState<Pdp | null>(null);
  const [viewingPdp, setViewingPdp] = React.useState<Pdp | null>(null);


  const handleAddPdp = (data: Pdp) => {
    const newPdp = { 
      ...data, 
      id: crypto.randomUUID(),
      goals: data.goals.map(g => ({...g, id: crypto.randomUUID()}))
    };
    setPdpList((prev) => [newPdp, ...prev]);
    setIsFormOpen(false);
  };

  const handleUpdatePdp = (data: Pdp) => {
    setPdpList((prev) =>
      prev.map((pdp) => (pdp.id === data.id ? {
        ...data,
        goals: data.goals.map(g => g.id ? g : {...g, id: crypto.randomUUID()})
      } : pdp))
    );
    setIsFormOpen(false);
    setEditingPdp(null);
  };

  const handleEdit = (pdp: Pdp) => {
    setEditingPdp(pdp);
    setViewingPdp(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (pdp: Pdp) => {
    setViewingPdp(pdp);
    setEditingPdp(null);
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (pdpToDelete) {
      setPdpList((prev) => prev.filter((pdp) => pdp.id !== pdpToDelete.id));
      setPdpToDelete(null);
    }
  };

  const openFormForNew = () => {
    setEditingPdp(null);
    setViewingPdp(null);
    setIsFormOpen(true);
  };
  
  const closeForm = () => {
    setEditingPdp(null);
    setIsFormOpen(false);
  };

  const closeViewDialog = () => {
    setViewingPdp(null);
  }

  const getOverallStatus = (goals: SMARTGoal[]): string => {
    if (!goals || goals.length === 0) return "No Goals";
    const completed = goals.every(g => g.status === "Completed");
    if (completed) return "Completed";
    const inProgress = goals.some(g => g.status === "In Progress");
    if (inProgress) return "In Progress";
    const onHold = goals.some(g => g.status === "On Hold");
    if (onHold) return "On Hold";
    return "Not Started";
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-primary hidden sm:block" />
              <div>
                <CardTitle className="text-2xl">Professional Development Plans (PDPs)</CardTitle>
                <CardDescription>Create, manage, and track professional development plans for staff members.</CardDescription>
              </div>
            </div>
            <Button onClick={openFormForNew} size="lg" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" /> Create New PDP
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pdpList.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <Briefcase className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No PDPs Created Yet</h3>
                <p className="text-muted-foreground mb-4">Click &quot;Create New PDP&quot; to get started.</p>
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>PDP Period</TableHead>
                  <TableHead className="hidden md:table-cell">Overall Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Next Review</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pdpList.map((pdp) => (
                  <TableRow key={pdp.id}>
                    <TableCell className="font-medium">{pdp.staffName}</TableCell>
                    <TableCell>{pdp.pdpPeriod}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={
                        getOverallStatus(pdp.goals) === "Completed" ? "default" : 
                        getOverallStatus(pdp.goals) === "In Progress" ? "secondary" : "outline" // Example, adjust as needed
                      }>
                        {getOverallStatus(pdp.goals)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {pdp.reviewDate ? format(pdp.reviewDate, "PP") : "N/A"}
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
                           <DropdownMenuItem onClick={() => handleViewDetails(pdp)}>
                            <Info className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(pdp)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setPdpToDelete(pdp)}
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
         {pdpList.length > 0 && (
          <CardFooter className="text-xs text-muted-foreground">
            Showing {pdpList.length} of {pdpList.length} PDPs.
          </CardFooter>
        )}
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeForm(); else setIsFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPdp ? "Edit Professional Development Plan" : "Create New PDP"}
            </DialogTitle>
            <DialogDescription>
              {editingPdp
                ? "Update the details of the PDP."
                : "Fill in the form to create a new PDP for a staff member."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-1">
            <div className="py-4 pr-4">
                <PdpForm
                onSubmit={editingPdp ? handleUpdatePdp : handleAddPdp}
                defaultValues={editingPdp || undefined}
                onCancel={closeForm}
                isEditing={!!editingPdp}
                />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {viewingPdp && (
         <Dialog open={!!viewingPdp} onOpenChange={closeViewDialog}>
            <DialogContent className="sm:max-w-3xl"> {/* Wider for better goal display */}
                <DialogHeader>
                    <DialogTitle>PDP for {viewingPdp.staffName} ({viewingPdp.pdpPeriod})</DialogTitle>
                    <DialogDescription>
                        Overall Status: <Badge variant={ getOverallStatus(viewingPdp.goals) === "Completed" ? "default" : getOverallStatus(viewingPdp.goals) === "In Progress" ? "secondary" : "outline" }>{getOverallStatus(viewingPdp.goals)}</Badge>
                        {viewingPdp.reviewDate && ` | Next Review: ${format(viewingPdp.reviewDate, "PPP")}`}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1 pr-4">
                    <div className="space-y-6 py-4">
                        <div>
                            <h3 className="font-semibold text-lg mb-2">SMART Goals</h3>
                            {viewingPdp.goals.map((goal, index) => (
                                <Card key={goal.id || index} className="mb-4 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-md flex justify-between">
                                            <span>Goal {index + 1}: {goal.specific}</span>
                                            <Badge variant={goal.status === "Completed" ? "default" : goal.status === "In Progress" ? "secondary" : "outline"}>{goal.status}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground space-y-1">
                                        <p><strong>Measurable:</strong> {goal.measurable}</p>
                                        <p><strong>Achievable:</strong> {goal.achievable}</p>
                                        <p><strong>Relevant:</strong> {goal.relevant}</p>
                                        <p><strong>Time-bound:</strong> {goal.timeBound}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {viewingPdp.developmentActivities && (
                            <div>
                                <h3 className="font-semibold text-lg mb-1">Development Activities</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingPdp.developmentActivities}</p>
                            </div>
                        )}
                         {viewingPdp.feedback && (
                            <div>
                                <h3 className="font-semibold text-lg mb-1">Feedback / Notes</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingPdp.feedback}</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4">
                    <Button variant="outline" onClick={() => handleEdit(viewingPdp)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewDialog}>Close</Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}

      {pdpToDelete && (
        <AlertDialog open={!!pdpToDelete} onOpenChange={() => setPdpToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the PDP for <strong>{pdpToDelete.staffName} ({pdpToDelete.pdpPeriod})</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPdpToDelete(null)}>
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
                    <CardDescription>Future enhancements for PDP Management.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center">
              <FileEdit className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Create individualized PDPs for each staff member, outlining goals and development areas. (Implemented)
            </li>
            <li className="flex items-center">
              <Target className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Set SMART (Specific, Measurable, Achievable, Relevant, Time-bound) goals and objectives. (Implemented)
            </li>
            <li className="flex items-center">
              <BarChart2 className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Track progress against development activities, training courses, and mentorship programs. (Partially implemented - text field)
            </li>
            <li className="flex items-center">
              <UserRoundCheck className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Conduct periodic reviews and provide feedback on PDP progress. (Implemented)
            </li>
            <li className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary/70 flex-shrink-0"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
              Generate reports on PDP completion and overall staff development.
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
