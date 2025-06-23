
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, UserCheck, Loader2, Download, ClipboardList } from "lucide-react";
import { format } from "date-fns";

import type { StaffMember } from "../staff/staff-schema";
import type { TrainingLog } from "../training/training-schema";
import { COMPLIANCE_CRITERIA_CONFIG, type StaffComplianceReport } from "../reporting/reporting-schema";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useStaff } from "@/hooks/useStaffData";
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { addLetterheadAndFooter, addPageNumbers, resetLetterheadCache } from '@/lib/utils';
import { processComplianceReports } from "@/lib/compliance-processing"; // Assuming you'll create this file

const SQUADRON_REGION_MAP: Record<string, string> = {
    '704 Squadron - Madeley': 'North',
    '711 Squadron - Geraldton': 'North',
    '721 Squadron - Madeley': 'North',
    '723 Squadron - Geraldton': 'North',
    '702 Squadron - Cannington': 'South',
    '705 Squadron - Albany': 'South',
    '713 Squadron - Cannington': 'South',
    '714 Squadron - Karrakatta': 'South',
    '701 Squadron - Bullsbrook': 'East',
    '712 Squadron - Guildford': 'East',
    '709 Squadron - Kalgoorlie': 'East',
    '715 Squadron - Guildford': 'East',
    '703 Squadron - Fremantle': 'West',
    '707 Squadron - Mandurah': 'West',
    '708 Squadron - Rockingham': 'West',
    '710 Squadron - Bunbury': 'West',
    '7 Wing - Headquarters': 'Headquarters',
};
const REGIONS = ['North', 'South', 'East', 'West', 'Headquarters'];

async function fetchAllTrainingLogs(): Promise<TrainingLog[]> {
    const collectionRef = collection(db, 'trainingLogs');
    const q = query(collectionRef, orderBy('completionDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            completionDate: (data.completionDate as Timestamp).toDate(),
            serviceNumber: data.serviceNumber || undefined,
        } as TrainingLog;
    });
}

