
"use client";

import * as React from "react";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Users as UsersIconLucide, UploadCloud, Info, Edit3, Briefcase, FileText, GraduationCap, Gavel, ShieldCheck, ListChecks, User, Loader2, AlertTriangle, AlertCircle, MapPin, ChevronDown, ChevronUp, History, Download as DownloadIcon, FileSpreadsheet, Search, FileSearch, UserX } from "lucide-react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { StaffMember, ServiceHistoryEntry } from "./staff-schema";
import { StaffForm } from "./components/staff-form";
import { RANKS, STAFF_QUERY_KEY } from "./staff-schema";
import { format, isValid as isValidDate, parse as parseDateFns, addYears, isBefore, startOfDay, addDays, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useStaff, useAddStaff, useUpdateStaff, useDeleteStaff } from '@/hooks/useStaffData';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, orderBy, Timestamp, writeBatch, doc, arrayUnion, addDoc, setDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import { addLetterheadAndFooter, addPageNumbers, resetLetterheadCache, calculateOICLevel } from '@/lib/utils'; 
import { COMPLIANCE_CRITERIA_CONFIG, type ComplianceCriterionCheck, type StaffComplianceReport } from "@/app/reporting/reporting-schema";
import { Input } from "@/components/ui/input";


import type { TrainingLog } from "../training/training-schema";
import { convertLogTimestamps as convertTrainingLogTimestamps, TRAINING_LOGS_QUERY_KEY } from "../training/training-schema"; // Use schema for key


type StaffGroup = {
  squadronName: string;
  staffMembers: StaffMember[];
};

const STAFF_TRAINING_LOGS_QUERY_KEY_PREFIX = 'staffTrainingLogs';
const HEADER_IMAGE_URL = "/AAFCLetterhead-Header.png";
const FOOTER_IMAGE_URL = "/AAFCLetterhead-Footer.png";

// Hashing function for de-duplication
async function createHash(input: string): Promise<string> {
    const textAsBuffer = new TextEncoder().encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', textAsBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


// Moved from training/page.tsx
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
  "GROUP CAPTAIN (AAFC)": "GPCAPT(AAFC)",
  "CIVILIAN": "CIV",
  "CIVILIAN INSTRUCTOR": "CIV",
  "ACTUAL - CIVILIAN": "CIV", // Added to handle this specific variant
  "REGIONAL WARRANT OFFICER": "WOFF(AAFC)",
  "DIRECTOR GENERAL CADETS - AIR FORCE": "GPCAPT(AAFC)",
  "COMMANDER AUSTRALIAN AIR FORCE CADETS": "WGCDR(AAFC)",
};

// Moved from training/page.tsx
function parseFullRankNameToAbbreviation(fullRankStringInput: string | undefined): typeof RANKS[number] | null {
  if (!fullRankStringInput) return null;
  const upperFullRankString = fullRankStringInput.toUpperCase().replace(/^ACTUAL - /i, "").trim();
  if (FULL_RANK_TO_ABBREVIATION_MAP[upperFullRankString]) {
    return FULL_RANK_TO_ABBREVIATION_MAP[upperFullRankString];
  }
  const rankAsConst = upperFullRankString as typeof RANKS[number];
  if (RANKS.includes(rankAsConst)) {
    return rankAsConst;
  }
  console.warn(`[RankParse] Could not parse full rank: "${fullRankStringInput}" to an abbreviation. Input normalized to: "${upperFullRankString}"`);
  return null;
}

// Moved from training/page.tsx
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
        const nameParts = namePart.split(/\s+/).filter(p => p); 
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


