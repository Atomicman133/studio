
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, GraduationCap, ListChecks, BarChartHorizontalBig, UserCog, Trophy, Edit3, Info, UploadCloud, Download, Archive, Paperclip, AlertCircle } from "lucide-react";
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
import { initialStaff } from "@/app/staff/page"; // Import initialStaff
import { useToast } from "@/hooks/use-toast";


export const initialTrainingLogs: TrainingLog[] = [
  {
    id: "t1",
    rank: "FLTLT(AAFC)",
    staffName: "Smith, Jane",
    squadron: "123 Squadron",
    currentRole: "Training Officer",
    courseName: "Officer Development Course",
    completionDate: new Date("2023-11-20"),
    qualificationAchieved: "ODC Certificate",
  },
  {
    id: "t2",
    rank: "FLGOFF(AAFC)",
    staffName: "Doe, John",
    squadron: "456 Squadron",
    currentRole: "Safety Officer",
    courseName: "Range Safety Officer Training",
    completionDate: new Date("2024-02-10"),
    instructorQualification: "Certified RSO",
    achievementDetails: "Top score in practical assessment."
  },
  {
    id: "t3",
    rank: "FLTLT(AAFC)",
    staffName: "Smith, Jane",
    squadron: "123 Squadron",
    currentRole: "Training Officer",
    courseName: "Advanced First Aid",
    completionDate: new Date("2024-03-15"),
    qualificationAchieved: "HLTAID011", // Example of a First Aid cert
    achievementDetails: "Instructor recommendation."
  },
   {
    id: "t4",
    rank: "PLTOFF(AAFC)",
    staffName: "Williams, Alice",
    squadron: "123 Squadron",
    currentRole: "Admin Officer",
    courseName: "Introduction to AAFC Systems",
    completionDate: new Date("2024-01-15"),
    qualificationAchieved: "System Access Granted",
  },
  {
    id: "t5",
    rank: "SQNLDR(AAFC)",
    staffName: "Brown, Robert",
    squadron: "721 Wing HQ", 
    currentRole: "Wing Training Coordinator",
    courseName: "Senior Leadership Seminar",
    completionDate: new Date("2023-09-05"),
    qualificationAchieved: "SLS Attendance",
  },
  // Adding more diverse logs for better compliance testing
  {
    id: "t6",
    rank: "FLGOFF(AAFC)",
    staffName: "Doe, John", // John Doe from 456 SQN
    squadron: "456 Squadron",
    currentRole: "Safety Officer",
    courseName: "Working With Children Check Application",
    completionDate: new Date("2023-01-10"), // Assume this is when it was processed/granted
    qualificationAchieved: "WWCC Cleared",
  },
  {
    id: "t7",
    rank: "FLTLT(AAFC)",
    staffName: "Smith, Jane", // Jane Smith from 123 SQN
    squadron: "123 Squadron",
    currentRole: "Training Officer",
    courseName: "Code of Conduct Acceptance",
    completionDate: new Date("2023-02-01"),
  },
  {
    id: "t8",
    rank: "FLGOFF(AAFC)",
    staffName: "Doe, John",
    squadron: "456 Squadron",
    currentRole: "Safety Officer",
    courseName: "National Police Clearance",
    completionDate: new Date("2020-07-01"), // This will be expired for a 5-year rule
  },
  {
    id: "t9",
    rank: "PLTOFF(AAFC)",
    staffName: "Williams, Alice",
    squadron: "123 Squadron",
    currentRole: "Admin Officer",
    courseName: "Defence Youth Safety Training (DYSAT)",
    completionDate: new Date("2024-06-01"), // Current for 1-year rule
  },
  {
    id: "t10",
    rank: "FLTLT(AAFC)",
    staffName: "Smith, Jane",
    squadron: "123 Squadron",
    currentRole: "Training Officer",
    courseName: "Psychological Assessment",
    completionDate: new Date("2022-05-01"),
  },
   { // Jane Smith gets her WWCC
    id: "t11",
    rank: "FLTLT(AAFC)",
    staffName: "Smith, Jane",
    squadron: "123 Squadron",
    currentRole: "Training Officer",
    courseName: "Working With Children Check (Vic)",
    completionDate: new Date("2023-03-15"),
    qualificationAchieved: "WWCC Card Holder"
  },
  { // Jane Smith gets her Police Check (recent)
    id: "t12",
    rank: "FLTLT(AAFC)",
    staffName: "Smith, Jane",
    squadron: "123 Squadron",
    currentRole: "Training Officer",
    courseName: "National Police Clearance (NPC)",
    completionDate: new Date("2023-08-20"),
  },
  { // Jane Smith gets her DYSAT (recent)
    id: "t13",
    rank: "FLTLT(AAFC)",
    staffName: "Smith, Jane",
    squadron: "123 Squadron",
    currentRole: "Training Officer",
    courseName: "Defence Youth Safety Awareness Training",
    completionDate: new Date("2024-05-10"),
  },
   { // John Doe gets Code of Conduct
    id: "t14",
    rank: "FLGOFF(AAFC)",
    staffName: "Doe, John",
    squadron: "456 Squadron",
    currentRole: "Safety Officer",
    courseName: "Code of Conduct and Behavioural Policy Acceptance",
    completionDate: new Date("2024-01-15"),
  },
  { // John Doe gets Psych Assessment
    id: "t15",
    rank: "FLGOFF(AAFC)",
    staffName: "Doe, John",
    squadron: "456 Squadron",
    currentRole: "Safety Officer",
    courseName: "Mandatory Psychological Assessment",
    completionDate: new Date("2024-02-20"),
  },
   { // John Doe gets DYSAT (old, will be expired)
    id: "t16",
    rank: "FLGOFF(AAFC)",
    staffName: "Doe, John",
    squadron: "456 Squadron",
    currentRole: "Safety Officer",
    courseName: "DYSAT Refresher",
    completionDate: new Date("2023-01-05"), // Will be expired
  },
];

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

