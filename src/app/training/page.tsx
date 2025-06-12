
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, GraduationCap, ListChecks, BarChartHorizontalBig, UserCog, Trophy, Edit3, Info, UploadCloud, Download, Archive, Paperclip, AlertCircle, Loader2, AlertTriangle, Mail } from "lucide-react";
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
import { RANKS, type StaffMember, type ServiceHistoryEntry, STAFF_QUERY_KEY } from "@/app/staff/staff-schema";
import { useStaff } from "@/hooks/useStaffData"; 
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, orderBy, writeBatch, arrayUnion } from 'firebase/firestore';
import { convertFileToDataUrl, addLetterheadAndFooter, addPageNumbers, resetLetterheadCache } from "@/lib/utils"; 
import jsPDF from 'jspdf';


export const TRAINING_LOGS_QUERY_KEY = 'trainingLogs'; 
const HEADER_IMAGE_URL = "/AAFCLetterhead-Header.png";
const FOOTER_IMAGE_URL = "/AAFCLetterhead-Footer.png";

const FULL_RANK_TO_ABBREVIATION_MAP: Record<string, typeof RANKS[number]> = {
  "AIRCRAFTMAN (AAFC)": "AC(AAFC)",
  "AIRCRAFTWOMAN (AAFC)": "ACW(AAFC)",
  "LEADING AIRCRAFTMAN (AAFC)": "LAC(AAFC)",
  "LEADING AIRCRAFTWOMAN (AAFC)": "LACW(AAFC)",
  "CORPORAL (AAFC)": "CPL(AAFC)",
  "SERGEANT (AAFC)": "SGT(AAFC)",
  "FLIGHT SERGEANT (AAFC)": "FSGT(AAFC)",
  "WARRANT OFFICER (AAFC)": "WOFF(AAFC)",
  "PILOT OFFICER (AAFC)": "PLTOFF(AAFC)",
  "FLYING OFFICER (AAFC)": "FLGOFF(AAFC)",
  "FLIGHT LIEUTENANT (AAFC)": "FLTLT(AAFC)",
  "SQUADRON LEADER (AAFC)": "SQNLDR(AAFC)",
  "WING COMMANDER (AAFC)": "WGCDR(AAFC)",
  "GROUP CAPTAIN (AAFC)": "GPCAPT(AAFC)", // Added GPCAPT
  "CIVILIAN INSTRUCTOR": "CIV", // Added CIV
  "REGIONAL WARRANT OFFICER": "WOFF(AAFC)", // Map to generic WOFF
  "DIRECTOR GENERAL CADETS - AIR FORCE": "GPCAPT(AAFC)", // Example mapping
  "COMMANDER AUSTRALIAN AIR FORCE CADETS": "WGCDR(AAFC)", // Example mapping
};

function parseFullRankNameToAbbreviation(fullRankStringInput: string | undefined): typeof RANKS[number] | null {
  if (!fullRankStringInput) return null;
  const upperFullRankString = fullRankStringInput.toUpperCase().replace(/^ACTUAL - /i, "").trim();
  if (FULL_RANK_TO_ABBREVIATION_MAP[upperFullRankString]) {
    return FULL_RANK_TO_ABBREVIATION_MAP[upperFullRankString];
  }
  // Fallback for ranks that might just be the abbreviation already
  const rankAsConst = upperFullRankString as typeof RANKS[number];
  if (RANKS.includes(rankAsConst)) {
    return rankAsConst;
  }
  console.warn(`[RankParse] Could not parse full rank: "${fullRankStringInput}" to an abbreviation. Input normalized to: "${upperFullRankString}"`);
  return null;
}


// Helper to convert Firestore Timestamps
export const convertLogTimestamps = (data: any): Partial<TrainingLog> => {
  const completionDate = data.completionDate instanceof Timestamp ? data.completionDate.toDate() : data.completionDate;
  if (completionDate && !isValidDate(new Date(completionDate))) {
    console.warn(`Invalid completionDate encountered during timestamp conversion: ${data.completionDate?.toString()}`);
    return {
      ...data,
      completionDate: undefined, 
      serviceNumber: data.serviceNumber || undefined,
    };
  }
  return {
    ...data,
    completionDate: completionDate ? new Date(completionDate) : undefined,
    serviceNumber: data.serviceNumber || undefined,
  };
};

// --- Fetch Training Logs ---
async function fetchTrainingLogs(): Promise<TrainingLog[]> {
  const collectionRef = collection(db, 'trainingLogs'); 
  const q = query(collectionRef, orderBy('completionDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    const convertedData = convertLogTimestamps(data);
    return {
      id: doc.id,
      rank: data.rank || undefined, 
      staffName: data.staffName || "Unknown Staff",
      squadron: data.squadron || "N/A",
      currentRole: data.currentRole || "N/A",
      courseName: data.courseName || "Unnamed Course",
      completionDate: convertedData.completionDate instanceof Date ? convertedData.completionDate : new Date(), 
      qualificationAchieved: data.qualificationAchieved || undefined,
      instructorQualification: data.instructorQualification || undefined,
      achievementDetails: data.achievementDetails || undefined,
      certificateFileName: data.certificateFileName || undefined,
      certificateDataUrl: data.certificateDataUrl || undefined,
      serviceNumber: data.serviceNumber || undefined,
      ...convertedData, 
    } as TrainingLog;
  })
}


