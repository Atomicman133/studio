
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Users as UsersIconLucide, UploadCloud, Info, Edit3, Briefcase, FileText, GraduationCap, Gavel, ShieldCheck, ListChecks, User, Loader2, AlertTriangle, AlertCircle, MapPin } from "lucide-react"; // Added MapPin
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
import { RANKS, STAFF_QUERY_KEY } from "./staff-schema";
import { format, isValid as isValidDate, parse as parseDateFns } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useStaff, useAddStaff, useUpdateStaff, useDeleteStaff } from '@/hooks/useStaffData';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';

import type { TrainingLog } from "../training/training-schema";
import { convertLogTimestamps as convertTrainingLogTimestamps } from "../training/page";
import type { Meeting } from "../meetings/meeting-schema";
import type { DisciplineAction } from "../discipline/discipline-schema";
import type { Pdp } from "../pdps/pdp-schema";
import type { SafetyAudit } from "../audits/audit-schema";


type StaffGroup = {
  squadronName: string;
  staffMembers: StaffMember[];
};

const STAFF_TRAINING_LOGS_QUERY_KEY = 'staffTrainingLogs';

async function fetchTrainingLogsForStaff(staffMember: StaffMember | null): Promise<TrainingLog[]> {
  if (!staffMember) return [];

  const logsCollectionRef = collection(db, 'trainingLogs');
  const q = query(
    logsCollectionRef,
    where('staffName', '==', `${staffMember.lastName}, ${staffMember.firstName}`),
    where('rank', '==', staffMember.rank),
    where('squadron', '==', staffMember.squadron),
    orderBy('completionDate', 'desc')
  );

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTrainingLogTimestamps(doc.data()),
    })) as TrainingLog[];
  } catch (error) {
    console.error("Error fetching training logs for staff:", error);
    return [];
  }
}

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
  const { data: staffList = [], isLoading, error } = useStaff();
  const addStaffMutation = useAddStaff();
  const updateStaffMutation = useUpdateStaff();
  const deleteStaffMutation = useDeleteStaff();
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingStaff, setEditingStaff] = React.useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = React.useState<StaffMember | null>(null);
  const [viewingStaffMember, setViewingStaffMember] = React.useState<StaffMember | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isImportingCsv, setIsImportingCsv] = React.useState(false);

  const {
    data: viewedStaffTrainingLogs = [],
    isLoading: isLoadingViewedStaffLogs,
    error: errorViewedStaffLogs
  } = useQuery<TrainingLog[], Error>({
    queryKey: [STAFF_TRAINING_LOGS_QUERY_KEY, viewingStaffMember?.id || `${viewingStaffMember?.lastName}, ${viewingStaffMember?.firstName}_${viewingStaffMember?.rank}`],
    queryFn: () => fetchTrainingLogsForStaff(viewingStaffMember),
    enabled: !!viewingStaffMember,
    staleTime: 1000 * 60 * 2,
  });

  const staffGroups = React.useMemo(() => {
    if (!staffList) return [];
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
        staffMembers: staffMembers
      }))
      .sort((a, b) => a.squadronName.localeCompare(b.squadronName));
  }, [staffList]);

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
         setStaffToDelete(null);
       }
    }
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

  const openFormForNew = () => {
    setEditingStaff(null);
    setViewingStaffMember(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingStaff(null);
    setIsFormOpen(false);
  };

  const appointmentMapping: Record<string, string> = {
    "XO": "Executive Officer",
    "ADMINO": "Administration Officer",
    "CO": "Commanding Officer",
    "TRGO": "Training Officer",
    "TRGOPS": "Training Operations Officer",
    "USA": "Unit Safety Advisor",
    "SSO": "Squadron Supply Officer",
    "TRS": "Trainee Staff",
    "STAFF": "Staff", // Added Staff in uppercase as per common CSV exports
    "SQNXI": "Squadron Executive Instructor",
  };

  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ variant: "destructive", title: "Import Error", description: "No file selected." });
      return;
    }
    setIsImportingCsv(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast({ variant: "destructive", title: "Import Error", description: "Could not read file content." });
        setIsImportingCsv(false);
        return;
      }

      const errors: string[] = [];
      let importedCount = 0;
      
      try {
        const lines = text.split(/\r\n|\n/).filter(line => line.trim());
        if (lines.length < 2) {
          throw new Error("CSV must have a header and at least one data row.");
        }

        const headerLine = lines[0].trim();
        const csvHeader = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        const userProvidedHeaders = [
          "PrimaryUnit", "MemberUID", "MemberName", "MemberType", "Appointment", 
          "IsPrimary", "Active", "EmailAddress", "ContactEmail1", "PhoneNumber", 
          "Address", "ContactName", "EmergencyContactEmail", "ParentalResponsiblity", 
          "Relationship", "NextOfKin", "PrimaryContact", "MemberContactPhoneNumber", 
          "AboriginalTorresStraitIslander", "FullTimeStudent", "EducationInstitution", 
          "HighestEducationLevel", "Religion", "Citizenship", "DefenceVendorNumber", "Name"
        ];

        const essentialHeaders = ["PrimaryUnit", "MemberUID", "MemberName", "Appointment", "EmailAddress", "PhoneNumber"];
        const hasAllEssentialHeaders = essentialHeaders.every(eh => csvHeader.includes(eh));

        if (!hasAllEssentialHeaders) {
           throw new Error(`Invalid CSV header. Expected at least these columns: "${essentialHeaders.join(', ')}". Got: "${csvHeader.join(',')}"`);
        }

        const headerIndices: Record<string, number> = {};
        userProvidedHeaders.forEach(eh => { // Map all user-provided headers, even if some are ignored
          headerIndices[eh] = csvHeader.indexOf(eh); // Will be -1 if not found, which is fine for ignored fields
        });
        
        const currentStaffList = queryClient.getQueryData<StaffMember[]>([STAFF_QUERY_KEY]) || [];
        const existingStaffNumbers = new Set(currentStaffList.map(s => s.serviceNumber));
        const existingEmails = new Set(currentStaffList.map(s => s.email));

        const addPromises: Promise<void>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = [];
          let currentVal = '';
          let inQuotes = false;
          for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            if (char === '"' && (charIndex === 0 || line[charIndex - 1] !== '"')) {
              if (inQuotes && charIndex + 1 < line.length && line[charIndex + 1] === '"') {
                currentVal += '"';
                charIndex++;
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
          values.push(currentVal.trim());

          if (values.length !== csvHeader.length) {
            errors.push(`Row ${i + 1}: Column count mismatch. Expected ${csvHeader.length}, got ${values.length}. Line: "${line}"`);
            continue;
          }

          const csvData: Record<string, string> = {};
          userProvidedHeaders.forEach(eh => {
              const index = headerIndices[eh];
              if (index !== -1 && index < values.length) { // Only populate if header was found and index is valid
                csvData[eh] = values[index].replace(/^"|"$/g, '').replace(/""/g, '"');
              } else if (essentialHeaders.includes(eh)) { 
                  // If an essential header was supposedly found by indexOf but its data is missing, this is an issue.
                  // However, the earlier check for hasAllEssentialHeaders should cover this for those.
                  // For non-essential but expected by user (like Address), we can allow them to be missing from the row.
                  csvData[eh] = ""; // Default to empty if column missing but was in userProvidedHeaders
              }
          });
          
          const phoneValue = csvData.PhoneNumber?.trim();
          if (!phoneValue) {
            errors.push(`Row ${i + 1}: PhoneNumber is blank. Skipping record for UID "${csvData.MemberUID || 'UNKNOWN'}".`);
            continue; 
          }

          const { rank, firstName, lastName } = parseMemberNameAndRank(csvData.MemberName);

          if (!rank) {
            errors.push(`Row ${i + 1}: Could not parse rank from MemberName "${csvData.MemberName}". Valid ranks: ${RANKS.join(", ")}`);
            continue;
          }
          if (!firstName || !lastName) {
            errors.push(`Row ${i + 1}: Could not parse first and last name from MemberName "${csvData.MemberName}". Expected "RANK FirstName LastName".`);
            continue;
          }

          const serviceNumber = csvData.MemberUID;
          const email = csvData.EmailAddress;
          let rawAppointment = csvData.Appointment;
          let role = rawAppointment; // Default to raw value
          
          const upperAppointment = rawAppointment?.toUpperCase();
          if (upperAppointment && appointmentMapping[upperAppointment]) {
            role = appointmentMapping[upperAppointment];
          }

          const squadron = csvData.PrimaryUnit || undefined;
          const address = csvData.Address || undefined;


          if (!serviceNumber || !email || !role) { // Role (after mapping) must also be valid
            errors.push(`Row ${i + 1}: Missing required fields (MemberUID, EmailAddress, or valid Appointment).`);
            continue;
          }

          if (!/^\S+@\S+\.\S+$/.test(email)) {
            errors.push(`Row ${i + 1}: Invalid email format for "${email}".`);
            continue;
          }

          if (existingStaffNumbers.has(serviceNumber) || existingEmails.has(email) ) {
            errors.push(`Row ${i + 1}: Duplicate MemberUID or EmailAddress for "${serviceNumber}/${email}". Skipped.`);
            continue;
          }

          const memberToAdd: Omit<StaffMember, 'id'> = {
            serviceNumber: serviceNumber,
            rank: rank,
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phoneValue, // Already checked it's not blank
            role: role,
            squadron: squadron,
            address: address,
            joinDate: undefined,
          };

           addPromises.push(
              addStaffMutation.mutateAsync(memberToAdd).then(() => {
                 importedCount++;
                 existingStaffNumbers.add(serviceNumber);
                 existingEmails.add(email);
              }).catch((addError: any) => {
                 errors.push(`Row ${i + 1}: Failed to add staff member (UID: ${serviceNumber}) to database: ${addError.message}`);
              })
            );
        }

        await Promise.all(addPromises);

        if (importedCount > 0 && errors.length === 0) {
          toast({ title: "Import Complete", description: `${importedCount} staff member(s) imported successfully.` });
        } else if (importedCount > 0 && errors.length > 0) {
            const errorMessages = errors.slice(0, 10).join("\n") + (errors.length > 10 ? "\n...and more errors." : "");
             toast({
                variant: "default",
                title: "CSV Import Partially Successful",
                description: ( <ScrollArea className="max-h-40"><pre className="whitespace-pre-wrap text-xs">{`${importedCount} imported. Errors:\n${errorMessages}`}</pre></ScrollArea> ),
                duration: 15000,
            });
        } else if (importedCount === 0 && errors.length > 0) {
             const errorMessages = errors.slice(0, 10).join("\n") + (errors.length > 10 ? "\n...and more errors." : "");
             toast({
                variant: "destructive",
                title: "CSV Import Failed",
                description: ( <ScrollArea className="max-h-40"><pre className="whitespace-pre-wrap text-xs">{errorMessages}</pre></ScrollArea> ),
                duration: 15000,
            });
        } else if (importedCount === 0 && errors.length === 0 && lines.length > 1) {
           toast({ title: "Import Complete", description: "No new staff members were found to import (all might already exist or file was empty/invalid)." });
        }

      } catch (error: any) {
        console.error("Error during CSV import processing:", error);
        toast({ variant: "destructive", title: "Import Error", description: error.message || "An unexpected error occurred during processing." });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setIsImportingCsv(false);
        queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });
      }
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "Import Error", description: "Failed to read the file."});
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsImportingCsv(false);
    };
    reader.readAsText(file);
  };

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
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && staffGroups.length === 0 && staffList.length === 0 && (
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <UsersIconLucide className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Staff Members Found</h3>
                <p className="text-muted-foreground mb-4">Add staff members manually or import a CSV file.</p>
            </CardContent>
        </Card>
      )}

      {!isLoading && !error && staffGroups.map(group => (
        <Card key={group.squadronName} className="shadow-xl mb-8">
          <CardHeader className="bg-muted/20 dark:bg-muted/10 border-b">
            <CardTitle className="text-2xl">Squadron: {group.squadronName}</CardTitle>
            <CardDescription>{group.staffMembers.length} staff member(s)</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 px-0 sm:px-0">
            {group.staffMembers.length === 0 ? (
              <p className="text-muted-foreground text-center p-6">No staff members in this squadron.</p>
            ) : (
              <ScrollArea className="max-h-[600px] w-full">
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
                        <TableCell className="hidden md:table-cell max-w-xs truncate">{staff.role}</TableCell>
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

      {!isLoading && !error && staffList.length > 0 && (
        <Card>
          <CardFooter className="text-xs text-muted-foreground pt-4 justify-center">
              Total staff members: {staffList.length} across {staffGroups.length} squadron(s).
          </CardFooter>
        </Card>
      )}

      <Alert className="mt-8">
        <UploadCloud className="h-4 w-4" />
        <AlertTitle>Staff CSV Import Instructions</AlertTitle>
        <AlertDescription>
          To bulk import staff, upload a CSV file. The system expects the following headers (order does not strictly matter, but all specified must be present):
          <ul className="list-disc pl-5 mt-2 text-xs space-y-1">
            <li><code>PrimaryUnit</code> (Text, Optional, e.g., "701 Squadron") - Becomes 'Squadron'</li>
            <li><code>MemberUID</code> (Text, Required, e.g., "8001234") - Becomes 'Service Number'</li>
            <li><code>MemberName</code> (Text, Required. Format: "RANK FirstName LastName" e.g., "FLTLT(AAFC) Jane Doe". RANK must be one of: {RANKS.join(", ")}.)</li>
            <li><code>MemberType</code> (Text) - Data from this column is ignored.</li>
            <li><code>Appointment</code> (Text, Required, e.g., "Squadron Training Officer" or "XO") - Becomes 'Role'. Abbreviations like XO, ADMINO, CO, TRGO, TRGOPS, USA, SSO, TRS, Staff, SQNXI will be expanded.</li>
            <li><code>IsPrimary</code> (Text) - Data from this column is ignored.</li>
            <li><code>Active</code> (Text) - Data from this column is ignored.</li>
            <li><code>EmailAddress</code> (Text, Required, e.g., "jane.doe@example.com") - Becomes 'Email'</li>
            <li><code>ContactEmail1</code> (Text) - Data from this column is ignored.</li>
            <li><code>PhoneNumber</code> (Text, Required, e.g., "0400123456") - Becomes 'Phone'. Records with a blank phone number will be skipped.</li>
            <li><code>Address</code> (Text, Optional) - Becomes 'Address'</li>
            <li>All other headers listed (<code>ContactName</code>, <code>EmergencyContactEmail</code>, etc.) will have their data ignored.</li>
          </ul>
          MemberUID and EmailAddress must be unique. Join Date is not part of this import and will be unassigned.
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
                  isSubmitting={editingStaff ? updateStaffMutation.isPending : addStaffMutation.isPending}
                />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

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
                                <p className="text-muted-foreground">{viewingStaffMember.joinDate ? format(viewingStaffMember.joinDate, "PP") : "N/A"}</p>
                            </div>
                             <div>
                                <p className="font-semibold">Address</p>
                                <p className="text-muted-foreground">{viewingStaffMember.address || "N/A"}</p>
                            </div>
                          </CardContent>
                      </Card>

                    <Accordion type="multiple" className="w-full" defaultValue={["training"]}>
                      <AccordionItem value="training">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2 text-lg">
                            <GraduationCap className="h-5 w-5" /> Training Records ({isLoadingViewedStaffLogs ? '...' : viewedStaffTrainingLogs.length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ScrollArea className="max-h-[300px] border rounded-md">
                            {isLoadingViewedStaffLogs && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                            {errorViewedStaffLogs && <p className="text-sm text-destructive">Error loading training records: {errorViewedStaffLogs.message}</p>}
                            {!isLoadingViewedStaffLogs && !errorViewedStaffLogs && viewedStaffTrainingLogs.length === 0 && (
                                <p className="text-sm text-muted-foreground p-4">No training records found.</p>
                            )}
                            {!isLoadingViewedStaffLogs && !errorViewedStaffLogs && viewedStaffTrainingLogs.length > 0 && (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Course Name</TableHead>
                                    <TableHead>Completion Date</TableHead>
                                    <TableHead>Qualification</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {viewedStaffTrainingLogs.map(log => (
                                    <TableRow key={log.id}>
                                      <TableCell>{log.courseName}</TableCell>
                                      <TableCell>{format(log.completionDate, "PP")}</TableCell>
                                      <TableCell>{log.qualificationAchieved || log.instructorQualification || "N/A"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </ScrollArea>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="meetings">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2 text-lg">
                           <FileText className="h-5 w-5" /> Meetings Attended ({filteredMeetings.length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            {filteredMeetings.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                {filteredMeetings.map(meeting => (
                                    <li key={meeting.id}>{meeting.title} - Date: {format(meeting.date, "PP")}
                                    <br/>Attendees: {meeting.attendees}
                                    </li>
                                ))}
                                </ul>
                            ) : <p className="text-sm text-muted-foreground">No meeting records found (fetching not implemented).</p>}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="pdps">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2 text-lg">
                            <Briefcase className="h-5 w-5" /> Professional Development ({filteredPdps.length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
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
                            ) : <p className="text-sm text-muted-foreground">No PDPs found (fetching not implemented).</p>}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="discipline">
                        <AccordionTrigger>
                            <div className="flex items-center gap-2 text-lg">
                                <Gavel className="h-5 w-5" /> Discipline Actions ({filteredDisciplineActions.length})
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                             {filteredDisciplineActions.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                {filteredDisciplineActions.map(action => (
                                    <li key={action.id}>
                                    {action.typeOfAction} - Incident Date: {format(action.dateOfIncident, "PP")}
                                    <br/>Description: {action.incidentDescription}
                                    </li>
                                ))}
                                </ul>
                            ) : <p className="text-sm text-muted-foreground">No discipline actions found (fetching not implemented).</p>}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="audits">
                        <AccordionTrigger>
                            <div className="flex items-center gap-2 text-lg">
                                <ShieldCheck className="h-5 w-5" /> Safety Audits Involved In ({filteredAudits.length})
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            {filteredAudits.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                {filteredAudits.map(audit => (
                                    <li key={audit.id}>
                                    {audit.auditTitle} - Date: {format(audit.auditDate, "PP")}
                                    <br/>Type: {audit.auditType}
                                    </li>
                                ))}
                                </ul>
                            ) : <p className="text-sm text-muted-foreground">No safety audits found where this member was involved (fetching not implemented).</p>}
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
