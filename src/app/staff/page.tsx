
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Users as UsersIconLucide, UploadCloud, Info, Edit3, Briefcase, FileText, GraduationCap, Gavel, ShieldCheck, ListChecks, User, Loader2, AlertTriangle, AlertCircle } from "lucide-react";
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
// Badge component is not used directly in this file after recent changes, can be removed if not needed by child components passed here.
// import { Badge } from "@/components/ui/badge";
import { useStaff, useAddStaff, useUpdateStaff, useDeleteStaff } from '@/hooks/useStaffData'; // Import hooks

// Import types for related data (actual data will be fetched or passed)
// TODO: Fetch this data dynamically in the View Details dialog based on staff member ID
import type { TrainingLog } from "../training/training-schema";
import type { Meeting } from "../meetings/meeting-schema";
import type { DisciplineAction } from "../discipline/discipline-schema";
import type { Pdp } from "../pdps/pdp-schema";
import type { SafetyAudit } from "../audits/audit-schema";


type StaffGroup = {
  squadronName: string;
  staffMembers: StaffMember[];
};

// Helper function to parse MemberName - Keep this for CSV import logic
function parseMemberNameAndRank(memberNameInput: string): { rank: typeof RANKS[number] | null, firstName: string | null, lastName: string | null } {
  let rank: typeof RANKS[number] | null = null;
  let namePart = memberNameInput.trim();

  const sortedRanksForParsing = [...RANKS].sort((a, b) => b.length - a.length);

  for (const r of sortedRanksForParsing) {
    if (namePart.toUpperCase().startsWith(r + " ")) {
      rank = r as typeof RANKS[number];
      namePart = namePart.substring(r.length).trim();
      break;
    }
  }

  if (!namePart) return { rank, firstName: null, lastName: null };

  // Expect "FirstName LastName" or "FirstName MiddleName LastName"
  const parts = namePart.split(' ').filter(p => p);
  if (parts.length >= 2) {
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    if (firstName && lastName) {
      return { rank, firstName, lastName };
    }
  }

  if (parts.length === 1 && parts[0]) {
    return { rank, firstName: null, lastName: parts[0] };
  }

  return { rank, firstName: null, lastName: namePart };
}


