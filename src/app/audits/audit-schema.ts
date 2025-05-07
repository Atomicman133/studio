
import { z } from 'zod';

export const auditFindingSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().min(1, "Finding description is required."),
  severity: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
  recommendedAction: z.string().optional(),
  assignedTo: z.string().optional().describe("Name or role of person responsible for CAPA."),
  dueDate: z.date().optional(),
  status: z.enum(["Open", "In Progress", "Resolved", "Closed"]).default("Open"),
});

export type AuditFinding = z.infer<typeof auditFindingSchema>;

export const auditSchema = z.object({
  id: z.string().uuid().optional(),
  auditTitle: z.string().min(1, "Audit title is required"),
  auditType: z.string().min(1, "Type of audit is required (e.g., Work Area Inspection, Facility Safety Check)"),
  auditDate: z.date({ required_error: "Date of audit is required" }),
  auditorName: z.string().min(1, "Auditor's name is required"),
  scope: z.string().min(1, "Scope of the audit is required (e.g., Squadron HQ, Flight Line)"),
  summary: z.string().optional().describe("Overall summary of the audit findings."),
  findings: z.array(auditFindingSchema).optional(),
  // checklistTemplateId: z.string().optional(), // For linking to predefined checklists
  // reportPath: z.string().optional(), // For generated report file
});

export type SafetyAudit = z.infer<typeof auditSchema>;
