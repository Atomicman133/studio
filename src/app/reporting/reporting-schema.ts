
import type { StaffMember } from "@/app/staff/staff-schema";
import type { TrainingLog } from "@/app/training/training-schema";

export interface ComplianceCriterionCheck {
  key: string;
  name: string;
  isMet: boolean;
  details: string; // e.g., "Completed on 01/01/2023", "Out of Date (Completed 01/01/2020)", "Missing"
  relevantLog?: TrainingLog; // The log that satisfied this criterion
}

export interface StaffComplianceReport {
  staffMemberId: string; // Assuming StaffMember has an ID or use generated identifier
  staffMemberName: string; // Full name for display
  staffMemberRank: string;
  isCompliant: boolean;
  criteriaChecks: ComplianceCriterionCheck[];
  squadron: string; // Use squadron from StaffMember profile for consistency
}

// Helper function for flexible keyword matching (case-insensitive)
const matchesKeywords = (text: string | undefined | null, keywords: string[]): boolean => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
};

// Configuration for compliance criteria
// The 'identifier' function checks if a given TrainingLog matches the criterion.
// 'yearsToExpire' is used for items that have an expiry based on completionDate.
export const COMPLIANCE_CRITERIA_CONFIG = [
  {
    key: 'firstAid',
    name: 'First Aid Certificate',
    yearsToExpire: 3, // Check if completionDate is within the last 3 years
    identifier: (log: TrainingLog) =>
      matchesKeywords(log.courseName, ['first aid', 'hltaid']) || matchesKeywords(log.qualificationAchieved, ['first aid', 'hltaid'])
  },
  {
    key: 'wwcc',
    name: 'Working With Children Check',
    // WWCCs *do* expire, but the expiry date isn't typically the completion date + fixed years.
    // For this system, we'll assume a log signifies it's held, but expiry needs external tracking or a dedicated field.
    // We will treat *any* record as meeting the check for now, acknowledging this limitation.
    yearsToExpire: undefined, // Check only for existence
    identifier: (log: TrainingLog) =>
      matchesKeywords(log.courseName, ['working with children', 'wwcc']) || matchesKeywords(log.qualificationAchieved, ['working with children', 'wwcc'])
  },
  {
    key: 'codeOfConduct',
    name: 'Code of Conduct & Behavioural Policy Acceptance',
    yearsToExpire: undefined, // Assume one-time or periodically renewed outside this log system
    identifier: (log: TrainingLog) =>
       matchesKeywords(log.courseName, ['code of conduct', 'behavioural policy acceptance', 'coc']) || matchesKeywords(log.qualificationAchieved, ['code of conduct', 'behavioural policy acceptance', 'coc'])
  },
  {
    key: 'psychAssessment',
    name: 'Psychological Assessment',
    yearsToExpire: undefined, // Assume one-time
    identifier: (log: TrainingLog) =>
       matchesKeywords(log.courseName, ['psychological assessment', 'psych assessment']) || matchesKeywords(log.qualificationAchieved, ['psychological assessment', 'psych assessment'])
  },
  {
    key: 'policeClearance',
    name: 'National Police Clearance',
    yearsToExpire: 5, // Check if completionDate is within the last 5 years
    identifier: (log: TrainingLog) =>
      matchesKeywords(log.courseName, ['national police clearance', 'police check', 'npc']) || matchesKeywords(log.qualificationAchieved, ['national police clearance', 'police check', 'npc'])
  },
  {
    key: 'youthSafety',
    name: 'Defence Youth Safety Annual Awareness Training',
    yearsToExpire: 1, // Check if completionDate is within the last 1 year
    identifier: (log: TrainingLog) =>
      matchesKeywords(log.courseName, ['defence youth safety', 'dysat']) || matchesKeywords(log.qualificationAchieved, ['defence youth safety', 'dysat'])
  },
] as const;

export type ComplianceCriterionKey = typeof COMPLIANCE_CRITERIA_CONFIG[number]['key'];

    