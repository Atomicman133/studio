
import { z } from 'zod';
import { RANKS } from '@/app/staff/staff-schema'; // Import RANKS

export const trainingLogSchema = z.object({
  id: z.string().uuid().optional(),
  rank: z.enum(RANKS, { required_error: "Rank is required" }),
  staffName: z.string().min(1, "Staff member's name is required"),
  squadron: z.string().min(1, "Squadron is required"),
  currentRole: z.string().min(1, "Current role is required"),
  courseName: z.string().min(1, "Course name is required"),
  completionDate: z.date({ required_error: "Completion date is required" }),
  qualificationAchieved: z.string().optional().describe("e.g., Certificate IV in Training and Assessment"),
  instructorQualification: z.string().optional().describe("e.g., Qualified Gliding Instructor"),
  achievementDetails: z.string().optional().describe("Details of any awards or significant recognitions."),
  certificateFileName: z.string().optional(),
  certificateDataUrl: z.string().optional().describe("Base64 encoded file data with MIME type."),
});

export type TrainingLog = z.infer<typeof trainingLogSchema>;

// Extended schema for form validation, including the temporary File object
export const trainingLogFormSchema = trainingLogSchema.extend({
  certificateFile: z.instanceof(File).optional()
    .refine(file => !file || file.size <= 5 * 1024 * 1024, `Max file size is 5MB.`)
    .refine(file => !file || ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type), "Only .pdf, .jpg, .png, .webp files are accepted.")
});

export type TrainingLogFormData = z.infer<typeof trainingLogFormSchema>;
