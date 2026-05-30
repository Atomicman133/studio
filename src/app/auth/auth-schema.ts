
import { z } from 'zod';

export const emailPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }).min(1, { message: "Email is required." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export const signUpSchema = emailPasswordSchema.extend({
  confirmPassword: z.string().min(6, { message: "Confirm password must be at least 6 characters." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"], // Path of error
});

export type EmailPasswordFormData = z.infer<typeof emailPasswordSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
