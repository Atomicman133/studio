
import { z } from 'zod';

export const visitActionItemSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().min(1, "Action item description is required."),
  responsible: z.string().min(1, "Responsible person/role is required."),
  dueDate: z.date().optional(),
  status: z.enum(["Open", "In Progress", "Completed", "Deferred"]).default("Open"),
});
export type VisitActionItem = z.infer<typeof visitActionItemSchema>;

export const squadronVisitSchema = z.object({
  id: z.string().uuid().optional(),
  squadronName: z.string().min(1, "Squadron name is required."),
  visitDate: z.date({ required_error: "Date of visit is required." }),
  rxoName: z.string().min(1, "RXO Name is required."),
  coName: z.string().min(1, "CO Name is required."),

  // Staffing
  staffingListReviewed: z.boolean().default(false).optional(),
  staffingVacanciesDiscussed: z.boolean().default(false).optional(),
  staffingSuccessionPlanningNotes: z.string().optional().describe("Notes on succession planning."),
  staffingInductionVerified: z.boolean().default(false).optional(),
  staffingPerformanceIssuesAddressed: z.boolean().default(false).optional(),
  staffingWellbeingCheckConducted: z.boolean().default(false).optional(),
  staffingSectionNotes: z.string().optional().describe("Overall notes for Staffing section."),

  // Training / Personal Development
  trainingScheduleCurrent: z.boolean().default(false).optional(),
  trainingStaffCurrencyMaintained: z.boolean().default(false).optional(),
  trainingCadetPdpReviewed: z.boolean().default(false).optional(),
  trainingCourseParticipationConfirmed: z.boolean().default(false).optional(),
  trainingRecordsUpToDate: z.boolean().default(false).optional(),
  trainingSectionNotes: z.string().optional().describe("Overall notes for Training section."),

  // Disciplinary Issues
  disciplineMattersDiscussed: z.boolean().default(false).optional(),
  disciplineProceduresFollowed: z.boolean().default(false).optional(),
  disciplineSupportProvided: z.boolean().default(false).optional(),
  disciplineRecordKeepingObserved: z.boolean().default(false).optional(),
  disciplineSectionNotes: z.string().optional().describe("Overall notes for Disciplinary Issues section."),

  // Upcoming Activities
  activitiesCalendarReviewed: z.boolean().default(false).optional(),
  activitiesExternalApprovalsFlagged: z.boolean().default(false).optional(),
  activitiesPlannedEventsNoted: z.boolean().default(false).optional(),
  activitiesContingencyPlanningChecked: z.boolean().default(false).optional(),
  activitiesEngagementEvaluated: z.boolean().default(false).optional(),
  activitiesSectionNotes: z.string().optional().describe("Overall notes for Upcoming Activities section."),

  // Known Issues
  issuesEquipmentShortages: z.boolean().default(false).optional(),
  issuesFacilityConcerns: z.boolean().default(false).optional(),
  issuesItAdminSupplyProblems: z.boolean().default(false).optional(),
  issuesUnresolvedSupportRequests: z.boolean().default(false).optional(),
  issuesEscalationRequestsNoted: z.boolean().default(false).optional(),
  issuesSectionNotes: z.string().optional().describe("Overall notes for Known Issues section."),

  // Safety
  safetyRiskRegisterReviewed: z.boolean().default(false).optional(),
  safetyIssuesAddressed: z.boolean().default(false).optional(),
  safetyIncidentReportsChecked: z.boolean().default(false).optional(),
  safetyFirstAidPpeEmergencyProcedures: z.boolean().default(false).optional(),
  safetyVehicleEquipmentCompliance: z.boolean().default(false).optional(),
  safetySectionNotes: z.string().optional().describe("Overall notes for Safety section."),

  generalComments: z.string().optional(),
  actionItems: z.array(visitActionItemSchema).optional(),
});

export type SquadronVisit = z.infer<typeof squadronVisitSchema>;