const chartConfig = {
  compliant: { label: "Compliant", color: "hsl(var(--chart-1))" },
  partiallyCompliant: { label: "Partially Compliant", color: "hsl(var(--chart-2))" },
  nonCompliant: { label: "Non-Compliant", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;


export default function RxoRxiPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const { data: staffList = [], isLoading: isLoadingStaff, error: errorStaff } = useStaff();
    const { data: trainingLogs = [], isLoading: isLoadingLogs, error: errorLogs } = useQuery<TrainingLog[], Error>({
        queryKey: ['allTrainingLogsForRxo'],
        queryFn: fetchAllTrainingLogs,
        enabled: !!user && !authLoading,
    });
    
    const [isDetailOpen, setIsDetailOpen] = React.useState(false);
    const [selectedData, setSelectedData] = React.useState<StaffComplianceReport[]>([]);
    const [selectedTitle, setSelectedTitle] = React.useState<string>("");

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.replace("/auth");
        }
    }, [user, authLoading, router]);

    const allProcessedReports = React.useMemo(() => {
        if (staffList.length > 0 && trainingLogs.length > 0) {
            return processComplianceReports(staffList, trainingLogs);
        }
        return [];
    }, [staffList, trainingLogs]);

    const regionalData = React.useMemo(() => {
        const dataByRegion = REGIONS.reduce((acc, region) => {
            acc[region] = { staff: [], reports: [], summary: { compliant: 0, partiallyCompliant: 0, nonCompliant: 0 } };
            return acc;
        }, {} as Record<string, { staff: StaffMember[], reports: StaffComplianceReport[], summary: { compliant: number, partiallyCompliant: number, nonCompliant: number } }>);

        allProcessedReports.forEach(report => {
            const region = SQUADRON_REGION_MAP[report.squadron] || 'Headquarters';
            if (dataByRegion[region]) {
                dataByRegion[region].reports.push(report);
            }
        });
        
        for (const region in dataByRegion) {
            dataByRegion[region].summary.compliant = dataByRegion[region].reports.filter(r => r.complianceStatusText === "Compliant").length;
            dataByRegion[region].summary.partiallyCompliant = dataByRegion[region].reports.filter(r => r.complianceStatusText === "Partially Compliant").length;
            dataByRegion[region].summary.nonCompliant = dataByRegion[region].reports.filter(r => r.complianceStatusText === "Not Compliant").length;
        }

        return dataByRegion;
    }, [allProcessedReports]);

    const handlePieSegmentClick = (region: string, statusText: StaffComplianceReport["complianceStatusText"]) => {
        const filteredData = regionalData[region].reports.filter(report => report.complianceStatusText === statusText);
        setSelectedData(filteredData);
        setSelectedTitle(`${region} - ${statusText} Staff (${filteredData.length})`);
        setIsDetailOpen(true);
    };

    const handleExportPdf = async () => {
        if (selectedData.length === 0) return;
        const { default: jsPDF } = await import('jspdf');
        await import('jspdf-autotable'); 

        const doc = new jsPDF();
        resetLetterheadCache();
        const filename = `${selectedTitle.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
        const margin = 15;
        let yPos = margin;
        const sectionSpacing = 10;
        let headerHeight = 0, footerHeight = 0;
        const pageWidth = doc.internal.pageSize.getWidth();

        const { headerHeight: hh, footerHeight: fh } = await addLetterheadAndFooter(doc, "/AAFCLetterhead-Header.png", "/AAFCLetterhead-Footer.png", margin);
        headerHeight = hh;
        footerHeight = fh;
        yPos = margin + headerHeight + 5;

        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(selectedTitle, pageWidth / 2, yPos, { align: 'center' });
        yPos += sectionSpacing;
        
        const tableHeaders = ["Rank", "Name", "Squadron", "Service No."];
        if (selectedData.some(r => r.complianceStatusText !== 'Compliant')) {
            tableHeaders.push("Non-Compliant Items");
        }
        
        const tableBody = selectedData.map(staff => {
            const row = [staff.staffMemberRank, staff.staffMemberName, staff.squadron, staff.staffServiceNumberActual || "N/A"];
            if (tableHeaders.includes("Non-Compliant Items")) {
                row.push(staff.criteriaChecks.filter(c => !c.isMet).map(c => c.name).join(", ") || "None");
            }
            return row;
        });

        (doc as any).autoTable({
            startY: yPos,
            head: [tableHeaders],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [0, 48, 143] },
        });

        addPageNumbers(doc, footerHeight, margin);
        doc.save(filename);
    };
    
    if (authLoading || isLoadingStaff || isLoadingLogs) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Loading Regional Data...</p>
            </div>
        );
    }
    
     if (errorStaff || errorLogs) {
        return (
            <Card className="border-destructive">
                <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle /> Error</CardTitle></CardHeader>
                <CardContent>
                    <p>Failed to load necessary data for the dashboard.</p>
                    {errorStaff && <p className="text-xs mt-2">Staff Error: {errorStaff.message}</p>}
                    {errorLogs && <p className="text-xs mt-2">Training Log Error: {errorLogs.message}</p>}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <ClipboardList className="h-8 w-8 text-primary hidden sm:block" />
                        <div>
                            <CardTitle className="text-2xl">RXO / RXI Dashboard</CardTitle>
                            <CardDescription>Regional overview of staff compliance metrics.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {REGIONS.map(region => {
                    const data = regionalData[region];
                    const totalStaff = data.reports.length;
                    const pieData = [
                        { name: 'Compliant', value: data.summary.compliant, fill: chartConfig.compliant.color, statusText: 'Compliant' as const },
                        { name: 'Partially Compliant', value: data.summary.partiallyCompliant, fill: chartConfig.partiallyCompliant.color, statusText: 'Partially Compliant' as const },
                        { name: 'Non-Compliant', value: data.summary.nonCompliant, fill: chartConfig.nonCompliant.color, statusText: 'Not Compliant' as const },
                    ].filter(item => item.value > 0);

                    return (
                        <Card key={region} className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-xl">{region} Region</CardTitle>
                                <CardDescription>{totalStaff} Staff Member(s)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {totalStaff > 0 ? (
                                    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                                <Pie
                                                    data={pieData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    strokeWidth={2}
                                                    onClick={(segmentData) => handlePieSegmentClick(region, segmentData.statusText)}
                                                >
                                                    {pieData.map((entry) => (
                                                        <Cell key={entry.name} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Legend content={<ChartTooltipContent nameKey="name" hideIndicator />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                                        <UserCheck className="h-10 w-10 mb-2" />
                                        <p>No staff assigned to this region.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{selectedTitle}</DialogTitle>
                        <DialogDescription>List of staff members in the selected category.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Squadron</TableHead>
                                    <TableHead>Service No.</TableHead>
                                    {selectedData.some(r => r.complianceStatusText !== 'Compliant') && (
                                        <TableHead>Non-Compliant Items</TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedData.map((staff) => (
                                    <TableRow key={staff.staffMemberId}>
                                        <TableCell>{staff.staffMemberRank}</TableCell>
                                        <TableCell>{staff.staffMemberName}</TableCell>
                                        <TableCell>{staff.squadron}</TableCell>
                                        <TableCell>{staff.staffServiceNumberActual || "N/A"}</TableCell>
                                        {selectedData.some(r => r.complianceStatusText !== 'Compliant') && (
                                            <TableCell>{staff.criteriaChecks.filter(c => !c.isMet).map(c => c.name).join(", ") || "None"}</TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
                        <Button onClick={handleExportPdf} disabled={selectedData.length === 0}>
                            <Download className="mr-2 h-4 w-4" /> Download as PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
