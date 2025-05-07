
import type { StaffMember } from "@/app/staff/staff-schema";
import type { TrainingLog } from "@/app/training/training-schema";

export interface ComplianceCriterionCheck {
  key: string;
  name: string;
  isMet: boolean;
  details: string; // e.g., "Completed on Jan 1, 2023", "Expires on Jan 1, 2026", "Missing"
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

// Configuration for compliance criteria
// The 'identifier' function checks if a given TrainingLog matches the criterion.
// 'yearsToExpire' is used for items that have an expiry based on completionDate.
export const COMPLIANCE_CRITERIA_CONFIG = [
  {
    key: 'firstAid',
    name: 'First Aid Certificate',
    yearsToExpire: 3,
    identifier: (log: TrainingLog) =>
      (log.courseName.toLowerCase().includes('first aid') || (log.qualificationAchieved || '').toLowerCase().includes('hltaid'))
  },
  {
    key: 'wwcc',
    name: 'Working With Children Check',
    // No expiry specified, considered current if a record exists.
    // In a real system, WWCCs have expiry dates that would need to be tracked.
    // For this simplified model, we'll treat it as a one-time check for existence.
    // A more robust system would store the WWCC expiry date separately.
    yearsToExpire: undefined, // Or a very long period if it's considered 'current indefinitely once obtained' in this model
    identifier: (log: TrainingLog) =>
      (log.courseName.toLowerCase().includes('working with children check') || (log.qualificationAchieved || '').toLowerCase().includes('wwcc'))
  },
  {
    key: 'codeOfConduct',
    name: 'Code of Conduct & Behavioural Policy Acceptance',
    yearsToExpire: undefined, // Typically a one-time acceptance or renewed periodically (e.g., annually, not based on completion date)
    identifier: (log: TrainingLog) =>
      log.courseName.toLowerCase().includes('code of conduct') || log.courseName.toLowerCase().includes('behavioural policy acceptance')
  },
  {
    key: 'psychAssessment',
    name: 'Psychological Assessment',
    yearsToExpire: undefined, // Typically a one-time assessment for suitability
    identifier: (log: TrainingLog) =>
      log.courseName.toLowerCase().includes('psychological assessment')
  },
  {
    key: 'policeClearance',
    name: 'National Police Clearance',
    yearsToExpire: 5,
    identifier: (log: TrainingLog) =>
      (log.courseName.toLowerCase().includes('national police clearance') ||
       (log.qualificationAchieved || '').toLowerCase().includes('police check') ||
       (log.qualificationAchieved || '').toLowerCase().includes('npc'))
  },
  {
    key: 'youthSafety',
    name: 'Defence Youth Safety Annual Awareness Training',
    yearsToExpire: 1,
    identifier: (log: TrainingLog) =>
      (log.courseName.toLowerCase().includes('defence youth safety') || log.courseName.toLowerCase().includes('dysat'))
  },
] as const;

export type ComplianceCriterionKey = typeof COMPLIANCE_CRITERIA_CONFIG[number]['key'];

