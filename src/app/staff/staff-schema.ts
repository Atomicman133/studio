
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

export const STAFF_STATUSES = ["Active", "UAL", "Pending Discharge", "Discharged"] as const;

export const serviceHistoryEntrySchema = z.object({
  id: z.string().uuid().optional(), // IDs for these are generated as UUIDs
  type: z.enum(["Rank", "Position"]),
  item: z.string().describe("Abbreviated rank or position title"),
  effectiveDate: z.date({ required_error: "Effective date is required for service history entry" }),
  endDate: z.date().optional().nullable(),
  notes: z.string().optional(),
});
export type ServiceHistoryEntry = z.infer<typeof serviceHistoryEntrySchema>;

export const staffMemberSchema = z.object({
  id: z.string().optional(), // Changed from z.string().uuid().optional()
  serviceNumber: z.string().min(1, "Service number is required"),
  rank: z.enum(RANKS, { required_error: "Rank is required" }),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  phone: z.string().optional(),
  role: z.string().optional(),
  joinDate: z.date().optional().nullable(),
  squadron: z.string().optional(),
  address: z.string().optional(),
  serviceHistory: z.array(serviceHistoryEntrySchema).optional().default([]),
  status: z.enum(STAFF_STATUSES).default("Active").optional(),
});

export type StaffMember = z.infer<typeof staffMemberSchema>;

export const STAFF_QUERY_KEY = 'staff';
