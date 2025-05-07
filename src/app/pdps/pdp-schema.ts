
import { z } from 'zod';

export const SMARTGoalSchema = z.object({
  id: z.string().uuid().optional(),
  specific: z.string().min(1, "Goal must be specific."),
  measurable: z.string().min(1, "How will progress be measured?"),
  achievable: z.string().min(1, "Is the goal achievable?"),
  relevant: z.string().min(1, "How is the goal relevant?"),
  timeBound: z.string().min(1, "What is the timeframe? e.g., By end of Q3"),
  status: z.enum(["Not Started", "In Progress", "Completed", "On Hold"]).default("Not Started"),
});

export type SMARTGoal = z.infer<typeof SMARTGoalSchema>;

export const pdpSchema = z.object({
  id: z.string().uuid().optional(),
  staffName: z.string().min(1, "Staff member's name is required"), // Simplified
  pdpPeriod: z.string().min(1, "PDP period is required (e.g., 2024-2025)"),
  goals: z.array(SMARTGoalSchema).min(1, "At least one SMART goal is required."),
  developmentActivities: z.string().optional().describe("e.g., Courses, Mentorship"),
  reviewDate: z.date().optional(),
  feedback: z.string().optional(),
});

export type Pdp = z.infer<typeof pdpSchema>;
