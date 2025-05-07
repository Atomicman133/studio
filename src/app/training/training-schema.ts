
import { z } from 'zod';

export const trainingLogSchema = z.object({
  id: z.string().uuid().optional(),
  staffName: z.string().min(1, "Staff member's name is required"), // Simplified from staffMemberId for now
  courseName: z.string().min(1, "Course name is required"),
  completionDate: z.date({ required_error: "Completion date is required" }),
  qualificationAchieved: z.string().optional().describe("e.g., Certificate IV in Training and Assessment"),
  instructorQualification: z.string().optional().describe("e.g., Qualified Gliding Instructor"),
  achievementDetails: z.string().optional().describe("Details of any awards or significant recognitions."),
  // certificatePath: z.string().optional(), // For file uploads, to be handled later
});

export type TrainingLog = z.infer<typeof trainingLogSchema>;
