
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Users as UsersIconLucide, UploadCloud, Info, Edit3 } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { StaffMember } from "./staff-schema";
import { StaffForm } from "./components/staff-form";
import { RANKS } from "./staff-schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const initialStaff: StaffMember[] = [
  {
    id: "1f7b3c2a-8e1d-4f9a-8b7c-6d5e4f3a2b1c",
    serviceNumber: "8001234",
    rank: "FLTLT",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@example.com",
    phone: "0412345678",
    role: "Commanding Officer",
    joinDate: new Date("2018-05-15"),
  },
  {
    id: "2g8c4d3b-9f2e-5g0b-9c8d-7e6f5g4b3c2d",
    serviceNumber: "8005678",
    rank: "FLGOFF",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "0423456789",
    role: "Training Officer",
    joinDate: new Date("2020-01-20"),
  },
  {
    id: "3h9d5e4c-0g3f-6h1c-0d9e-8f7g6h5c4d3e",
    serviceNumber: "8009012",
    rank: "PLTOFF",
    firstName: "Alice",
    lastName: "Williams",
    email: "alice.williams@example.com",
    role: "Admin Officer",
    joinDate: new Date("2021-07-10"),
  },
];


export default function StaffPage() {
  const [staffList, setStaffList] = React.useState<StaffMember[]>(initialStaff);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingStaff, setEditingStaff] = React.useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = React.useState<StaffMember | null>(null);
  const [viewingStaffMember, setViewingStaffMember] = React.useState<StaffMember | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAddStaff = (data: StaffMember) => {
    const newStaffMember = { ...data, id: crypto.randomUUID() };
    setStaffList((prev) => [...prev, newStaffMember]);
    setIsFormOpen(false);
    toast({ title: "Success", description: "Staff member added." });
  };

  const handleUpdateStaff = (data: StaffMember) => {
    setStaffList((prev) =>
      prev.map((staff) => (staff.id === data.id ? data : staff))
    );
    setIsFormOpen(false);
    setEditingStaff(null);
    toast({ title: "Success", description: "Staff member updated." });
  };

  const handleEdit = (staffMember: StaffMember) => {
    setEditingStaff(staffMember);
    setViewingStaffMember(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (staffMember: StaffMember) => {
    setViewingStaffMember(staffMember);
    setEditingStaff(null);
    setIsFormOpen(false);
  };
  
  const closeViewDialog = () => {
    setViewingStaffMember(null);
  };


  const handleDeleteConfirm = () => {
    if (staffToDelete) {
      setStaffList((prev) => prev.filter((staff) => staff.id !== staffToDelete.id));
      setStaffToDelete(null);
      toast({ title: "Success", description: "Staff member deleted." });
    }
  };

  const openFormForNew = () => {
    setEditingStaff(null);
    setViewingStaffMember(null);
    setIsFormOpen(true);
  };
  
  const closeForm = () => {
    setEditingStaff(null);
    setIsFormOpen(false);
  };

  const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ variant: "destructive", title: "Import Error", description: "No file selected." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast({ variant: "destructive", title: "Import Error", description: "Could not read file content." });
        return;
      }
      
      const importedMembers: StaffMember[] = [];
      const errors: string[] = [];
      const lines = text.split(/\r\n|\n/);

      if (lines.length < 2) {
        errors.push("CSV must have a header and at least one data row.");
      } else {
        const header = lines[0].split(',').map(h => h.trim());
        const expectedHeader = ["serviceNumber", "rank", "firstName", "lastName", "email", "phone", "role", "joinDate"];
        if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) {
            errors.push(`Invalid CSV header. Expected: ${expectedHeader.join(',')}. Got: ${header.join(',')}`);
        } else {
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = line.split(',').map(v => v.trim());
                if (values.length !== header.length) {
                    errors.push(`Row ${i + 1}: Incorrect number of columns. Expected ${header.length}, got ${values.length}.`);
                    continue;
                }

                const staffData: any = {};
                header.forEach((col, index) => {
                    staffData[col] = values[index];
                });

                const rank = staffData.rank as typeof RANKS[number];
                if (!RANKS.includes(rank)) {
                    errors.push(`Row ${i + 1}: Invalid rank "${rank}". Valid ranks are: ${RANKS.join(", ")}.`);
                    continue;
                }

                const joinDate = staffData.joinDate ? new Date(staffData.joinDate) : undefined;
                if (staffData.joinDate && isNaN(joinDate?.getTime())) {
                    errors.push(`Row ${i + 1}: Invalid joinDate format for "${staffData.joinDate}". Please use YYYY-MM-DD.`);
                    continue;
                }
                
                if (!staffData.serviceNumber || !staffData.firstName || !staffData.lastName || !staffData.email || !staffData.role) {
                    errors.push(`Row ${i + 1}: Missing one or more required fields (serviceNumber, firstName, lastName, email, role).`);
                    continue;
                }
                
                // Basic email validation
                if (!/^\S+@\S+\.\S+$/.test(staffData.email)) {
                    errors.push(`Row ${i+1}: Invalid email format for "${staffData.email}".`);
                    continue;
                }

                // Check for duplicates based on service number or email before adding
                const isDuplicate = staffList.some(s => s.serviceNumber === staffData.serviceNumber || s.email === staffData.email) ||
                                    importedMembers.some(s => s.serviceNumber === staffData.serviceNumber || s.email === staffData.email);
                if (isDuplicate) {
                    errors.push(`Row ${i + 1}: Duplicate service number or email for "${staffData.serviceNumber}/${staffData.email}". Skipped.`);
                    continue;
                }


                importedMembers.push({
                    id: crypto.randomUUID(),
                    serviceNumber: staffData.serviceNumber,
                    rank: rank,
                    firstName: staffData.firstName,
                    lastName: staffData.lastName,
                    email: staffData.email,
                    phone: staffData.phone || undefined,
                    role: staffData.role,
                    joinDate: joinDate,
                });
            }
        }
      }

      if (importedMembers.length > 0) {
        setStaffList(prev => [...prev, ...importedMembers]);
        toast({ title: "Import Successful", description: `${importedMembers.length} staff member(s) imported.` });
      }
      if (errors.length > 0) {
        const errorMessages = errors.slice(0, 5).join("\n") + (errors.length > 5 ? "\n...and more errors." : "");
        toast({
            variant: "destructive",
            title: `CSV Import ${importedMembers.length > 0 ? "Partially Successful" : "Failed"}`,
            description: (
              <ScrollArea className="max-h-40">
                <pre className="whitespace-pre-wrap text-xs">{errorMessages}</pre>
              </ScrollArea>
            ),
            duration: 10000, // Longer duration for errors
        });
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
      }
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "Import Error", description: "Failed to read the file."});
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Staff Management</CardTitle>
              <CardDescription>
                Manage staff member records and information.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button onClick={openFormForNew} size="lg" className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-5 w-5" /> Add New Staff
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} size="lg" variant="outline" className="w-full sm:w-auto">
                <UploadCloud className="mr-2 h-5 w-5" /> Import CSV
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleCsvImport} accept=".csv" style={{ display: 'none' }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {staffList.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <UsersIconLucide className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Staff Members Yet</h3>
                <p className="text-muted-foreground mb-4">Click &quot;Add New Staff&quot; or &quot;Import CSV&quot; to get started.</p>
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service No.</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Role</TableHead>
                  <TableHead className="hidden lg:table-cell">Join Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell>{staff.serviceNumber}</TableCell>
                    <TableCell>{staff.rank}</TableCell>
                    <TableCell>{`${staff.firstName} ${staff.lastName}`}</TableCell>
                    <TableCell className="hidden md:table-cell">{staff.email}</TableCell>
                    <TableCell className="hidden lg:table-cell">{staff.role}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {staff.joinDate ? format(staff.joinDate, "PP") : "N/A"}
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
                          <DropdownMenuItem onClick={() => handleViewDetails(staff)}>
                            <Info className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(staff)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setStaffToDelete(staff)}
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
         {staffList.length > 0 && (
          <CardFooter className="text-xs text-muted-foreground">
            Showing {staffList.length} staff member(s).
          </CardFooter>
        )}
      </Card>
      
      <Alert>
        <UploadCloud className="h-4 w-4" />
        <AlertTitle>CSV Import Instructions</AlertTitle>
        <AlertDescription>
          To bulk import staff members, upload a CSV file with the following columns in order:
          <ul className="list-disc pl-5 mt-2 text-xs">
            <li><code>serviceNumber</code> (Text, Required, e.g., &quot;8001234&quot;)</li>
            <li><code>rank</code> (Text, Required, e.g., &quot;FLTLT&quot;. Must be one of: {RANKS.join(", ")})</li>
            <li><code>firstName</code> (Text, Required, e.g., &quot;Jane&quot;)</li>
            <li><code>lastName</code> (Text, Required, e.g., &quot;Smith&quot;)</li>
            <li><code>email</code> (Text, Required, Valid email format, e.g., &quot;jane.smith@example.com&quot;)</li>
            <li><code>phone</code> (Text, Optional, e.g., &quot;0412345678&quot;)</li>
            <li><code>role</code> (Text, Required, e.g., &quot;Commanding Officer&quot;)</li>
            <li><code>joinDate</code> (Date, Optional, Format: YYYY-MM-DD, e.g., &quot;2018-05-15&quot;)</li>
          </ul>
          The first row must be a header row with these exact names. Service Number and Email must be unique per staff member.
        </AlertDescription>
      </Alert>


      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeForm(); else setIsFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
            </DialogTitle>
            <DialogDescription>
              {editingStaff
                ? "Update the details of the staff member."
                : "Fill in the form to add a new staff member."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-1">
            <div className="py-4 pr-4">
              <StaffForm
                onSubmit={editingStaff ? handleUpdateStaff : handleAddStaff}
                defaultValues={editingStaff || undefined}
                onCancel={closeForm}
                isEditing={!!editingStaff}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {viewingStaffMember && (
         <Dialog open={!!viewingStaffMember} onOpenChange={closeViewDialog}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{viewingStaffMember.rank} {viewingStaffMember.firstName} {viewingStaffMember.lastName}</DialogTitle>
                    <DialogDescription>
                       Service Number: {viewingStaffMember.serviceNumber} | Role: {viewingStaffMember.role}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1 pr-4">
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h3 className="font-semibold text-sm mb-1">Email</h3>
                                <p className="text-sm text-muted-foreground">{viewingStaffMember.email}</p>
                            </div>
                             <div>
                                <h3 className="font-semibold text-sm mb-1">Phone</h3>
                                <p className="text-sm text-muted-foreground">{viewingStaffMember.phone || "N/A"}</p>
                            </div>
                             <div>
                                <h3 className="font-semibold text-sm mb-1">Join Date</h3>
                                <p className="text-sm text-muted-foreground">{viewingStaffMember.joinDate ? format(viewingStaffMember.joinDate, "PPP") : "N/A"}</p>
                            </div>
                        </div>
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle className="text-lg">Related Records</CardTitle>
                                <CardDescription>Professional development, training, compliance, and discipline records.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Integration with other modules to display related records for this staff member is planned for a future update.
                                </p>
                                {/* 
                                TODO: In the future, fetch and display:
                                - PDPs for this staff member
                                - Training logs
                                - Compliance items
                                - Discipline actions
                                This will likely require matching by staff name or ideally a unique staff ID propagated to other schemas.
                                */}
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => {
                      if (viewingStaffMember) {
                        handleEdit(viewingStaffMember);
                      }
                    }}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewDialog}>Close</Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}


      {staffToDelete && (
        <AlertDialog open={!!staffToDelete} onOpenChange={() => setStaffToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the record for{" "}
                <strong>{`${staffToDelete.firstName} ${staffToDelete.lastName}`}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setStaffToDelete(null)}>
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
    </div>
  );
}

// Re-using existing icon component from the page if it was removed.
function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

    