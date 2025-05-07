
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import type { StaffMember } from "./staff-schema";
import { StaffForm } from "./components/staff-form";
import { format } from "date-fns";

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

  const handleAddStaff = (data: StaffMember) => {
    const newStaffMember = { ...data, id: crypto.randomUUID() };
    setStaffList((prev) => [...prev, newStaffMember]);
    setIsFormOpen(false);
  };

  const handleUpdateStaff = (data: StaffMember) => {
    setStaffList((prev) =>
      prev.map((staff) => (staff.id === data.id ? data : staff))
    );
    setIsFormOpen(false);
    setEditingStaff(null);
  };

  const handleEdit = (staffMember: StaffMember) => {
    setEditingStaff(staffMember);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (staffToDelete) {
      setStaffList((prev) => prev.filter((staff) => staff.id !== staffToDelete.id));
      setStaffToDelete(null);
    }
  };

  const openFormForNew = () => {
    setEditingStaff(null);
    setIsFormOpen(true);
  };
  
  const closeForm = () => {
    setEditingStaff(null);
    setIsFormOpen(false);
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Staff Management</CardTitle>
              <CardDescription>
                Manage staff member records and information.
              </CardDescription>
            </div>
            <Button onClick={openFormForNew} size="lg">
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Staff
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {staffList.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <UsersIcon className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Staff Members Yet</h3>
                <p className="text-muted-foreground mb-4">Click &quot;Add New Staff&quot; to get started.</p>
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service No.</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell>{staff.serviceNumber}</TableCell>
                    <TableCell>{staff.rank}</TableCell>
                    <TableCell>{`${staff.firstName} ${staff.lastName}`}</TableCell>
                    <TableCell>{staff.email}</TableCell>
                    <TableCell>{staff.role}</TableCell>
                    <TableCell>
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
      </Card>

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
          <div className="py-4">
            <StaffForm
              onSubmit={editingStaff ? handleUpdateStaff : handleAddStaff}
              defaultValues={editingStaff || undefined}
              onCancel={closeForm}
              isEditing={!!editingStaff}
            />
          </div>
        </DialogContent>
      </Dialog>

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

// Helper icon for empty state, replace if you have a better one
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