// --- Add Training Log ---
async function addTrainingLog(newLogData: Omit<TrainingLog, 'id'>): Promise<string> {
  const collectionRef = collection(db, 'trainingLogs');
  const dataToSave: any = { 
    ...newLogData,
    completionDate: Timestamp.fromDate(newLogData.completionDate),
    qualificationAchieved: newLogData.qualificationAchieved || null,
    instructorQualification: newLogData.instructorQualification || null,
    achievementDetails: newLogData.achievementDetails || null,
    certificateFileName: newLogData.certificateFileName || null,
    certificateDataUrl: newLogData.certificateDataUrl || null,
    serviceNumber: newLogData.serviceNumber || null, 
  };
  
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
  const dataToSave: any = { 
    ...dataToUpdate,
    completionDate: Timestamp.fromDate(dataToUpdate.completionDate),
     qualificationAchieved: dataToUpdate.qualificationAchieved || null,
     instructorQualification: dataToUpdate.instructorQualification || null,
     achievementDetails: dataToUpdate.achievementDetails || null,
     certificateFileName: dataToUpdate.certificateFileName || null,
     certificateDataUrl: dataToUpdate.certificateDataUrl || null,
     serviceNumber: dataToUpdate.serviceNumber || null, 
  };

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


const robustCsvParser = (csvText: string): string[][] => {
    const rows: string[][] = [];
    if (!csvText || csvText.trim() === "") return rows;

    let currentRow: string[] = [];
    let currentField = "";
    let inQuotedField = false;
    const normalizedText = csvText.replace(/\r\n|\r/g, '\n'); 

    for (let i = 0; i < normalizedText.length; i++) {
        const char = normalizedText[i];

        if (inQuotedField) {
            if (char === '"') {
                if (i + 1 < normalizedText.length && normalizedText[i + 1] === '"') {
                    currentField += '"'; 
                    i++; 
                } else {
                    inQuotedField = false; 
                }
            } else {
                currentField += char; 
            }
        } else { 
            if (char === '"') {
                if (currentField.trim() === "") {
                    inQuotedField = true;
                } else { 
                    currentField += char; 
                }
            } else if (char === ',') {
                currentRow.push(currentField.trim()); 
                currentField = "";
            } else if (char === '\n') {
                currentRow.push(currentField.trim()); 
                currentField = "";
                if (currentRow.length > 0 && (rows.length > 0 ? currentRow.some(f => f.trim() !== "") : true) ) {
                    rows.push([...currentRow]);
                }
                currentRow = [];
            } else {
                currentField += char; 
            }
        }
    }
    if (currentField || currentRow.length > 0) { 
        currentRow.push(currentField.trim());
    }
    if (currentRow.length > 0 && currentRow.some(f => f.trim() !== "")) { 
        rows.push([...currentRow]);
    }
    return rows;
};


export default function TrainingPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: staffList = [], isLoading: isLoadingStaff } = useStaff(); 

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


  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingLog, setEditingLog] = React.useState<TrainingLog | null>(null);
  const [logToDelete, setLogToDelete] = React.useState<TrainingLog | null>(null);
  const [viewingLog, setViewingLog] = React.useState<TrainingLog | null>(null);
  const [accomplishmentCsvInputRef, setAccomplishmentCsvInputRef] = React.useState<HTMLInputElement | null>(null);
  const [isImportingAccomplishments, setIsImportingAccomplishments] = React.useState(false);

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isImportingAccomplishments) {
        event.preventDefault();
        event.returnValue = "Import is in progress. Are you sure you want to leave? This may interrupt the import.";
      }
    };

    if (isImportingAccomplishments) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    } else {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isImportingAccomplishments]);


  const squadronStaffGroups = React.useMemo(() => {
    const logsBySquadron: Record<string, TrainingLog[]> = {};
    trainingLogsList.forEach(log => {
      const sqn = log.squadron || "Unassigned"; 
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
            const rankComparison = rankAIndex - rankBIndex;
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
        return; 
      }
    }

    let serviceNumberToSave: string | undefined = undefined;
    if (data.staffName && data.rank && data.squadron && staffList.length > 0) {
        const matchedStaff = staffList.find(sm => 
            sm.rank === data.rank && 
            `${sm.lastName}, ${sm.firstName}` === data.staffName &&
            sm.squadron === data.squadron
        );
        if (matchedStaff && matchedStaff.serviceNumber) {
            serviceNumberToSave = matchedStaff.serviceNumber;
        } else {
            console.warn(`Manual Log: Could not find exact staff match for ${data.staffName}, ${data.rank}, ${data.squadron} to add serviceNumber.`);
        }
    }


    const newLog: Omit<TrainingLog, 'id'> = { 
      rank: data.rank,
      staffName: data.staffName,
      squadron: data.squadron,
      currentRole: data.currentRole,
      courseName: data.courseName,
      completionDate: data.completionDate,
      qualificationAchieved: data.qualificationAchieved,
      instructorQualification: data.instructorQualification,
      achievementDetails: data.achievementDetails,
      certificateFileName: certificateInfo.certificateFileName, 
      certificateDataUrl: certificateInfo.certificateDataUrl,
      serviceNumber: serviceNumberToSave, 
    };
    addLogMutation.mutate(newLog); 
  };

  const handleUpdateLog = async (data: TrainingLogFormData) => {
    if (!editingLog || !editingLog.id) return;

    let certificateUpdates: Partial<TrainingLog> = {};
    if (data.certificateFile) {
      try {
        const { name, dataUrl } = await convertFileToDataUrl(data.certificateFile);
        certificateUpdates = { certificateFileName: name, dataUrl: dataUrl };
      } catch (error) {
        console.error("Error converting file:", error);
        toast({ variant: "destructive", title: "File Error", description: "Could not process certificate file."});
        return; 
      }
    } else if (data.certificateFileName === undefined && data.certificateDataUrl === undefined) {
      // This case handles when the "Remove Certificate" button was clicked
      certificateUpdates = { certificateFileName: undefined, certificateDataUrl: undefined };
    }


    let serviceNumberToSave: string | undefined = editingLog.serviceNumber; 
    if (data.staffName && data.rank && data.squadron && staffList.length > 0) {
        const matchedStaff = staffList.find(sm => 
            sm.rank === data.rank && 
            `${sm.lastName}, ${sm.firstName}` === data.staffName &&
            sm.squadron === data.squadron
        );
        if (matchedStaff && matchedStaff.serviceNumber) {
            serviceNumberToSave = matchedStaff.serviceNumber;
        } else {
            console.warn(`Manual Log Update: Could not find exact staff match for ${data.staffName}, ${data.rank}, ${data.squadron} to update serviceNumber. Previous: ${serviceNumberToSave}`);
        }
    }
    
    const updatedLog: TrainingLog = {
      id: editingLog.id, 
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
      serviceNumber: serviceNumberToSave, 
    };

    updateLogMutation.mutate(updatedLog); 
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
      deleteLogMutation.mutate(logToDelete.id); 
    }
  };

  const handleExportIndividualRecord = async (log: TrainingLog) => {
    const doc = new jsPDF();
    resetLetterheadCache(); 
    const recordDate = format(log.completionDate, "yyyy-MM-dd");
    const filename = `training_record_${log.rank}_${log.staffName.replace(/\s*,\s*|\s+/g, '_')}_${log.courseName.replace(/\s+/g, '_')}_${recordDate}.pdf`;

    const margin = 15;
    let yPos = margin;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - (margin * 2);
    let headerHeight = 0;
    let footerHeight = 0;

    const { headerHeight: hh, footerHeight: fh } = await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
    headerHeight = hh;
    footerHeight = fh;
    yPos = margin + headerHeight + 5;


    const checkPageBreak = async (neededHeight: number) => {
      if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin - footerHeight) {
        addPageNumbers(doc, footerHeight, margin);
        doc.addPage();
        await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
        yPos = margin + headerHeight + 5;
      }
    };

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    await checkPageBreak(sectionSpacing + 16);
    doc.text(`Training Record: ${log.courseName}`, margin, yPos);
    yPos += sectionSpacing;

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');

    const addText = async (label: string, value?: string | null) => {
      if (!value || value.trim() === "") return;
      doc.setFont(undefined, 'bold');
      await checkPageBreak(lineSpacing);
      doc.text(`${label}:`, margin, yPos);
      doc.setFont(undefined, 'normal');
      const textLines = doc.splitTextToSize(value, maxLineWidth - doc.getTextWidth(`${label}: `) - 5);
      await checkPageBreak(textLines.length * (lineSpacing * 0.7));
      doc.text(textLines, margin + doc.getTextWidth(`${label}: `) + 2, yPos);
      yPos += (textLines.length * lineSpacing * 0.7) + (lineSpacing * 0.3);
    };
    
    await addText("Staff Name", `${log.rank} ${log.staffName}`);
    if(log.serviceNumber) await addText("Service Number", log.serviceNumber);
    await addText("Squadron", log.squadron);
    await addText("Role at Training", log.currentRole);
    await addText("Completion Date", format(log.completionDate, "PPP"));
    await addText("Qualification Achieved", log.qualificationAchieved);
    await addText("Instructor Qualification", log.instructorQualification);
    await addText("Achievements/Awards", log.achievementDetails);
    await addText("Certificate Attached", log.certificateFileName);

    addPageNumbers(doc, footerHeight, margin);
    doc.save(filename);
  };

  const handleExportAllTrainingRecordsForMember = async (staffMemberGroup: StaffMemberLogGroup) => {
    const doc = new jsPDF();
    resetLetterheadCache();
    const staffIdentifier = `${staffMemberGroup.rank}_${staffMemberGroup.staffName.replace(/\s*,\s*|\s+/g, '_')}`;
    const filename = `all_training_records_${staffIdentifier}.pdf`;

    const margin = 15;
    let yPos = margin;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const indent = 5;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - margin * 2;
    let headerHeight = 0;
    let footerHeight = 0;
    
    const { headerHeight: hh, footerHeight: fh } = await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
    headerHeight = hh;
    footerHeight = fh;
    yPos = margin + headerHeight + 5;

    const checkPageBreak = async (neededHeight: number) => {
      if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin - footerHeight) {
        addPageNumbers(doc, footerHeight, margin);
        doc.addPage();
        await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
        yPos = margin + headerHeight + 5;
      }
    };

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    await checkPageBreak(sectionSpacing + 18);
    doc.text(`All Training Records for ${staffMemberGroup.rank} ${staffMemberGroup.staffName}`, margin, yPos);
    yPos += lineSpacing;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    await checkPageBreak(lineSpacing);
    const memberServiceNumber = staffMemberGroup.logs[0]?.serviceNumber; 
    if(memberServiceNumber) await checkPageBreak(lineSpacing); doc.text(`Service Number: ${memberServiceNumber}`, margin, yPos); yPos += lineSpacing;
    await checkPageBreak(lineSpacing);
    doc.text(`Associated with Squadron(s): ${Array.from(new Set(staffMemberGroup.logs.map(l => l.squadron))).join(', ')}`, margin, yPos);
    yPos += sectionSpacing * 1.5;

    for (const [index, log] of staffMemberGroup.logs.entries()) {
      await checkPageBreak(sectionSpacing * 2 + lineSpacing * 7 + 12); 
      doc.setLineWidth(0.2);
      doc.line(margin, yPos - (lineSpacing / 2), pageWidth - margin, yPos - (lineSpacing / 2)); 
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Record ${index + 1}: ${log.courseName}`, margin, yPos);
      yPos += lineSpacing;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const addDetail = async (label: string, value?: string | null) => {
        if (!value || value.trim() === "") return;
        await checkPageBreak(lineSpacing);
        const textLines = doc.splitTextToSize(`${label}: ${value}`, maxLineWidth - indent);
        await checkPageBreak(textLines.length * (lineSpacing * 0.7));
        doc.text(textLines, margin + indent, yPos);
        yPos += (textLines.length * lineSpacing * 0.7) + (lineSpacing * 0.3);
      };

      await addDetail("Squadron at Training", log.squadron);
      await addDetail("Role at Training", log.currentRole);
      await addDetail("Completion Date", format(log.completionDate, "PPP"));
      await addDetail("Qualification Achieved", log.qualificationAchieved);
      await addDetail("Instructor Qualification", log.instructorQualification);
      await addDetail("Achievements/Awards", log.achievementDetails);
      await addDetail("Certificate", log.certificateFileName);
      yPos += lineSpacing * 0.5; 
    }
    addPageNumbers(doc, footerHeight, margin);
    doc.save(filename);
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

  const parseDate = (dateString: string): Date | null => {
    const formatsToTry = ["dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "dd-MM-yyyy", "yyyy/MM/dd", "dd/MM/yy", "d-MMM-yy"]; // Added d-MMM-yy
    for (const fmt of formatsToTry) {
      const parsed = parseDateFns(dateString, fmt, new Date());
      if (isValidDate(parsed)) return parsed;
    }
    const directParsed = new Date(dateString);
    if (isValidDate(directParsed)) return directParsed;
    console.warn(`[DateParse] Could not parse date: "${dateString}" with any known format.`);
    return null;
  };

function parseCompositeSurnameField(surnameFieldInput: string): { lastName: string | null, firstName: string | null, rank: typeof RANKS[number] | null, memberUID: string | null } {
    const surnameField = surnameFieldInput.trim().replace(/\r\n|\n|\r/g, " ");
    
    let namePart = surnameField;
    let foundRank: typeof RANKS[number] | null = null;
    let memberUID: string | null = null;

    const uidMatch = namePart.match(/(\d{7,})$/); 
    if (uidMatch && uidMatch[1]) {
        memberUID = uidMatch[1];
        namePart = namePart.substring(0, namePart.lastIndexOf(memberUID)).trim();
    } else {
        const partsForUid = namePart.split(/\s+/);
        if (partsForUid.length > 1 && /^\d+$/.test(partsForUid[partsForUid.length - 1])) {
            memberUID = partsForUid.pop()!; 
            namePart = partsForUid.join(" ");
        }
    }
    
    const sortedRanks = [...RANKS].sort((a, b) => b.length - a.length);
    let rankIndex = -1;
    let rankLength = 0;

    for (const r of sortedRanks) {
        const rUpper = r.toUpperCase();
        const namePartUpper = namePart.toUpperCase();
        const currentRankIndex = namePartUpper.indexOf(rUpper);
        if (currentRankIndex !== -1) {
            const charBefore = currentRankIndex > 0 ? namePartUpper[currentRankIndex - 1] : ' ';
            const charAfter = currentRankIndex + rUpper.length < namePartUpper.length ? namePartUpper[currentRankIndex + rUpper.length] : ' ';
            
            if (charBefore.match(/\s|,|^/) && charAfter.match(/\s|,|$/)) {
                 foundRank = r;
                 rankIndex = currentRankIndex;
                 rankLength = r.length;
                 break;
            }
        }
    }

    if (foundRank && rankIndex !== -1) {
        namePart = (namePart.substring(0, rankIndex) + namePart.substring(rankIndex + rankLength)).trim().replace(/\s+/g, " ");
    }
    
    let lastName: string | null = null;
    let firstName: string | null = null;
    if (namePart) {
        const nameParts = namePart.split(/\s+/).filter(p => p); // Filter empty strings
        if (nameParts.length > 0) {
            if (nameParts.length === 1) { 
                lastName = nameParts[0];
                firstName = ""; 
            } else {
                if (namePart.includes(",")) {
                    const commaParts = namePart.split(",").map(p => p.trim());
                    lastName = commaParts[0];
                    firstName = commaParts.length > 1 ? commaParts[1] : "";
                } else {
                    lastName = nameParts[nameParts.length - 1];
                    firstName = nameParts.slice(0, -1).join(" ");
                }
            }
        }
    }
    
    return { lastName, firstName, rank: foundRank, memberUID };
}


  const handleAccomplishmentCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ variant: "destructive", title: "Import Error", description: "No file selected." });
      return;
    }
    setIsImportingAccomplishments(true);

    const currentStaffList: StaffMember[] = queryClient.getQueryData([STAFF_QUERY_KEY]) || await queryClient.fetchQuery({queryKey: [STAFF_QUERY_KEY], queryFn: useStaff().queryFn as () => Promise<StaffMember[]> });
    const staffMapByServiceNumber = new Map(currentStaffList.map(s => [s.serviceNumber, s]));

    const reader = new FileReader();
    reader.onload = async (e) => { 
      const skippedRecordsLog: string[] = [];
      try {
        const text = e.target?.result as string;
        if (!text) {
          toast({ variant: "destructive", title: "Import Error", description: "Could not read file content." });
          setIsImportingAccomplishments(false);
          return;
        }

        const logsToAdd: Omit<TrainingLog, 'id'>[] = []; 
        const staffUpdates = new Map<string, Partial<StaffMember> & { serviceHistoryToAdd: ServiceHistoryEntry[] }>();
        const errors: string[] = [];
        
        const allRows = robustCsvParser(text);

        if (allRows.length < 2) {
          errors.push("CSV must have a header and at least one data row.");
        } else {
          const header = allRows[0].map(h => h.trim());
          const expectedHeaders = ["Unit_1", "Surname", "EffectiveDate", "EndDate", "ChangeType", "StatusName", "Details", "Comment"];
          const requiredDataHeaders = ["Surname", "EffectiveDate", "Details", "ChangeType"]; 

          const headerIndices: Record<string, number> = {};
          let allRequiredHeadersPresent = true;

          expectedHeaders.forEach(eh => { 
            const index = header.indexOf(eh);
            if (index !== -1) {
              headerIndices[eh] = index;
            } else if (requiredDataHeaders.includes(eh)) { 
              errors.push(`Missing required CSV header: "${eh}".`);
              allRequiredHeadersPresent = false;
            }
          });

          if (!allRequiredHeadersPresent) {
               toast({
                  variant: "destructive",
                  title: "CSV Import Failed: Header Mismatch",
                  description: ( <ScrollArea className="max-h-40"><pre className="whitespace-pre-wrap text-xs">{errors.join("\n")}</pre></ScrollArea> ),
                  duration: 15000,
              });
              if (accomplishmentCsvInputRef) accomplishmentCsvInputRef.value = "";
              setIsImportingAccomplishments(false); 
              return;
          }
          
          for (let i = 1; i < allRows.length; i++) { 
              const values = allRows[i];
              if (values.every(val => val.trim() === "")) continue; 

              if (values.length !== header.length) {
                  errors.push(`Row ${i + 1}: Incorrect number of columns. Expected ${header.length}, got ${values.length}. Line: "${allRows[i].join(",").substring(0,100)}..."`);
                  continue;
              }

              const csvRowData: Record<string, string> = {};
               expectedHeaders.forEach(eh => {
                   const index = headerIndices[eh];
                   if (index !== undefined && index < values.length) {
                       csvRowData[eh] = values[index]; 
                   } else {
                       csvRowData[eh] = ""; 
                   }
              });
              
              const surnameField = csvRowData["Surname"];
              if (!surnameField) {
                  errors.push(`Row ${i + 1}: Missing "Surname" field content.`);
                  skippedRecordsLog.push(`Row ${i + 1}: Skipped - Missing "Surname" field.`);
                  continue;
              }

              const parsedNameRankUid = parseCompositeSurnameField(surnameField);

              if (!parsedNameRankUid.memberUID) {
                  errors.push(`Row ${i + 1}: Could not parse MemberUID from Surname field: "${surnameField}".`);
                  skippedRecordsLog.push(`Row ${i + 1}: Skipped - Could not parse MemberUID from "${surnameField}".`);
                  continue;
              }
              
              const matchedStaffFromMap = staffMapByServiceNumber.get(parsedNameRankUid.memberUID);

              if (!matchedStaffFromMap) {
                  const skipMsg = `Row ${i + 1}: Staff member with MemberUID "${parsedNameRankUid.memberUID}" (from "${surnameField}") not found. Please ensure a staff profile exists.`;
                  errors.push(skipMsg);
                  skippedRecordsLog.push(skipMsg);
                  continue; 
              }
              
              const details = csvRowData["Details"]?.trim();
              const effectiveDateStr = csvRowData["EffectiveDate"];
              const endDateStr = csvRowData["EndDate"]?.trim();
              const changeType = csvRowData["ChangeType"]?.trim().toLowerCase();
              const statusName = csvRowData["StatusName"]?.trim().toLowerCase();
              const comment = csvRowData["Comment"]?.trim();
              
              if (!effectiveDateStr) {
                  errors.push(`Row ${i + 1} (UID: ${matchedStaffFromMap.serviceNumber}): Missing "EffectiveDate".`);
                  skippedRecordsLog.push(`Row ${i + 1} (UID: ${matchedStaffFromMap.serviceNumber}): Skipped - Missing "EffectiveDate".`);
                  continue;
              }
              
              const effectiveDate = parseDate(effectiveDateStr);
              if (!effectiveDate) {
                  errors.push(`Row ${i + 1} (UID: ${matchedStaffFromMap.serviceNumber}): Invalid "EffectiveDate" format for "${effectiveDateStr}".`);
                  skippedRecordsLog.push(`Row ${i + 1} (UID: ${matchedStaffFromMap.serviceNumber}): Skipped - Invalid "EffectiveDate" ("${effectiveDateStr}").`);
                  continue;
              }
              
              const staffUpdateData = staffUpdates.get(matchedStaffFromMap.id!) || { serviceHistoryToAdd: [], ...JSON.parse(JSON.stringify(matchedStaffFromMap)) };


              if (changeType === "enrolment") {
                staffUpdateData.joinDate = effectiveDate;
              } else if (changeType === "position") {
                if (!details) { errors.push(`Row ${i+1} (UID: ${matchedStaffFromMap.serviceNumber}): 'Details' field required for Position change type.`); skippedRecordsLog.push(`Row ${i+1} (UID: ${matchedStaffFromMap.serviceNumber}): Skipped - Position change missing 'Details'.`); continue; }
                const positionEndDate = endDateStr ? parseDate(endDateStr) : null;
                if (endDateStr && !positionEndDate) { errors.push(`Row ${i+1} (UID: ${matchedStaffFromMap.serviceNumber}): Invalid 'EndDate' for Position: "${endDateStr}".`); skippedRecordsLog.push(`Row ${i+1} (UID: ${matchedStaffFromMap.serviceNumber}): Skipped - Position change invalid 'EndDate' ("${endDateStr}").`); continue; }
                
                staffUpdateData.serviceHistoryToAdd.push({
                    id: crypto.randomUUID(), type: "Position", item: details, 
                    effectiveDate: effectiveDate, endDate: positionEndDate, notes: comment 
                });
                if (statusName === "current" && details !== staffUpdateData.role) {
                    staffUpdateData.role = details;
                }
              } else if (changeType === "rank") {
                if (!details) { errors.push(`Row ${i+1} (UID: ${matchedStaffFromMap.serviceNumber}): 'Details' field required for Rank change type.`); skippedRecordsLog.push(`Row ${i+1} (UID: ${matchedStaffFromMap.serviceNumber}): Skipped - Rank change missing 'Details'.`); continue; }
                const parsedRank = parseFullRankNameToAbbreviation(details);
                if (!parsedRank) { errors.push(`Row ${i+1} (UID: ${matchedStaffFromMap.serviceNumber}): Could not parse rank from Details: "${details}".`); skippedRecordsLog.push(`Row ${i+1} (UID: ${matchedStaffFromMap.serviceNumber}): Skipped - Rank change invalid rank in 'Details' ("${details}").`); continue; }
                
                staffUpdateData.serviceHistoryToAdd.push({
                    id: crypto.randomUUID(), type: "Rank", item: parsedRank, 
                    effectiveDate: effectiveDate, notes: comment
                });
                if (statusName === "current" && parsedRank !== staffUpdateData.rank) {
                    staffUpdateData.rank = parsedRank;
                }
              } else { 
                if (!details) { errors.push(`Row ${i+1} (UID: ${matchedStaffFromMap.serviceNumber}): Missing 'Details' for accomplishment/training log.`); skippedRecordsLog.push(`Row ${i+1} (UID: ${matchedStaffFromMap.serviceNumber}): Skipped - Accomplishment missing 'Details'.`); continue; }
                const newLog: Omit<TrainingLog, 'id' | 'certificateFileName' | 'certificateDataUrl'> = {
                  rank: parsedNameRankUid.rank || matchedStaffFromMap.rank, 
                  staffName: `${parsedNameRankUid.lastName || matchedStaffFromMap.lastName}, ${parsedNameRankUid.firstName || matchedStaffFromMap.firstName}`,
                  squadron: csvRowData["Unit_1"] || matchedStaffFromMap.squadron || "N/A", 
                  currentRole: matchedStaffFromMap.role || "N/A",  
                  courseName: details,
                  completionDate: effectiveDate,
                  qualificationAchieved: details, 
                  instructorQualification: "", 
                  achievementDetails: comment || "", 
                  serviceNumber: matchedStaffFromMap.serviceNumber, 
                };
                logsToAdd.push(newLog as Omit<TrainingLog, 'id'>);
              }
              staffUpdates.set(matchedStaffFromMap.id!, staffUpdateData);
          }
        }

        const batch = writeBatch(db);
        let trainingLogsImportedCount = 0;
        let staffProfilesUpdatedCount = 0;

        for (const log of logsToAdd) {
           try {
               const collectionRef = collection(db, 'trainingLogs');
               const { id, ...logDataForFirestore } = log; 
                const dataToSave: any = { 
                    ...logDataForFirestore,
                    completionDate: Timestamp.fromDate(log.completionDate),
                };
                Object.keys(dataToSave).forEach(key => {
                    if (dataToSave[key as keyof typeof dataToSave] === null || dataToSave[key as keyof typeof dataToSave] === undefined) {
                        delete dataToSave[key as keyof typeof dataToSave];
                    }
                });
               batch.set(doc(collectionRef), dataToSave); 
               trainingLogsImportedCount++;
           } catch (err: any) {
               errors.push(`Failed to stage training log "${log.courseName}" for ${log.staffName}: ${err.message}`);
           }
        }
        
        staffUpdates.forEach((update, staffId) => {
            const staffDocRef = doc(db, "staff", staffId);
            const updatePayload: any = {};

            const originalStaffMember = currentStaffList.find(s => s.id === staffId);
            if (!originalStaffMember) {
                errors.push(`Consistency error: Could not find original staff data for ID ${staffId} during batch update.`);
                return; 
            }

            if (update.joinDate !== undefined && update.joinDate !== originalStaffMember.joinDate) {
                 updatePayload.joinDate = Timestamp.fromDate(new Date(update.joinDate!));
            }
            if (update.role !== undefined && update.role !== originalStaffMember.role) {
                 updatePayload.role = update.role;
            }
            if (update.rank !== undefined && update.rank !== originalStaffMember.rank) {
                 updatePayload.rank = update.rank;
            }
            
            const existingHistory = originalStaffMember.serviceHistory || [];
            const newHistoryEntries = update.serviceHistoryToAdd.map(entry => ({
                ...entry,
                id: entry.id || crypto.randomUUID(),
                effectiveDate: Timestamp.fromDate(new Date(entry.effectiveDate)),
                endDate: entry.endDate ? Timestamp.fromDate(new Date(entry.endDate)) : null,
            }));

            if (newHistoryEntries.length > 0) {
              // Create a Set of existing entry identifiers to check for duplicates before adding
              const existingEntryIdentifiers = new Set(existingHistory.map(eh => `${eh.type}-${eh.item}-${format(new Date(eh.effectiveDate), 'yyyy-MM-dd')}`));
              const uniqueNewEntries = newHistoryEntries.filter(ne => !existingEntryIdentifiers.has(`${ne.type}-${ne.item}-${format(new Date(ne.effectiveDate.toDate()), 'yyyy-MM-dd')}`));
              
              if (uniqueNewEntries.length > 0) {
                updatePayload.serviceHistory = arrayUnion(...uniqueNewEntries);
              }
            }


            if(Object.keys(updatePayload).length > 0 ) {
                 batch.update(staffDocRef, updatePayload);
                 staffProfilesUpdatedCount++;
            }
        });

        if (trainingLogsImportedCount > 0 || staffProfilesUpdatedCount > 0) {
            await batch.commit();
        }
        
        let toastTitle = "Import Processing Complete";
        let toastVariant: "default" | "destructive" = "default";
        let toastDescription = "";

        if (trainingLogsImportedCount > 0) toastDescription += `${trainingLogsImportedCount} training log(s) imported/updated. `;
        if (staffProfilesUpdatedCount > 0) toastDescription += `${staffProfilesUpdatedCount} staff profile(s) updated. `;
        
        if (errors.length > 0) {
            toastTitle = trainingLogsImportedCount > 0 || staffProfilesUpdatedCount > 0 ? "Import Partially Successful" : "Import Failed";
            toastVariant = trainingLogsImportedCount > 0 || staffProfilesUpdatedCount > 0 ? "default" : "destructive";
            const errorMessages = errors.slice(0, 5).join("\n") + (errors.length > 5 ? `\n...and ${errors.length - 5} more errors.` : "");
            toastDescription += `\nErrors (${errors.length}):\n${errorMessages}`;
        }
        if (skippedRecordsLog.length > 0) {
            if (errors.length === 0 && trainingLogsImportedCount === 0 && staffProfilesUpdatedCount === 0) toastTitle = "Import Information";
            const skippedMessages = skippedRecordsLog.slice(0, 5).join("\n") + (skippedRecordsLog.length > 5 ? `\n...and ${skippedRecordsLog.length - 5} more skipped records.` : "");
            toastDescription += `\nSkipped Records (${skippedRecordsLog.length}):\n${skippedMessages}`;
        }

        if (toastDescription.trim() === "" && allRows.length <= 1) {
            toastTitle = "Import Information";
            toastDescription = "CSV file has no data rows to import.";
        } else if (toastDescription.trim() === "") {
            toastTitle = "Import Information";
            toastDescription = "No new records or staff updates processed from the CSV.";
        }
        
        toast({
            variant: toastVariant,
            title: toastTitle,
            description: (<ScrollArea className="max-h-60 w-full"><pre className="whitespace-pre-wrap text-xs">{toastDescription.trim()}</pre></ScrollArea>),
            duration: errors.length > 0 || skippedRecordsLog.length > 0 ? 20000 : 8000,
        });


        if (trainingLogsImportedCount > 0) queryClient.invalidateQueries({ queryKey: [TRAINING_LOGS_QUERY_KEY] });
        if (staffProfilesUpdatedCount > 0) queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });

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
          <CardContent className="pt-0 px-0 sm:px-0">
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
                          <Download className="mr-2 h-4 w-4" /> Export All (PDF)
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                       <ScrollArea className="h-[200px] w-full border rounded-md"> {/* Reduced height */}
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
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
                                <TableCell>{log.completionDate && isValidDate(new Date(log.completionDate)) ? format(new Date(log.completionDate), "PP") : "Invalid Date"}</TableCell>
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
                                        Export Record (PDF)
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
          To bulk import training, positions, or ranks, upload a CSV file. The header row is required.
          The system expects the following headers:
          <code className="block whitespace-pre-wrap bg-muted p-2 rounded-md my-2 text-xs">Unit_1,Surname,EffectiveDate,EndDate,ChangeType,StatusName,Details,Comment</code>
          <ul className="list-disc pl-5 mt-2 text-xs space-y-1">
            <li><code>Unit_1</code>: Populates 'Squadron' for new training log entries.</li>
            <li><code>Surname</code>: (Text, Required) Expected format: "LastName FirstName Rank MemberUID". Rank must be valid. MemberUID (Service Number) is used to match an existing staff profile. If no profile found, the row is skipped.</li>
            <li><code>EffectiveDate</code>: (Date, Required) Completion/effective date. Formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY, YYYY/MM/DD, DD/MM/YY, D-MMM-YY.</li>
            <li><code>EndDate</code>: (Date, Optional) End date for positions. Same formats as EffectiveDate.</li>
            <li><code>ChangeType</code>: (Text, Required) Determines how the row is processed:
                <ul className="list-['-_'] pl-5">
                    <li>"Enrolment": Updates the matched Staff Member's 'Join Date' with `EffectiveDate`.</li>
                    <li>"Position": Adds an entry to the Staff Member's 'Service History'. `Details` field is used as position title. If `StatusName` is "Current" and position differs from current staff role, updates staff role. `Comment` is used for notes.</li>
                    <li>"Rank": Adds an entry to Staff Member's 'Service History'. `Details` (e.g., "Actual - Flight Lieutenant (AAFC)") is parsed for the rank. If `StatusName` is "Current" and rank differs, updates staff rank. `Comment` is used for notes.</li>
                    <li>Other values (e.g., "Accomplishment"): Creates a new Training Log entry. `Details` is Course Name & Qualification. `Comment` is Achievement Details.</li>
                </ul>
            </li>
            <li><code>StatusName</code>: (Text) If "Current" for Position/Rank, may update staff profile. If "Historical", record is still processed for service history.</li>
            <li><code>Details</code>: (Text, Required) Content depends on `ChangeType` (Position Title, Full Rank Name, or Course Name/Qualification).</li>
            <li><code>Comment</code>: (Text) Populates 'notes' for service history entries or 'achievementDetails' for training logs.</li>
          </ul>
           <p className="mt-2 text-xs">
            <strong>Important:</strong> Staff profiles must exist for each `MemberUID` for any processing to occur. The "Surname" field must be parsable for UID, Rank, and Name.
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
                        Training for {viewingLog.rank} {viewingLog.staffName} (SN: {viewingLog.serviceNumber || "N/A"}), completed on {viewingLog.completionDate && isValidDate(new Date(viewingLog.completionDate)) ? format(new Date(viewingLog.completionDate), "PPP") : "Invalid Date"}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1 pr-4">
                    <div className="space-y-4 py-4">
                        <div>
                            <h3 className="font-semibold text-sm mb-1">Staff Member</h3>
                            <p className="text-sm text-muted-foreground">{viewingLog.rank} {viewingLog.staffName} (SN: {viewingLog.serviceNumber || "N/A"})</p>
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
              Bulk import training accomplishments, positions, and ranks via CSV to update Training Logs and Staff Service History. (Implemented - See instructions above)
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
    
