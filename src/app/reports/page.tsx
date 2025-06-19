
"use client";

import * as React from "react";
import { BarChart3, CheckCircle2, Download, FileSearch, FileSpreadsheet, Loader2, XCircle, AlertTriangle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStaff } from "@/hooks/useStaffData";
import type { StaffMember } from "../staff/staff-schema";
import type { TrainingLog } from "../training/training-schema";
import { COMPLIANCE_CRITERIA_CONFIG, type ComplianceCriterionCheck } from "../reporting/reporting-schema";
import { calculateOICLevel } from "@/lib/utils"; // Moved utility
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { format, isValid, startOfDay, addYears, isBefore, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
// Removed static imports:
// import jsPDF from 'jspdf';
// import 'jspdf-autotable'; // Import for autoTable plugin
import { addLetterheadAndFooter, addPageNumbers, resetLetterheadCache } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";

const HEADER_IMAGE_URL = "/AAFCLetterhead-Header.png";
const FOOTER_IMAGE_URL = "/AAFCLetterhead-Footer.png";

type ReportType = "oicLevelByUnit" | "specificComplianceByUnit";

interface OICLevelReportItem {
  staffId: string;
  staffName: string;
  rank: string;
  squadron: string;
  oicLevel: number | null;
}

interface SpecificComplianceReportItem {
  staffId: string;
  staffName: string;
  rank: string;
  squadron: string;
  complianceItemName: string;
  isMet: boolean;
  details: string;
}

type ReportData = OICLevelReportItem[] | SpecificComplianceReportItem[];

// Fetch training logs (similar to what's in training/page.tsx or reporting/page.tsx)
async function fetchAllTrainingLogs(): Promise<TrainingLog[]> {
  const logsCollectionRef = collection(db, 'trainingLogs');
  const q = query(logsCollectionRef, orderBy('completionDate', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    const completionDate = data.completionDate instanceof Timestamp ? data.completionDate.toDate() : data.completionDate;
    return {
      id: doc.id,
      ...data,
      completionDate: completionDate && isValid(new Date(completionDate)) ? new Date(completionDate) : new Date(0), // Fallback for invalid dates
      serviceNumber: data.serviceNumber || undefined,
    } as TrainingLog;
  });
}


export default function ReportsPage() {
  const { data: staffList = [], isLoading: isLoadingStaff, error: errorStaff } = useStaff();
  const { data: trainingLogs = [], isLoading: isLoadingLogs, error: errorLogs } = useQuery<TrainingLog[], Error>({
    queryKey: ['allTrainingLogsForReports'],
    queryFn: fetchAllTrainingLogs,
  });
  const { toast } = useToast();

  const [selectedSquadron, setSelectedSquadron] = React.useState<string | null>(null);
  const [selectedReportType, setSelectedReportType] = React.useState<ReportType | null>(null);
  const [selectedComplianceItemKey, setSelectedComplianceItemKey] = React.useState<string | null>(null);
  const [reportData, setReportData] = React.useState<ReportData | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);

  const uniqueSquadrons = React.useMemo(() => {
    if (!staffList) return [];
    const squadrons = new Set(staffList.map(staff => staff.squadron).filter(Boolean) as string[]);
    return Array.from(squadrons).sort();
  }, [staffList]);

  const handleRunReport = () => {
    if (!selectedSquadron || !selectedReportType) {
      toast({ variant: "destructive", title: "Missing Selection", description: "Please select a squadron and a report type." });
      return;
    }
    if (selectedReportType === "specificComplianceByUnit" && !selectedComplianceItemKey) {
      toast({ variant: "destructive", title: "Missing Selection", description: "Please select a compliance item." });
      return;
    }

    setIsGeneratingReport(true);
    setReportData(null); // Clear previous report

    const staffInSquadron = staffList.filter(staff => staff.squadron === selectedSquadron);
    if (staffInSquadron.length === 0) {
      toast({ title: "No Staff", description: `No staff members found for squadron: ${selectedSquadron}.` });
      setIsGeneratingReport(false);
      return;
    }

    if (selectedReportType === "oicLevelByUnit") {
      const oicReport: OICLevelReportItem[] = staffInSquadron.map(staff => {
        const memberLogs = trainingLogs?.filter(log => log.serviceNumber === staff.serviceNumber) || [];
        return {
          staffId: staff.id || staff.serviceNumber,
          staffName: `${staff.firstName} ${staff.lastName}`,
          rank: staff.rank,
          squadron: staff.squadron || "N/A",
          oicLevel: calculateOICLevel(memberLogs),
        };
      });
      setReportData(oicReport);
    } else if (selectedReportType === "specificComplianceByUnit" && selectedComplianceItemKey) {
      const criterionConfig = COMPLIANCE_CRITERIA_CONFIG.find(c => c.key === selectedComplianceItemKey);
      if (!criterionConfig) {
        toast({ variant: "destructive", title: "Error", description: "Selected compliance criterion not found." });
        setIsGeneratingReport(false);
        return;
      }

      const complianceReport: SpecificComplianceReportItem[] = staffInSquadron.map(staff => {
        const memberLogs = trainingLogs?.filter(log => log.serviceNumber === staff.serviceNumber) || [];
        const relevantLogs = memberLogs
          .filter(log => criterionConfig.identifier(log))
          .sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime());

        let isMet = false;
        let details = "Missing";
        if (relevantLogs.length > 0) {
          const completionDate = startOfDay(new Date(relevantLogs[0].completionDate));
          if (!isValid(completionDate)) {
            details = "Invalid completion date in record.";
          } else {
            const today = startOfDay(new Date());
            if (criterionConfig.yearsToExpire) {
              const expiryDate = startOfDay(addYears(completionDate, criterionConfig.yearsToExpire));
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
        return {
          staffId: staff.id || staff.serviceNumber,
          staffName: `${staff.firstName} ${staff.lastName}`,
          rank: staff.rank,
          squadron: staff.squadron || "N/A",
          complianceItemName: criterionConfig.name,
          isMet,
          details,
        };
      });
      setReportData(complianceReport);
    }
    setIsGeneratingReport(false);
    toast({title: "Report Generated", description: "Report data is now displayed below."});
  };
  
  const generateCsv = (data: ReportData | null, filename: string) => {
    if (!data || data.length === 0) {
      toast({variant: "destructive", title: "No Data", description: "No data to export."});
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => JSON.stringify((row as any)[header], (_, value) => value === null ? '' : value)).join(',')
      )
    ];
    
    const csvString = csvRows.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportCsv = () => {
    let filename = "report.csv";
    if (selectedReportType === "oicLevelByUnit" && selectedSquadron) {
      filename = `oic_level_report_${selectedSquadron.replace(/\s+/g, '_')}.csv`;
    } else if (selectedReportType === "specificComplianceByUnit" && selectedSquadron && selectedComplianceItemKey) {
      const complianceItem = COMPLIANCE_CRITERIA_CONFIG.find(c => c.key === selectedComplianceItemKey);
      const itemName = complianceItem ? complianceItem.name.replace(/\s+/g, '_') : "compliance_item";
      filename = `${itemName}_report_${selectedSquadron.replace(/\s+/g, '_')}.csv`;
    }
    generateCsv(reportData, filename);
  };
  
  const handleExportPdf = async () => {
    if (!reportData || reportData.length === 0) {
        toast({variant: "destructive", title: "No Data", description: "No data to export for PDF."});
        return;
    }
    if (!selectedSquadron || !selectedReportType) {
        toast({variant: "destructive", title: "Report Context Missing", description: "Cannot determine report context for PDF export."});
        return;
    }

    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable'); // For side effects to extend jsPDF prototype

    const doc = new jsPDF();
    resetLetterheadCache();
    const margin = 15;
    let yPos = margin;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    let headerHeight = 0;
    let footerHeight = 0;

    const { headerHeight: hh, footerHeight: fh } = await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
    headerHeight = hh;
    footerHeight = fh;
    yPos = margin + headerHeight + 5;

    const checkPageBreak = async (neededHeight: number = lineSpacing) => {
        if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin - footerHeight - 10) { // Buffer for page numbers
            addPageNumbers(doc, footerHeight, margin);
            doc.addPage();
            await addLetterheadAndFooter(doc, HEADER_IMAGE_URL, FOOTER_IMAGE_URL, margin);
            yPos = margin + headerHeight + 5;
        }
    };
    
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    let reportTitle = "Report";
    // let reportSubtitle = `Squadron: ${selectedSquadron}`; // Not used in current title formatting
    if (selectedReportType === "oicLevelByUnit") {
        reportTitle = `OIC Level Report for ${selectedSquadron}`;
    } else if (selectedReportType === "specificComplianceByUnit" && selectedComplianceItemKey) {
        const item = COMPLIANCE_CRITERIA_CONFIG.find(c => c.key === selectedComplianceItemKey);
        reportTitle = `${item ? item.name : 'Compliance'} Report for ${selectedSquadron}`;
    }
    await checkPageBreak(sectionSpacing);
    doc.text(reportTitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += lineSpacing * 1.5;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Generated on: ${format(new Date(), "PPP")}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += sectionSpacing;

    const tableHeaders: string[] = Object.keys(reportData[0]).filter(key => key !== 'staffId' && key !== 'squadron');
    // const columnWidths = tableHeaders.map(header => doc.getTextWidth(header) + 8); // Not directly used by autoTable in simple mode
    
    const tableData = reportData.map(item => {
        const row: any = {};
        for(const key of tableHeaders){
            if (key === 'isMet') row[key] = (item as any)[key] ? 'Met' : 'Not Met';
            else row[key] = (item as any)[key] === null ? 'N/A' : (item as any)[key];
        }
        return Object.values(row);
    });

    (doc as any).autoTable({ // Using any for autoTable
        startY: yPos,
        head: [tableHeaders.map(h => h.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))], // Format headers
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 48, 143], textColor: 255 }, // Primary color for header
        margin: { top: yPos + sectionSpacing }, // This might be redundant if startY is already accounting for it
        didDrawPage: (data: any) => {
             // yPos = data.cursor.y + sectionSpacing; // autoTable manages yPos internally on new pages
        },
        willDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.dataKey === (tableHeaders.length -1) ) { // Assuming last column is 'Details' or similar
                if (typeof data.cell.raw === 'string' && data.cell.raw.toLowerCase().includes("out of date")) {
                    doc.setTextColor(255,0,0); // Red for out of date
                } else if (typeof data.cell.raw === 'string' && data.cell.raw.toLowerCase().includes("missing")) {
                     doc.setTextColor(200,100,0); // Orange for missing
                }
            }
        },
        didDrawCell: (data: any) => {
            doc.setTextColor(0,0,0); // Reset text color
        }
    });
    
    addPageNumbers(doc, footerHeight, margin);
    let filename = `report_${selectedSquadron.replace(/\s+/g, '_')}.pdf`;
     if (selectedReportType === "oicLevelByUnit") {
      filename = `oic_level_report_${selectedSquadron.replace(/\s+/g, '_')}.pdf`;
    } else if (selectedReportType === "specificComplianceByUnit" && selectedComplianceItemKey) {
      const complianceItem = COMPLIANCE_CRITERIA_CONFIG.find(c => c.key === selectedComplianceItemKey);
      const itemName = complianceItem ? complianceItem.name.replace(/\s+/g, '_') : "compliance_item";
      filename = `${itemName}_report_${selectedSquadron.replace(/\s+/g, '_')}.pdf`;
    }
    doc.save(filename);
  };


  const isLoadingAny = isLoadingStaff || isLoadingLogs || isGeneratingReport;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileSearch className="h-8 w-8 text-primary hidden sm:block" />
            <div>
              <CardTitle className="text-2xl">Generate Reports</CardTitle>
              <CardDescription>Select parameters to generate and view custom reports.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1">
              <label htmlFor="squadron-select" className="text-sm font-medium">Squadron</label>
              <Select onValueChange={setSelectedSquadron} value={selectedSquadron || ""} disabled={isLoadingAny}>
                <SelectTrigger id="squadron-select" aria-label="Select Squadron">
                  <SelectValue placeholder="Select Squadron" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSquadrons.map(sqn => <SelectItem key={sqn} value={sqn}>{sqn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label htmlFor="report-type-select" className="text-sm font-medium">Report Type</label>
              <Select onValueChange={(value) => setSelectedReportType(value as ReportType)} value={selectedReportType || ""} disabled={isLoadingAny}>
                <SelectTrigger id="report-type-select" aria-label="Select Report Type">
                  <SelectValue placeholder="Select Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oicLevelByUnit">OIC Level by Unit</SelectItem>
                  <SelectItem value="specificComplianceByUnit">Specific Compliance Item by Unit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedReportType === "specificComplianceByUnit" && (
              <div className="space-y-1">
                <label htmlFor="compliance-item-select" className="text-sm font-medium">Compliance Item</label>
                <Select onValueChange={setSelectedComplianceItemKey} value={selectedComplianceItemKey || ""} disabled={isLoadingAny}>
                  <SelectTrigger id="compliance-item-select" aria-label="Select Compliance Item">
                    <SelectValue placeholder="Select Compliance Item" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLIANCE_CRITERIA_CONFIG.map(item => <SelectItem key={item.key} value={item.key}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button onClick={handleRunReport} disabled={isLoadingAny || !selectedSquadron || !selectedReportType || (selectedReportType === 'specificComplianceByUnit' && !selectedComplianceItemKey)} className="mt-4 w-full md:w-auto">
            {isGeneratingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
            Run Report
          </Button>
        </CardContent>
      </Card>

      {isLoadingStaff && <div className="text-center p-4"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /> <p>Loading staff data...</p></div>}
      {errorStaff && <div className="text-red-600 p-4 text-center">Error loading staff: {errorStaff.message}</div>}
      {isLoadingLogs && <div className="text-center p-4"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /> <p>Loading training logs...</p></div>}
      {errorLogs && <div className="text-red-600 p-4 text-center">Error loading training logs: {errorLogs.message}</div>}

      {isGeneratingReport && !isLoadingStaff && !isLoadingLogs && (
          <Card className="mt-6">
              <CardContent className="pt-6 text-center">
                  <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Generating report...</p>
              </CardContent>
          </Card>
      )}

      {reportData && !isGeneratingReport && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Report Results</CardTitle>
            <CardDescription>
              {selectedReportType === "oicLevelByUnit" ? `OIC Levels for ${selectedSquadron}` :
               selectedReportType === "specificComplianceByUnit" && selectedComplianceItemKey ?
               `${COMPLIANCE_CRITERIA_CONFIG.find(c => c.key === selectedComplianceItemKey)?.name || 'Compliance Item'} Status for ${selectedSquadron}` :
               "Generated Report"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.length === 0 ? (
              <p className="text-muted-foreground">No data found for the selected criteria.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Name</TableHead>
                    {selectedReportType === "oicLevelByUnit" && <TableHead>OIC Level</TableHead>}
                    {selectedReportType === "specificComplianceByUnit" && (
                      <>
                        <TableHead>Compliance Item</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Details</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map(item => (
                    <TableRow key={item.staffId}>
                      <TableCell>{item.rank}</TableCell>
                      <TableCell>{item.staffName}</TableCell>
                      {selectedReportType === "oicLevelByUnit" && (
                        <TableCell>{(item as OICLevelReportItem).oicLevel ?? "N/A"}</TableCell>
                      )}
                      {selectedReportType === "specificComplianceByUnit" && (
                        <>
                          <TableCell>{(item as SpecificComplianceReportItem).complianceItemName}</TableCell>
                          <TableCell>
                            {(item as SpecificComplianceReportItem).isMet ? 
                                <Badge variant="default"><CheckCircle2 className="mr-1 h-4 w-4 inline-block"/>Met</Badge> : 
                                <Badge variant="destructive"><XCircle className="mr-1 h-4 w-4 inline-block"/>Not Met</Badge>
                            }
                          </TableCell>
                          <TableCell>{(item as SpecificComplianceReportItem).details}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleExportCsv} disabled={!reportData || reportData.length === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={handleExportPdf} disabled={!reportData || reportData.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
