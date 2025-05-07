
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Users as UsersIconLucide, UploadCloud, Info, Edit3, Briefcase, FileText, GraduationCap, Gavel, ShieldCheck, ListChecks, User } from "lucide-react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { StaffMember } from "./staff-schema";
import { StaffForm } from "./components/staff-form";
import { RANKS } from "./staff-schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// Import initial data from other modules
import { initialTrainingLogs, type TrainingLog } from "../training/page";
import { initialMeetings, type Meeting } from "../meetings/page";
import { initialDisciplineActions, type DisciplineAction } from "../discipline/page";
import { initialPdps, type Pdp } from "../pdps/page";
import { initialAudits, type SafetyAudit } from "../audits/page";


export const initialStaff: StaffMember[] = [
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
    squadron: "123 Squadron" 
  },
  {
    id: "2g8c4d3b-9f2e-5g0b-9c8d-7e6f5g4b3c2d",
    serviceNumber: "8005678",
    rank: "FLGOFF",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "0423456789",
    role: "Safety Officer",
    joinDate: new Date("2020-01-20"),
    squadron: "456 Squadron"
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
    squadron: "123 Squadron"
  },
  { 
    id: "4i0e6f5d-1h4g-7i2d-1e0f-9g8h7i6d5e4f",
    serviceNumber: "8012345",
    rank: "SQNLDR",
    firstName: "Robert",
    lastName: "Brown",
    email: "robert.brown@example.com",
    role: "Wing Training Coordinator",
    joinDate: new Date("2015-03-01"),
    squadron: "721 Wing HQ"
  }
];

type StaffGroup = {
  squadronName: string;
  staffMembers: StaffMember[];
};

// Helper function to parse MemberName into rank, firstName, and lastName
function parseMemberNameAndRank(memberNameInput: string): { rank: typeof RANKS[number] | null, firstName: string | null, lastName: string | null } {
  let rank: typeof RANKS[number] | null = null;
  let namePart = memberNameInput.trim();

  for (const r of RANKS) {
    if (namePart.toUpperCase().startsWith(r + " ")) {
      rank = r;
      namePart = namePart.substring(r.length).trim();
      break;
    }
  }

  if (!namePart) return { rank, firstName: null, lastName: null };

  // Try "LastName, FirstName"
  const commaIndex = namePart.indexOf(',');
  if (commaIndex > 0 && commaIndex < namePart.length - 1) { // Ensure comma is not at start or end
    const lastName = namePart.substring(0, commaIndex).trim();
    const firstName = namePart.substring(commaIndex + 1).trim();
    if (lastName && firstName) {
      return { rank, firstName, lastName };
    }
  }

  // Try "FirstName LastName" or "FirstName MiddleName LastName"
  const parts = namePart.split(' ').filter(p => p); // Filter out empty strings from multiple spaces
  if (parts.length >= 2) {
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    if (firstName && lastName) {
      return { rank, firstName, lastName };
    }
  }
  
  // If only one name part left (e.g. "Smith")
  if (parts.length === 1 && parts[0]) {
     // Cannot reliably determine if it's first or last.
     // Let's assume it's a last name for now, user might need to correct.
    return { rank, firstName: null, lastName: parts[0] };
  }
  
  // Fallback: if namePart is not empty but couldn't be parsed into first/last
  return { rank, firstName: null, lastName: namePart }; // lastName will hold the unparsed part
}


