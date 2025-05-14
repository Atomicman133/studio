
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
import { RANKS } from "./staff-schema";
import { STAFF_QUERY_KEY } from "@/hooks/useStaffData";
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

    for (const sqn in groups) {
      groups[sqn].sort((a, b) => {
        const rankAIndex = RANKS.indexOf(a.rank);
        const rankBIndex = RANKS.indexOf(b.rank);
        const effectiveRankAIndex = rankAIndex === -1 ? Infinity : rankAIndex;
        const effectiveRankBIndex = rankBIndex === -1 ? Infinity : rankBIndex;

        if (effectiveRankAIndex !== effectiveRankBIndex) {
            return effectiveRankAIndex - effectiveRankBIndex;
        }
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
      });
    }

    return Object.entries(groups)
      .map(([squadronName, staffMembers]) => ({
        squadronName,
        staffMembers
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
    "STAFF": "Staff", 
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
      let updatedCount = 0;
      
      try {
        const lines = text.split(/\r\n|\n/).filter(line => line.trim());
        if (lines.length < 2) {
          throw new Error("CSV must have a header and at least one data row.");
        }

        const headerLine = lines[0].trim();
        const csvHeader = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        const allPossibleCsvHeaders = [
          "PrimaryUnit", "MemberUID", "MemberName", "MemberType", "Appointment", 
          "IsPrimary", "Active", "EmailAddress", "ContactEmail1", "PhoneNumber", 
          "Address", "ContactName", "EmergencyContactEmail", "ParentalResponsiblity", 
          "Relationship", "NextOfKin", "PrimaryContact", "MemberContactPhoneNumber", 
          "AboriginalTorresStraitIslander", "FullTimeStudent", "EducationInstitution", 
          "HighestEducationLevel", "Religion", "Citizenship", "DefenceVendorNumber", "Name"
        ];
        
        const headerIndices: Record<string, number> = {};
        allPossibleCsvHeaders.forEach(h => { 
          headerIndices[h] = csvHeader.indexOf(h); 
        });
        
        // Use the staffList from useStaff for checking existing records
        const currentStaffList = staffList || [];
        const existingStaffNumbers = new Set(currentStaffList.map(s => s.serviceNumber));
        const existingEmails = new Set(currentStaffList.map(s => s.email));

        const addPromises: Promise<void>[] = [];
        const updatePromises: Promise<void>[] = [];


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
          allPossibleCsvHeaders.forEach(h => {
              const index = headerIndices[h];
              if (index !== -1 && index < values.length) { 
                csvData[h] = values[index].replace(/^"|"$/g, '').replace(/""/g, '"');
              } else {
                csvData[h] = ""; 
              }
          });
          
          const phoneValue = csvData.PhoneNumber?.trim();
          const serviceNumber = csvData.MemberUID;
          const email = csvData.EmailAddress?.trim(); // Trim email as well

          if (!phoneValue) {
            errors.push(`Row ${i + 1}: PhoneNumber is blank. Skipping record for UID "${serviceNumber || 'UNKNOWN'}".`);
            continue; 
          }

          const { rank, firstName, lastName } = parseMemberNameAndRank(csvData.MemberName);
          
          let roleToSave = ""; 
          const rawAppointmentFromCsv = csvData.Appointment;
          if (rawAppointmentFromCsv && rawAppointmentFromCsv.trim() !== "") {
            const upperAppointment = rawAppointmentFromCsv.trim().toUpperCase();
            roleToSave = appointmentMapping[upperAppointment] || rawAppointmentFromCsv.trim();
          }

          const squadron = csvData.PrimaryUnit || undefined;
          const address = csvData.Address || undefined;
          
          const existingStaffMember = currentStaffList.find(s => s.serviceNumber === serviceNumber);

          const staffDataPayload: Omit<StaffMember, 'id'> & { id?: string } = {
            serviceNumber: serviceNumber,
            rank: rank || "", 
            firstName: firstName || "",
            lastName: lastName || "",
            email: email || "", 
            phone: phoneValue,
            role: roleToSave, 
            squadron: squadron,
            address: address,
            joinDate: existingStaffMember?.joinDate || undefined,
          };

          if (existingStaffMember) {
            // Update existing record
            staffDataPayload.id = existingStaffMember.id;

            if (email && email !== existingStaffMember.email && existingEmails.has(email)) {
                errors.push(`Row ${i + 1} (UID: ${serviceNumber}): Email "${email}" already exists for another staff member. Update for this UID skipped.`);
                continue;
            }

            updatePromises.push(
              updateStaffMutation.mutateAsync(staffDataPayload as StaffMember).then(() => {
                updatedCount++;
                if (email && email !== existingStaffMember.email) {
                  existingEmails.delete(existingStaffMember.email); // Remove old email if it changed
                  existingEmails.add(email); // Add new email
                }
              }).catch((updateError: any) => {
                errors.push(`Row ${i + 1} (UID: ${serviceNumber}): Failed to update: ${updateError.message}`);
              })
            );
          } else {
            // Add new record
            if (email && existingEmails.has(email)) {
              errors.push(`Row ${i + 1} (UID: ${serviceNumber}): Email "${email}" already exists. New record skipped.`);
              continue;
            }
            // Service number uniqueness is implicitly handled by the find above, but an explicit check for new records is safer.
            if (existingStaffNumbers.has(serviceNumber)) {
                errors.push(`Row ${i + 1} (UID: ${serviceNumber}): Service Number "${serviceNumber}" already exists (should have been an update). New record skipped.`);
                continue;
            }

            addPromises.push(
              addStaffMutation.mutateAsync(staffDataPayload).then(() => {
                importedCount++;
                existingStaffNumbers.add(serviceNumber);
                if(email) existingEmails.add(email);      
              }).catch((addError: any) => {
                errors.push(`Row ${i + 1} (UID: ${serviceNumber}): Failed to add: ${addError.message}`);
              })
            );
          }
        }

        await Promise.all([...addPromises, ...updatePromises]);

        let toastMessage = "";
        if (importedCount > 0) toastMessage += `${importedCount} new staff member(s) imported. `;
        if (updatedCount > 0) toastMessage += `${updatedCount} staff member(s) updated. `;
        
        if (toastMessage === "" && errors.length === 0 && lines.length > 1) {
            toast({ title: "Import Complete", description: "No new staff members were found to import or update (all might already exist with no changes, or file was empty after header)." });
        } else if (toastMessage !== "" && errors.length === 0) {
            toast({ title: "Import Successful", description: toastMessage.trim() });
        } else if (errors.length > 0) {
            const errorMessages = errors.slice(0, 10).join("\n") + (errors.length > 10 ? "\n...and more errors." : "");
            const title = (importedCount > 0 || updatedCount > 0) ? "CSV Import Partially Successful" : "CSV Import Failed";
            const descriptionPrefix = toastMessage !== "" ? toastMessage : "";
            
            toast({
                variant: (importedCount > 0 || updatedCount > 0) ? "default" : "destructive",
                title: title,
                description: ( <ScrollArea className="max-h-40"><pre className="whitespace-pre-wrap text-xs">{descriptionPrefix}Errors:\n{errorMessages}</pre></ScrollArea> ),
                duration: 15000,
            });
        } else if (lines.length <=1) {
           toast({ variant: "destructive", title: "Import Error", description: "CSV file appears to be empty or has no data rows." });
        }


      } catch (error: any) {
        console.error("Error during CSV import processing:", error);
        toast({ variant: "destructive", title: "Import Error", description: error.message || "An unexpected error occurred during processing." });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; 
        }
        setIsImportingCsv(false);
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
                          {staff.joinDate && isValidDate(new Date(staff.joinDate)) ? format(new Date(staff.joinDate), "PP") : "N/A"}
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
          To bulk import staff, upload a CSV file. The system will attempt to parse the headers provided.
          The following fields are used if their corresponding headers are found:
          <ul className="list-disc pl-5 mt-2 text-xs space-y-1">
            <li><code>PrimaryUnit</code> (Optional, e.g., "701 Squadron") - Populates 'Squadron'.</li>
            <li><code>MemberUID</code> (Required, e.g., "8001234") - Populates 'Service Number'. Used to match existing records for updates.</li>
            <li><code>MemberName</code> (Required. Format: "RANK FirstName LastName" e.g., "FLTLT(AAFC) Jane Doe". RANK must be one of: {RANKS.join(", ")}.) - Parsed for Rank, First Name, Last Name.</li>
            <li><code>Appointment</code> (Required, e.g., "Squadron Training Officer" or "XO") - Populates 'Role'. Abbreviations (XO, ADMINO, etc.) will be expanded. If this field is blank or cannot be mapped, the record will error during validation.</li>
            <li><code>EmailAddress</code> (Required, e.g., "jane.doe@example.com") - Populates 'Email'.</li>
            <li><code>PhoneNumber</code> (Required, e.g., "0400123456") - Populates 'Phone'. <strong>Records with a blank PhoneNumber will be skipped.</strong></li>
            <li><code>Address</code> (Optional) - Populates 'Address'.</li>
            <li>Other headers (e.g., MemberType, IsPrimary, Active, ContactEmail1, ContactName, etc.) will be ignored.</li>
          </ul>
          If a record with a matching `MemberUID` is found, it will be updated. Otherwise, a new record will be created.
          MemberUID and EmailAddress must be unique among existing and newly imported/updated staff (updates skip if new email conflicts). Join Date is not part of this import; it will be preserved for existing records and unassigned for new ones.
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
                                <p className="text-muted-foreground">{viewingStaffMember.joinDate && isValidDate(new Date(viewingStaffMember.joinDate)) ? format(new Date(viewingStaffMember.joinDate), "PP") : "N/A"}</p>
                            </div>
                             <div>
                                <p className="font-semibold">Address</p>
                                <p className="text-muted-foreground">{viewingStaffMember.address || "N/A"}</p>
                            </div>
                          </CardContent>
                      </Card>

                    <Accordion type="multiple" className="w-full" defaultValue={["training"]}>
                      <AccordionItem value="training">
                        <AccordionTrigger className="text-lg">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5" /> Training Records ({isLoadingViewedStaffLogs ? <Loader2 className="h-4 w-4 animate-spin"/> : viewedStaffTrainingLogs.length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ScrollArea className="max-h-[300px] border rounded-md">
                            {isLoadingViewedStaffLogs && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                            {errorViewedStaffLogs && <p className="text-sm text-destructive p-4">Error loading training records: {errorViewedStaffLogs.message}</p>}
                            {!isLoadingViewedStaffLogs && !errorViewedStaffLogs && viewedStaffTrainingLogs.length === 0 && (
                                <p className="text-sm text-muted-foreground p-4 text-center">No training records found for this staff member.</p>
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
                                      <TableCell>{log.completionDate && isValidDate(new Date(log.completionDate)) ? format(new Date(log.completionDate), "PP") : "Invalid Date"}</TableCell>
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
                        <AccordionTrigger className="text-lg">
                          <div className="flex items-center gap-2">
                           <FileText className="h-5 w-5" /> Meetings Attended ({filteredMeetings.length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            {filteredMeetings.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                {filteredMeetings.map(meeting => (
                                    <li key={meeting.id}>{meeting.title} - Date: {meeting.date && isValidDate(new Date(meeting.date)) ? format(new Date(meeting.date), "PP") : "Invalid Date"}
                                    <br/>Attendees: {meeting.attendees}
                                    </li>
                                ))}
                                </ul>
                            ) : <p className="text-sm text-muted-foreground p-4 text-center">No meeting records found (fetching not implemented).</p>}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="pdps">
                        <AccordionTrigger className="text-lg">
                          <div className="flex items-center gap-2">
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
                                    {pdp.reviewDate && isValidDate(new Date(pdp.reviewDate)) && ` | Next Review: ${format(new Date(pdp.reviewDate), "PP")}`}
                                    </li>
                                ))}
                                </ul>
                            ) : <p className="text-sm text-muted-foreground p-4 text-center">No PDPs found (fetching not implemented).</p>}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="discipline">
                        <AccordionTrigger className="text-lg">
                            <div className="flex items-center gap-2">
                                <Gavel className="h-5 w-5" /> Discipline Actions ({filteredDisciplineActions.length})
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                             {filteredDisciplineActions.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                {filteredDisciplineActions.map(action => (
                                    <li key={action.id}>
                                    {action.typeOfAction} - Incident Date: {action.dateOfIncident && isValidDate(new Date(action.dateOfIncident)) ? format(new Date(action.dateOfIncident), "PP") : "Invalid Date"}
                                    <br/>Description: {action.incidentDescription}
                                    </li>
                                ))}
                                </ul>
                            ) : <p className="text-sm text-muted-foreground p-4 text-center">No discipline actions found (fetching not implemented).</p>}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="audits">
                        <AccordionTrigger className="text-lg">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5" /> Safety Audits Involved In ({filteredAudits.length})
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            {filteredAudits.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                {filteredAudits.map(audit => (
                                    <li key={audit.id}>
                                    {audit.auditTitle} - Date: {audit.auditDate && isValidDate(new Date(audit.auditDate)) ? format(new Date(audit.auditDate), "PP") : "Invalid Date"}
                                    <br/>Type: {audit.auditType}
                                    </li>
                                ))}
                                </ul>
                            ) : <p className="text-sm text-muted-foreground p-4 text-center">No safety audits found where this member was involved (fetching not implemented).</p>}
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

