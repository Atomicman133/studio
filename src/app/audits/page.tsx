

"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ShieldCheck, ListChecks, FilePlus2, Activity, FileText, Edit3, Info, Camera } from "lucide-react";
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
import type { SafetyAudit, AuditFinding } from "./audit-schema";
import { SafetyAuditForm } from "./components/safety-audit-form";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export const initialAudits: SafetyAudit[] = [
  {
    id: "sa1",
    auditTitle: "Classroom Safety Check Q2",
    auditType: "Scheduled Work Area Inspection",
    auditDate: new Date("2024-04-15"),
    auditorName: "Jane Smith", // Updated to full name
    scope: "All classrooms in Training Wing",
    summary: "Generally good condition. Minor trip hazard identified in Classroom 3.",
    findings: [
      { id:"f1", description: "Loose carpet tile near doorway in Classroom 3.", severity: "Medium", recommendedAction: "Secure or replace carpet tile.", assignedTo: "Alice Williams", dueDate: new Date("2024-04-22"), status: "Resolved" }
    ]
  },
  {
    id: "sa2",
    auditTitle: "Pre-Exercise Vehicle Checks",
    auditType: "Equipment Safety Audit",
    auditDate: new Date("2024-06-01"),
    auditorName: "John Doe", // Updated to full name
    scope: "All Squadron Vehicles",
    summary: "All vehicles passed pre-use checks. One vehicle requires tire pressure adjustment.",
     findings: [
      { id:"f2", description: "Vehicle REG012 - Low tire pressure front-left.", severity: "Low", recommendedAction: "Inflate tire to correct PSI.", assignedTo: "Transport NCO", status: "Resolved" }
    ]
  },
];