export default function StaffPage() {
  const [staffList, setStaffList] = React.useState<StaffMember[]>(initialStaff);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingStaff, setEditingStaff] = React.useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = React.useState<StaffMember | null>(null);
  const [viewingStaffMember, setViewingStaffMember] = React.useState<StaffMember | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const staffGroups = React.useMemo(() => {
    const groups: Record<string, StaffMember[]> = {};
    staffList.forEach(staff => {
      const sqn = staff.squadron || "Unassigned";
      if (!groups[sqn]) {
        groups[sqn] = [];
      }
      groups[sqn].push(staff);
    });

    return Object.entries(groups)
      .map(([squadronName, staffMembers]) => ({
        squadronName,
        staffMembers: staffMembers.sort((a, b) => {
          const rankAIndex = RANKS.indexOf(a.rank);
          const rankBIndex = RANKS.indexOf(b.rank);
          if (rankAIndex !== rankBIndex) {
            return rankBIndex - rankAIndex; // Higher rank first
          }
          return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
        }),
      }))
      .sort((a, b) => a.squadronName.localeCompare(b.squadronName));
  }, [staffList]);

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
        const headerLine = lines[0].trim();
        const header = headerLine.split(',').map(h => h.trim());
        const expectedHeader = ["MemberUID", "MemberName", "PrimaryUnit", "Appointment", "EmailAddress", "PhoneNumber", "Address"];
        
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
                
                const csvData: Record<string, string> = {};
                header.forEach((col, index) => {
                    csvData[col] = values[index];
                });

                const { rank, firstName, lastName } = parseMemberNameAndRank(csvData.MemberName);

                if (!rank) {
                  errors.push(`Row ${i + 1}: Could not parse rank from MemberName "${csvData.MemberName}". Ensure it starts with a valid rank (e.g., FLTLT).`);
                  continue;
                }
                if (!firstName || !lastName) {
                  errors.push(`Row ${i + 1}: Could not parse first and last name from MemberName "${csvData.MemberName}". Expected format like "RANK LastName, FirstName" or "RANK FirstName LastName".`);
                  continue;
                }

                const serviceNumber = csvData.MemberUID;
                const email = csvData.EmailAddress;
                const role = csvData.Appointment;
                const squadron = csvData.PrimaryUnit || undefined; // Optional
                const phone = csvData.PhoneNumber || undefined; // Optional
                // Address (csvData.Address) is ignored as per current spec.

                if (!serviceNumber || !email || !role) {
                    errors.push(`Row ${i + 1}: Missing required fields (MemberUID, EmailAddress, Appointment).`);
                    continue;
                }
                                
                if (!/^\S+@\S+\.\S+$/.test(email)) {
                    errors.push(`Row ${i+1}: Invalid email format for "${email}".`);
                    continue;
                }

                const isDuplicate = staffList.some(s => s.serviceNumber === serviceNumber || s.email === email) ||
                                    importedMembers.some(s => s.serviceNumber === serviceNumber || s.email === email);
                if (isDuplicate) {
                    errors.push(`Row ${i + 1}: Duplicate MemberUID or EmailAddress for "${serviceNumber}/${email}". Skipped.`);
                    continue;
                }

                importedMembers.push({
                    id: crypto.randomUUID(),
                    serviceNumber: serviceNumber,
                    rank: rank,
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    phone: phone,
                    role: role,
                    squadron: squadron,
                    joinDate: undefined, // joinDate is not in this CSV format
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
            duration: 10000, 
        });
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
      }
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "Import Error", description: "Failed to read the file."});
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
      }
    };
    reader.readAsText(file);
  };

  // Prepare data for the view details dialog
  const currentStaffFullName = viewingStaffMember ? `${viewingStaffMember.firstName} ${viewingStaffMember.lastName}` : "";
  const staffNameForTrainingLog = viewingStaffMember ? `${viewingStaffMember.lastName}, ${viewingStaffMember.firstName}` : "";

  const filteredTrainingLogs = React.useMemo(() => {
    if (!viewingStaffMember) return [];
    // Match more reliably using service number if it were available in TrainingLog.
    // For now, using name and rank.
    return initialTrainingLogs.filter(log => 
      log.staffName.toLowerCase() === staffNameForTrainingLog.toLowerCase() && 
      log.rank === viewingStaffMember.rank &&
      log.squadron === viewingStaffMember.squadron // Assuming training logs should also match squadron for relevance to *this* staff profile view.
    );
  }, [viewingStaffMember, staffNameForTrainingLog]);

  const filteredMeetings = React.useMemo(() => {
    if (!viewingStaffMember) return [];
    return initialMeetings.filter(meeting => meeting.attendees.toLowerCase().includes(currentStaffFullName.toLowerCase()));
  }, [viewingStaffMember, currentStaffFullName]);

  const filteredPdps = React.useMemo(() => {
    if (!viewingStaffMember) return [];
    return initialPdps.filter(pdp => pdp.staffName.toLowerCase() === currentStaffFullName.toLowerCase());
  }, [viewingStaffMember, currentStaffFullName]);

  const filteredDisciplineActions = React.useMemo(() => {
    if (!viewingStaffMember) return [];
    return initialDisciplineActions.filter(action => action.staffName.toLowerCase() === currentStaffFullName.toLowerCase());
  }, [viewingStaffMember, currentStaffFullName]);
  
  const filteredAudits = React.useMemo(() => {
    if (!viewingStaffMember) return [];
    return initialAudits.filter(audit => 
      audit.auditorName.toLowerCase() === currentStaffFullName.toLowerCase() || 
      (audit.findings && audit.findings.some(f => f.assignedTo?.toLowerCase() === currentStaffFullName.toLowerCase()))
    );
  }, [viewingStaffMember, currentStaffFullName]);


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
               <User className="h-8 w-8 text-primary hidden sm:block" />
              <div>
                <CardTitle className="text-2xl">Staff Management</CardTitle>
                <CardDescription>
                  Manage staff member records and information, grouped by squadron.
                </CardDescription>
              </div>
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
      </Card>

      {staffGroups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <UsersIconLucide className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Staff Members Yet</h3>
              <p className="text-muted-foreground mb-4">Click &quot;Add New Staff&quot; or &quot;Import CSV&quot; to get started.</p>
            </CardContent>
          </Card>
      ) : (
        staffGroups.map(group => (
          <Card key={group.squadronName} className="shadow-xl mb-8">
            <CardHeader className="bg-muted/20 dark:bg-muted/10 border-b rounded-t-lg">
              <CardTitle className="text-xl">Squadron: {group.squadronName}</CardTitle>
              <CardDescription>{group.staffMembers.length} staff member(s)</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service No.</TableHead>
                    <TableHead>Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden lg:table-cell">Role</TableHead>
                    <TableHead className="hidden lg:table-cell">Join Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.staffMembers.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell>{staff.serviceNumber}</TableCell>
                      <TableCell>{staff.rank}</TableCell>
                      <TableCell>{`${staff.firstName} ${staff.lastName}`}</TableCell>
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
            </CardContent>
            {group.staffMembers.length === 0 && (
                 <CardContent>
                    <p className="text-muted-foreground text-center py-4">No staff members in this squadron.</p>
                 </CardContent>
            )}
          </Card>
        ))
      )}
      
      {staffList.length > 0 && (
         <Card className="mt-4">
            <CardFooter className="text-xs text-muted-foreground pt-4 justify-center">
                Total staff members: {staffList.length} across {staffGroups.length} squadron(s).
            </CardFooter>
         </Card>
      )}

      <Alert className="mt-8">
        <UploadCloud className="h-4 w-4" />
        <AlertTitle>CSV Import Instructions</AlertTitle>
        <AlertDescription>
          To bulk import staff members, upload a CSV file with the following columns in order:
          <ul className="list-disc pl-5 mt-2 text-xs">
            <li><code>MemberUID</code> (Text, Required, e.g., &quot;8001234&quot;)</li>
            <li><code>MemberName</code> (Text, Required. Format: &quot;RANK LastName, FirstName&quot; e.g., &quot;FLTLT Smith, Jane&quot; or &quot;RANK FirstName LastName&quot; e.g., &quot;FLTLT Jane Doe&quot;. RANK must be one of: {RANKS.join(", ")})</li>
            <li><code>PrimaryUnit</code> (Text, Optional, e.g., &quot;123 Squadron&quot;)</li>
            <li><code>Appointment</code> (Text, Required, e.g., &quot;Commanding Officer&quot;)</li>
            <li><code>EmailAddress</code> (Text, Required, Valid email format, e.g., &quot;jane.smith@example.com&quot;)</li>
            <li><code>PhoneNumber</code> (Text, Optional, e.g., &quot;0412345678&quot;)</li>
            <li><code>Address</code> (Text, Optional. This column is currently ignored by the import process.)</li>
          </ul>
          The first row must be a header row with these exact names. MemberUID and EmailAddress must be unique per staff member.
          Join Date is not part of this import format and will be unassigned.
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
            <DialogContent className="sm:max-w-4xl"> {/* Increased width for more content */}
                <DialogHeader>
                    <DialogTitle>{viewingStaffMember.rank} {viewingStaffMember.firstName} {viewingStaffMember.lastName}</DialogTitle>
                    <DialogDescription>
                       Service No: {viewingStaffMember.serviceNumber} | Role: {viewingStaffMember.role} | Squadron: {viewingStaffMember.squadron || 'N/A'}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1 pr-4">
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div>
                                <h3 className="font-semibold text-sm mb-1">Email</h3>
                                <p className="text-sm text-muted-foreground truncate">{viewingStaffMember.email}</p>
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
                        
                        <Accordion type="multiple" className="w-full" collapsible>
                          <AccordionItem value="training">
                            <AccordionTrigger>
                              <div className="flex items-center gap-2">
                                <GraduationCap className="h-5 w-5 text-primary" />
                                Training Records ({filteredTrainingLogs.length})
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              {filteredTrainingLogs.length > 0 ? (
                                <ul className="space-y-2">
                                  {filteredTrainingLogs.map(log => (
                                    <li key={log.id} className="text-sm p-2 border rounded-md bg-muted/50">
                                      <strong>{log.courseName}</strong> - Completed: {format(log.completionDate, "PP")}
                                      {log.qualificationAchieved && <p className="text-xs text-muted-foreground">Qual: {log.qualificationAchieved}</p>}
                                    </li>
                                  ))}
                                </ul>
                              ) : <p className="text-sm text-muted-foreground p-2">No training records found.</p>}
                            </AccordionContent>
                          </AccordionItem>

                          <AccordionItem value="meetings">
                             <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                   <FileText className="h-5 w-5 text-primary" />
                                    Meetings Attended ({filteredMeetings.length})
                                </div>
                             </AccordionTrigger>
                            <AccordionContent>
                              {filteredMeetings.length > 0 ? (
                                <ul className="space-y-2">
                                  {filteredMeetings.map(meeting => (
                                    <li key={meeting.id} className="text-sm p-2 border rounded-md bg-muted/50">
                                      <strong>{meeting.title}</strong> - Date: {format(meeting.date, "PP")}
                                      <p className="text-xs text-muted-foreground truncate">Agenda: {meeting.agenda.split('\n')[0]}</p>
                                    </li>
                                  ))}
                                </ul>
                              ) : <p className="text-sm text-muted-foreground p-2">No meeting records found.</p>}
                            </AccordionContent>
                          </AccordionItem>

                           <AccordionItem value="pdps">
                             <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                   <Briefcase className="h-5 w-5 text-primary" />
                                   Professional Development ({filteredPdps.length})
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              {filteredPdps.length > 0 ? (
                                <ul className="space-y-2">
                                  {filteredPdps.map(pdp => (
                                    <li key={pdp.id} className="text-sm p-2 border rounded-md bg-muted/50">
                                      <strong>PDP Period: {pdp.pdpPeriod}</strong>
                                      <p className="text-xs text-muted-foreground">Goals: {pdp.goals.length}</p>
                                      {pdp.reviewDate && <p className="text-xs text-muted-foreground">Next Review: {format(pdp.reviewDate, "PP")}</p>}
                                    </li>
                                  ))}
                                </ul>
                              ) : <p className="text-sm text-muted-foreground p-2">No PDPs found.</p>}
                            </AccordionContent>
                          </AccordionItem>

                          <AccordionItem value="discipline">
                             <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                    <Gavel className="h-5 w-5 text-primary" />
                                    Discipline Actions ({filteredDisciplineActions.length})
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              {filteredDisciplineActions.length > 0 ? (
                                <ul className="space-y-2">
                                  {filteredDisciplineActions.map(action => (
                                    <li key={action.id} className="text-sm p-2 border rounded-md bg-muted/50">
                                      <strong>{action.typeOfAction}</strong> - Incident Date: {format(action.dateOfIncident, "PP")}
                                      <p className="text-xs text-muted-foreground truncate">Description: {action.incidentDescription}</p>
                                    </li>
                                  ))}
                                </ul>
                              ) : <p className="text-sm text-muted-foreground p-2">No discipline actions found.</p>}
                            </AccordionContent>
                          </AccordionItem>
                          
                           <AccordionItem value="audits">
                             <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-primary" />
                                    Safety Audits Involved In ({filteredAudits.length})
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              {filteredAudits.length > 0 ? (
                                <ul className="space-y-2">
                                  {filteredAudits.map(audit => (
                                    <li key={audit.id} className="text-sm p-2 border rounded-md bg-muted/50">
                                      <strong>{audit.auditTitle}</strong> - Date: {format(audit.auditDate, "PP")}
                                      <p className="text-xs text-muted-foreground">Type: {audit.auditType}</p>
                                    </li>
                                  ))}
                                </ul>
                              ) : <p className="text-sm text-muted-foreground p-2">No safety audits found where this member was involved.</p>}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t mt-4">
                    <Button variant="outline" onClick={() => {
                      if (viewingStaffMember) {
                        handleEdit(viewingStaffMember);
                      }
                    }}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
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
    
