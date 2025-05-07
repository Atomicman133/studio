
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, UserCheck, CheckSquare, CalendarClock, BellRing, BarChart3, Edit3, Info, UploadCloud } from "lucide-react";
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
import type { ComplianceItem } from "./compliance-schema";
import { ComplianceItemForm } from "./components/compliance-item-form";
import { format, isBefore, addMonths } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const initialComplianceItems: ComplianceItem[] = [
  {
    id: "c1",
    staffName: "FLGOFF John Doe",
    itemName: "First Aid Certificate",
    expiryDate: new Date("2025-12-31"),
    status: "Compliant",
    notes: "HLTAID011 - St John Ambulance"
  },
  {
    id: "c2",
    staffName: "PLTOFF Alice Williams",
    itemName: "Working With Children Check (WWCC)",
    expiryDate: new Date("2024-08-15"), // This will be "Expiring Soon"
    status: "Expiring Soon", // Status should be dynamic ideally
    notes: "WWCC No: 1234567E"
  },
   {
    id: "c3",
    staffName: "FLTLT Jane Smith",
    itemName: "Range Safety Officer",
    status: "Compliant", // No expiry or N/A
    notes: "Qualified on 2022-06-01"
  },
];

// Function to determine badge variant based on status
const getStatusBadgeVariant = (status: ComplianceItem['status']) => {
  switch (status) {
    case 'Compliant':
      return 'default'; // Greenish or primary
    case 'Expiring Soon':
      return 'secondary'; // Yellowish or accent
    case 'Expired':
      return 'destructive'; // Reddish
    case 'Not Applicable':
      return 'outline'; // Greyish
    default:
      return 'outline';
  }
};

// Function to dynamically determine status based on expiry date
const getDynamicStatus = (expiryDate?: Date): ComplianceItem['status'] => {
  if (!expiryDate) return "Compliant"; // Or "Not Applicable" if that's more appropriate
  const today = new Date();
  if (isBefore(expiryDate, today)) return "Expired";
  if (isBefore(expiryDate, addMonths(today, 3))) return "Expiring Soon"; // e.g., 3 months warning
  return "Compliant";
};


export default function CompliancePage() {
  const [complianceList, setComplianceList] = React.useState<ComplianceItem[]>(
     initialComplianceItems.map(item => ({...item, status: getDynamicStatus(item.expiryDate) }))
  );
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ComplianceItem | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<ComplianceItem | null>(null);
  const [viewingItem, setViewingItem] = React.useState<ComplianceItem | null>(null);


  const handleAddItem = (data: ComplianceItem) => {
    const newItem = { ...data, id: crypto.randomUUID(), status: getDynamicStatus(data.expiryDate) };
    setComplianceList((prev) => [newItem, ...prev]);
    setIsFormOpen(false);
  };

  const handleUpdateItem = (data: ComplianceItem) => {
    setComplianceList((prev) =>
      prev.map((item) => (item.id === data.id ? {...data, status: getDynamicStatus(data.expiryDate)} : item))
    );
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleEdit = (item: ComplianceItem) => {
    setEditingItem(item);
    setViewingItem(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (item: ComplianceItem) => {
    setViewingItem(item);
    setEditingItem(null);
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      setComplianceList((prev) => prev.filter((item) => item.id !== itemToDelete.id));
      setItemToDelete(null);
    }
  };

  const openFormForNew = () => {
    setEditingItem(null);
    setViewingItem(null);
    setIsFormOpen(true);
  };
  
  const closeForm = () => {
    setEditingItem(null);
    setIsFormOpen(false);
  };

  const closeViewDialog = () => {
    setViewingItem(null);
  }

  React.useEffect(() => {
    // Periodically update statuses if needed, or on page load / data change
    setComplianceList(prevList => prevList.map(item => ({...item, status: getDynamicStatus(item.expiryDate)})))
  }, []); // Empty dependency for on-load, or add triggers if data changes elsewhere


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-primary hidden sm:block" />
              <div>
                <CardTitle className="text-2xl">Staff Compliance</CardTitle>
                <CardDescription>Track staff member compliance with mandatory training, certifications, and other requirements.</CardDescription>
              </div>
            </div>
            <Button onClick={openFormForNew} size="lg" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" /> Add Compliance Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {complianceList.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <UserCheck className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Compliance Items Tracked</h3>
                <p className="text-muted-foreground mb-4">Click &quot;Add Compliance Item&quot; to get started.</p>
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Expiry Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceList.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.staffName}</TableCell>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {item.expiryDate ? format(item.expiryDate, "PP") : "N/A"}
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
                           <DropdownMenuItem onClick={() => handleViewDetails(item)}>
                            <Info className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setItemToDelete(item)}
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
         {complianceList.length > 0 && (
          <CardFooter className="text-xs text-muted-foreground">
            Showing {complianceList.length} of {complianceList.length} compliance items.
          </CardFooter>
        )}
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeForm(); else setIsFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Compliance Item" : "Add New Compliance Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the details of the compliance item."
                : "Fill in the form to add a new compliance item."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-1">
            <div className="py-4 pr-4">
                <ComplianceItemForm
                onSubmit={editingItem ? handleUpdateItem : handleAddItem}
                defaultValues={editingItem || undefined}
                onCancel={closeForm}
                isEditing={!!editingItem}
                />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {viewingItem && (
         <Dialog open={!!viewingItem} onOpenChange={closeViewDialog}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{viewingItem.itemName} - {viewingItem.staffName}</DialogTitle>
                    <DialogDescription>
                       Status: <Badge variant={getStatusBadgeVariant(viewingItem.status)}>{viewingItem.status}</Badge>
                       {viewingItem.expiryDate && ` | Expires: ${format(viewingItem.expiryDate, "PPP")}`}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1 pr-4">
                    <div className="space-y-4 py-4">
                        {viewingItem.notes && (
                            <div>
                                <h3 className="font-semibold text-sm mb-1">Notes</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingItem.notes}</p>
                            </div>
                        )}
                        {!viewingItem.notes && (
                            <p className="text-sm text-muted-foreground">No additional notes for this item.</p>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => handleEdit(viewingItem)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewDialog}>Close</Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}

      {itemToDelete && (
        <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the compliance item <strong>{itemToDelete.itemName}</strong> for <strong>{itemToDelete.staffName}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)}>
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
                    <CardDescription>Future enhancements for Staff Compliance.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center">
              <CheckSquare className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Define and manage various compliance items. (Implemented)
            </li>
            <li className="flex items-center">
              <CalendarClock className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Track expiry dates for certifications and licenses. (Implemented, status update logic added)
            </li>
            <li className="flex items-center">
              <BellRing className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Automated reminders and notifications for upcoming renewals or overdue items.
            </li>
            <li className="flex items-center">
               <UploadCloud className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Upload and store evidence of compliance (e.g., certificates, signed forms).
            </li>
            <li className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Generate compliance status reports for individuals, roles, or the entire squadron.
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
