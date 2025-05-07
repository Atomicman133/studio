
import { z } from 'zod';

export const meetingSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  date: z.date({ required_error: "Meeting date is required" }),
  attendees: z.string().min(1, "Attendees list is required (e.g., comma-separated names)"),
  agenda: z.string().min(1, "Agenda is required"),
  discussionPoints: z.string().optional().describe("Key topics discussed during the meeting."),
  decisionsMade: z.string().optional().describe("Decisions or outcomes of the meeting."),
  actionItemsText: z.string().optional().describe("List action items, assignees, and due dates."),
});

export type Meeting = z.infer<typeof meetingSchema>;
