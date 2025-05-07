
import { z } from 'zod';

export const meetingSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  date: z.date({ required_error: "Meeting date is required" }),
  attendees: z.string().min(1, "Attendees list is required (e.g., comma-separated names)"),
  agendaNotes: z.string().optional().describe("Free-text notes about the agenda."),
  agendaDocumentFileName: z.string().optional(),
  agendaDocumentDataUrl: z.string().optional().describe("Base64 encoded agenda document data with MIME type."),
  discussionPoints: z.string().optional().describe("Key topics discussed during the meeting."),
  decisionsMade: z.string().optional().describe("Decisions or outcomes of the meeting."),
  actionItemsText: z.string().optional().describe("List action items, assignees, and due dates."),
});

export type Meeting = z.infer<typeof meetingSchema>;

// Extended schema for form validation, including the temporary File object for agenda document
export const meetingFormSchema = meetingSchema.extend({
  agendaDocumentFile: z.instanceof(File).optional()
    .refine(file => !file || file.size <= 5 * 1024 * 1024, `Max file size is 5MB.`)
    .refine(file => !file || ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type), "Only PDF, DOC, DOCX, JPG, PNG, WEBP files are accepted.")
});

export type MeetingFormData = z.infer<typeof meetingFormSchema>;
