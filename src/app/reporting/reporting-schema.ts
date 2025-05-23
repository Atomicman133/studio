
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
  staffMemberId: string; 
  staffMemberName: string; 
  staffMemberRank: string;
  isCompliant: boolean;
  criteriaChecks: ComplianceCriterionCheck[];
  squadron: string; 
  email?: string | null; // Add email to facilitate emailing
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
    yearsToExpire: 3,
    identifier: (log: TrainingLog) =>
      matchesKeywords(log.courseName, ['first aid', 'hltaid']) || matchesKeywords(log.qualificationAchieved, ['first aid', 'hltaid'])
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
    name: 'Code of Conduct & Behavioural Policy Acceptance',
    yearsToExpire: undefined,
    identifier: (log: TrainingLog) =>
       matchesKeywords(log.courseName, ['code of conduct', 'behavioural policy acceptance', 'coc']) || matchesKeywords(log.qualificationAchieved, ['code of conduct', 'behavioural policy acceptance', 'coc'])
  },
  {
    key: 'psychAssessment',
    name: 'Psychological Assessment',
    yearsToExpire: undefined, 
    identifier: (log: TrainingLog) =>
       matchesKeywords(log.courseName, ['psychological assessment', 'psych assessment', 'psychological test - completed']) || matchesKeywords(log.qualificationAchieved, ['psychological assessment', 'psych assessment', 'psychological test - completed'])
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
    name: 'Defence Youth Safety Annual Awareness Training',
    yearsToExpire: 1,
    identifier: (log: TrainingLog) =>
      matchesKeywords(log.courseName, [
        'defence youth safety', 
        'dysat', 
        'youth mental health - awareness - completed', 
        'defence youth protection awareness course - completed online', 
        'defence youth safety level 3 - leader - completed online'
      ]) || matchesKeywords(log.qualificationAchieved, [
        'defence youth safety', 
        'dysat',
        'youth mental health - awareness - completed', 
        'defence youth protection awareness course - completed online', 
        'defence youth safety level 3 - leader - completed online'
      ])
  },
] as const;

export type ComplianceCriterionKey = typeof COMPLIANCE_CRITERIA_CONFIG[number]['key'];