export default function StaffPage() {
  // --- Use React Query Hooks ---
  const { data: staffList = [], isLoading, error } = useStaff(); // Default to empty array
  const addStaffMutation = useAddStaff();
  const updateStaffMutation = useUpdateStaff();
  const deleteStaffMutation = useDeleteStaff();
  // --- End React Query Hooks ---

  // State for managing UI elements (forms, dialogs)
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingStaff, setEditingStaff] = React.useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = React.useState<StaffMember | null>(null);
  const [viewingStaffMember, setViewingStaffMember] = React.useState<StaffMember | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isImportingCsv, setIsImportingCsv] = React.useState(false);


  // Grouping logic remains the same, but uses staffList from useStaff
  const staffGroups = React.useMemo(() => {
    if (!staffList) return []; // Handle case where data might be undefined initially
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
        // Sorting logic remains the same
        staffMembers: staffMembers.sort((a, b) => {
          const rankAIndex = RANKS.indexOf(a.rank);
          const rankBIndex = RANKS.indexOf(b.rank);
          if (rankAIndex !== rankBIndex) {
            return rankBIndex - rankAIndex;
          }
          return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
        }),
      }))
      .sort((a, b) => a.squadronName.localeCompare(b.squadronName));
  }, [staffList]);

  // --- Update Handlers to use Mutations ---
  const handleAddStaff = async (data: Omit<StaffMember, 'id'>) => {
    try {
      await addStaffMutation.mutateAsync(data);
      setIsFormOpen(false);
      toast({ title: "Success", description: "Staff member added." });
    } catch (err: any) {
      console.error("Failed to add staff:", err);
      toast({ variant: "destructive", title: "Error", description: `Failed to add staff member: ${err.message}` });
    }
  };

  const handleUpdateStaff = async (data: StaffMember) => {
     if (!data.id) {
        toast({ variant: "destructive", title: "Error", description: "Cannot update staff member without an ID." });
        return;
     }
    try {
      await updateStaffMutation.mutateAsync(data);
      setIsFormOpen(false);
      setEditingStaff(null);
      toast({ title: "Success", description: "Staff member updated." });
    } catch (err: any) {
      console.error("Failed to update staff:", err);
      toast({ variant: "destructive", title: "Error", description: `Failed to update staff member: ${err.message}` });
    }
  };

  const handleDeleteConfirm = async () => {
    if (staffToDelete && staffToDelete.id) {
       try {
        await deleteStaffMutation.mutateAsync(staffToDelete.id);
        setStaffToDelete(null);
        toast({ title: "Success", description: "Staff member deleted." });
       } catch (err: any) {
         console.error("Failed to delete staff:", err);
         toast({ variant: "destructive", title: "Error", description: `Failed to delete staff member: ${err.message}` });
         setStaffToDelete(null); // Close dialog even on error
       }
    }
  };
  // --- End Updated Handlers ---


  // Edit, View, Close handlers remain mostly the same (manage local UI state)
  const handleEdit = (staffMember: StaffMember) => {
    setEditingStaff(staffMember);
    setViewingStaffMember(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (staffMember: StaffMember) => {
    // TODO: Fetch related data (training, meetings, pdps, discipline, audits)
    // based on staffMember.id and set it to respective states or pass to dialog.
    // For now, the filtering logic below uses placeholder data.
    setViewingStaffMember(staffMember);
    setEditingStaff(null);
    setIsFormOpen(false);
  };

  const closeViewDialog = () => {
    setViewingStaffMember(null);
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

  // CSV Import Logic
  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ variant: "destructive", title: "Import Error", description: "No file selected." });
      return;
    }
    setIsImportingCsv(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          toast({ variant: "destructive", title: "Import Error", description: "Could not read file content." });
          setIsImportingCsv(false);
          return;
        }

        const membersToAdd: Omit<StaffMember, 'id'>[] = [];
        const errors: string[] = [];
        const lines = text.split(/\r\n|\n/);

        if (lines.length < 2) {
          errors.push("CSV must have a header and at least one data row.");
        } else {
          const headerLine = lines[0].trim();
          const csvHeader = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, '')); // Clean header
          const expectedHeader = ["MemberUID", "MemberName", "PrimaryUnit", "Appointment", "EmailAddress", "PhoneNumber", "Address"];

          // Check if all expected headers are present, order doesn't strictly matter for this check
          // but we will enforce order for value extraction.
          const allExpectedHeadersPresent = expectedHeader.every(eh => csvHeader.includes(eh));
          const headersMatchOrder = JSON.stringify(csvHeader) === JSON.stringify(expectedHeader);


          if (!headersMatchOrder) { // Strict check for order and content
              errors.push(`Invalid CSV header or order. Expected: "${expectedHeader.join(',')}" (in this exact order). Got: "${csvHeader.join(',')}"`);
          } else {
              const existingStaffNumbers = new Set(staffList.map(s => s.serviceNumber));
              const existingEmails = new Set(staffList.map(s => s.email));

              for (let i = 1; i < lines.length; i++) {
                  const line = lines[i].trim();
                  if (!line) continue;

                  // Robust CSV line parser
                  const values = [];
                  let currentVal = '';
                  let inQuotes = false;
                  for (let charIndex = 0; charIndex < line.length; charIndex++) {
                      const char = line[charIndex];
                      if (char === '"' && (charIndex === 0 || line[charIndex-1] !== '"')) { // Handle " at start or non-escaped "
                          if (inQuotes && charIndex + 1 < line.length && line[charIndex+1] === '"') { // Escaped double quote ""
                              currentVal += '"';
                              charIndex++; // Skip next quote
                          } else {
                              inQuotes = !inQuotes;
                          }
                      } else if (char === ',' && !inQuotes) {
                          values.push(currentVal.trim());
                          currentVal = '';
                      } else {
                          currentVal += char;
                      }
                  }
                  values.push(currentVal.trim()); // Add last value

                  if (values.length !== csvHeader.length) {
                      errors.push(`Row ${i + 1}: Column count mismatch. Expected ${csvHeader.length}, got ${values.length}. Line: "${line}"`);
                      continue;
                  }

                  const csvData: Record<string, string> = {};
                  csvHeader.forEach((header, index) => {
                      csvData[header] = values[index].replace(/^"|"$/g, ''); // Also remove quotes from values
                  });


                  const { rank, firstName, lastName } = parseMemberNameAndRank(csvData.MemberName);

                  if (!rank) {
                    errors.push(`Row ${i + 1}: Could not parse rank from MemberName "${csvData.MemberName}". Ensure it starts with a valid rank (e.g., ${RANKS[RANKS.length-1]}). Valid ranks: ${RANKS.join(", ")}`);
                    continue;
                  }
                  if (!firstName || !lastName) {
                    errors.push(`Row ${i + 1}: Could not parse first and last name from MemberName "${csvData.MemberName}". Expected format "RANK FirstName LastName". Received: "${csvData.MemberName}". Parsed Name Part: "${csvData.MemberName.substring(rank.length).trim()}"`);
                    continue;
                  }

                  const serviceNumber = csvData.MemberUID;
                  const email = csvData.EmailAddress;
                  const role = csvData.Appointment;
                  const squadron = csvData.PrimaryUnit || undefined;
                  const phone = csvData.PhoneNumber || undefined;

                  if (!serviceNumber || !email || !role) {
                      errors.push(`Row ${i + 1}: Missing required fields (MemberUID, EmailAddress, Appointment).`);
                      continue;
                  }

                  if (!/^\S+@\S+\.\S+$/.test(email)) {
                      errors.push(`Row ${i+1}: Invalid email format for "${email}".`);
                      continue;
                  }

                  if (existingStaffNumbers.has(serviceNumber) || existingEmails.has(email) || membersToAdd.some(m => m.serviceNumber === serviceNumber || m.email === email)) {
                      errors.push(`Row ${i + 1}: Duplicate MemberUID or EmailAddress for "${serviceNumber}/${email}". Skipped.`);
                      continue;
                  }

                  membersToAdd.push({
                      serviceNumber: serviceNumber,
                      rank: rank,
                      firstName: firstName,
                      lastName: lastName,
                      email: email,
                      phone: phone,
                      role: role,
                      squadron: squadron,
                      joinDate: undefined, // Join date not in CSV
                  });
              }
          }
        }

        let importedCount = 0;
        if (membersToAdd.length > 0) {
          for (const member of membersToAdd) {
             try {
                 // Await the mutation to ensure sequential addition
                 await addStaffMutation.mutateAsync(member);
                 importedCount++;
             } catch (err: any) {
                 errors.push(`Failed to import ${member.rank} ${member.firstName} ${member.lastName} (UID: ${member.serviceNumber}): ${err.message}`);
                 // Decide if you want to stop the import on first error or continue
                 // break; // Uncomment to stop on first error
             }
          }
        }

        // Consolidate toast notifications
        if (importedCount > 0 && errors.length === 0) {
            toast({ title: "Import Complete", description: `${importedCount} staff member(s) imported successfully.` });
        } else if (importedCount > 0 && errors.length > 0) {
            const errorMessages = errors.slice(0, 5).join("\n") + (errors.length > 5 ? "\n...and more errors." : "");
            toast({
                variant: "default", // Consider it partially successful
                title: "CSV Import Partially Successful",
                description: (
                  <ScrollArea className="max-h-40">
                    <pre className="whitespace-pre-wrap text-xs">
                      {importedCount} records imported. Some rows had errors:
                      <br />
                      {errorMessages}
                    </pre>
                  </ScrollArea>
                ),
                duration: 10000,
            });
        } else if (errors.length > 0) { // No imports, only errors
            const errorMessages = errors.slice(0, 5).join("\n") + (errors.length > 5 ? "\n...and more errors." : "");
            toast({
                variant: "destructive",
                title: "CSV Import Failed",
                description: (
                  <ScrollArea className="max-h-40">
                    <pre className="whitespace-pre-wrap text-xs">
                        {errorMessages}
                    </pre>
                  </ScrollArea>
                ),
                duration: 10000,
            });
        } else if (importedCount === 0 && errors.length === 0 && lines.length > 1) {
            // No members to add (e.g., all duplicates or empty data rows) but no parsing errors.
            toast({ title: "Import Information", description: "No new staff members were imported. Data might be empty or all entries already exist." });
        }


      } catch (error: any) {
        console.error("Error during CSV import processing:", error);
        toast({ variant: "destructive", title: "Import Error", description: `An unexpected error occurred: ${error.message}` });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setIsImportingCsv(false); // Ensure state is reset
      }
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "Import Error", description: "Failed to read the file."});
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsImportingCsv(false); // Ensure state is reset
    };
    reader.readAsText(file);
  };


  // Related data fetching logic - Placeholder, needs actual implementation using React Query
  const currentStaffFullName = viewingStaffMember ? `${viewingStaffMember.firstName} ${viewingStaffMember.lastName}` : "";
  const staffNameForTrainingLog = viewingStaffMember ? `${viewingStaffMember.lastName}, ${viewingStaffMember.firstName}` : "";

  // TODO: Replace these with actual data fetching hooks or logic based on viewingStaffMember.id
  const filteredTrainingLogs: TrainingLog[] = React.useMemo(() => {
    if (!viewingStaffMember) return [];
    console.warn("TODO: Implement backend fetch for training logs for staff member:", viewingStaffMember.id);
    return [];
  }, [viewingStaffMember]);

  const filteredMeetings: Meeting[] = React.useMemo(() => {
    if (!viewingStaffMember) return [];
    console.warn("TODO: Implement backend fetch for meetings for staff member:", viewingStaffMember.id);
    return [];
  }, [viewingStaffMember]);

  const filteredPdps: Pdp[] = React.useMemo(() => {
    if (!viewingStaffMember) return [];
    console.warn("TODO: Implement backend fetch for PDPs for staff member:", viewingStaffMember.id);
    return [];
  }, [viewingStaffMember]);

  const filteredDisciplineActions: DisciplineAction[] = React.useMemo(() => {
    if (!viewingStaffMember) return [];
    console.warn("TODO: Implement backend fetch for discipline actions for staff member:", viewingStaffMember.id);
    return [];
  }, [viewingStaffMember]);

  const filteredAudits: SafetyAudit[] = React.useMemo(() => {
    if (!viewingStaffMember) return [];
    console.warn("TODO: Implement backend fetch for audits involving staff member:", viewingStaffMember.id);
    return [];
  }, [viewingStaffMember]);


  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <UsersIconLucide className="h-8 w-8 text-primary hidden sm:block" />
              <div>
                <CardTitle className="text-2xl">Staff Management</CardTitle>
                <CardDescription>Manage staff profiles, qualifications, and assignments.</CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button onClick={openFormForNew} size="lg" className="w-full sm:w-auto" disabled={addStaffMutation.isPending || isImportingCsv}>
                 {(addStaffMutation.isPending && !isImportingCsv) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                 Add New Staff
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} size="lg" variant="outline" className="w-full sm:w-auto" disabled={isImportingCsv || addStaffMutation.isPending || updateStaffMutation.isPending || deleteStaffMutation.isPending}>
                   {isImportingCsv ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
                 Import CSV
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleCsvImport} accept=".csv" style={{ display: 'none' }} />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Loading and Error States */}
      {isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading staff data...</p>
          </CardContent>
        </Card>
      )}
      {error && !isLoading && (
        <Card className="border-destructive">
          <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle /> Error Loading Staff</CardTitle>
          </CardHeader>
          <CardContent>
              <p className="text-destructive mb-4">{error.message}</p>
              {/* Optionally add a retry button here */}
          </CardContent>
        </Card>
      )}

      {/* Staff List Display */}
      {!isLoading && !error && staffGroups.length === 0 && (
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <UsersIconLucide className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Staff Members Found</h3>
                <p className="text-muted-foreground mb-4">Add staff members manually or import a CSV file.</p>
            </CardContent>
        </Card>
      )}

      {!isLoading && !error && staffGroups.length > 0 && staffGroups.map(group => (
        <Card key={group.squadronName} className="shadow-xl mb-8">
          <CardHeader className="bg-muted/20 dark:bg-muted/10 border-b">
            <CardTitle className="text-2xl">Squadron: {group.squadronName}</CardTitle>
            <CardDescription>{group.staffMembers.length} staff member(s)</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 px-0 sm:px-0">
            {group.staffMembers.length === 0 ? (
              <p className="text-muted-foreground text-center p-6">No staff members in this squadron.</p>
            ) : (
              <ScrollArea className="max-h-[600px]"> {/* Add ScrollArea for long lists within a squadron */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service No.</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Role</TableHead>
                      <TableHead className="hidden lg:table-cell">Join Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.staffMembers.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell>{staff.serviceNumber}</TableCell>
                        <TableCell>{staff.rank}</TableCell>
                        <TableCell className="font-medium">{`${staff.firstName} ${staff.lastName}`}</TableCell>
                        <TableCell className="hidden md:table-cell">{staff.role}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {staff.joinDate ? format(staff.joinDate, "PP") : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" disabled={updateStaffMutation.isPending || deleteStaffMutation.isPending || isImportingCsv}>
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewDetails(staff)} disabled={updateStaffMutation.isPending || deleteStaffMutation.isPending || isImportingCsv}>
                                <Info className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(staff)} disabled={updateStaffMutation.isPending || deleteStaffMutation.isPending || isImportingCsv}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setStaffToDelete(staff)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                disabled={updateStaffMutation.isPending || deleteStaffMutation.isPending || isImportingCsv}
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
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Total Count Footer */}
      {!isLoading && !error && staffList.length > 0 && (
        <Card>
          <CardFooter className="text-xs text-muted-foreground pt-4 justify-center">
              Total staff members: {staffList.length} across {staffGroups.length} squadron(s).
          </CardFooter>
        </Card>
      )}

      {/* CSV Import Instructions */}
       <Alert className="mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>CSV Import Instructions</AlertTitle>
        <AlertDescription>
          To bulk import staff members, upload a CSV file with the following columns in order:
          <ul className="list-disc pl-5 mt-2 text-xs space-y-1">
            <li><code>MemberUID</code> (Text, Required, e.g., &quot;8001234&quot;)</li>
            <li><code>MemberName</code> (Text, Required. Format: &quot;RANK FirstName LastName&quot; e.g., &quot;FLTLT(AAFC) Jane Doe&quot;. RANK must be one of: {RANKS.join(", ")}.)</li>
            <li><code>PrimaryUnit</code> (Text, Optional, e.g., &quot;701 Squadron&quot;)</li>
            <li><code>Appointment</code> (Text, Required, e.g., &quot;Squadron Training Officer&quot;)</li>
            <li><code>EmailAddress</code> (Text, Required, e.g., &quot;jane.doe@example.com&quot;)</li>
            <li><code>PhoneNumber</code> (Text, Optional, e.g., &quot;0400123456&quot;)</li>
            <li><code>Address</code> (Text, Optional. Not currently stored but include column for future compatibility)</li>
          </ul>
          The first row must be a header row with these exact names. MemberUID and EmailAddress must be unique per staff member.
          Join Date is not part of this import format and will be unassigned.
        </AlertDescription>
      </Alert>


      {/* Add/Edit Dialog */}
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
                  isSubmitting={editingStaff ? updateStaffMutation.isPending : addStaffMutation.isPending}
                />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      {viewingStaffMember && (
         <Dialog open={!!viewingStaffMember} onOpenChange={closeViewDialog}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{viewingStaffMember.rank} {viewingStaffMember.firstName} {viewingStaffMember.lastName}</DialogTitle>
                    <DialogDescription>
                       Service No: {viewingStaffMember.serviceNumber} | Role: {viewingStaffMember.role} | Squadron: {viewingStaffMember.squadron || 'N/A'}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1 pr-4">
                    <div className="space-y-6 py-4">
                      {/* Contact Info */}
                      <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" /> Contact Information</CardTitle>
                          </CardHeader>
                          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="font-semibold">Email</p>
                                <p className="text-muted-foreground">{viewingStaffMember.email}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Phone</p>
                                <p className="text-muted-foreground">{viewingStaffMember.phone || "N/A"}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Join Date</p>
                                <p className="text-muted-foreground">{viewingStaffMember.joinDate ? format(viewingStaffMember.joinDate, "PPP") : "N/A"}</p>
                            </div>
                          </CardContent>
                      </Card>

                    {/* Accordion for related data */}
                    <Accordion type="multiple" collapsible className="w-full">
                      <AccordionItem value="training">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2 text-lg">
                            <GraduationCap className="h-5 w-5" /> Training Records ({filteredTrainingLogs.length}) {/* TODO: Implement dynamic count */}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {/* TODO: Replace with fetched data based on viewingStaffMember.id */}
                          {filteredTrainingLogs.length > 0 ? (
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                              {filteredTrainingLogs.map(log => (
                                <li key={log.id}>{log.courseName} - Completed: {format(log.completionDate, "PP")}
                                  {log.qualificationAchieved && ` (Qual: ${log.qualificationAchieved})`}
                                </li>
                              ))}
                            </ul>
                          ) : <p className="text-sm text-muted-foreground">No training records found.</p>}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="meetings">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2 text-lg">
                           <FileText className="h-5 w-5" /> Meetings Attended ({filteredMeetings.length}) {/* TODO: Implement dynamic count */}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            {/* TODO: Fetch meeting data based on viewingStaffMember.id */}
                            {filteredMeetings.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                {filteredMeetings.map(meeting => (
                                    <li key={meeting.id}>{meeting.title} - Date: {format(meeting.date, "PP")}
                                    <br/>Attendees: {meeting.attendees}
                                    </li>
                                ))}
                                </ul>
                            ) : <p className="text-sm text-muted-foreground">No meeting records found.</p>}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="pdps">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2 text-lg">
                            <Briefcase className="h-5 w-5" /> Professional Development ({filteredPdps.length}) {/* TODO: Implement dynamic count */}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            {/* TODO: Fetch PDP data based on viewingStaffMember.id */}
                            {filteredPdps.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                {filteredPdps.map(pdp => (
                                    <li key={pdp.id}>
                                    PDP Period: {pdp.pdpPeriod}
                                    <br/>Goals: {pdp.goals.length}
                                    {pdp.reviewDate && ` | Next Review: ${format(pdp.reviewDate, "PP")}`}
                                    </li>
                                ))}
                                </ul>
                            ) : <p className="text-sm text-muted-foreground">No PDPs found.</p>}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="discipline">
                        <AccordionTrigger>
                            <div className="flex items-center gap-2 text-lg">
                                <Gavel className="h-5 w-5" /> Discipline Actions ({filteredDisciplineActions.length}) {/* TODO: Implement dynamic count */}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            {/* TODO: Fetch Discipline data based on viewingStaffMember.id */}
                             {filteredDisciplineActions.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                {filteredDisciplineActions.map(action => (
                                    <li key={action.id}>
                                    {action.typeOfAction} - Incident Date: {format(action.dateOfIncident, "PP")}
                                    <br/>Description: {action.incidentDescription}
                                    </li>
                                ))}
                                </ul>
                            ) : <p className="text-sm text-muted-foreground">No discipline actions found.</p>}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="audits">
                        <AccordionTrigger>
                            <div className="flex items-center gap-2 text-lg">
                                <ShieldCheck className="h-5 w-5" /> Safety Audits Involved In ({filteredAudits.length}) {/* TODO: Implement dynamic count */}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                             {/* TODO: Fetch Audit data based on viewingStaffMember.id (e.g., if auditorName matches) */}
                            {filteredAudits.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                {filteredAudits.map(audit => (
                                    <li key={audit.id}>
                                    {audit.auditTitle} - Date: {format(audit.auditDate, "PP")}
                                    <br/>Type: {audit.auditType}
                                    </li>
                                ))}
                                </ul>
                            ) : <p className="text-sm text-muted-foreground">No safety audits found where this member was involved.</p>}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => {
                      if (viewingStaffMember) {
                        handleEdit(viewingStaffMember);
                      }
                    }}
                    disabled={updateStaffMutation.isPending || isImportingCsv}
                    >
                        <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
                    </Button>
                    <Button onClick={closeViewDialog} disabled={updateStaffMutation.isPending || isImportingCsv}>Close</Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
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
              <AlertDialogCancel onClick={() => setStaffToDelete(null)} disabled={deleteStaffMutation.isPending || isImportingCsv}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={deleteStaffMutation.isPending || isImportingCsv}
              >
                {deleteStaffMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}

