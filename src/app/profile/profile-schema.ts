
import { z } from 'zod';

export const profileUpdateSchema = z.object({
  displayName: z.string().min(1, "Display name is required.").max(50, "Display name is too long."),
  photoURL: z.string().url("Please enter a valid URL for your photo.").or(z.literal("")).optional(),
});

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
