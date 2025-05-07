
import { z } from 'zod';

export const disciplineActionSchema = z.object({
  id: z.string().uuid().optional(),
  staffName: z.string().min(1, "Staff member's name is required"), // Simplified for now
  dateOfIncident: z.date({ required_error: "Date of incident is required" }),
  typeOfAction: z.enum(["Informal Discussion", "Formal Warning", "Suspension", "Other"], { required_error: "Type of action is required" }),
  incidentDescription: z.string().min(1, "Description of the incident is required"),
  policyBreached: z.string().optional().describe("e.g., AAFC Code of Conduct Section 3.2"),
  supportingDocumentsPaths: z.array(z.string()).optional().describe("Paths to uploaded evidence"), // Placeholder for file uploads
  outcome: z.string().optional(),
  sanctionsApplied: z.string().optional(),
  appealProcessNotes: z.string().optional(),
});

export type DisciplineAction = z.infer<typeof disciplineActionSchema>;