export default function AuditsPage() {
  const [auditList, setAuditList] = React.useState<SafetyAudit[]>(initialAudits);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAudit, setEditingAudit] = React.useState<SafetyAudit | null>(null);
  const [auditToDelete, setAuditToDelete] = React.useState<SafetyAudit | null>(null);
  const [viewingAudit, setViewingAudit] = React.useState<SafetyAudit | null>(null);

  const handleAddAudit = (data: SafetyAudit) => {
    const newAudit = { 
      ...data, 
      id: crypto.randomUUID(),
      findings: data.findings?.map(f => ({...f, id: crypto.randomUUID()}))
    };
    setAuditList((prev) => [newAudit, ...prev]);
    setIsFormOpen(false);
  };

  const handleUpdateAudit = (data: SafetyAudit) => {
    setAuditList((prev) =>
      prev.map((audit) => (audit.id === data.id ? {
        ...data,
        findings: data.findings?.map(f => f.id ? f : {...f, id: crypto.randomUUID()})
      } : audit))
    );
    setIsFormOpen(false);
    setEditingAudit(null);
  };

  const handleEdit = (audit: SafetyAudit) => {
    setEditingAudit(audit);
    setViewingAudit(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (audit: SafetyAudit) => {
    setViewingAudit(audit);
    setEditingAudit(null);
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (auditToDelete) {
      setAuditList((prev) => prev.filter((audit) => audit.id !== auditToDelete.id));
      setAuditToDelete(null);
    }
  };

  const openFormForNew = () => {
    setEditingAudit(null);
    setViewingAudit(null);
    setIsFormOpen(true);
  };
  
  const closeForm = () => {
    setEditingAudit(null);
    setIsFormOpen(false);
  };

  const closeViewDialog = () => {
    setViewingAudit(null);
  }
  
  const getOverallAuditStatus = (findings?: AuditFinding[]): string => {
    if (!findings || findings.length === 0) return "No Findings";
    const hasOpen = findings.some(f => f.status === "Open" || f.status === "In Progress");
    if (hasOpen) {
        const hasCritical = findings.some(f => f.severity === "Critical" && (f.status === "Open" || f.status === "In Progress"));
        if (hasCritical) return "Action Required (Critical)";
        const hasHigh = findings.some(f => f.severity === "High" && (f.status === "Open" || f.status === "In Progress"));
        if (hasHigh) return "Action Required (High)";
        return "Action Required";
    }
    return "All Clear";
  }


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-primary hidden sm:block" />
              <div>
                <CardTitle className="text-2xl">Safety Audits</CardTitle>
                <CardDescription>Perform safety inspections, document hazards, and create action items.</CardDescription>
              </div>
            </div>
            <Button onClick={openFormForNew} size="lg" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" /> New Audit Record
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {auditList.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShieldCheck className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Audits Recorded Yet</h3>
                <p className="text-muted-foreground mb-4">Click &quot;New Audit Record&quot; to get started.</p>
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Overall Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditList.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell className="font-medium">{audit.auditTitle}</TableCell>
                    <TableCell>{format(audit.auditDate, "PP")}</TableCell>
                    <TableCell className="hidden md:table-cell">{audit.auditType}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                       <Badge variant={
                          getOverallAuditStatus(audit.findings).includes("Critical") ? "destructive" :
                          getOverallAuditStatus(audit.findings).includes("High") ? "destructive" : // Consider a warning variant
                          getOverallAuditStatus(audit.findings) === "Action Required" ? "secondary" :
                          getOverallAuditStatus(audit.findings) === "All Clear" ? "default" : "outline"
                       }>
                        {getOverallAuditStatus(audit.findings)}
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
                           <DropdownMenuItem onClick={() => handleViewDetails(audit)}>
                            <Info className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(audit)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setAuditToDelete(audit)}
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
         {auditList.length > 0 && (
          <CardFooter className="text-xs text-muted-foreground">
            Showing {auditList.length} of {auditList.length} safety audits.
          </CardFooter>
        )}
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeForm(); else setIsFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-3xl"> {/* Wider for findings */}
          <DialogHeader>
            <DialogTitle>
              {editingAudit ? "Edit Safety Audit Record" : "New Safety Audit Record"}
            </DialogTitle>
            <DialogDescription>
              {editingAudit
                ? "Update the details of the safety audit."
                : "Fill in the form to record a new safety audit."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-1">
            <div className="py-4 pr-4">
                <SafetyAuditForm
                onSubmit={editingAudit ? handleUpdateAudit : handleAddAudit}
                defaultValues={editingAudit || undefined}
                onCancel={closeForm}
                isEditing={!!editingAudit}
                />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {viewingAudit && (
         <Dialog open={!!viewingAudit} onOpenChange={closeViewDialog}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{viewingAudit.auditTitle}</DialogTitle>
                    <DialogDescription>
                       Audit conducted on {format(viewingAudit.auditDate, "PPP")} by {viewingAudit.auditorName}. Type: {viewingAudit.auditType}.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1 pr-4">
                    <div className="space-y-6 py-4">
                        <div>
                            <h3 className="font-semibold text-md mb-1">Scope</h3>
                            <p className="text-sm text-muted-foreground">{viewingAudit.scope}</p>
                        </div>
                        {viewingAudit.summary && (
                            <div>
                                <h3 className="font-semibold text-md mb-1">Summary</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingAudit.summary}</p>
                            </div>
                        )}
                        
                        {viewingAudit.findings && viewingAudit.findings.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Findings & CAPAs</h3>
                                {viewingAudit.findings.map((finding, index) => (
                                    <Card key={finding.id || index} className="mb-3 shadow-sm">
                                        <CardHeader className="pb-2 pt-3">
                                            <CardTitle className="text-sm flex justify-between">
                                                <span>Finding {index + 1}: {finding.description}</span>
                                                <Badge variant={finding.severity === "Critical" || finding.severity === "High" ? "destructive" : finding.severity === "Medium" ? "secondary" : "outline"} className="ml-2">{finding.severity}</Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-xs text-muted-foreground space-y-1">
                                            <p><strong>Status:</strong> <Badge variant={finding.status === "Open" || finding.status === "In Progress" ? "secondary" : "default"} className="text-xs">{finding.status}</Badge></p>
                                            {finding.recommendedAction && <p><strong>Action:</strong> {finding.recommendedAction}</p>}
                                            {finding.assignedTo && <p><strong>Assigned To:</strong> {finding.assignedTo}</p>}
                                            {finding.dueDate && <p><strong>Due Date:</strong> {format(finding.dueDate, "PPP")}</p>}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                         {(!viewingAudit.findings || viewingAudit.findings.length === 0) && (
                            <p className="text-sm text-muted-foreground">No specific findings or CAPAs recorded for this audit.</p>
                         )}
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => {
                      if (viewingAudit) {
                        handleEdit(viewingAudit);
                      }
                    }}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewDialog}>Close</Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}

      {auditToDelete && (
        <AlertDialog open={!!auditToDelete} onOpenChange={() => setAuditToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the audit record for <strong>{auditToDelete.auditTitle}</strong> conducted on {format(auditToDelete.auditDate, "PP")}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAuditToDelete(null)}>
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
                    <CardDescription>Future enhancements for Safety Audits.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center">
              <ListChecks className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Create and manage customizable audit templates and checklists.
            </li>
            <li className="flex items-center">
              <FilePlus2 className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Schedule and assign audits to responsible personnel.
            </li>
            <li className="flex items-center">
              <Camera className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Conduct audits with integrated checklists, note-taking, and photo/document uploads. (Findings/CAPAs partially implemented)
            </li>
            <li className="flex items-center">
              <Activity className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Track findings, assign corrective and preventative actions (CAPAs), and monitor resolution progress. (Implemented)
            </li>
            <li className="flex items-center">
              <FileText className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Generate comprehensive audit reports and analyze safety trends.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}