async function fetchTrainingLogsForStaff(staffMember: StaffMember | null): Promise<TrainingLog[]> {
  if (!staffMember || !staffMember.id) return []; 
  const logsCollectionRef = collection(db, 'trainingLogs');
  const q = query(
    logsCollectionRef,
    where('serviceNumber', '==', staffMember.serviceNumber),
    orderBy('completionDate', 'desc')
  );
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTrainingLogTimestamps(doc.data()),
    })) as TrainingLog[];
  } catch (error) {
    console.error("Error fetching training logs for staff SN:", staffMember.serviceNumber, error);
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

const StaffDetailsContent = ({
  staffMember,
  onEdit,
  isMutationPending
}: {
  staffMember: StaffMember;
  onEdit: (staff: StaffMember) => void;
  isMutationPending: boolean;
}) => {
  const { data: trainingLogs = [], isLoading: isLoadingLogs, error: errorLogs } = useQuery<TrainingLog[], Error>({
      queryKey: [`${STAFF_TRAINING_LOGS_QUERY_KEY_PREFIX}_${staffMember.id}`],
      queryFn: () => fetchTrainingLogsForStaff(staffMember),
      enabled: !!staffMember?.id,
  });

  const { toast } = useToast();

  const oicLevel = React.useMemo(() => {
    if (isLoadingLogs || !trainingLogs || trainingLogs.length === 0) return null;
    return calculateOICLevel(trainingLogs);
  }, [trainingLogs, isLoadingLogs]);
  
  const calculateSingleStaffCompliance = (staffMember: StaffMember, memberLogs: TrainingLog[]): { criteriaChecks: ComplianceCriterionCheck[], overallStatus: StaffComplianceReport["complianceStatusText"] } => {
    const criteriaChecks: ComplianceCriterionCheck[] = COMPLIANCE_CRITERIA_CONFIG.map(criterion => {
      const relevantLogs = memberLogs
        .filter(log => criterion.identifier(log, staffMember))
        .sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime());

      let isMet = false;
      let details = "Missing";
      let selectedLog: TrainingLog | undefined = undefined;

      if (relevantLogs.length > 0) {
        selectedLog = relevantLogs[0];
        const completionDate = startOfDay(new Date(selectedLog.completionDate));
        if (!isValidDate(completionDate)) {
          details = "Invalid completion date in record.";
        } else {
          const today = startOfDay(new Date());
          if (criterion.yearsToExpire) {
            const expiryDate = startOfDay(addYears(completionDate, criterion.yearsToExpire));
            isMet = isBefore(today, expiryDate);
            if (isMet) {
              details = `Completed: ${format(completionDate, "dd/MM/yyyy")}. Valid until ${format(addDays(expiryDate, -1), 'dd/MM/yyyy')}.`;
            } else {
              details = `Out of Date. Last completed: ${format(completionDate, 'dd/MM/yyyy')}. Expired on ${format(expiryDate, 'dd/MM/yyyy')}.`;
            }
          } else {
            isMet = true;
            details = `Completed: ${format(completionDate, "dd/MM/yyyy")}`;
          }
        }
      }
      return { key: criterion.key, name: criterion.name, isMet, details, relevantLog: selectedLog };
    });

    const mandatoryChecks = criteriaChecks.filter(check => {
      const config = COMPLIANCE_CRITERIA_CONFIG.find(c => c.key === check.key);
      return !config?.isAdvisory;
    });
    const isOverallCompliant = mandatoryChecks.every(c => c.isMet);
    const overallStatus: StaffComplianceReport["complianceStatusText"] = isOverallCompliant ? "Compliant" : "Not Compliant";
    return { criteriaChecks, overallStatus };
  };

  const handleExportFullProfilePdf = async () => {
    const doc = new jsPDF();
    resetLetterheadCache();
    const filename = `profile_${staffMember.rank}_${staffMember.lastName}_${staffMember.firstName}_${staffMember.serviceNumber}.pdf`;

    const margin = 15;
    let yPos = margin;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const indent = 5;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - (margin * 2);
    let headerHeight = 0;
    let footerHeight = 0;

    const { headerHeight: hh, footerHeight: fh } = await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
    headerHeight = hh;
    footerHeight = fh;
    yPos = margin + headerHeight + 5;

    const checkPageBreak = async (neededHeight: number = lineSpacing) => {
        if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin - footerHeight) {
            addPageNumbers(doc, footerHeight, margin); 
            doc.addPage();
            await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
            yPos = margin + headerHeight + 5;
        }
    };
    
    const staffStatus = staffMember.status || 'Active';
    if (staffStatus === 'UAL' || staffStatus === 'Pending Discharge') {
      await checkPageBreak(20);
      doc.setFontSize(48);
      doc.setTextColor(255, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text(staffStatus.toUpperCase(), pageWidth / 2, yPos + 10, {
        align: 'center',
      });
      doc.setTextColor(0); 
      yPos += 20; 
    }


    const addSectionTitle = async (title: string) => {
      await checkPageBreak(sectionSpacing + 14);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(title, margin, yPos);
      yPos += lineSpacing * 1.5;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
    };

    const addDetailLine = async (label: string, value?: string | null) => {
      if (value === undefined || value === null || value.trim() === "") return;
      await checkPageBreak(lineSpacing);
      const labelWidth = doc.getTextWidth(`${label}: `) + 2;
      doc.setFont(undefined, 'bold');
      doc.text(`${label}:`, margin, yPos);
      doc.setFont(undefined, 'normal');
      const valueLines = doc.splitTextToSize(value, maxLineWidth - labelWidth);
      await checkPageBreak(valueLines.length * (lineSpacing * 0.7));
      doc.text(valueLines, margin + labelWidth, yPos);
      yPos += valueLines.length * (lineSpacing * 0.7) + (lineSpacing * 0.3);
    };

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    await checkPageBreak(sectionSpacing + 18);
    doc.text(`Staff Profile: ${staffMember.rank} ${staffMember.firstName} ${staffMember.lastName}`, margin, yPos);
    yPos += sectionSpacing;

    await addSectionTitle("Basic Information");
    await addDetailLine("Service Number", staffMember.serviceNumber);
    if (oicLevel !== null) {
      await addDetailLine("OIC Level", oicLevel.toString());
    }
    await addDetailLine("Role", staffMember.role);
    await addDetailLine("Squadron", staffMember.squadron);
    yPos += sectionSpacing * 0.5;

    await addSectionTitle("Contact Details");
    await addDetailLine("Email", staffMember.email);
    await addDetailLine("Phone", staffMember.phone);
    await addDetailLine("Address", staffMember.address);
    await addDetailLine("Join Date", staffMember.joinDate ? format(new Date(staffMember.joinDate), "PPP") : "N/A");
    yPos += sectionSpacing * 0.5;

    await addSectionTitle("Compliance Status");
    const { criteriaChecks, overallStatus } = calculateSingleStaffCompliance(staffMember, trainingLogs);
    await addDetailLine("Overall Status", overallStatus);
    if (overallStatus !== "Compliant") {
        await checkPageBreak(lineSpacing);
        doc.setFont(undefined, 'bold');
        doc.text("Non-Compliant Items:", margin, yPos);
        yPos += lineSpacing * 0.8;
        doc.setFont(undefined, 'normal');
        for (const criterion of criteriaChecks) {
            if (!criterion.isMet) {
                const itemText = `- ${criterion.name}: ${criterion.details}`;
                const lines = doc.splitTextToSize(itemText, maxLineWidth - indent);
                await checkPageBreak(lines.length * (lineSpacing * 0.7));
                doc.text(lines, margin + indent, yPos);
                yPos += lines.length * (lineSpacing * 0.7) + (lineSpacing * 0.2);
            }
        }
    }
    yPos += sectionSpacing * 0.5;

    await addSectionTitle("Service History");
    if (staffMember.serviceHistory && staffMember.serviceHistory.length > 0) {
        for (const entry of staffMember.serviceHistory.sort((a,b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())) {
            await checkPageBreak(lineSpacing * 3);
            let entryText = `${entry.type}: ${entry.item} (Effective: ${format(new Date(entry.effectiveDate), "PP")}`;
            if (entry.endDate) entryText += ` - End: ${format(new Date(entry.endDate), "PP")}`;
            entryText += ")";
            if (entry.notes) entryText += ` Notes: ${entry.notes}`;
            const lines = doc.splitTextToSize(entryText, maxLineWidth);
            doc.text(lines, margin, yPos);
            yPos += lines.length * (lineSpacing * 0.7) + (lineSpacing * 0.2);
        }
    } else {
        await addDetailLine("", "No service history recorded.");
    }
    yPos += sectionSpacing * 0.5;

    await addSectionTitle("Training Records");
    if (trainingLogs && trainingLogs.length > 0) {
        for (const log of trainingLogs) {
            await checkPageBreak(lineSpacing * 3);
            let logText = `${log.courseName} (Completed: ${format(new Date(log.completionDate), "PP")})`;
            if (log.qualificationAchieved) logText += ` - Qual: ${log.qualificationAchieved}`;
            if (log.instructorQualification) logText += ` - Instr. Qual: ${log.instructorQualification}`;
            const lines = doc.splitTextToSize(logText, maxLineWidth);
            doc.text(lines, margin, yPos);
            yPos += lines.length * (lineSpacing * 0.7) + (lineSpacing * 0.2);
        }
    } else {
        await addDetailLine("", "No training records found for this staff member.");
    }
    yPos += sectionSpacing * 0.5;
    
    const placeholderSections = ["Meetings Attended", "Professional Development Plans", "Discipline Actions Involvement", "Safety Audits Involvement"];
    for (const sectionTitle of placeholderSections) {
        await addSectionTitle(sectionTitle);
        await addDetailLine("", `Data for ${sectionTitle.toLowerCase()} is not yet integrated into this profile export.`);
        yPos += sectionSpacing * 0.5;
    }

    addPageNumbers(doc, footerHeight, margin);
    doc.save(filename);
    toast({title: "Profile PDF Exported", description: `${filename} has been downloaded.`});
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {staffMember.rank} {staffMember.firstName} {staffMember.lastName}
        </DialogTitle>
        <DialogDescription>
          Service No: {staffMember.serviceNumber}
          {isLoadingLogs ? (
            <Loader2 className="inline h-4 w-4 ml-2 animate-spin" />
          ) : (
            oicLevel !== null && ` | OIC Level: ${oicLevel}`
          )}
          {' '}| Role: {staffMember.role || "N/A"} | Squadron: {staffMember.squadron || 'N/A'}
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
          <div className="space-y-6 py-4">
            <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" /> Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                      <p className="font-semibold">Email</p>
                      <p className="text-muted-foreground">{staffMember.email}</p>
                  </div>
                  <div>
                      <p className="font-semibold">Phone</p>
                      <p className="text-muted-foreground">{staffMember.phone || "N/A"}</p>
                  </div>
                  <div>
                      <p className="font-semibold">Join Date</p>
                      <p className="text-muted-foreground">{staffMember.joinDate && isValidDate(new Date(staffMember.joinDate)) ? format(new Date(staffMember.joinDate), "PP") : "N/A"}</p>
                  </div>
                   <div>
                      <p className="font-semibold">Address</p>
                      <p className="text-muted-foreground">{staffMember.address || "N/A"}</p>
                  </div>
                </CardContent>
            </Card>

              <Accordion type="multiple" className="w-full">
                 <AccordionItem value="compliance-status">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" /> Compliance Status
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {isLoadingLogs ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : errorLogs ? (
                      <p className="text-sm text-destructive p-4">Error loading compliance data: {errorLogs.message}</p>
                    ) : (
                      (() => {
                        const { criteriaChecks, overallStatus } = calculateSingleStaffCompliance(staffMember, trainingLogs);
                        return (
                          <div className="space-y-2 p-2 border rounded-md">
                            <p className="text-sm"><strong>Overall:</strong> <Badge variant={overallStatus === "Compliant" ? "default" : "destructive"}>{overallStatus}</Badge></p>
                            {(() => {
                              const failedMandatory = criteriaChecks.filter(c => {
                                const config = COMPLIANCE_CRITERIA_CONFIG.find(x => x.key === c.key);
                                return !c.isMet && !config?.isAdvisory;
                              });
                              const failedAdvisory = criteriaChecks.filter(c => {
                                const config = COMPLIANCE_CRITERIA_CONFIG.find(x => x.key === c.key);
                                return !c.isMet && config?.isAdvisory;
                              });
                              return (
                                <>
                                  {failedMandatory.length > 0 && (
                                    <div className="mt-2 text-xs">
                                      <p className="font-semibold text-destructive">Missing/Expired Mandatory Requirements:</p>
                                      <ul className="list-disc pl-5 mt-1">
                                        {failedMandatory.map(c => (
                                          <li key={c.key} className="text-muted-foreground">{c.name}: {c.details}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {failedAdvisory.length > 0 && (
                                    <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-250 dark:border-yellow-900 rounded-md">
                                      <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-400 flex items-center gap-1">
                                        <AlertTriangle className="h-3.5 w-3.5" /> Caution (Advisory Notices):
                                      </p>
                                      <ul className="list-disc pl-5 text-[11px] text-yellow-700 dark:text-yellow-500 mt-1">
                                        {failedAdvisory.map(c => (
                                          <li key={c.key}>
                                            {c.key === 'adultBehaviourPolicy' ? (
                                              <span><strong>{c.name}:</strong> Adult Behaviour Policy Training has now been deprecated. Members missing this accomplishment will be considered to have met the compliance requirements for this item until new training has been published within the online training system.</span>
                                            ) : (
                                              <span>{c.name}: {c.details}</span>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        );
                      })()
                    )}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="service-history">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <History className="h-5 w-5" /> Service History ({(staffMember.serviceHistory || []).length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="max-h-[300px] overflow-y-auto border rounded-md">
                      {(staffMember.serviceHistory || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4 text-center">No service history recorded.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Item</TableHead>
                              <TableHead>Effective Date</TableHead>
                              <TableHead>End Date</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(staffMember.serviceHistory || []).sort((a,b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()).map(entry => (
                              <TableRow key={entry.id}>
                                <TableCell><Badge variant={entry.type === "Rank" ? "secondary" : "outline"}>{entry.type}</Badge></TableCell>
                                <TableCell>{entry.item}</TableCell>
                                <TableCell>{format(new Date(entry.effectiveDate), "PP")}</TableCell>
                                <TableCell>{entry.endDate ? format(new Date(entry.endDate), "PP") : "N/A"}</TableCell>
                                <TableCell className="truncate max-w-xs">{entry.notes || "N/A"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="training">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" /> Training Records ({isLoadingLogs ? <Loader2 className="h-4 w-4 animate-spin"/> : trainingLogs.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="max-h-[300px] overflow-y-auto border rounded-md">
                      {isLoadingLogs && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                      {errorLogs && <p className="text-sm text-destructive p-4">Error loading training records: {errorLogs.message}</p>}
                      {!isLoadingLogs && !errorLogs && trainingLogs.length === 0 && (
                          <p className="text-sm text-muted-foreground p-4 text-center">No training records found for this staff member.</p>
                      )}
                      {!isLoadingLogs && !errorLogs && trainingLogs.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Course Name</TableHead>
                              <TableHead>Completion Date</TableHead>
                              <TableHead>Qualification</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {trainingLogs.map(log => (
                              <TableRow key={log.id}>
                                <TableCell>{log.courseName}</TableCell>
                                <TableCell>{log.completionDate && isValidDate(new Date(log.completionDate)) ? format(new Date(log.completionDate), "PP") : "Invalid Date"}</TableCell>
                                <TableCell>{log.qualificationAchieved || log.instructorQualification || "N/A"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="meetings">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                     <FileText className="h-5 w-5" /> Meetings Attended
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                     <p className="text-sm text-muted-foreground p-4 text-center">Meeting attendance data not yet integrated.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="pdps">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" /> Professional Development
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                      <p className="text-sm text-muted-foreground p-4 text-center">PDP data not yet integrated.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="discipline">
                  <AccordionTrigger>
                      <div className="flex items-center gap-2">
                          <Gavel className="h-5 w-5" /> Discipline Actions
                      </div>
                  </AccordionTrigger>
                  <AccordionContent>
                       <p className="text-sm text-muted-foreground p-4 text-center">Discipline action data not yet integrated.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="audits">
                  <AccordionTrigger>
                      <div className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5" /> Safety Audits Involvement
                      </div>
                  </AccordionTrigger>
                  <AccordionContent>
                      <p className="text-sm text-muted-foreground p-4 text-center">Safety audit involvement data not yet integrated.</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
      </div>
      <DialogFooter className="pt-4 border-t gap-2">
          <Button variant="outline" onClick={() => onEdit(staffMember)} disabled={isMutationPending}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
          <Button
              variant="default"
              onClick={handleExportFullProfilePdf}
              disabled={isLoadingLogs || isMutationPending}
          >
              {isLoadingLogs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              Export Full Profile (PDF)
          </Button>
      </DialogFooter>
    </>
  );
};

export default function StaffPage() {
  const { data: staffList = [], isLoading, error } = useStaff();
  const addStaffMutation = useAddStaff();
  const updateStaffMutation = useUpdateStaff();
  const deleteStaffMutation = useDeleteStaff();
  const queryClient = useQueryClient();

  const { data: trainingLogs = [] } = useQuery<TrainingLog[], Error>({
    queryKey: [TRAINING_LOGS_QUERY_KEY],
    queryFn: async () => {
      const querySnapshot = await getDocs(query(collection(db, "trainingLogs")));
      return querySnapshot.docs.map(d => convertTrainingLogTimestamps(d.data()));
    }
  });

  const getStaffAdvisoryWarnings = React.useCallback((staff: StaffMember) => {
    const memberLogs = trainingLogs.filter(log => {
      if (staff.serviceNumber && staff.serviceNumber.trim() !== "" && log.serviceNumber && log.serviceNumber.trim() !== "") {
        return staff.serviceNumber.trim() === log.serviceNumber.trim();
      }
      return false;
    });

    const warnings: string[] = [];
    const advisoryCriteria = COMPLIANCE_CRITERIA_CONFIG.filter(c => c.isAdvisory);

    advisoryCriteria.forEach(criterion => {
      const relevantLogs = memberLogs
        .filter(log => criterion.identifier(log, staff))
        .sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime());

      let isMet = false;
      if (relevantLogs.length > 0) {
        const selectedLog = relevantLogs[0];
        const completionDate = startOfDay(new Date(selectedLog.completionDate));
        if (isValidDate(completionDate)) {
          const today = startOfDay(new Date());
          if (criterion.yearsToExpire) {
            const expiryDate = startOfDay(addYears(completionDate, criterion.yearsToExpire));
            isMet = isBefore(today, expiryDate);
          } else {
            isMet = true;
          }
        }
      }

      if (!isMet) {
        warnings.push(
          criterion.key === 'cpr'
            ? 'CPR'
            : criterion.key === 'adultBehaviourPolicy'
            ? 'Adult Behaviour'
            : 'Code of Conduct'
        );
      }
    });

    return warnings;
  }, [trainingLogs]);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingStaff, setEditingStaff] = React.useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = React.useState<StaffMember | null>(null);
  const [viewingStaffMember, setViewingStaffMember] = React.useState<StaffMember | null>(null);
  const staffCsvInputRef = React.useRef<HTMLInputElement>(null);
  const accomplishmentCsvInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isImportingStaffCsv, setIsImportingStaffCsv] = React.useState(false);
  const [isImportingAccomplishments, setIsImportingAccomplishments] = React.useState(false);
  const [openSquadrons, setOpenSquadrons] = React.useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = React.useState("");

  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = React.useState(false);
  const [staffToPurge, setStaffToPurge] = React.useState<StaffMember[]>([]);
  const [isFindingStaffToPurge, setIsFindingStaffToPurge] = React.useState(false);

  const purgeStaffMutation = useMutation<string[], Error, StaffMember[]>({
    mutationFn: async (staffToPurge: StaffMember[]): Promise<string[]> => {
        if (staffToPurge.length === 0) return [];
        
        const batch = writeBatch(db);
        const purgedStaffNames: string[] = [];

        for (const staff of staffToPurge) {
            if (!staff.id || !staff.serviceNumber) continue;

            // Delete staff document
            const staffDocRef = doc(db, "staff", staff.id);
            batch.delete(staffDocRef);
            purgedStaffNames.push(`${staff.firstName} ${staff.lastName}`);

            // Find and delete associated training logs
            const logsQuery = query(collection(db, "trainingLogs"), where("serviceNumber", "==", staff.serviceNumber));
            const logSnapshots = await getDocs(logsQuery);
            logSnapshots.forEach(logDoc => {
                batch.delete(logDoc.ref);
            });
        }

        await batch.commit();
        return purgedStaffNames;
    },
    onSuccess: (purgedNames) => {
        toast({
            title: "Purge Complete",
            description: `Successfully purged ${purgedNames.length} staff member(s): ${purgedNames.join(", ")}.`,
        });
        queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });
        queryClient.invalidateQueries({ queryKey: [TRAINING_LOGS_QUERY_KEY] });
        setIsPurgeDialogOpen(false);
        setStaffToPurge([]);
    },
    onError: (error) => {
        toast({
            variant: "destructive",
            title: "Purge Failed",
            description: error.message,
        });
        setIsPurgeDialogOpen(false);
    },
});


  const toggleSquadron = (squadronName: string) => {
    setOpenSquadrons(prev => ({ ...prev, [squadronName]: !(prev[squadronName] ?? true) }));
  };

   React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isImportingStaffCsv || isImportingAccomplishments) {
        event.preventDefault();
        event.returnValue = "Import is in progress. Are you sure you want to leave? This may interrupt the import.";
      }
    };

    if (isImportingStaffCsv || isImportingAccomplishments) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    } else {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isImportingStaffCsv, isImportingAccomplishments]);

  const filteredStaffList = React.useMemo(() => {
    if (!staffList) return [];
    if (!searchQuery) return staffList;

    const lowercasedQuery = searchQuery.toLowerCase();
    return staffList.filter(staff =>
        `${staff.rank} ${staff.firstName} ${staff.lastName}`.toLowerCase().includes(lowercasedQuery) ||
        staff.serviceNumber.includes(lowercasedQuery) ||
        staff.squadron?.toLowerCase().includes(lowercasedQuery) ||
        staff.role?.toLowerCase().includes(lowercasedQuery)
    );
  }, [staffList, searchQuery]);


  const staffGroups = React.useMemo(() => {
    if (!filteredStaffList) return [];
    const groups: Record<string, StaffMember[]> = {};
    filteredStaffList.forEach(staff => {
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
  }, [filteredStaffList]);

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

  const handleStaffCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ variant: "destructive", title: "Import Error", description: "No file selected." });
      return;
    }
    setIsImportingStaffCsv(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast({ variant: "destructive", title: "Import Error", description: "Could not read file content." });
        setIsImportingStaffCsv(false);
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

        const expectedCsvHeaders = [
          "PrimaryUnit", "MemberUID", "MemberName", "Appointment",
          "EmailAddress", "PhoneNumber", "Address"
        ];
        const allRecognizedHeaders = [
            ...expectedCsvHeaders,
            "MemberType", "IsPrimary", "Active", "ContactEmail1", "ContactName",
            "EmergencyContactEmail", "ParentalResponsiblity", "Relationship", "NextOfKin",
            "PrimaryContact", "MemberContactPhoneNumber", "AboriginalTorresStraitIslander",
            "FullTimeStudent", "EducationInstitution", "HighestEducationLevel", "Religion",
            "Citizenship", "DefenceVendorNumber", "Name"
        ];

        const headerIndices: Record<string, number> = {};
        allRecognizedHeaders.forEach(h => {
          const index = csvHeader.indexOf(h);
          if (index !== -1) {
            headerIndices[h] = index;
          }
        });

        for (const expectedHeader of expectedCsvHeaders) {
            if (headerIndices[expectedHeader] === undefined) {
                 errors.push(`Missing required CSV header: "${expectedHeader}".`);
            }
        }
        if (errors.length > 0) {
            throw new Error(errors.join(" "));
        }

        let currentStaffList: StaffMember[] = queryClient.getQueryData([STAFF_QUERY_KEY]) || [];
        if (currentStaffList.length === 0 && staffList.length > 0) {
            currentStaffList = staffList;
        } else if (currentStaffList.length === 0 && staffList.length === 0 && !isLoading) {
            currentStaffList = await queryClient.fetchQuery({queryKey: [STAFF_QUERY_KEY], queryFn: useStaff().queryFn as () => Promise<StaffMember[]> });
        }

        const existingStaffByServiceNumber = new Map(currentStaffList.map(s => [s.serviceNumber, s],));
        const existingEmails = new Set(currentStaffList.map(s => s.email).filter(Boolean));

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

          const csvData: Record<string, string | undefined> = {};
          allRecognizedHeaders.forEach(h => {
              const index = headerIndices[h];
              if (index !== undefined && index < values.length) {
                csvData[h] = values[index].replace(/^"|"$/g, '').replace(/""/g, '"');
              } else {
                csvData[h] = undefined;
              }
          });

          const phoneValue = csvData.PhoneNumber?.trim();
          if (!phoneValue) {
            errors.push(`Row ${i + 1}: PhoneNumber is blank. Skipping record for UID "${csvData.MemberUID || 'UNKNOWN'}".`);
            continue;
          }

          const serviceNumber = csvData.MemberUID;
          const email = csvData.EmailAddress?.trim();

          if (!serviceNumber) {
             errors.push(`Row ${i + 1}: MemberUID (Service Number) is blank. Skipping record.`);
             continue;
          }
          if (!email) {
             errors.push(`Row ${i + 1} (UID: ${serviceNumber}): EmailAddress is blank. Skipping record.`);
             continue;
          }

          const { rank, firstName, lastName } = parseMemberNameAndRank(csvData.MemberName || "");
          if (!rank || !firstName || !lastName) {
             errors.push(`Row ${i + 1} (UID: ${serviceNumber}): MemberName "${csvData.MemberName || ''}" could not be parsed into Rank, First Name, and Last Name. Skipping record.`);
             continue;
          }

          let roleToSave = "Staff";
          const rawAppointmentFromCsv = csvData.Appointment?.trim().toUpperCase();
          if (rawAppointmentFromCsv && appointmentMapping[rawAppointmentFromCsv]) {
              roleToSave = appointmentMapping[rawAppointmentFromCsv];
          } else if (rawAppointmentFromCsv && rawAppointmentFromCsv.length > 0) {
              roleToSave = csvData.Appointment!.trim();
          }


          const squadron = csvData.PrimaryUnit || undefined;
          const address = csvData.Address || undefined;

          const existingStaffMember = existingStaffByServiceNumber.get(serviceNumber);

          const memberDataPayload: Omit<StaffMember, 'id' | 'serviceHistory'> & { id?: string; serviceHistory?: ServiceHistoryEntry[] } = {
            serviceNumber: serviceNumber,
            rank: rank,
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phoneValue,
            role: roleToSave,
            squadron: squadron,
            address: address,
            joinDate: existingStaffMember?.joinDate || null,
            status: existingStaffMember?.status || "Active",
          };

          if (existingStaffMember) {
            memberDataPayload.id = existingStaffMember.id;
            memberDataPayload.serviceHistory = existingStaffMember.serviceHistory || []; 
            if (email && email !== existingStaffMember.email && existingEmails.has(email)) {
                errors.push(`Row ${i + 1} (UID: ${serviceNumber}): Email "${email}" already exists for another staff member. Update for this UID skipped.`);
                continue;
            }
            updatePromises.push(
              updateStaffMutation.mutateAsync(memberDataPayload as StaffMember).then(() => {
                updatedCount++;
                if (email && email !== existingStaffMember.email) {
                    existingEmails.delete(existingStaffMember.email);
                    existingEmails.add(email);
                }
                existingStaffByServiceNumber.set(serviceNumber, { ...existingStaffMember, ...memberDataPayload });
              }).catch((updateError: any) => {
                let errorMessage = `Row ${i + 1} (UID: ${serviceNumber}): Failed to update: ${updateError.message}`;
                if (updateError.errors) {
                  errorMessage += ` Details: ${JSON.stringify(updateError.errors)}`;
                }
                errors.push(errorMessage);
              })
            );
          } else {
            memberDataPayload.serviceHistory = []; 
            if (email && existingEmails.has(email)) {
              errors.push(`Row ${i + 1} (UID: ${serviceNumber}): Email "${email}" already exists. New record skipped.`);
              continue;
            }
            addPromises.push(
              addStaffMutation.mutateAsync(memberDataPayload as Omit<StaffMember, 'id'>).then((newId) => {
                importedCount++;
                existingStaffByServiceNumber.set(serviceNumber, { ...memberDataPayload, id: newId as string, serviceHistory: [] });
                if(email) existingEmails.add(email);
              }).catch((addError: any) => {
                let errorMessage = `Row ${i + 1} (UID: ${serviceNumber}): Failed to add: ${addError.message}`;
                if (addError.errors) {
                  errorMessage += ` Details: ${JSON.stringify(addError.errors)}`;
                }
                errors.push(errorMessage);
              })
            );
          }
        }

        await Promise.all([...addPromises, ...updatePromises]);

        let toastMessage = "";
        if (importedCount > 0) toastMessage += `${importedCount} new staff member(s) imported. `;
        if (updatedCount > 0) toastMessage += `${updatedCount} staff member(s) updated. `;

        if (toastMessage === "" && errors.length === 0 && lines.length > 1) {
            toast({ title: "Import Complete", description: "No new staff members were found to import or update based on provided UIDs." });
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
        if (staffCsvInputRef.current) {
          staffCsvInputRef.current.value = "";
        }
        setIsImportingStaffCsv(false);
        queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });
      }
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "Import Error", description: "Failed to read the file."});
      if (staffCsvInputRef.current) {
        staffCsvInputRef.current.value = "";
      }
      setIsImportingStaffCsv(false);
    };
    reader.readAsText(file);
  };

  const parseDateForAccomplishment = (dateString: string): Date | null => {
    const formatsToTry = ["dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "dd-MM-yyyy", "yyyy/MM/dd", "dd/MM/yy", "d-MMM-yy"];
    for (const fmt of formatsToTry) {
      const parsed = parseDateFns(dateString, fmt, new Date());
      if (isValidDate(parsed)) return parsed;
    }
    const directParsed = new Date(dateString);
    if (isValidDate(directParsed)) return directParsed;
    console.warn(`[AccomplishmentDateParse] Could not parse date: "${dateString}" with any known format.`);
    return null;
  };


  const handleAccomplishmentCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ variant: "destructive", title: "Import Error", description: "No file selected." });
      return;
    }
    setIsImportingAccomplishments(true);

    const currentStaffList: StaffMember[] = queryClient.getQueryData([STAFF_QUERY_KEY]) || await queryClient.fetchQuery({queryKey: [STAFF_QUERY_KEY], queryFn: useStaff().queryFn as () => Promise<StaffMember[]> });
    const staffMapByServiceNumber = new Map(currentStaffList.map(s => [s.serviceNumber, s]));
    
    const allTrainingLogs: TrainingLog[] = queryClient.getQueryData([TRAINING_LOGS_QUERY_KEY]) || await queryClient.fetchQuery({queryKey: [TRAINING_LOGS_QUERY_KEY], queryFn: async () => {
        const querySnapshot = await getDocs(query(collection(db, "trainingLogs")));
        return querySnapshot.docs.map(d => convertTrainingLogTimestamps(d.data()));
    }});
    const existingLogHashes = new Set(allTrainingLogs.map(log => log.hash).filter(Boolean));


    const reader = new FileReader();
    reader.onload = async (e) => {
      const skippedRecordsLog: string[] = [];
      const staffToHardDelete = new Map<string, { id: string, serviceNumber: string, name: string }>();
      const BATCH_SIZE = 490;
      try {
        const text = e.target?.result as string;
        if (!text) {
          toast({ variant: "destructive", title: "Import Error", description: "Could not read file content." });
          setIsImportingAccomplishments(false);
          if (accomplishmentCsvInputRef.current) accomplishmentCsvInputRef.current.value = "";
          return;
        }

        
        const allOperations: { type: 'log' | 'staffUpdate', payload: any }[] = [];
        const errors: string[] = [];
        
        toast({ title: "Import Started", description: "Parsing CSV file..." });

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
          
          const staffUpdates = new Map<string, Partial<StaffMember> & { serviceHistoryToAdd: ServiceHistoryEntry[] }>();

          if (!allRequiredHeadersPresent) {
              toast({
                  variant: "destructive", title: "CSV Import Failed: Header Mismatch",
                  description: ( <ScrollArea className="max-h-40"><pre className="whitespace-pre-wrap text-xs">{errors.join("\n")}</pre></ScrollArea> ),
                  duration: 15000,
              });
              if (accomplishmentCsvInputRef.current) accomplishmentCsvInputRef.current.value = "";
              setIsImportingAccomplishments(false);
              return;
          }

          for (let i = 1; i < allRows.length; i++) {
              const values = allRows[i];
              if (values.every(val => val.trim() === "")) continue;
              if (values.length !== header.length) {
                  errors.push(`Row ${i + 1}: Incorrect columns. Expected ${header.length}, got ${values.length}. Line: "${allRows[i].join(",").substring(0,100)}..."`);
                  continue;
              }

              const csvRowData: Record<string, string> = {};
              expectedHeaders.forEach(eh => {
                const index = headerIndices[eh];
                csvRowData[eh] = (index !== undefined && index < values.length) ? values[index] : "";
              });

              const surnameField = csvRowData["Surname"];
              if (!surnameField) {
                  errors.push(`Row ${i + 1}: Missing "Surname" field.`);
                  skippedRecordsLog.push(`Row ${i + 1}: Skipped - Missing "Surname".`);
                  continue;
              }

              const changeType = csvRowData["ChangeType"]?.trim().toLowerCase();

              if (changeType === "resign" || changeType === "discharge") {
                  const parsedNameRankUid = parseCompositeSurnameField(surnameField);
                  if (parsedNameRankUid.memberUID) {
                      const matchedStaffFromMap = staffMapByServiceNumber.get(parsedNameRankUid.memberUID);
                      if (matchedStaffFromMap) {
                          if (!staffToHardDelete.has(matchedStaffFromMap.id!)) {
                              staffToHardDelete.set(matchedStaffFromMap.id!, {
                                  id: matchedStaffFromMap.id!,
                                  serviceNumber: matchedStaffFromMap.serviceNumber,
                                  name: `${matchedStaffFromMap.firstName} ${matchedStaffFromMap.lastName}`
                              });
                          }
                      } else {
                          skippedRecordsLog.push(`Row ${i + 1}: Skipped deletion - Staff with UID "${parsedNameRankUid.memberUID}" not found in the system.`);
                      }
                  } else {
                       skippedRecordsLog.push(`Row ${i + 1}: Skipped deletion - Could not parse MemberUID from "${surnameField}".`);
                  }
                  continue; 
              }

              const parsedNameRankUid = parseCompositeSurnameField(surnameField);
              if (!parsedNameRankUid.memberUID) {
                  errors.push(`Row ${i + 1}: Could not parse MemberUID from "${surnameField}".`);
                  skippedRecordsLog.push(`Row ${i + 1}: Skipped - No MemberUID in "${surnameField}".`);
                  continue;
              }

              const matchedStaffFromMap = staffMapByServiceNumber.get(parsedNameRankUid.memberUID);
              if (!matchedStaffFromMap) {
                  skippedRecordsLog.push(`Row ${i + 1}: Staff with MemberUID "${parsedNameRankUid.memberUID}" not found.`);
                  continue;
              }

              const effectiveDateStr = csvRowData["EffectiveDate"];
              if (!effectiveDateStr) {
                  errors.push(`Row ${i + 1}: Missing "EffectiveDate".`);
                  skippedRecordsLog.push(`Row ${i + 1}: Skipped - Missing "EffectiveDate".`);
                  continue;
              }
              const effectiveDate = parseDateForAccomplishment(effectiveDateStr);
              if (!effectiveDate) {
                  errors.push(`Row ${i + 1}: Invalid "EffectiveDate" format: "${effectiveDateStr}".`);
                  skippedRecordsLog.push(`Row ${i + 1}: Skipped - Invalid "EffectiveDate".`);
                  continue;
              }
              
              const detailsText = csvRowData["Details"]?.trim();

              const staffUpdateData = staffUpdates.get(matchedStaffFromMap.id!) || { serviceHistoryToAdd: [], ...JSON.parse(JSON.stringify(matchedStaffFromMap)) };

              if (changeType === "enrolment") {
                 staffUpdateData.joinDate = effectiveDate;
              } else if (changeType === "position" || changeType === "rank") {
                  if (!detailsText) {
                      skippedRecordsLog.push(`Row ${i+1}: Skipped - '${changeType}' change missing 'Details'.`); continue;
                  }
                  if (changeType === "position") {
                      const endDateStr = csvRowData["EndDate"]?.trim();
                      const positionEndDate = endDateStr ? parseDateForAccomplishment(endDateStr) : null;
                      staffUpdateData.serviceHistoryToAdd.push({ id: crypto.randomUUID(), type: "Position", item: detailsText, effectiveDate: effectiveDate, endDate: positionEndDate, notes: csvRowData["Comment"]?.trim() });
                      if (csvRowData["StatusName"]?.trim().toLowerCase() === "current") staffUpdateData.role = detailsText;
                  } else { // rank
                      const parsedRank = parseFullRankNameToAbbreviation(detailsText);
                      if (!parsedRank) { skippedRecordsLog.push(`Row ${i+1}: Skipped - Rank change invalid rank in 'Details' ("${detailsText}").`); continue; }
                      staffUpdateData.serviceHistoryToAdd.push({ id: crypto.randomUUID(), type: "Rank", item: parsedRank, effectiveDate: effectiveDate, notes: csvRowData["Comment"]?.trim() });
                      if (csvRowData["StatusName"]?.trim().toLowerCase() === "current") staffUpdateData.rank = parsedRank;
                  }
              } else {
                  if (!detailsText) { skippedRecordsLog.push(`Row ${i+1}: Skipped - Accomplishment missing 'Details'.`); continue; }
                  
                  const staffNameForHash = `${parsedNameRankUid.lastName || matchedStaffFromMap.lastName}, ${parsedNameRankUid.firstName || matchedStaffFromMap.firstName}`;
                  const completionDateForHash = format(effectiveDate, 'yyyy-MM-dd');
                  const hashString = `${staffNameForHash}-${detailsText}-${completionDateForHash}`;
                  const recordHash = await createHash(hashString);


                  if (existingLogHashes.has(recordHash)) {
                      skippedRecordsLog.push(`Row ${i + 1}: Skipped - Duplicate record found via hash for SN ${matchedStaffFromMap.serviceNumber}.`);
                      continue;
                  }

                  const logPayload = {
                      rank: parsedNameRankUid.rank || matchedStaffFromMap.rank,
                      staffName: staffNameForHash,
                      squadron: csvRowData["Unit_1"] || matchedStaffFromMap.squadron || "N/A",
                      currentRole: matchedStaffFromMap.role || "N/A",
                      courseName: detailsText,
                      completionDate: effectiveDate,
                      qualificationAchieved: detailsText,
                      instructorQualification: "",
                      achievementDetails: csvRowData["Comment"]?.trim() || "",
                      serviceNumber: matchedStaffFromMap.serviceNumber,
                      hash: recordHash,
                  };
                  allOperations.push({ type: 'log', payload: logPayload });
                  existingLogHashes.add(recordHash); 
              }
              staffUpdates.set(matchedStaffFromMap.id!, staffUpdateData);
          }
        
          staffToHardDelete.forEach((_, staffId) => staffUpdates.delete(staffId));
          staffUpdates.forEach((update, staffId) => {
              allOperations.push({ type: 'staffUpdate', payload: { staffId, update } });
          });
        }

        if (errors.length === 0 && allOperations.length === 0 && staffToHardDelete.size === 0) {
            toast({ title: "Import Information", description: "No new training logs or staff updates found to process in the CSV." });
            setIsImportingAccomplishments(false);
            if (accomplishmentCsvInputRef.current) accomplishmentCsvInputRef.current.value = "";
            return;
        }
        
        toast({ title: "Processing...", description: `Preparing to write ${allOperations.length} operations to the database...` });
        
        const totalBatches = Math.ceil(allOperations.length / BATCH_SIZE);
        for (let i = 0; i < totalBatches; i++) {
            const batch = writeBatch(db);
            const batchStart = i * BATCH_SIZE;
            const batchEnd = batchStart + BATCH_SIZE;
            const currentBatchOps = allOperations.slice(batchStart, batchEnd);
            
            toast({ title: `Writing Batch ${i + 1} of ${totalBatches}`, description: `Processing ${currentBatchOps.length} operations...` });

            for (const op of currentBatchOps) {
                if (op.type === 'log') {
                    const logRef = doc(collection(db, 'trainingLogs'));
                    const logData = { ...op.payload, completionDate: Timestamp.fromDate(op.payload.completionDate) };
                    batch.set(logRef, logData);
                } else if (op.type === 'staffUpdate') {
                    const { staffId, update } = op.payload;
                    const staffDocRef = doc(db, "staff", staffId);
                    const updatePayload: any = {};
                    const originalStaffMember = currentStaffList.find(s => s.id === staffId);
                    
                    if (!originalStaffMember) continue;

                    if (update.joinDate && new Date(update.joinDate).getTime() !== (originalStaffMember.joinDate ? new Date(originalStaffMember.joinDate).getTime() : null)) {
                        updatePayload.joinDate = Timestamp.fromDate(new Date(update.joinDate));
                    }
                    if (update.role && update.role !== originalStaffMember.role) {
                        updatePayload.role = update.role;
                    }
                    if (update.rank && update.rank !== originalStaffMember.rank) {
                        updatePayload.rank = update.rank;
    
                    }
                    
                    const existingHistoryIdentifiers = new Set((originalStaffMember.serviceHistory || []).map(eh => `${eh.type}-${eh.item}-${format(new Date(eh.effectiveDate), 'yyyy-MM-dd')}`));
                    const uniqueNewEntries = update.serviceHistoryToAdd.filter((ne: ServiceHistoryEntry) => !existingHistoryIdentifiers.has(`${ne.type}-${ne.item}-${format(new Date(ne.effectiveDate), 'yyyy-MM-dd')}`));

                    if (uniqueNewEntries.length > 0) {
                        updatePayload.serviceHistory = arrayUnion(...uniqueNewEntries.map(entry => ({
                            ...entry,
                            effectiveDate: Timestamp.fromDate(new Date(entry.effectiveDate)),
                            endDate: entry.endDate ? Timestamp.fromDate(new Date(entry.endDate)) : null
                        })));
                    }

                    if (Object.keys(updatePayload).length > 0) {
                        batch.update(staffDocRef, updatePayload);
                    }
                }
            }
            await batch.commit();
        }

        if (staffToHardDelete.size > 0) {
            toast({
                title: "Deletion Process Started",
                description: `Deleting ${staffToHardDelete.size} staff member(s) and their associated data...`
            });

            try {
                const staffArray = Array.from(staffToHardDelete.values());
                const deletionBatch = writeBatch(db);
                let deletedStaffNames: string[] = [];

                const logDeletionPromises = staffArray.map(staff =>
                    getDocs(query(collection(db, "trainingLogs"), where("serviceNumber", "==", staff.serviceNumber)))
                );
                const logSnapshots = await Promise.all(logDeletionPromises);

                staffArray.forEach(staff => {
                    deletedStaffNames.push(staff.name);
                    deletionBatch.delete(doc(db, "staff", staff.id));
                });
                logSnapshots.forEach(snapshot => {
                    snapshot.forEach(logDoc => deletionBatch.delete(logDoc.ref));
                });

                await deletionBatch.commit();

                toast({
                    title: "Deletion Successful",
                    description: `Successfully deleted: ${deletedStaffNames.join(", ")}.`
                });
            } catch (deleteError: any) {
                console.error("Error during hard deletion:", deleteError);
                toast({
                    variant: "destructive",
                    title: "Deletion Error",
                    description: `Failed to delete staff members: ${deleteError.message}`
                });
            }
        }
        
        // Update metadata for last accomplishment import time
        if (allOperations.length > 0 || staffToHardDelete.size > 0) {
            const metaRef = doc(db, 'systemMetadata', 'accomplishmentImport');
            await setDoc(metaRef, { lastImportAt: Timestamp.now() }, { merge: true });
        }
        
        let toastTitle = "Import Successful";
        let toastVariant: "default" | "destructive" = "default";
        let toastDescription = `${allOperations.length} operations processed successfully.`;
        
        if (errors.length > 0) {
            toastTitle = "Import Partially Successful";
            toastVariant = "default";
            const errorMessages = errors.slice(0, 5).join("\n") + (errors.length > 5 ? `\n...and ${errors.length - 5} more errors.` : "");
            toastDescription += `\n\nErrors (${errors.length}):\n${errorMessages}`;
        }
        if (skippedRecordsLog.length > 0) {
            if (errors.length === 0 && allOperations.length === 0) toastTitle = "Import Information";
            const skippedMessages = skippedRecordsLog.slice(0, 5).join("\n") + (skippedRecordsLog.length > 5 ? `\n...and ${skippedRecordsLog.length - 5} more skipped records.` : "");
            toastDescription += `\n\nSkipped Records (${skippedRecordsLog.length}):\n${skippedMessages}`;
        }
        
        if (toastDescription.trim() === "" && allRows.length <= 1) {
            toastTitle = "Import Information";
            toastDescription = "CSV file has no data rows to import.";
        } else if (toastDescription.trim() === "" && staffToHardDelete.size === 0) {
            toastTitle = "Import Information";
            toastDescription = "No new records or staff updates processed from the CSV.";
        }
        
        toast({
            variant: toastVariant, title: toastTitle,
            description: (<ScrollArea className="max-h-60 w-full"><pre className="whitespace-pre-wrap text-xs">{toastDescription.trim()}</pre></ScrollArea>),
            duration: errors.length > 0 || skippedRecordsLog.length > 0 ? 20000 : 8000,
        });

        if (allOperations.some(op => op.type === 'log') || staffToHardDelete.size > 0) queryClient.invalidateQueries({ queryKey: [TRAINING_LOGS_QUERY_KEY] });
        if (allOperations.some(op => op.type === 'staffUpdate') || staffToHardDelete.size > 0) queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });

      } catch (error: any) {
        console.error("Error during CSV import processing:", error);
        toast({ variant: "destructive", title: "Import Error", description: `An unexpected error occurred: ${error.message}` });
      } finally {
        if (accomplishmentCsvInputRef.current) {
          accomplishmentCsvInputRef.current.value = "";
        }
        setIsImportingAccomplishments(false);
      }
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "Import Error", description: "Failed to read the file."});
      if (accomplishmentCsvInputRef.current) {
        accomplishmentCsvInputRef.current.value = "";
      }
      setIsImportingAccomplishments(false);
    };
    reader.readAsText(file);
  };
  
  const handleFindDischargedStaff = async () => {
    setIsFindingStaffToPurge(true);
    toast({ title: "Scanning Records...", description: "Looking for staff marked for discharge." });

    try {
      const allLogs = await queryClient.fetchQuery<TrainingLog[], Error>({
        queryKey: [TRAINING_LOGS_QUERY_KEY],
        queryFn: async () => {
            const querySnapshot = await getDocs(query(collection(db, "trainingLogs")));
            return querySnapshot.docs.map(d => convertTrainingLogTimestamps(d.data()));
        }
      });
      const allStaff = await queryClient.fetchQuery<StaffMember[], Error>({ queryKey: [STAFF_QUERY_KEY] });

      if (!allStaff) {
        throw new Error("Could not fetch staff data to perform scan.");
      }

      const dischargeKeywords = ["discharged", "discharge", "resign", "cancellation of acceptance"];
      const staffIdsToDelete = new Set<string>();
      
      if (allLogs) {
        allLogs.forEach(log => {
          const logDetailsLower = [log.courseName, log.achievementDetails, log.qualificationAchieved].filter(Boolean).join(' ').toLowerCase();
          const isDischargeLog = dischargeKeywords.some(keyword => logDetailsLower.includes(keyword));

          if (isDischargeLog && log.serviceNumber) {
            const staffMember = allStaff.find(s => s.serviceNumber === log.serviceNumber);
            if (staffMember?.id) {
              staffIdsToDelete.add(staffMember.id);
            }
          }
        });
      }

      allStaff.forEach(staff => {
        if (staff.status === 'Pending Discharge' && staff.id) {
            staffIdsToDelete.add(staff.id);
        }
      });

      const staffToDeleteList = allStaff.filter(s => s.id && staffIdsToDelete.has(s.id));
      
      setStaffToPurge(staffToDeleteList);

      if (staffToDeleteList.length > 0) {
        setIsPurgeDialogOpen(true);
      } else {
        toast({ title: "Scan Complete", description: "No staff members found with a 'Pending Discharge' status or discharge-related accomplishments." });
      }
    } catch (err: any) {
        toast({ variant: "destructive", title: "Scan Error", description: err.message });
    } finally {
        setIsFindingStaffToPurge(false);
    }
  };

  const handleConfirmPurge = () => {
    if (staffToPurge.length > 0) {
        purgeStaffMutation.mutate(staffToPurge);
    } else {
        setIsPurgeDialogOpen(false);
    }
  };


  const isLoadingAnyMutation = updateStaffMutation.isPending || deleteStaffMutation.isPending || addStaffMutation.isPending || purgeStaffMutation.isPending;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <UsersIconLucide className="h-8 w-8 text-primary hidden sm:block" />
                <div>
                  <CardTitle className="text-2xl">Staff Management</CardTitle>
                  <CardDescription>Manage profiles, qualifications, and assignments. Import staff or accomplishments.</CardDescription>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search staff..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full"
                        disabled={isLoading}
                    />
                </div>
                 <Button onClick={openFormForNew} size="lg" className="w-full sm:w-auto shrink-0" disabled={addStaffMutation.isPending || isImportingStaffCsv || isImportingAccomplishments}>
                 {(addStaffMutation.isPending && !isImportingStaffCsv) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                 Add Staff
                </Button>
                <Button onClick={() => staffCsvInputRef.current?.click()} size="lg" variant="outline" className="w-full sm:w-auto shrink-0" disabled={isImportingStaffCsv || addStaffMutation.isPending || updateStaffMutation.isPending || deleteStaffMutation.isPending || isImportingAccomplishments}>
                   {isImportingStaffCsv ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
                 Import Staff
                </Button>
                 <Button onClick={() => accomplishmentCsvInputRef.current?.click()} size="lg" variant="outline" className="w-full sm:w-auto shrink-0" disabled={isLoading || isImportingAccomplishments || addStaffMutation.isPending || updateStaffMutation.isPending || deleteStaffMutation.isPending || isImportingStaffCsv}>
                   {isImportingAccomplishments || isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GraduationCap className="mr-2 h-5 w-5" />}
                    Import Accomp.
                </Button>
                <Button onClick={handleFindDischargedStaff} size="lg" variant="destructive" className="w-full sm:w-auto shrink-0" disabled={isFindingStaffToPurge || isImportingAccomplishments || isLoading}>
                    {isFindingStaffToPurge ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserX className="mr-2 h-5 w-5" />}
                    Purge Discharged
                </Button>
                <input type="file" ref={staffCsvInputRef} onChange={handleStaffCsvImport} accept=".csv" style={{ display: 'none' }} />
                <input type="file" ref={accomplishmentCsvInputRef} onChange={handleAccomplishmentCsvImport} accept=".csv" style={{ display: 'none' }} />
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

      {!isLoading && !error && staffList.length > 0 && filteredStaffList.length === 0 && (
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileSearch className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Staff Found</h3>
                <p className="text-muted-foreground">Your search for &quot;{searchQuery}&quot; did not match any staff members.</p>
            </CardContent>
        </Card>
      )}

      {!isLoading && !error && staffList.length === 0 && (
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <UsersIconLucide className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Staff Members Found</h3>
                <p className="text-muted-foreground">Add staff members manually or import a CSV file.</p>
            </CardContent>
        </Card>
      )}


      {!isLoading && !error && filteredStaffList.length > 0 && staffGroups.map(group => (
        <Card key={group.squadronName} className="shadow-xl mb-8">
          <Collapsible
            open={openSquadrons[group.squadronName] ?? (searchQuery.length > 0 ? true : (openSquadrons[group.squadronName] ?? true))}
            onOpenChange={() => toggleSquadron(group.squadronName)}
            className="w-full"
          >
            <CollapsibleTrigger asChild>
              <div className="flex justify-between items-center p-6 border-b bg-muted/20 dark:bg-muted/10 cursor-pointer hover:bg-muted/30 dark:hover:bg-muted/20 transition-colors rounded-t-lg">
                <div>
                  <CardTitle className="text-2xl">Squadron: {group.squadronName}</CardTitle>
                  <CardDescription>{group.staffMembers.length} staff member(s)</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="ml-auto">
                  {(openSquadrons[group.squadronName] ?? true) ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  <span className="sr-only">Toggle</span>
                </Button>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 px-0 sm:px-0">
                {group.staffMembers.length === 0 ? (
                  <p className="text-muted-foreground text-center p-6">No staff members in this squadron.</p>
                ) : (
                  <div className="overflow-y-auto max-h-[400px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
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
                        {group.staffMembers.map((staff) => {
                          const advisoryWarnings = getStaffAdvisoryWarnings(staff);
                          return (
                            <TableRow key={staff.id}>
                              <TableCell>{staff.serviceNumber}</TableCell>
                              <TableCell>{staff.rank}</TableCell>
                              <TableCell className="font-medium">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span>{`${staff.firstName} ${staff.lastName}`}</span>
                                  {(staff.status === 'UAL' || staff.status === 'Pending Discharge') && (
                                    <Badge variant="destructive">{staff.status}</Badge>
                                  )}
                                  {advisoryWarnings.length > 0 && (
                                    <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-500 border-yellow-200 dark:border-yellow-800 flex items-center gap-1 py-0 h-5 text-[10px] font-semibold shrink-0">
                                      <AlertTriangle className="h-3 w-3" /> {advisoryWarnings.join(", ")}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                            <TableCell className="hidden md:table-cell max-w-xs truncate">{staff.role || "N/A"}</TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {staff.joinDate && isValidDate(new Date(staff.joinDate)) ? format(new Date(staff.joinDate), "PP") : "N/A"}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoadingAnyMutation || isImportingStaffCsv || isImportingAccomplishments}>
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleViewDetails(staff)} disabled={isLoadingAnyMutation || isImportingStaffCsv || isImportingAccomplishments}>
                                    <Info className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(staff)} disabled={isLoadingAnyMutation || isImportingStaffCsv || isImportingAccomplishments}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setStaffToDelete(staff)}
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    disabled={isLoadingAnyMutation || isImportingStaffCsv || isImportingAccomplishments}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}

      {!isLoading && !error && staffList.length > 0 && (
        <Card>
          <CardFooter className="text-xs text-muted-foreground pt-4 justify-center">
              Total staff members: {staffList.length} across {staffGroups.length} squadron(s).
              {searchQuery && ` (${filteredStaffList.length} matching search)`}
          </CardFooter>
        </Card>
      )}

      <Alert className="mt-8">
        <UploadCloud className="h-4 w-4" />
        <AlertTitle>Staff CSV Import Instructions</AlertTitle>
        <AlertDescription>
          To bulk import staff, upload a CSV file. The system will attempt to parse the headers provided.
          <ul className="list-disc pl-5 mt-2 text-xs space-y-1">
            <li><code>PrimaryUnit</code> (e.g., "701 Squadron") - Populates 'Squadron'.</li>
            <li><code>MemberUID</code> (e.g., "8001234") - Populates 'Service Number'. Used to match existing records for updates. **Required for each record.**</li>
            <li><code>MemberName</code> (Format: "RANK FirstName LastName" e.g., "FLTLT(AAFC) Jane Doe". RANK must be one of: {RANKS.join(", ")}.) - Parsed for Rank, First Name, Last Name. **Required and must be parsable.**</li>
            <li><code>Appointment</code> (e.g., "Squadron Training Officer" or "XO") - Populates 'Role'. Abbreviations (XO, ADMINO, etc.) will be expanded. If blank or unmappable, defaults to "Staff".</li>
            <li><code>EmailAddress</code> (e.g., "jane.doe@example.com") - Populates 'Email'. **Required for each record.**</li>
            <li><code>PhoneNumber</code> (e.g., "0400123456") - Populates 'Phone'. **Records with a blank PhoneNumber will be skipped entirely.**</li>
            <li><code>Address</code> - Populates 'Address'.</li>
            <li>Other headers (e.g., MemberType, IsPrimary, Active, ContactEmail1, ContactName, etc.) will be ignored.</li>
          </ul>
          If a record with a matching `MemberUID` is found, it will be updated. Otherwise, a new record will be created.
          MemberUID and EmailAddress must be unique among existing and newly imported/updated staff (updates/creations skip if new email conflicts). Join Date is not part of this import; it will be preserved for existing records and unassigned for new ones. Service History is not updated by this CSV import; use the "Import Accomplishments" CSV for that.
        </AlertDescription>
      </Alert>
      
      <Alert className="mt-4">
        <GraduationCap className="h-4 w-4" />
        <AlertTitle>Accomplishments CSV Import Instructions</AlertTitle>
        <AlertDescription>
          To bulk import training, positions, or ranks, upload a CSV file. The header row is required.
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
                    <li><strong>"Resign" or "Discharge"</strong>: Marks the staff member for full deletion (profile and all data). No other processing occurs for this row.</li>
                    <li>Other values (e.g., "Accomplishment"): Creates a new Training Log entry. `Details` is Course Name & Qualification. `Comment` is Achievement Details.</li>
                </ul>
            </li>
            <li><code>StatusName</code>: (Text) If "Current" for Position/Rank, may update staff profile. If "Historical", record is still processed for service history.</li>
            <li><code>Details</code>: (Text, Required) Content depends on `ChangeType` (Position Title, Full Rank Name, or Course Name/Qualification).</li>
            <li><code>Comment</code>: (Text) Populates 'notes' for service history entries or 'achievementDetails' for training logs.</li>
          </ul>
           <p className="mt-2 text-xs">
            <strong>Important:</strong> Staff profiles must exist for each `MemberUID` for any processing to occur. A hash is generated from the staff name, course name, and completion date to prevent duplicate accomplishment entries.
          </p>
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
          <div className="py-4 pr-1">
              <StaffForm
                onSubmit={editingStaff ? handleUpdateStaff : handleAddStaff}
                defaultValues={editingStaff || undefined}
                onCancel={closeForm}
                isEditing={!!editingStaff}
                isSubmitting={editingStaff ? updateStaffMutation.isPending : addStaffMutation.isPending}
              />
          </div>
        </DialogContent>
      </Dialog>

      {viewingStaffMember && (
        <Dialog open={!!viewingStaffMember} onOpenChange={closeViewDialog}>
          <DialogContent className="sm:max-w-4xl">
              <StaffDetailsContent 
                staffMember={viewingStaffMember} 
                onEdit={handleEdit}
                isMutationPending={isLoadingAnyMutation || isImportingStaffCsv || isImportingAccomplishments}
              />
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
              <AlertDialogCancel onClick={() => setStaffToDelete(null)} disabled={deleteStaffMutation.isPending || isImportingStaffCsv || isImportingAccomplishments}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={deleteStaffMutation.isPending || isImportingStaffCsv || isImportingAccomplishments}
              >
                {deleteStaffMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isPurgeDialogOpen && (
        <AlertDialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                    <AlertDialogDescription>
                        The following {staffToPurge.length} staff member(s) have been identified for deletion based on a 'Pending Discharge' status or discharge-related accomplishment. This action is irreversible and will delete their profile and all associated training logs.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <ScrollArea className="max-h-60 border rounded-md my-4">
                    <ul className="p-4 space-y-1 text-sm">
                        {staffToPurge.map(s => (
                            <li key={s.id}>{s.rank} {s.firstName} {s.lastName} (SN: {s.serviceNumber})</li>
                        ))}
                    </ul>
                </ScrollArea>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={purgeStaffMutation.isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmPurge} disabled={purgeStaffMutation.isPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        {purgeStaffMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Confirm & Delete {staffToPurge.length} Member(s)
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
