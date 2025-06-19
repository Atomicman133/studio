
import { z } from 'zod';
import { RANKS } from '@/app/staff/staff-schema'; // Import RANKS
import type { Timestamp } from 'firebase/firestore'; // Import Timestamp

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
  serviceNumber: z.string().optional(), // Added serviceNumber as it's used and expected
});

export type TrainingLog = z.infer<typeof trainingLogSchema>;

// Extended schema for form validation, including the temporary File object
export const trainingLogFormSchema = trainingLogSchema.extend({
  certificateFile: z.instanceof(File).optional()
    .refine(file => !file || file.size <= 5 * 1024 * 1024, `Max file size is 5MB.`)
    .refine(file => !file || ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type), "Only .pdf, .jpg, .png, .webp files are accepted.")
});

export type TrainingLogFormData = z.infer<typeof trainingLogFormSchema>;

export const TRAINING_LOGS_QUERY_KEY = 'trainingLogs';

export const convertLogTimestamps = (data: any): TrainingLog => {
  // Ensure 'Timestamp' is imported from 'firebase/firestore'
  // For a client component or utility that might run client-side:
  const isTimestamp = (value: any): value is Timestamp => 
    value && typeof value.toDate === 'function' && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number';

  let completionDate;
  if (isTimestamp(data.completionDate)) {
    completionDate = data.completionDate.toDate();
  } else if (data.completionDate && typeof data.completionDate === 'string') {
    completionDate = new Date(data.completionDate);
  } else if (data.completionDate instanceof Date) {
    completionDate = data.completionDate;
  } else {
    // Fallback or error handling if date is invalid or missing
    // For now, let's assign a default or throw, depending on strictness.
    // console.warn("Invalid or missing completionDate for log:", data);
    completionDate = new Date(0); // Or handle as an error
  }
  
  return {
    id: data.id || crypto.randomUUID(), // Ensure id if not passed (e.g. from doc.data())
    rank: data.rank,
    staffName: data.staffName,
    squadron: data.squadron,
    currentRole: data.currentRole,
    courseName: data.courseName,
    completionDate: completionDate,
    qualificationAchieved: data.qualificationAchieved,
    instructorQualification: data.instructorQualification,
    achievementDetails: data.achievementDetails,
    certificateFileName: data.certificateFileName,
    certificateDataUrl: data.certificateDataUrl,
    serviceNumber: data.serviceNumber,
  } as TrainingLog; // Add 'as TrainingLog' for type assertion if confident in properties
};
