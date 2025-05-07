
import { z } from 'zod';

export const complianceItemSchema = z.object({
  id: z.string().uuid().optional(),
  staffName: z.string().min(1, "Staff member's name is required"), // Simplified
  itemName: z.string().min(1, "Compliance item name is required (e.g., First Aid Certificate)"),
  expiryDate: z.date().optional(),
  status: z.enum(["Compliant", "Expiring Soon", "Expired", "Not Applicable"]).default("Compliant"),
  // evidencePath: z.string().optional(), // For file uploads
  notes: z.string().optional(),
});

export type ComplianceItem = z.infer<typeof complianceItemSchema>;
