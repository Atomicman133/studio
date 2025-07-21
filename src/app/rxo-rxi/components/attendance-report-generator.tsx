
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UploadCloud, FileDown, Loader2, BarChart2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addLetterheadAndFooter, addPageNumbers, resetLetterheadCache } from "@/lib/utils";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ReportHeader {
  unit: string;
  startDate: string;
  endDate: string;
}

interface MemberReport {
  memberName: string;
  activities: { name: string; attendance: string }[];
  eligibleActivities: number;
  attendedActivities: number;
  attendancePercentage: number;
  notAttended: { name: string; attendance: string }[];
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


export function AttendanceReportGenerator() {
  const { toast } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [reportHeader, setReportHeader] = React.useState<ReportHeader | null>(null);
  const [memberReports, setMemberReports] = React.useState<MemberReport[]>([]);
  const csvInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "text/csv") {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a valid CSV file.",
        });
        return;
      }
      setFile(selectedFile);
      setReportHeader(null);
      setMemberReports([]);
      processFile(selectedFile);
    }
  };

  const processFile = (fileToProcess: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const allRows = robustCsvParser(text);

        if (allRows.length < 4) {
          throw new Error("CSV file is missing required header or data rows.");
        }

        // --- New Header Parsing Logic ---
        const headerRow = allRows[0];
        const headerDataRow = allRows[1];
        
        const unitIndex = headerRow.findIndex(h => h.toLowerCase().includes('unit'));
        const startDateIndex = headerRow.findIndex(h => h.toLowerCase().includes('startdate'));
        const endDateIndex = headerRow.findIndex(h => h.toLowerCase().includes('enddate'));

        if (unitIndex === -1 || startDateIndex === -1 || endDateIndex === -1) {
            throw new Error("Could not find 'Unit', 'Startdate', or 'Enddate' columns in the CSV header.");
        }

        const unitValue = headerDataRow[unitIndex]?.replace(/Unit:\s*/, '').trim();
        const startDateValue = headerDataRow[startDateIndex]?.replace(/Start date:\s*/, '').trim();
        const endDateValue = headerDataRow[endDateIndex]?.replace(/End date:\s*/, '').trim();

        if (!unitValue || !startDateValue || !endDateValue) {
            throw new Error("Header data (Unit, Start Date, End Date) is missing or empty.");
        }
        
        const header: ReportHeader = {
          unit: unitValue,
          startDate: startDateValue,
          endDate: endDateValue,
        };
        setReportHeader(header);
        // --- End New Header Parsing Logic ---


        // Parse Member Data - find the correct column for member name and activity
        const memberDataHeaderRow = allRows[2];
        const memberNameIndex = memberDataHeaderRow.findIndex(h => h.toLowerCase().includes('member'));
        const activityNameIndex = memberDataHeaderRow.findIndex(h => h.toLowerCase().includes('activity'));
        const attendanceIndex = memberDataHeaderRow.findIndex(h => h.toLowerCase().includes('attendance'));

        if (memberNameIndex === -1 || activityNameIndex === -1 || attendanceIndex === -1) {
             throw new Error("Could not find 'Member', 'Activity', or 'Attendance' columns for the member data section.");
        }

        const memberDataLines = allRows.slice(3);
        const groupedByMember: Record<string, { name: string; attendance: string }[]> = {};

        memberDataLines.forEach(lineParts => {
          if (lineParts.length > Math.max(memberNameIndex, activityNameIndex, attendanceIndex)) {
            const memberName = lineParts[memberNameIndex].trim();
            const activityName = lineParts[activityNameIndex].trim();
            const attendance = lineParts[attendanceIndex].trim();

            if (memberName && activityName) { // Ensure member and activity names are not empty
                if (!groupedByMember[memberName]) {
                  groupedByMember[memberName] = [];
                }
                groupedByMember[memberName].push({ name: activityName, attendance });
            }
          }
        });

        const reports: MemberReport[] = Object.entries(groupedByMember).map(([memberName, activities]) => {
          const eligibleActivities = activities.filter(act => act.attendance !== "--").length;
          const attendedActivities = activities.filter(act => act.attendance === "P").length;
          const attendancePercentage = eligibleActivities > 0 ? (attendedActivities / eligibleActivities) * 100 : 0;
          const notAttended = activities.filter(act => act.attendance !== "P" && act.attendance !== "--");

          return {
            memberName,
            activities,
            eligibleActivities,
            attendedActivities,
            attendancePercentage,
            notAttended
          };
        });
        setMemberReports(reports);
        toast({ title: "Report Processed", description: `Found attendance data for ${reports.length} members.` });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Processing Error",
          description: error.message || "An unknown error occurred.",
        });
        setReportHeader(null);
        setMemberReports([]);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(fileToProcess);
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage < 75) return 'text-red-500';
    if (percentage >= 75 && percentage <= 80) return 'text-yellow-500';
    return 'text-green-500';
  };

  const handleDownloadPdf = async () => {
    if (!reportHeader || memberReports.length === 0) {
      toast({ variant: "destructive", title: "No data to export" });
      return;
    }
    
    setIsLoading(true);
    const doc = new jsPDF();
    resetLetterheadCache();
    const filename = `Attendance_Report_${reportHeader.unit.replace(/\s+/g, '_')}_${reportHeader.startDate}_to_${reportHeader.endDate}.pdf`;
    
    const margin = 15;
    let yPos = margin;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const indent = 5;
    let headerHeight = 0;
    let footerHeight = 0;

    const { headerHeight: hh, footerHeight: fh } = await addLetterheadAndFooter(doc, "/AAFCLetterhead-Header.png", "/AAFCLetterhead-Footer.png", margin);
    headerHeight = hh;
    footerHeight = fh;
    yPos = margin + headerHeight + 5;

    const checkPageBreak = (neededHeight: number) => {
        if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin - footerHeight) {
            addPageNumbers(doc, footerHeight, margin);
            doc.addPage();
            yPos = margin + headerHeight + 5;
        }
    };

    // Main Header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`Attendance Report`, doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
    yPos += sectionSpacing;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Unit: ${reportHeader.unit}`, margin, yPos);
    yPos += lineSpacing;
    doc.text(`Reporting Period: ${reportHeader.startDate} - ${reportHeader.endDate}`, margin, yPos);
    yPos += sectionSpacing * 1.5;

    // Member sections
    for (const member of memberReports) {
      checkPageBreak(sectionSpacing * 2);
      doc.setDrawColor(200);
      doc.line(margin, yPos, doc.internal.pageSize.getWidth() - margin, yPos);
      yPos += lineSpacing;

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(member.memberName, margin, yPos);
      yPos += lineSpacing * 1.2;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      checkPageBreak(lineSpacing);
      doc.text(`Eligible Activities Attended: ${member.attendedActivities} of ${member.eligibleActivities}`, margin + indent, yPos);
      yPos += lineSpacing;

      checkPageBreak(lineSpacing);
      const percentageText = `Attendance Percentage: ${member.attendancePercentage.toFixed(2)}%`;
      doc.text(percentageText, margin + indent, yPos);
      yPos += lineSpacing;

      if (member.notAttended.length > 0) {
        checkPageBreak(lineSpacing);
        doc.setFont(undefined, 'bold');
        doc.text(`Activities Not Attended (${member.notAttended.length}):`, margin + indent, yPos);
        yPos += lineSpacing;
        doc.setFont(undefined, 'normal');

        for (const activity of member.notAttended) {
            checkPageBreak(lineSpacing);
            doc.text(`- ${activity.name}: ${activity.attendance}`, margin + indent * 2, yPos);
            yPos += lineSpacing * 0.8;
        }
      }
      yPos += sectionSpacing;
    }

    addPageNumbers(doc, footerHeight, margin);
    doc.save(filename);
    setIsLoading(false);
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Attendance Reporting</CardTitle>
        <CardDescription>Upload a CSV report to analyze and generate a simplified attendance PDF.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-lg p-8 text-center">
          <UploadCloud className="w-12 h-12 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            {file ? `Selected: ${file.name}` : "Click button to select a CSV file"}
          </p>
          <Button onClick={() => csvInputRef.current?.click()} className="mt-4" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Select CSV File
          </Button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {memberReports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Report Preview</CardTitle>
              <CardDescription>
                Unit: {reportHeader?.unit} | Period: {reportHeader?.startDate} - {reportHeader?.endDate}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDownloadPdf} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                Download Report as PDF
              </Button>
              <ScrollArea className="h-96 mt-4 border rounded-md">
                <div className="p-4 space-y-4">
                  {memberReports.map(member => (
                    <div key={member.memberName} className="p-3 border-b">
                      <h3 className="font-semibold">{member.memberName}</h3>
                      <p className="text-sm text-muted-foreground">
                        Attended: {member.attendedActivities} of {member.eligibleActivities}
                      </p>
                      <p className={`text-sm font-bold ${getPercentageColor(member.attendancePercentage)}`}>
                        Percentage: {member.attendancePercentage.toFixed(2)}%
                      </p>
                      {member.notAttended.length > 0 && (
                        <div className="mt-2">
                          <h4 className="text-xs font-semibold uppercase text-muted-foreground">Not Attended:</h4>
                          <ul className="list-disc pl-5 text-xs text-muted-foreground">
                            {member.notAttended.map((activity, idx) => (
                              <li key={idx}>{activity.name}: {activity.attendance}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
