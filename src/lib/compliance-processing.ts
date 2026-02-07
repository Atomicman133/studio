
import type { StaffMember } from "@/app/staff/staff-schema";
import type { TrainingLog } from "@/app/training/training-schema";
import type { SafetyAudit } from "@/app/audits/audit-schema";
import type { SquadronVisit, VisitActionItem } from "@/app/squadron-visits/squadron-visit-schema";
import { COMPLIANCE_CRITERIA_CONFIG, type StaffComplianceReport, type ComplianceCriterionCheck } from "@/app/reporting/reporting-schema";
import { RANKS } from "@/app/staff/staff-schema";
import { addYears, isBefore, format, differenceInDays, isValid as isValidDate, startOfDay, addDays, isAfter } from "date-fns";

export function processComplianceReports(
  staffList: StaffMember[],
  trainingLogs: TrainingLog[]
): StaffComplianceReport[] {
  console.log("[ComplianceDebug] processComplianceReports called. Staff:", staffList.length, ", Logs:", trainingLogs ? trainingLogs.length : 0);
  if (trainingLogs && trainingLogs.length > 0 && staffList.length > 0) {
     console.log("[ComplianceDebug] Sample training logs received:", trainingLogs.slice(0, 3).map(l => ({name: l.staffName, sn: l.serviceNumber, course: l.courseName, rank: l.rank })));
     if (staffList[0]) {
        console.log("[ComplianceDebug] Sample staff list item:", {name: `${staffList[0].firstName} ${staffList[0].lastName}`, rank: staffList[0].rank, sn: staffList[0].serviceNumber});
     }
  }

  return staffList.map((staff) => {
    const staffServiceNumberActual = staff.serviceNumber;

    if (!staffServiceNumberActual) {
        console.warn(`[ComplianceDebug] Staff member ${staff.firstName} ${staff.lastName} (Rank: ${staff.rank}, ID: ${staff.id || 'NO_ID'}) is missing a service number. Compliance check will be incomplete.`);
    }

    const memberLogs = trainingLogs ? trainingLogs.filter(log => {
      // Primary match on serviceNumber if both exist and are not empty
      if (staff.serviceNumber && staff.serviceNumber.trim() !== "" && log.serviceNumber && log.serviceNumber.trim() !== "") {
        return staff.serviceNumber.trim() === log.serviceNumber.trim();
      }
      // Fallback: if log has no SN, or staff has no SN, try to match by name and rank (case-insensitive)
      if (log.staffName && log.rank) {
        const logNameUpper = log.staffName.toUpperCase().trim();
        const staffFullNameUpper = `${staff.firstName} ${staff.lastName}`.toUpperCase().trim();
        const staffLastNameFirstNameUpper = `${staff.lastName}, ${staff.firstName}`.toUpperCase().trim();
        const nameMatch = logNameUpper === staffFullNameUpper || logNameUpper === staffLastNameFirstNameUpper;
        const rankMatch = log.rank === staff.rank;
        
        if (nameMatch && rankMatch) {
          // console.log(`[ComplianceDebug] Fallback match for ${staff.firstName} ${staff.lastName} with log ${log.id} by name/rank.`);
          return true;
        }
      }
      return false;
    }) : [];

    console.log(`[ComplianceDebug] Processing staff: ${staff.firstName} ${staff.lastName} (SN: ${staffServiceNumberActual || 'None'})`);
    if (staffServiceNumberActual) {
      console.log(`[ComplianceDebug] Found ${memberLogs.length} logs for SN: ${staffServiceNumberActual}.`);
      if (memberLogs.length > 0) {
        // console.log(`[ComplianceDebug] Sample memberLogs for ${staff.firstName} ${staff.lastName}:`, memberLogs.slice(0,1).map(l => ({course: l.courseName, date: l.completionDate, logSN: l.serviceNumber, logName: l.staffName })));
      }
    } else {
      console.log(`[ComplianceDebug] Staff ${staff.firstName} ${staff.lastName} has no SN. Name/Rank matching found ${memberLogs.length} logs.`);
    }


    const criteriaChecks: ComplianceCriterionCheck[] = COMPLIANCE_CRITERIA_CONFIG.map(criterion => {
      // console.log(`[ComplianceDebug]   Checking criterion: "${criterion.name}" for ${staff.firstName} ${staff.lastName}`);
      const relevantLogs = memberLogs
        .filter(log => {
            const isRelevant = criterion.identifier(log);
            return isRelevant;
        })
        .sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime());

      // console.log(`[ComplianceDebug]     Found ${relevantLogs.length} relevant logs for "${criterion.name}".`);

      let isMet = false;
      let details = "Missing";
      let selectedLog: TrainingLog | undefined = undefined;

      if (relevantLogs.length > 0) {
        selectedLog = relevantLogs[0];
        // console.log(`[ComplianceDebug]       Using latest relevant log for "${criterion.name}": ${selectedLog.courseName}, completed: ${selectedLog.completionDate}`);
        const completionDate = startOfDay(new Date(selectedLog.completionDate));

        if (!isValidDate(completionDate)) {
          details = "Invalid completion date in record.";
           // console.log(`[ComplianceDebug]       Invalid completion date for log ID ${selectedLog.id}: ${selectedLog.completionDate}`);
        } else {
          const today = startOfDay(new Date());

          if (criterion.yearsToExpire) {
            const expiryDate = startOfDay(addYears(completionDate, criterion.yearsToExpire));
            isMet = isBefore(today, expiryDate); // Valid if today is *before* the calculated expiry date

            const validUntilDate = format(addDays(expiryDate, -1), 'dd/MM/yy'); // Last full day of validity
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
      } else {
        // console.log(`[ComplianceDebug]       No relevant logs found for "${criterion.name}", marking as Missing.`);
      }
      // console.log(`[ComplianceDebug]     Criterion "${criterion.name}" result: isMet=${isMet}, details="${details}"`);
      return {
        key: criterion.key,
        name: criterion.name,
        isMet,
        details,
        relevantLog: selectedLog,
      };
    });

    const metCount = criteriaChecks.filter(c => c.isMet).length;
    let complianceStatusText: StaffComplianceReport["complianceStatusText"] = "Not Compliant";
    let complianceStatusVariant: StaffComplianceReport["complianceStatusVariant"] = "destructive";

    if (metCount === COMPLIANCE_CRITERIA_CONFIG.length) {
      complianceStatusText = "Compliant";
      complianceStatusVariant = "default";
    }
    // console.log(`[ComplianceDebug] Overall compliance for ${staff.firstName} ${staff.lastName}: ${complianceStatusText}`);

    return {
      staffMemberId: staff.id || `${staff.lastName}, ${staff.firstName}_${staff.rank}_${staffServiceNumberActual || 'NO_SN'}`,
      staffMemberName: `${staff.firstName} ${staff.lastName}`,
      staffMemberRank: staff.rank,
      squadron: staff.squadron || "N/A",
      isCompliant: complianceStatusText === "Compliant",
      criteriaChecks,
      email: staff.email,
      staffServiceNumberActual: staffServiceNumberActual,
      complianceStatusText,
      complianceStatusVariant,
      status: staff.status || "Active",
    };
  })
  .sort((a,b) => {
    const squadronCompare = (a.squadron || "ZZZ").localeCompare(b.squadron || "ZZZ");
    if (squadronCompare !== 0) {
        return squadronCompare;
    }

    const rankOrder = RANKS;
    const rankAIndex = rankOrder.indexOf(a.staffMemberRank as typeof RANKS[number]);
    const rankBIndex = rankOrder.indexOf(b.staffMemberRank as typeof RANKS[number]);

    const effectiveRankAIndex = rankAIndex === -1 ? Infinity : rankAIndex;
    const effectiveRankBIndex = rankBIndex === -1 ? Infinity : rankBIndex;

    if (effectiveRankAIndex !== effectiveRankBIndex) {
        return effectiveRankAIndex - effectiveRankBIndex;
    }

    const lastNameCompare = a.staffMemberName.split(' ').pop()!.localeCompare(b.staffMemberName.split(' ').pop()!);
    if (lastNameCompare !== 0) return lastNameCompare;
    return a.staffMemberName.split(' ')[0].localeCompare(b.staffMemberName.split(' ')[0]);
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
    const today = startOfDay(new Date());
    const thresholdDate = addDays(today, daysThreshold);
    const expiring: ExpiringAccomplishment[] = [];

    const activeStaff = staffList.filter(s => (s.status || 'Active') === 'Active');

    trainingLogs.forEach(log => {
        COMPLIANCE_CRITERIA_CONFIG.forEach(criterion => {
            if (criterion.identifier(log) && criterion.yearsToExpire) {
                const completionDate = startOfDay(new Date(log.completionDate));
                if (!isValidDate(completionDate)) return;
                const expiryDate = startOfDay(addYears(completionDate, criterion.yearsToExpire));
                if (isAfter(expiryDate, today) && isBefore(expiryDate, thresholdDate)) {
                    const staffMember = activeStaff.find(s => s.serviceNumber === log.serviceNumber);
                    if (staffMember) { // Only add if the staff member is active
                      expiring.push({
                          staffName: `${staffMember.firstName} ${staffMember.lastName}`,
                          staffRank: staffMember.rank,
                          squadron: staffMember.squadron || "N/A",
                          courseName: `${criterion.name} (${log.courseName})`,
                          expiryDate: expiryDate,
                          daysLeft: differenceInDays(expiryDate, today)
                      });
                    }
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
    const today = startOfDay(new Date());
    const thresholdDate = addDays(today, daysThreshold);
    const actions: UpcomingActionItem[] = [];

    audits.forEach(audit => {
        audit.findings?.forEach(finding => {
            if (finding.dueDate && (finding.status === "Open" || finding.status === "In Progress")) {
                const dueDate = startOfDay(new Date(finding.dueDate));
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
                const dueDate = startOfDay(new Date(item.dueDate));
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
