
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


export const recordOfConversationSchema = z.object({
  id: z.string().uuid().optional(),
  referenceNumber: z.string().optional().describe("Reference/CEA Incident Number"),
  interviewingOfficerName: z.string().min(1, "Interviewing officer's name is required"),
  interviewingOfficerPosition: z.string().min(1, "Interviewing officer's position is required"),
  interviewDate: z.date({ required_error: "Date of interview is required" }),
  interviewTime: z.string().min(1, "Time of interview is required (e.g., HH:MM)"),
  interviewType: z.enum(["In Person", "Telephone Conversation"], { required_error: "Interview type is required" }),
  subject: z.string().min(1, "Subject of conversation is required"),
  personsPresent: z.string().optional().describe("List of persons present during the conversation."),
  conversationWithName: z.string().min(1, "Name of person conversation was with is required (including title/rank)."),
  conversationWithDeptUnitFirm: z.string().optional().describe("Department, unit, or firm of the person (including address)."),
  conversationWithSquadron: z.string().optional().describe("Squadron of the person, if applicable."),
  conversationWithTelephone: z.string().optional().describe("Telephone number of the person."),
  background: z.string().min(1, "Background of the conversation is required."),
  conversation: z.string().min(1, "Details of the conversation are required."),
  actionsTaken: z.string().optional().describe("Actions taken or agreed upon."),
  questionsAsked: z.string().optional().describe("Key questions asked during the conversation."),
  followUp: z.string().optional().describe("Follow-up actions or notes."),
});

export type RecordOfConversation = z.infer<typeof recordOfConversationSchema>;
