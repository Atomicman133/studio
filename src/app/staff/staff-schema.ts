
import { z } from 'zod';

export const RANKS = [
  "CIV",
  "AC(AAFC)",
  "ACW(AAFC)",
  "LAC(AAFC)",
  "LACW(AAFC)",
  "CPL(AAFC)",
  "SGT(AAFC)",
  "FSGT(AAFC)",
  "WOFF(AAFC)",
  "PLTOFF(AAFC)",
  "FLGOFF(AAFC)",
  "FLTLT(AAFC)",
  "SQNLDR(AAFC)",
  "WGCDR(AAFC)",
  "GPCAPT(AAFC)",
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
  squadron: z.string().optional(), // Added for CSV import and direct association
});

export type StaffMember = z.infer<typeof staffMemberSchema>;