async function convertFileToDataUrl(file: File): Promise<{ name: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, dataUrl: reader.result as string });
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}


export default function TrainingPage() {
  const [trainingLogsList, setTrainingLogsList] = React.useState<TrainingLog[]>(initialTrainingLogs);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingLog, setEditingLog] = React.useState<TrainingLog | null>(null);
  const [logToDelete, setLogToDelete] = React.useState<TrainingLog | null>(null);
  const [viewingLog, setViewingLog] = React.useState<TrainingLog | null>(null);
  const accomplishmentCsvInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();


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
            
            const rankComparison = rankBIndex - rankAIndex; 
            if (rankComparison !== 0) return rankComparison;
            
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
      }
    }

    const newLog: TrainingLog = {
      id: crypto.randomUUID(),
      rank: data.rank,
      staffName: data.staffName,
      squadron: data.squadron,
      currentRole: data.currentRole,
      courseName: data.courseName,
      completionDate: data.completionDate,
      qualificationAchieved: data.qualificationAchieved,
      instructorQualification: data.instructorQualification,
      achievementDetails: data.achievementDetails,
      ...certificateInfo,
    };
    setTrainingLogsList((prev) => [newLog, ...prev]);
    setIsFormOpen(false);
    toast({ title: "Success", description: "Training record added." });
  };

  const handleUpdateLog = async (data: TrainingLogFormData) => {
    if (!editingLog) return;

    let certificateUpdates: Partial<TrainingLog> = {};
    if (data.certificateFile) {
      try {
        const { name, dataUrl } = await convertFileToDataUrl(data.certificateFile);
        certificateUpdates = { certificateFileName: name, certificateDataUrl: dataUrl };
      } catch (error) {
        console.error("Error converting file:", error);
        toast({ variant: "destructive", title: "File Error", description: "Could not process certificate file."});
      }
    } else if (data.certificateFileName === undefined && data.certificateDataUrl === undefined) {
      certificateUpdates = { certificateFileName: undefined, certificateDataUrl: undefined };
    } else {
      // Keep existing certificate if no new file and not explicitly removed
      certificateUpdates = {
        certificateFileName: editingLog.certificateFileName,
        certificateDataUrl: editingLog.certificateDataUrl,
      };
    }

    const updatedLog: TrainingLog = {
      ...editingLog, // Preserve existing fields like ID
      rank: data.rank,
      staffName: data.staffName,
      squadron: data.squadron,
      currentRole: data.currentRole,
      courseName: data.courseName,
      completionDate: data.completionDate,
      qualificationAchieved: data.qualificationAchieved,
      instructorQualification: data.instructorQualification,
      achievementDetails: data.achievementDetails,
      ...certificateUpdates,
    };

    setTrainingLogsList((prev) =>
      prev.map((log) => (log.id === updatedLog.id ? updatedLog : log))
    );
    setIsFormOpen(false);
    setEditingLog(null);
    toast({ title: "Success", description: "Training record updated." });
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
    if (logToDelete) {
      setTrainingLogsList((prev) => prev.filter((log) => log.id !== logToDelete.id));
      setLogToDelete(null);
      toast({ title: "Success", description: "Training record deleted." });
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
    const formatsToTry = ["dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "dd-MM-yyyy", "yyyy/MM/dd"];
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

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast({ variant: "destructive", title: "Import Error", description: "Could not read file content." });
        return;
      }
      
      const newLogs: TrainingLog[] = [];
      const errors: string[] = [];
      const lines = text.split(/\r\n|\n/);

      if (lines.length < 2) {
        errors.push("CSV must have a header and at least one data row.");
      } else {
        const headerLine = lines[0].trim();
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
                  errors.push(`Missing expected header column: "${eh}"`);
                }
            });

            if (errors.length > 0) { // If any expected header is missing
                 toast({
                    variant: "destructive",
                    title: "CSV Import Failed",
                    description: (
                        <ScrollArea className="max-h-40">
                            <pre className="whitespace-pre-wrap text-xs">
                                Missing one or more required CSV header columns. Details:\n{errors.join("\n")}
                            </pre>
                        </ScrollArea>
                    ),
                    duration: 15000,
                });
                if (accomplishmentCsvInputRef.current) accomplishmentCsvInputRef.current.value = "";
                return;
            }
            
            const membersToProcess: Array<{ staffMember: StaffMember, csvRow: Record<string, string>, rowIndex: number }> = [];
            let allMembersFound = true;

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                if (values.length !== header.length) {
                    errors.push(`Row ${i + 1}: Incorrect number of columns. Expected ${header.length}, got ${values.length}. Line: "${line}"`);
                    allMembersFound = false;
                    continue;
                }
                
                const csvData: Record<string, string> = {};
                expectedHeader.forEach(eh => {
                    csvData[eh] = values[headerIndices[eh]];
                });

                const memberRankNameStr = csvData["Member Rank - Name"];
                const serviceNumber = csvData["MemberUID"];
                const { rank, firstName, lastName } = parseMemberRankName(memberRankNameStr);

                if (!serviceNumber) {
                    errors.push(`Row ${i + 1}: Missing "MemberUID".`);
                    allMembersFound = false;
                    continue;
                }
                if (!rank) {
                  errors.push(`Row ${i + 1}: Could not parse rank from "Member Rank - Name": "${memberRankNameStr}". Valid ranks: ${RANKS.join(", ")}`);
                  allMembersFound = false;
                  continue;
                }
                if (!firstName || !lastName) {
                  errors.push(`Row ${i + 1}: Could not parse first and last name from "Member Rank - Name": "${memberRankNameStr}". Expected format: "RANK FirstName LastName".`);
                  allMembersFound = false;
                  continue;
                }

                const matchedStaff = initialStaff.find(
                    (sm) => sm.serviceNumber === serviceNumber &&
                           sm.rank === rank &&
                           sm.firstName.toLowerCase() === firstName.toLowerCase() &&
                           sm.lastName.toLowerCase() === lastName.toLowerCase()
                );

                if (!matchedStaff) {
                    errors.push(`Row ${i + 1}: Staff member "${lastName}, ${firstName} (${rank}, ${serviceNumber})" not found. Please ensure staff profile exists.`);
                    allMembersFound = false;
                } else {
                    membersToProcess.push({ staffMember: matchedStaff, csvRow: csvData, rowIndex: i + 1 });
                }
            }

            if (!allMembersFound) {
                toast({
                    variant: "destructive",
                    title: "CSV Import Failed",
                    description: (
                        <ScrollArea className="max-h-40">
                            <pre className="whitespace-pre-wrap text-xs">
                                One or more staff members in the CSV could not be found or data was malformed. Details:\n{errors.join("\n")}
                            </pre>
                        </ScrollArea>
                    ),
                    duration: 15000,
                });
                if (accomplishmentCsvInputRef.current) accomplishmentCsvInputRef.current.value = "";
                return;
            }

            membersToProcess.forEach(({ staffMember, csvRow, rowIndex }) => {
                const accomplishment = csvRow["Accomplishment"];
                const effectiveDateStr = csvRow["EffectiveDate"];
                
                if (!accomplishment) {
                    errors.push(`Row ${rowIndex}: Missing "Accomplishment".`);
                    return; 
                }
                if (!effectiveDateStr) {
                    errors.push(`Row ${rowIndex}: Missing "EffectiveDate".`);
                    return;
                }

                const completionDate = parseDate(effectiveDateStr);
                if (!completionDate) {
                    errors.push(`Row ${rowIndex}: Invalid "EffectiveDate" format for "${effectiveDateStr}". Use DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD.`);
                    return;
                }
                
                newLogs.push({
                    id: crypto.randomUUID(),
                    rank: staffMember.rank,
                    staffName: `${staffMember.lastName}, ${staffMember.firstName}`,
                    squadron: staffMember.squadron || "N/A", 
                    currentRole: staffMember.role, 
                    courseName: accomplishment,
                    completionDate: completionDate,
                    qualificationAchieved: accomplishment,
                });
            });
        }
      }

      if (newLogs.length > 0) {
        setTrainingLogsList(prev => [...prev, ...newLogs].sort((a,b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime() ));
        toast({ title: "Import Successful", description: `${newLogs.length} accomplishment(s) imported.` });
      }
      if (errors.length > 0 && newLogs.length === 0) { // Only show if all rows failed (excluding header issues handled above)
        const errorMessages = errors.slice(0, 10).join("\n") + (errors.length > 10 ? "\n...and more errors." : "");
        toast({
            variant: "destructive",
            title: `CSV Import Failed`,
            description: (
              <ScrollArea className="max-h-40">
                <pre className="whitespace-pre-wrap text-xs">{errorMessages}</pre>
              </ScrollArea>
            ),
            duration: 10000, 
        });
      } else if (errors.length > 0 && newLogs.length > 0) { // Partial success
          const errorMessages = errors.slice(0, 5).join("\n") + (errors.length > 5 ? "\n...and more errors." : "");
           toast({
            variant: "default", // Use default or a warning variant if available
            title: `CSV Import Partially Successful`,
            description: (
              <ScrollArea className="max-h-40">
                <pre className="whitespace-pre-wrap text-xs">{newLogs.length} records imported. Some rows had errors:\n{errorMessages}</pre>
              </ScrollArea>
            ),
            duration: 10000, 
        });
      }


      if (accomplishmentCsvInputRef.current) {
        accomplishmentCsvInputRef.current.value = ""; 
      }
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "Import Error", description: "Failed to read the file."});
      if (accomplishmentCsvInputRef.current) {
        accomplishmentCsvInputRef.current.value = ""; 
      }
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
                <Button onClick={openFormForNew} size="lg" className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-5 w-5" /> Log Training Record
                </Button>
                <Button onClick={() => accomplishmentCsvInputRef.current?.click()} size="lg" variant="outline" className="w-full sm:w-auto">
                    <UploadCloud className="mr-2 h-5 w-5" /> Import Accomplishments
                </Button>
                <input type="file" ref={accomplishmentCsvInputRef} onChange={handleAccomplishmentCsvImport} accept=".csv" style={{ display: 'none' }} />
            </div>
          </div>
        </CardHeader>
      </Card>

      {squadronStaffGroups.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Training Records Yet</h3>
            <p className="text-muted-foreground mb-4">Click &quot;Log Training Record&quot; or &quot;Import Accomplishments&quot; to get started.</p>
          </CardContent>
        </Card>
      )}

      {squadronStaffGroups.map((squadronGroup) => (
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
                        <Button variant="outline" size="sm" onClick={() => handleExportAllTrainingRecordsForMember(staffMemberGroup)}>
                          <Archive className="mr-2 h-4 w-4" /> Export All for Member
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
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
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleViewDetails(log)}>
                                      <Info className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEdit(log)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExportIndividualRecord(log)}>
                                      <Download className="mr-2 h-4 w-4" />
                                      Export Record
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setLogToDelete(log)}
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
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
        
      {squadronStaffGroups.length > 0 && (
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
            <li><code>Member Rank - Name</code> (Text, Required. Format: &quot;RANK FirstName LastName&quot; e.g., &quot;FLTLT(AAFC) Jane Doe&quot;. RANK must be one of: {RANKS.join(", ")}. The Service Number, Rank, and Name must exactly match an existing staff profile in Staff Management.)</li>
            <li><code>EffectiveDate</code> (Date, Required. Recommended formats: DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD. This will be the completion date of the training.)</li>
            <li><code>Accomplishment</code> (Text, Required. This will be used as the Course Name and Qualification Achieved for the training log.)</li>
          </ul>
          <p className="mt-2 text-xs">
            <strong>Important:</strong> All staff members identified in the CSV (via MemberUID, Member Rank - Name) must already exist in the Staff Management section. If any member is not found, or if data is malformed, the entire CSV import will be rejected.
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
                    }}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={closeViewDialog}>Close</Button>
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
              <AlertDialogCancel onClick={() => setLogToDelete(null)}>
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

