
import type { StaffMember } from "@/app/staff/staff-schema";
import type { TrainingLog } from "@/app/training/training-schema";
import type { SafetyAudit } from "@/app/audits/audit-schema";
import type { SquadronVisit, VisitActionItem } from "@/app/squadron-visits/squadron-visit-schema";
import { COMPLIANCE_CRITERIA_CONFIG, type StaffComplianceReport, type ComplianceCriterionCheck } from "@/app/reporting/reporting-schema";
import { addYears, isBefore, format, differenceInDays, isValid as isValidDate, startOfDay, addDays, isAfter } from "date-fns";

export function processComplianceReports(
  staffList: StaffMember[],
  trainingLogs: TrainingLog[]
): StaffComplianceReport[] {
  return staffList.map((staff) => {
    const memberLogs = trainingLogs.filter(log =>
        log.serviceNumber && staff.serviceNumber && log.serviceNumber === staff.serviceNumber
    );

    const criteriaChecks: ComplianceCriterionCheck[] = COMPLIANCE_CRITERIA_CONFIG.map(criterion => {
      const relevantLogs = memberLogs
        .filter(log => criterion.identifier(log))
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
            const validUntilDate = format(addDays(expiryDate, -1), 'dd/MM/yy');
            const expiredOnDateText = format(expiryDate, 'dd/MM/yy');
            if (isMet) {
              details = `Completed: ${format(completionDate, 'dd/MM/yy')}. Valid until: ${validUntilDate}.`;
            } else {
              details = `Out of Date. Last completed: ${format(completionDate, 'dd/MM/yy')}. Expired on: ${expiredOnDateText}.`;
            }
          } else {
            isMet = true;
            details = `Completed: ${format(completionDate, 'dd/MM/yy')}`;
          }
        }
      }
      return { key: criterion.key, name: criterion.name, isMet, details, relevantLog: selectedLog };
    });
    
    const metCount = criteriaChecks.filter(c => c.isMet).length;
    let complianceStatusText: StaffComplianceReport["complianceStatusText"] = "Not Compliant";
    if (metCount === COMPLIANCE_CRITERIA_CONFIG.length) {
      complianceStatusText = "Compliant";
    } else if (metCount >= 3) {
      complianceStatusText = "Partially Compliant";
    }

    return {
      staffMemberId: staff.id || `${staff.lastName}, ${staff.firstName}_${staff.rank}_${staff.serviceNumber || 'NO_SN'}`,
      staffMemberName: `${staff.firstName} ${staff.lastName}`,
      staffMemberRank: staff.rank,
      squadron: staff.squadron || "N/A",
      isCompliant: complianceStatusText === "Compliant",
      criteriaChecks,
      email: staff.email,
      staffServiceNumberActual: staff.serviceNumber,
      complianceStatusText,
      complianceStatusVariant:
        complianceStatusText === "Compliant" ? "default" :
        complianceStatusText === "Partially Compliant" ? "secondary" : "destructive",
    };
  });
};

interface ExpiringAccomplishment {
  staffName: string;
  staffRank: string;
  courseName: string;
  squadron: string;
  expiryDate: Date;
  daysLeft: number;
}

export function getExpiringAccomplishments(
    staffList: StaffMember[],
    trainingLogs: TrainingLog[],
    daysThreshold: number
): ExpiringAccomplishment[] {
    const today = new Date();
    const thresholdDate = addDays(today, daysThreshold);
    const expiring: ExpiringAccomplishment[] = [];

    trainingLogs.forEach(log => {
        COMPLIANCE_CRITERIA_CONFIG.forEach(criterion => {
            if (criterion.identifier(log) && criterion.yearsToExpire) {
                const completionDate = new Date(log.completionDate);
                if (!isValidDate(completionDate)) return;
                const expiryDate = addYears(completionDate, criterion.yearsToExpire);
                if (isAfter(expiryDate, today) && isBefore(expiryDate, thresholdDate)) {
                    const staffMember = staffList.find(s => s.serviceNumber === log.serviceNumber);
                    expiring.push({
                        staffName: staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : log.staffName,
                        staffRank: staffMember ? staffMember.rank : log.rank,
                        squadron: staffMember ? staffMember.squadron || "N/A" : log.squadron,
                        courseName: `${criterion.name} (${log.courseName})`,
                        expiryDate: expiryDate,
                        daysLeft: differenceInDays(expiryDate, today)
                    });
                }
            }
        });
    });
    return expiring.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
}

interface UpcomingActionItem {
  id: string;
  description: string;
  responsible: string;
  dueDate: Date;
  source: string;
  sourceId: string;
  daysLeft: number;
}

export function getUpcomingActionItems(
    audits: SafetyAudit[],
    visits: SquadronVisit[],
    daysThreshold: number
): UpcomingActionItem[] {
    const today = new Date();
    const thresholdDate = addDays(today, daysThreshold);
    const actions: UpcomingActionItem[] = [];

    audits.forEach(audit => {
        audit.findings?.forEach(finding => {
            if (finding.dueDate && (finding.status === "Open" || finding.status === "In Progress")) {
                const dueDate = new Date(finding.dueDate);
                if (isValidDate(dueDate) && isAfter(dueDate, today) && isBefore(dueDate, thresholdDate)) {
                    actions.push({
                        id: finding.id || crypto.randomUUID(),
                        description: finding.description,
                        responsible: finding.assignedTo || "Unassigned",
                        dueDate: dueDate,
                        source: `Audit: ${audit.auditTitle}`,
                        sourceId: audit.id || crypto.randomUUID(),
                        daysLeft: differenceInDays(dueDate, today)
                    });
                }
            }
        });
    });

    visits.forEach(visit => {
        visit.actionItems?.forEach(item => {
            if (item.dueDate && (item.status === "Open" || item.status === "In Progress")) {
                const dueDate = new Date(item.dueDate);
                if (isValidDate(dueDate) && isAfter(dueDate, today) && isBefore(dueDate, thresholdDate)) {
                    actions.push({
                        id: item.id || crypto.randomUUID(),
                        description: item.description,
                        responsible: item.responsible,
                        dueDate: dueDate,
                        source: `Visit: ${visit.squadronName}`,
                        sourceId: visit.id || crypto.randomUUID(),
                        daysLeft: differenceInDays(dueDate, today)
                    });
                }
            }
        });
    });
    return actions.sort((a,b) => a.daysLeft - b.daysLeft).slice(0, 5);
}
