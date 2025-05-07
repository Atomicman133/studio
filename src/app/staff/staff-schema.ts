
import { z } from 'zod';

export const RANKS = [
  "OFFCDT", // Officer Cadet
  "PLTOFF", // Pilot Officer
  "FLGOFF", // Flying Officer
  "FLTLT",  // Flight Lieutenant
  "SQNLDR", // Squadron Leader
] as const;

export const staffMemberSchema = z.object({
  id: z.string().uuid().optional(), // Will be generated on creation
  serviceNumber: z.string().min(1, "Service number is required"),
  rank: z.enum(RANKS, { required_error: "Rank is required" }),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  phone: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  joinDate: z.date().optional(),
});

export type StaffMember = z.infer<typeof staffMemberSchema>;
