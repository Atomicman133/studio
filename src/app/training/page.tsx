"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, GraduationCap, ListChecks, BarChartHorizontalBig, UserCog, Trophy, Edit3, Info, UploadCloud, Download, Archive, Paperclip, AlertCircle, Loader2, AlertTriangle } from "lucide-react";
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
import type { TrainingLog, TrainingLogFormData } from "./training-schema";
import { TrainingLogForm } from "./components/training-log-form";
import { format, parse as parseDateFns, isValid as isValidDate } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RANKS, type StaffMember } from "@/app/staff/staff-schema";
import { useStaff } from "@/hooks/useStaffData"; // Import useStaff hook
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import { convertFileToDataUrl } from "@/lib/utils"; // Ensure this utility exists


const TRAINING_LOGS_QUERY_KEY = 'trainingLogs';

// Helper to convert Firestore Timestamps
export const convertLogTimestamps = (data: any): TrainingLog => {
  return {
    ...data,
    completionDate: data.completionDate instanceof Timestamp ? data.completionDate.toDate() : data.completionDate,
  };
};

// --- Fetch Training Logs ---
async function fetchTrainingLogs(): Promise<TrainingLog[]> {
  const collectionRef = collection(db, 'trainingLogs'); // Assuming 'trainingLogs' collection
  const q = query(collectionRef, orderBy('completionDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertLogTimestamps(doc.data()),
  })) as TrainingLog[];
}

// --- Add Training Log ---
async function addTrainingLog(newLogData: Omit<TrainingLog, 'id'>): Promise<string> {
  const collectionRef = collection(db, 'trainingLogs');
  const dataToSave = {
    ...newLogData,
    completionDate: Timestamp.fromDate(newLogData.completionDate),
    // Ensure optional fields that might be missing are handled (Firestore omits them)
    qualificationAchieved: newLogData.qualificationAchieved || null,
    instructorQualification: newLogData.instructorQualification || null,
    achievementDetails: newLogData.achievementDetails || null,
    certificateFileName: newLogData.certificateFileName || null,
    certificateDataUrl: newLogData.certificateDataUrl || null,
  };
  // Remove null fields before saving, as Firestore might prefer omission over null for some use cases
  Object.keys(dataToSave).forEach(key => {
      const typedKey = key as keyof typeof dataToSave;
      if (dataToSave[typedKey] === null || dataToSave[typedKey] === undefined) {
          delete dataToSave[typedKey];
      }
  });


  const docRef = await addDoc(collectionRef, dataToSave);
  return docRef.id;
}

// --- Update Training Log ---
async function updateTrainingLog(updatedLog: TrainingLog): Promise<void> {
  if (!updatedLog.id) throw new Error("Log ID is required for update.");
  const docRef = doc(db, 'trainingLogs', updatedLog.id);
  const { id, ...dataToUpdate } = updatedLog;
  const dataToSave = {
    ...dataToUpdate,
    completionDate: Timestamp.fromDate(dataToUpdate.completionDate),
     // Ensure optional fields are explicitly set to null if empty/undefined before saving
     qualificationAchieved: dataToUpdate.qualificationAchieved || null,
     instructorQualification: dataToUpdate.instructorQualification || null,
     achievementDetails: dataToUpdate.achievementDetails || null,
     certificateFileName: dataToUpdate.certificateFileName || null,
     certificateDataUrl: dataToUpdate.certificateDataUrl || null,
  };

  // Remove null fields before saving
  Object.keys(dataToSave).forEach(key => {
       const typedKey = key as keyof typeof dataToSave;
      if (dataToSave[typedKey] === null || dataToSave[typedKey] === undefined) {
          delete dataToSave[typedKey];
      }
  });
  await updateDoc(docRef, dataToSave);
}

// --- Delete Training Log ---
async function deleteTrainingLog(logId: string): Promise<void> {
  if (!logId) throw new Error("Log ID is required for deletion.");
  await deleteDoc(doc(db, 'trainingLogs', logId));
}



type StaffMemberLogGroup = {
  identifier: string;
  rank: typeof RANKS[number];
  staffName: string;
  logs: TrainingLog[];
};

type SquadronGroup = {
  squadronName: string;
  staffMembers: StaffMemberLogGroup[];
};


