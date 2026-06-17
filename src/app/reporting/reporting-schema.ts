
import type { StaffMember, STAFF_STATUSES } from "@/app/staff/staff-schema";
import type { TrainingLog } from "@/app/training/training-schema";

export interface ComplianceCriterionCheck {
  key: string;
  name: string;
  isMet: boolean;
  details: string; // e.g., "Completed on 01/01/2023", "Out of Date (Completed 01/01/2020)", "Missing"
  relevantLog?: TrainingLog; // The log that satisfied this criterion
}

export interface StaffComplianceReport {
  staffMemberId: string;
  staffMemberName: string;
  staffMemberRank: string;
  isCompliant: boolean; // True if all non-advisory criteria are met
  criteriaChecks: ComplianceCriterionCheck[];
  squadron: string;
  email?: string | null;
  staffServiceNumberActual?: string; // Explicit field for the staff member's actual service number
  complianceStatusText: "Compliant" | "Not Compliant";
  complianceStatusVariant: "default" | "destructive";
  status: typeof STAFF_STATUSES[number];
}

// Helper function for flexible keyword matching (case-insensitive)
const matchesKeywords = (text: string | undefined | null, keywords: string[]): boolean => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
};

type ComplianceCriterionConfigItem = {
    key: string;
    name: string;
    yearsToExpire?: number;
    isAdvisory?: boolean; // New property to mark non-blocking compliance checks
    identifier: (log: TrainingLog, staff: StaffMember) => boolean;
};

// Configuration for compliance criteria
export const COMPLIANCE_CRITERIA_CONFIG: readonly ComplianceCriterionConfigItem[] = [
  {
    key: 'firstAid',
    name: 'First Aid Certificate',
    yearsToExpire: 3,
    identifier: (log: TrainingLog) =>
      matchesKeywords(log.courseName, ['first aid', 'hltaid']) || matchesKeywords(log.qualificationAchieved, ['first aid', 'hltaid'])
  },
  {
    key: 'cpr',
    name: 'Provide Cardiopulmonary Resuscitation',
    yearsToExpire: 1,
    isAdvisory: true,
    identifier: (log: TrainingLog) =>
      matchesKeywords(log.courseName, ['Cardiopulmonary Resuscitation', 'cpr', 'hltaid009']) || matchesKeywords(log.qualificationAchieved, ['Cardiopulmonary Resuscitation', 'cpr', 'hltaid009'])
  },
  {
    key: 'wwcc',
    name: 'Working With Children Check',
    yearsToExpire: 3,
    identifier: (log: TrainingLog) =>
      matchesKeywords(log.courseName, ['working with children', 'wwcc', 'Working With Children - WA - Certified']) || matchesKeywords(log.qualificationAchieved, ['working with children', 'wwcc', 'Working With Children - WA - Certified'])
  },
  {
    key: 'codeOfConduct',
    name: 'Code of Conduct - Signed',
    yearsToExpire: 3,
    isAdvisory: true,
    identifier: (log: TrainingLog) =>
       matchesKeywords(log.courseName, ['code of conduct', 'coc']) || matchesKeywords(log.qualificationAchieved, ['code of conduct', 'coc'])
  },
  {
    key: 'adultBehaviourPolicy',
    name: 'Adult Behaviour Policy Training',
    yearsToExpire: 1,
    isAdvisory: true,
    identifier: (log: TrainingLog) =>
       matchesKeywords(log.courseName, ['Adult Behaviour Policy Training']) || matchesKeywords(log.qualificationAchieved, ['Adult Behaviour Policy Training'])
  },
  {
    key: 'policeClearance',
    name: 'National Police Clearance',
    yearsToExpire: 5,
    identifier: (log: TrainingLog) =>
      matchesKeywords(log.courseName, ['national police clearance', 'police check', 'npc']) || matchesKeywords(log.qualificationAchieved, ['national police clearance', 'police check', 'npc'])
  },
  {
    key: 'youthSafety',
    name: 'Defence Youth Protection',
    yearsToExpire: 3,
    identifier: (log: TrainingLog, staff: StaffMember) => {
        const youthProtectionKeywords = ["Defence Youth Protection Officers and Instructors"];
        if (staff.rank === 'CIV') {
            youthProtectionKeywords.push("Defence Youth Protection Awareness Course");
        }
        return matchesKeywords(log.courseName, youthProtectionKeywords) || matchesKeywords(log.qualificationAchieved, youthProtectionKeywords);
    }
  },
] as const;

export type ComplianceCriterionKey = typeof COMPLIANCE_CRITERIA_CONFIG[number]['key'];
