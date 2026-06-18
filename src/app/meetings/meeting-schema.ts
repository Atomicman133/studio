import { z } from 'zod';

export const actionItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Description is required"),
  assignee: z.string().min(1, "Assignee is required"),
  dueDate: z.date().optional().nullable(),
  carriedForward: z.boolean().default(false),
});
export type ActionItem = z.infer<typeof actionItemSchema>;

export const agendaItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Agenda item description is required"),
  submitterName: z.string().min(1, "Submitter name is required"),
  notes: z.string().optional(),
  actionItems: z.array(actionItemSchema).default([]),
});
export type AgendaItem = z.infer<typeof agendaItemSchema>;

export const meetingInviteeSchema = z.object({
  staffId: z.string().optional(), // If they are a registered staff member
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").min(1, "Email is required"),
});
export type MeetingInvitee = z.infer<typeof meetingInviteeSchema>;

export const MEETING_STATUSES = ["Draft", "Agenda Finalised", "Completed"] as const;

export const meetingSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Meeting title is required"),
  dateTime: z.date({ required_error: "Meeting date and time are required" }),
  location: z.string().optional(),
  status: z.enum(MEETING_STATUSES).default("Draft"),
  creatorId: z.string().optional(), // UID of the user who created the meeting
  invitees: z.array(meetingInviteeSchema).default([]),
  agendaItems: z.array(agendaItemSchema).default([]),
  attendeesPresentEmails: z.array(z.string()).default([]), // Emails of invitees who attended
  adhocAttendees: z.array(z.string()).default([]), // Names of adhoc attendees
  otherBusinessNotes: z.string().optional(),
  minutesCompiled: z.boolean().default(false),
});

export type Meeting = z.infer<typeof meetingSchema>;

// Form schemas
export const createMeetingFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  meetingDate: z.date({ required_error: "Date is required" }),
  meetingTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
  location: z.string().optional(),
  invitees: z.array(meetingInviteeSchema).min(1, "At least one invitee is required"),
});
export type CreateMeetingFormData = z.infer<typeof createMeetingFormSchema>;