function downloadTextFile(filename: string, text: string) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export default function TrainingPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: staffList = [], isLoading: isLoadingStaff } = useStaff(); // Fetch staff data

  // --- React Query for Training Logs ---
  const { data: trainingLogsList = [], isLoading: isLoadingLogs, error: errorLogs } = useQuery<TrainingLog[], Error>({
    queryKey: [TRAINING_LOGS_QUERY_KEY],
    queryFn: fetchTrainingLogs,
  });

  const addLogMutation = useMutation<string, Error, Omit<TrainingLog, 'id'>>({
    mutationFn: addTrainingLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRAINING_LOGS_QUERY_KEY] });
      setIsFormOpen(false);
      toast({ title: "Success", description: "Training record added." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: `Failed to add record: ${err.message}` });
    }
  });

  const updateLogMutation = useMutation<void, Error, TrainingLog>({
    mutationFn: updateTrainingLog,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TRAINING_LOGS_QUERY_KEY] });
       queryClient.setQueryData<TrainingLog[]>([TRAINING_LOGS_QUERY_KEY], (oldData) =>
         oldData?.map((log) => (log.id === variables.id ? variables : log))
       );
      setIsFormOpen(false);
      setEditingLog(null);
      toast({ title: "Success", description: "Training record updated." });
    },
     onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: `Failed to update record: ${err.message}` });
    }
  });

  const deleteLogMutation = useMutation<void, Error, string>({
    mutationFn: deleteTrainingLog,
    onSuccess: (_, logId) => {
      queryClient.invalidateQueries({ queryKey: [TRAINING_LOGS_QUERY_KEY] });
       queryClient.setQueryData<TrainingLog[]>([TRAINING_LOGS_QUERY_KEY], (oldData) =>
         oldData?.filter((log) => log.id !== logId)
       );
      setLogToDelete(null);
      toast({ title: "Success", description: "Training record deleted." });
    },
     onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: `Failed to delete record: ${err.message}` });
      setLogToDelete(null);
    }
  });

  // --- End React Query for Training Logs ---

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingLog, setEditingLog] = React.useState<TrainingLog | null>(null);
  const [logToDelete, setLogToDelete] = React.useState<TrainingLog | null>(null);
  const [viewingLog, setViewingLog] = React.useState<TrainingLog | null>(null);
  const [accomplishmentCsvInputRef, setAccomplishmentCsvInputRef] = React.useState<HTMLInputElement | null>(null);
  const [isImportingAccomplishments, setIsImportingAccomplishments] = React.useState(false);


  const squadronStaffGroups = React.useMemo(() => {
    const logsBySquadron: Record<string, TrainingLog[]> = {};
    trainingLogsList.forEach(log => {
      const sqn = log.squadron || "Unassigned"; // Handle undefined squadron
      if (!logsBySquadron[sqn]) {
        logsBySquadron[sqn] = [];
      }
      logsBySquadron[sqn].push(log);
    });

    const processedSquadrons: SquadronGroup[] = Object.entries(logsBySquadron)
      .map(([squadronName, squadronLogs]) => {
        const staffGroupsInSquadron: Record<string, { rank: typeof RANKS[number]; staffName: string; logs: TrainingLog[] }> = {};
        squadronLogs.forEach(log => {
          const staffKey = `${log.rank} ${log.staffName}`;
          if (!staffGroupsInSquadron[staffKey]) {
            staffGroupsInSquadron[staffKey] = { rank: log.rank, staffName: log.staffName, logs: [] };
          }
          staffGroupsInSquadron[staffKey].logs.push(log);
        });

        const staffMembers = Object.values(staffGroupsInSquadron)
          .map(staffGroup => ({
            ...staffGroup,
            identifier: `${staffGroup.rank} ${staffGroup.staffName}`,
            logs: staffGroup.logs.sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime()),
          }))
          .sort((a, b) => {
            const rankAIndex = RANKS.indexOf(a.rank);
            const rankBIndex = RANKS.indexOf(b.rank);

            if (rankAIndex === -1 && rankBIndex === -1) return a.staffName.localeCompare(b.staffName);
            if (rankAIndex === -1) return 1;
            if (rankBIndex === -1) return -1;

            // Corrected rank comparison: Higher rank (lower index) should come first.
            const rankComparison = rankAIndex - rankBIndex;
            if (rankComparison !== 0) return rankComparison;

            // If ranks are the same, sort by name
            return a.staffName.localeCompare(b.staffName);
          });


        return { squadronName, staffMembers };
      })
      .sort((a, b) => a.squadronName.localeCompare(b.squadronName));

    return processedSquadrons;
  }, [trainingLogsList]);


  const handleAddLog = async (data: TrainingLogFormData) => {
    let certificateInfo: Partial<TrainingLog> = {};
    if (data.certificateFile) {
      try {
        const { name, dataUrl } = await convertFileToDataUrl(data.certificateFile);
        certificateInfo = { certificateFileName: name, certificateDataUrl: dataUrl };
      } catch (error) {
        console.error("Error converting file:", error);
        toast({ variant: "destructive", title: "File Error", description: "Could not process certificate file."});
        return; // Prevent submission if file conversion fails
      }
    }

    const newLog: Omit<TrainingLog, 'id'> = { // Use Omit here as ID is generated by backend
      rank: data.rank,
      staffName: data.staffName,
      squadron: data.squadron,
      currentRole: data.currentRole,
      courseName: data.courseName,
      completionDate: data.completionDate,
      qualificationAchieved: data.qualificationAchieved,
      instructorQualification: data.instructorQualification,
      achievementDetails: data.achievementDetails,
      certificateFileName: certificateInfo.certificateFileName, // Use processed info
      certificateDataUrl: certificateInfo.certificateDataUrl,   // Use processed info
    };
    addLogMutation.mutate(newLog); // Use mutation
  };

  const handleUpdateLog = async (data: TrainingLogFormData) => {
    if (!editingLog || !editingLog.id) return;

    let certificateUpdates: Partial<TrainingLog> = {};
    if (data.certificateFile) {
      try {
        const { name, dataUrl } = await convertFileToDataUrl(data.certificateFile);
        certificateUpdates = { certificateFileName: name, certificateDataUrl: dataUrl };
      } catch (error) {
        console.error("Error converting file:", error);
        toast({ variant: "destructive", title: "File Error", description: "Could not process certificate file."});
        return; // Prevent submission if file conversion fails
      }
    } else if (data.certificateFileName === undefined && data.certificateDataUrl === undefined) {
      // File was explicitly removed
      certificateUpdates = { certificateFileName: undefined, certificateDataUrl: undefined };
    }
    // If no new file and not explicitly removed, keep existing (no changes to certificateUpdates needed)

    const updatedLog: TrainingLog = {
      id: editingLog.id, // Keep existing ID
      rank: data.rank,
      staffName: data.staffName,
      squadron: data.squadron,
      currentRole: data.currentRole,
      courseName: data.courseName,
      completionDate: data.completionDate,
      qualificationAchieved: data.qualificationAchieved,
      instructorQualification: data.instructorQualification,
      achievementDetails: data.achievementDetails,
      certificateFileName: certificateUpdates.hasOwnProperty('certificateFileName') ? certificateUpdates.certificateFileName : editingLog.certificateFileName,
      certificateDataUrl: certificateUpdates.hasOwnProperty('certificateDataUrl') ? certificateUpdates.certificateDataUrl : editingLog.certificateDataUrl,
    };

    updateLogMutation.mutate(updatedLog); // Use mutation
  };

  const handleEdit = (log: TrainingLog) => {
    setEditingLog(log);
    setViewingLog(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (log: TrainingLog) => {
    setViewingLog(log);
    setEditingLog(null);
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (logToDelete && logToDelete.id) {
      deleteLogMutation.mutate(logToDelete.id); // Use mutation
    }
  };

  const handleExportIndividualRecord = (log: TrainingLog) => {
    const recordDate = format(log.completionDate, "yyyy-MM-dd");
    const filename = `training_record_${log.rank}_${log.staffName.replace(/\s*,\s*|\s+/g, '_')}_${log.courseName.replace(/\s+/g, '_')}_${recordDate}.txt`;

    let content = `Training Record\n`;
    content += `------------------------------------\n`;
    content += `Rank: ${log.rank}\n`;
    content += `Staff Name: ${log.staffName}\n`;
    content += `Squadron: ${log.squadron}\n`;
    content += `Role at time of training: ${log.currentRole}\n`;
    content += `Course Name: ${log.courseName}\n`;
    content += `Completion Date: ${format(log.completionDate, "PPP")}\n\n`;

    if (log.qualificationAchieved) {
      content += `Qualification Achieved: ${log.qualificationAchieved}\n`;
    }
    if (log.instructorQualification) {
      content += `Instructor Qualification: ${log.instructorQualification}\n`;
    }
    if (log.achievementDetails) {
      content += `Achievements/Awards:\n${log.achievementDetails}\n`;
    }
    if (log.certificateFileName) {
      content += `Certificate Attached: ${log.certificateFileName}\n`;
    }

    downloadTextFile(filename, content);
  };

  const handleExportAllTrainingRecordsForMember = (staffMemberGroup: StaffMemberLogGroup) => {
    const staffIdentifier = `${staffMemberGroup.rank}_${staffMemberGroup.staffName.replace(/\s*,\s*|\s+/g, '_')}`;
    const filename = `all_training_records_${staffIdentifier}.txt`;

    let content = `All Training Records for ${staffMemberGroup.rank} ${staffMemberGroup.staffName}\n`;
    content += `Associated with Squadron(s): ${Array.from(new Set(staffMemberGroup.logs.map(l => l.squadron))).join(', ')}\n`
    content += `====================================================\n\n`;

    staffMemberGroup.logs.forEach((log, index) => {
      content += `Record ${index + 1} of ${staffMemberGroup.logs.length}\n`;
      content += `------------------------------------\n`;
      content += `Course Name: ${log.courseName}\n`;
      content += `Squadron at time of training: ${log.squadron}\n`;
      content += `Role at time of training: ${log.currentRole}\n`;
      content += `Completion Date: ${format(log.completionDate, "PPP")}\n`;
      if (log.qualificationAchieved) {
        content += `Qualification Achieved: ${log.qualificationAchieved}\n`;
      }
      if (log.instructorQualification) {
        content += `Instructor Qualification: ${log.instructorQualification}\n`;
      }
      if (log.achievementDetails) {
        content += `Achievements/Awards:\n${log.achievementDetails}\n`;
      }
      if (log.certificateFileName) {
        content += `Certificate Attached: ${log.certificateFileName}\n`;
      }
      content += `------------------------------------\n\n`;
    });

    downloadTextFile(filename, content);
  };


  const openFormForNew = () => {
    setEditingLog(null);
    setViewingLog(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingLog(null);
    setIsFormOpen(false);
  };

  const closeViewDialog = () => {
    setViewingLog(null);
  };

  function parseMemberRankName(memberRankNameInput: string): { rank: typeof RANKS[number] | null, firstName: string | null, lastName: string | null } {
    let rank: typeof RANKS[number] | null = null;
    let namePart = memberRankNameInput.trim();

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
      const lastName = parts.pop()!; // Last part is lastName
      const firstName = parts.join(' '); // Remaining parts are firstName (could include middle names)
      if (firstName && lastName) {
        return { rank, firstName, lastName };
      }
    }

    // Fallback if parsing fails
    if (parts.length === 1 && parts[0]) {
      return { rank, firstName: null, lastName: parts[0] }; // Assume single remaining part is lastName
    }

    return { rank, firstName: null, lastName: namePart }; // If still unparsed, put all in lastName
  }


  const parseDate = (dateString: string): Date | null => {
    // Add 'dd/MM/yy' to the list of formats to try
    const formatsToTry = ["dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "dd-MM-yyyy", "yyyy/MM/dd", "dd/MM/yy"];
    for (const fmt of formatsToTry) {
      const parsed = parseDateFns(dateString, fmt, new Date());
      if (isValidDate(parsed)) return parsed;
    }
    const directParsed = new Date(dateString);
    if (isValidDate(directParsed)) return directParsed;

    return null;
  };


  const handleAccomplishmentCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ variant: "destructive", title: "Import Error", description: "No file selected." });
      return;
    }
    setIsImportingAccomplishments(true);

    const reader = new FileReader();
    reader.onload = async (e) => { // Make async
      try {
        const text = e.target?.result as string;
        if (!text) {
          toast({ variant: "destructive", title: "Import Error", description: "Could not read file content." });
          setIsImportingAccomplishments(false);
          return;
        }

        const newLogsToAdd: Omit<TrainingLog, 'id'>[] = []; // Logs to be sent to backend
        const errors: string[] = [];
        const csvLines = text.split(/\r\n|\n/);

        if (csvLines.length < 2) {
          errors.push("CSV must have a header and at least one data row.");
        } else {
          const headerLine = csvLines[0].trim();
          const header = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          const expectedHeader = ["MemberUID", "Member Rank - Name", "EffectiveDate", "Accomplishment"];

          const allHeadersPresent = expectedHeader.every(eh => header.includes(eh));

          if (!allHeadersPresent) {
              errors.push(`Invalid CSV header. Expected columns (any order): ${expectedHeader.join(', ')}. Got: ${header.join(',')}`);
          } else {
              const headerIndices: Record<string, number> = {};
              expectedHeader.forEach(eh => {
                  headerIndices[eh] = header.indexOf(eh);
                  if (headerIndices[eh] === -1) {
                    errors.push(`Critical Error: Missing expected header column: "${eh}" despite passing initial check.`);
                  }
              });

              if (!allHeadersPresent) { // Stop if headers are fundamentally wrong
                   toast({
                      variant: "destructive",
                      title: "CSV Import Failed: Header Mismatch",
                      description: ( <ScrollArea className="max-h-40"><pre className="whitespace-pre-wrap text-xs">{errors.join("\n")}</pre></ScrollArea> ),
                      duration: 15000,
                  });
                  if (accomplishmentCsvInputRef) accomplishmentCsvInputRef.value = "";
                  setIsImportingAccomplishments(false); // Reset loading state
                  return;
              }

              const membersToProcess: Array<{ staffMember: StaffMember, csvRowData: Record<string, string>, rowIndex: number }> = [];
              let preliminaryParsingOk = true;

              for (let i = 1; i < csvLines.length; i++) {
                  let line = csvLines[i].trim(); // Use let for line modification
                  if (!line) continue;

                  // Handle commas within quoted fields (basic CSV parsing)
                  const values = [];
                  let currentVal = '';
                  let inQuotes = false;
                  for (let charIndex = 0; charIndex < line.length; charIndex++) {
                      let char = line[charIndex];
                      if (char === '"') {
                          // Check for escaped double quote ""
                          if (inQuotes && charIndex + 1 < line.length && line[charIndex + 1] === '"') {
                              currentVal += '"';
                              charIndex++; // Skip the next quote
                          } else {
                              inQuotes = !inQuotes; // Toggle quote state
                          }
                      } else if (char === ',' && !inQuotes) {
                          values.push(currentVal.trim());
                          currentVal = '';
                      } else {
                          currentVal += char;
                      }
                  }
                  values.push(currentVal.trim()); // Add the last value


                  if (values.length !== header.length) {
                      errors.push(`Row ${i + 1}: Incorrect number of columns. Expected ${header.length}, got ${values.length}. Line: "${line}"`);
                      preliminaryParsingOk = false;
                      continue;
                  }

                  const csvRowData: Record<string, string> = {};
                   expectedHeader.forEach(eh => {
                       // Remove surrounding quotes only if they exist as a pair
                       let val = values[headerIndices[eh]];
                       if (val && val.startsWith('"') && val.endsWith('"')) {
                           val = val.substring(1, val.length - 1);
                       }
                       // Replace escaped double quotes "" with a single double quote "
                       csvRowData[eh] = val.replace(/""/g, '"');
                  });

                  const serviceNumber = csvRowData["MemberUID"];

                  if (!serviceNumber) {
                      errors.push(`Row ${i + 1}: Missing "MemberUID".`);
                      preliminaryParsingOk = false;
                      continue;
                  }

                  // Find staff member using only MemberUID
                  const matchedStaff = staffList.find(sm => sm.serviceNumber === serviceNumber);

                  if (!matchedStaff) {
                      errors.push(`Row ${i + 1}: Staff member with MemberUID "${serviceNumber}" not found. Please ensure a staff profile exists with this Service Number in Staff Management.`);
                      preliminaryParsingOk = false;
                  } else {
                      // Optional: Validate Rank/Name from CSV against profile? For now, we trust the profile.
                      const parsedRankName = parseMemberRankName(csvRowData["Member Rank - Name"]);
                      if (!parsedRankName.rank || !parsedRankName.firstName || !parsedRankName.lastName) {
                         console.warn(`Row ${i + 1}: Could not fully parse Rank/Name from CSV "${csvRowData["Member Rank - Name"]}", but proceeding with UID match.`);
                         // Not treating this as a hard error since UID matched
                      }

                      membersToProcess.push({ staffMember: matchedStaff, csvRowData, rowIndex: i + 1 });
                  }
              }

              if (!preliminaryParsingOk) {
                  toast({
                      variant: "destructive",
                      title: "CSV Import Failed: Data Issues",
                      description: ( <ScrollArea className="max-h-40"><pre className="whitespace-pre-wrap text-xs">{errors.join("\n")}</pre></ScrollArea> ),
                      duration: 15000,
                  });
                  if (accomplishmentCsvInputRef) accomplishmentCsvInputRef.value = "";
                  setIsImportingAccomplishments(false); // Reset loading state
                  return;
              }

              membersToProcess.forEach(({ staffMember, csvRowData, rowIndex }) => {
                  const accomplishment = csvRowData["Accomplishment"];
                  const effectiveDateStr = csvRowData["EffectiveDate"];

                  if (!accomplishment) {
                      errors.push(`Row ${rowIndex} (UID: ${staffMember.serviceNumber}): Missing "Accomplishment".`);
                      return;
                  }
                  if (!effectiveDateStr) {
                      errors.push(`Row ${rowIndex} (UID: ${staffMember.serviceNumber}): Missing "EffectiveDate".`);
                      return;
                  }

                  const completionDate = parseDate(effectiveDateStr);
                  if (!completionDate) {
                      errors.push(`Row ${rowIndex} (UID: ${staffMember.serviceNumber}): Invalid "EffectiveDate" format for "${effectiveDateStr}". Use DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, or DD/MM/YY.`);
                      return;
                  }

                  // Create the log object, omitting certificate fields as they are not in the CSV
                  const newLog: Omit<TrainingLog, 'id' | 'certificateFileName' | 'certificateDataUrl'> = {
                    rank: staffMember.rank,
                    staffName: `${staffMember.lastName}, ${staffMember.firstName}`,
                    squadron: staffMember.squadron || "N/A",
                    currentRole: staffMember.role,
                    courseName: accomplishment,
                    completionDate: completionDate,
                    qualificationAchieved: accomplishment, // Assuming accomplishment is the qualification
                    instructorQualification: "", // Default empty
                    achievementDetails: "", // Default empty
                  };

                  newLogsToAdd.push(newLog as Omit<TrainingLog, 'id'>); // Cast needed as we omitted fields
              });
          }
        }

        let importedCount = 0;
        if (newLogsToAdd.length > 0 && errors.length === 0) { // Only proceed if no parsing errors
          // Add logs one by one using mutation
          for (const log of newLogsToAdd) {
             try {
                 await addLogMutation.mutateAsync(log);
                 importedCount++;
             } catch (err: any) {
                 errors.push(`Failed to import accomplishment "${log.courseName}" for ${log.rank} ${log.staffName}: ${err.message}`);
             }
          }
           if (importedCount > 0) {
              toast({ title: "Import Processing Complete", description: `${importedCount} accomplishment(s) added.` });
           }
        }

        // Consolidated error display
        if (errors.length > 0) {
          const title = importedCount > 0 ? "CSV Import Partially Successful" : "CSV Import Failed";
          const variant = importedCount > 0 ? "default" : "destructive";
          const errorMessages = errors.slice(0, 10).join("\n") + (errors.length > 10 ? "\n...and more errors." : "");

          let descriptionPrefix = "";
          if (importedCount > 0 && errors.length > 0) {
              descriptionPrefix = `${importedCount} records imported. Some rows had errors:\n`;
          } else if (importedCount === 0 && errors.length > 0) {
              descriptionPrefix = "No records imported. Errors found:\n";
          }

          toast({
              variant: variant,
              title: title,
              description: (
                <ScrollArea className="max-h-40"><pre className="whitespace-pre-wrap text-xs">{descriptionPrefix}{errorMessages}</pre></ScrollArea>
              ),
              duration: 15000,
          });
        }
      } catch (error: any) {
        console.error("Error during CSV import processing:", error);
        toast({ variant: "destructive", title: "Import Error", description: `An unexpected error occurred: ${error.message}` });
      } finally {
        if (accomplishmentCsvInputRef) {
          accomplishmentCsvInputRef.value = "";
        }
        setIsImportingAccomplishments(false);
      }
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "Import Error", description: "Failed to read the file."});
      if (accomplishmentCsvInputRef) {
        accomplishmentCsvInputRef.value = "";
      }
      setIsImportingAccomplishments(false);
    };
    reader.readAsText(file);
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary hidden sm:block" />
              <div>
                <CardTitle className="text-2xl">Training Overview</CardTitle>
                <CardDescription>Record staff training, qualifications, accomplishments, and generate reports.</CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button onClick={openFormForNew} size="lg" className="w-full sm:w-auto" disabled={addLogMutation.isPending || isImportingAccomplishments}>
                   {(addLogMutation.isPending && !isImportingAccomplishments) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                    Log Training Record
                </Button>
                <Button onClick={() => accomplishmentCsvInputRef?.click()} size="lg" variant="outline" className="w-full sm:w-auto" disabled={isLoadingStaff || isImportingAccomplishments || addLogMutation.isPending || updateLogMutation.isPending || deleteLogMutation.isPending}>
                   {isImportingAccomplishments || isLoadingStaff ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
                    Import Accomplishments
                </Button>
                <input type="file" ref={(el) => setAccomplishmentCsvInputRef(el)} onChange={handleAccomplishmentCsvImport} accept=".csv" style={{ display: 'none' }} />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Loading / Error States */}
       {isLoadingLogs && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading training records...</p>
          </CardContent>
        </Card>
      )}
      {errorLogs && !isLoadingLogs && (
         <Card className="border-destructive">
           <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle /> Error Loading Training Records</CardTitle>
            </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-destructive mb-4">{errorLogs.message}</p>
          </CardContent>
        </Card>
      )}


      {!isLoadingLogs && !errorLogs && squadronStaffGroups.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Training Records Yet</h3>
            <p className="text-muted-foreground mb-4">Click &quot;Log Training Record&quot; or &quot;Import Accomplishments&quot; to get started.</p>
          </CardContent>
        </Card>
      )}

      {!isLoadingLogs && !errorLogs && squadronStaffGroups.map((squadronGroup) => (
        <Card key={squadronGroup.squadronName} className="shadow-xl mb-8">
          <CardHeader className="bg-muted/20 dark:bg-muted/10 border-b rounded-t-lg">
            <CardTitle className="text-2xl">Squadron: {squadronGroup.squadronName}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-2 sm:px-4 md:px-6">
            {squadronGroup.staffMembers.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No training records for this squadron.</p>
            ) : (
              <div className="space-y-6 py-6">
                {squadronGroup.staffMembers.map((staffMemberGroup) => (
                  <Card key={staffMemberGroup.identifier} className="shadow-md">
                    <CardHeader className="border-b bg-background">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <CardTitle className="text-xl">{staffMemberGroup.rank} {staffMemberGroup.staffName}</CardTitle>
                          <CardDescription>{staffMemberGroup.logs.length} training record(s)</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleExportAllTrainingRecordsForMember(staffMemberGroup)} disabled={deleteLogMutation.isPending || updateLogMutation.isPending || isImportingAccomplishments}>
                          <Archive className="mr-2 h-4 w-4" /> Export All for Member
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <ScrollArea className="h-[400px] w-full border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Course/Training</TableHead>
                              <TableHead className="hidden md:table-cell">Role at Training</TableHead>
                              <TableHead>Completion</TableHead>
                              <TableHead className="hidden lg:table-cell">Qualification</TableHead>
                              <TableHead className="hidden xl:table-cell">Certificate</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {staffMemberGroup.logs.map((log) => (
                              <TableRow key={log.id}>
                                <TableCell className="font-medium">{log.courseName}</TableCell>
                                <TableCell className="hidden md:table-cell">{log.currentRole}</TableCell>
                                <TableCell>{format(log.completionDate, "PP")}</TableCell>
                                <TableCell className="hidden lg:table-cell truncate max-w-xs">{log.qualificationAchieved || log.instructorQualification || "N/A"}</TableCell>
                                 <TableCell className="hidden xl:table-cell">
                                  {log.certificateFileName && log.certificateDataUrl ? (
                                    <a href={log.certificateDataUrl} download={log.certificateFileName} className="text-primary hover:underline flex items-center">
                                      <Paperclip className="mr-1 h-4 w-4" /> {log.certificateFileName}
                                    </a>
                                  ) : (
                                    "None"
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0" disabled={deleteLogMutation.isPending || updateLogMutation.isPending || isImportingAccomplishments}>
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => handleViewDetails(log)} disabled={deleteLogMutation.isPending || updateLogMutation.isPending || isImportingAccomplishments}>
                                        <Info className="mr-2 h-4 w-4" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleEdit(log)} disabled={deleteLogMutation.isPending || updateLogMutation.isPending || isImportingAccomplishments}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleExportIndividualRecord(log)} disabled={deleteLogMutation.isPending || updateLogMutation.isPending || isImportingAccomplishments}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Export Record
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => setLogToDelete(log)}
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                        disabled={deleteLogMutation.isPending || updateLogMutation.isPending || isImportingAccomplishments}
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {!isLoadingLogs && !errorLogs && squadronStaffGroups.length > 0 && (
          <Card>
            <CardFooter className="text-xs text-muted-foreground pt-4 justify-center">
                 Displaying records for {squadronStaffGroups.reduce((acc, sq) => acc + sq.staffMembers.length, 0)} staff member(s) across {squadronStaffGroups.length} squadron(s). Total individual logs: {trainingLogsList.length}.
            </CardFooter>
          </Card>
      )}

      <Alert className="mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Accomplishments CSV Import Instructions</AlertTitle>
        <AlertDescription>
          To bulk import training accomplishments, upload a CSV file with the following columns (header row required, order matters):
          <ul className="list-disc pl-5 mt-2 text-xs space-y-1">
            <li><code>MemberUID</code> (Text, Required. This is the Staff Member&apos;s Service Number, e.g., &quot;8001234&quot;)</li>
            <li><code>Member Rank - Name</code> (Text, Required. Format: &quot;RANK FirstName LastName&quot; e.g., &quot;FLTLT(AAFC) Jane Doe&quot;. RANK must be one of: {RANKS.join(", ")}.)</li>
            <li><code>EffectiveDate</code> (Date, Required. Recommended formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, or DD/MM/YY. This will be the completion date of the training.)</li>
            <li><code>Accomplishment</code> (Text, Required. This will be used as the Course Name and Qualification Achieved for the training log.)</li>
          </ul>
          <p className="mt-2 text-xs">
            <strong>Important:</strong> The system uses the <code>MemberUID</code> to find an existing staff member. If a staff member with the provided <code>MemberUID</code> is found, their existing profile details (Rank, Name, Squadron, Role) will be used for the new training log.
            The <code>Member Rank - Name</code> column must still be correctly formatted as specified, as it is validated.
            If a staff member is not found via <code>MemberUID</code>, or if CSV data is malformed for a row, that row will be skipped, and an error reported.
          </p>
        </AlertDescription>
      </Alert>


      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeForm(); else setIsFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingLog ? "Edit Training Record" : "Log New Training Record"}
            </DialogTitle>
            <DialogDescription>
              {editingLog
                ? "Update the details of the training record."
                : "Fill in the form to add a new training record."}
            </DialogDescription>
          </DialogHeader>
           <ScrollArea className="max-h-[70vh] p-1">
            <div className="py-4 pr-4">
            <TrainingLogForm
              onSubmit={editingLog ? handleUpdateLog : handleAddLog}
              defaultValues={editingLog || undefined}
              onCancel={closeForm}
              isEditing={!!editingLog}
            />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

       {viewingLog && (
         <Dialog open={!!viewingLog} onOpenChange={closeViewDialog}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{viewingLog.courseName}</DialogTitle>
                    <DialogDescription>
                        Training for {viewingLog.rank} {viewingLog.staffName}, completed on {format(viewingLog.completionDate, "PPP")}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1 pr-4">
                    <div className="space-y-4 py-4">
                        <div>
                            <h3 className="font-semibold text-sm mb-1">Staff Member</h3>
                            <p className="text-sm text-muted-foreground">{viewingLog.rank} {viewingLog.staffName}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm mb-1">Squadron</h3>
                            <p className="text-sm text-muted-foreground">{viewingLog.squadron}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm mb-1">Role at time of training</h3>
                            <p className="text-sm text-muted-foreground">{viewingLog.currentRole}</p>
                        </div>
                         {viewingLog.qualificationAchieved && (
                            <div>
                                <h3 className="font-semibold text-sm mb-1">Qualification Achieved</h3>
                                <p className="text-sm text-muted-foreground">{viewingLog.qualificationAchieved}</p>
                            </div>
                        )}
                        {viewingLog.instructorQualification && (
                            <div>
                                <h3 className="font-semibold text-sm mb-1">Instructor Qualification</h3>
                                <p className="text-sm text-muted-foreground">{viewingLog.instructorQualification}</p>
                            </div>
                        )}
                        {viewingLog.achievementDetails && (
                             <div>
                                <h3 className="font-semibold text-sm mb-1">Achievements/Awards</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingLog.achievementDetails}</p>
                            </div>
                        )}
                        {viewingLog.certificateFileName && viewingLog.certificateDataUrl && (
                           <div>
                                <h3 className="font-semibold text-sm mb-1">Certificate Attached</h3>
                                <a href={viewingLog.certificateDataUrl} download={viewingLog.certificateFileName} className="text-primary hover:underline flex items-center text-sm">
                                    <Paperclip className="mr-1 h-4 w-4 flex-shrink-0" /> {viewingLog.certificateFileName}
                                </a>
                            </div>
                        )}
                         {(!viewingLog.qualificationAchieved && !viewingLog.instructorQualification && !viewingLog.achievementDetails && !viewingLog.certificateFileName) && (
                            <p className="text-sm text-muted-foreground italic">No additional qualifications, achievements or certificate noted for this record.</p>
                         )}
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => {
                      if (viewingLog) {
                        handleEdit(viewingLog);
                      }
                    }} disabled={deleteLogMutation.isPending || updateLogMutation.isPending || isImportingAccomplishments}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewDialog} disabled={deleteLogMutation.isPending || updateLogMutation.isPending || isImportingAccomplishments}>Close</Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}


      {logToDelete && (
        <AlertDialog open={!!logToDelete} onOpenChange={() => setLogToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the training record for <strong>{logToDelete.rank} {logToDelete.staffName} - {logToDelete.courseName}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setLogToDelete(null)} disabled={deleteLogMutation.isPending || isImportingAccomplishments}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                 disabled={deleteLogMutation.isPending || isImportingAccomplishments}
              >
                {deleteLogMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                    <CardTitle className="text-xl">System Features & Usage Notes</CardTitle>
                    <CardDescription>Overview of Training module capabilities and import guidelines.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center">
              <ListChecks className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Log completed training courses, workshops, and qualifications for each staff member. (Implemented)
            </li>
             <li className="flex items-center">
              <Archive className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Group records by squadron and staff member, export records. (Implemented)
            </li>
            <li className="flex items-center">
              <UserCog className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Track instructor qualifications and endorsements. (Partially implemented)
            </li>
            <li className="flex items-center">
              <Trophy className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Record significant achievements, awards, and recognitions. (Implemented)
            </li>
            <li className="flex items-center">
               <UploadCloud className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Upload and manage training certificates and supporting documentation. (Implemented)
            </li>
             <li className="flex items-center">
               <UploadCloud className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Bulk import training accomplishments via CSV. (Implemented - See instructions above)
            </li>
            <li className="flex items-center">
              <BarChartHorizontalBig className="h-4 w-4 mr-3 text-primary/70 flex-shrink-0" />
              Generate reports on training completion, qualification status, and skill gaps. (Export single record implemented, export all for member implemented)
            </li>
             <li className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-primary/70 flex-shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              Integration with Staff Management module for selecting staff and ensuring data consistency.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

