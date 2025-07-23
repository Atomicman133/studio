'use server';
/**
 * @fileOverview An AI flow to classify attendance records.
 *
 * - classifyAttendanceStatus - A function that classifies attendance text.
 * - AttendanceStatusInput - The input type for the classifyAttendanceStatus function.
 * - AttendanceStatusOutput - The return type for the classifyAttendanceStatus function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const AttendanceStatusInputSchema = z.string();
export type AttendanceStatusInput = z.infer<typeof AttendanceStatusInputSchema>;

export const AttendanceStatusOutputSchema = z.object({
  status: z
    .enum(['Leave', 'Sick', 'Absent'])
    .describe(
      'The classified status of the attendance record. "Leave" for approved leave (e.g., holiday, appointment). "Sick" for medical reasons. "Absent" for unexplained absences or "no show".'
    ),
});
export type AttendanceStatusOutput = z.infer<typeof AttendanceStatusOutputSchema>;

export async function classifyAttendanceStatus(
  input: AttendanceStatusInput
): Promise<AttendanceStatusOutput> {
  return classifyAttendanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'classifyAttendancePrompt',
  input: { schema: AttendanceStatusInputSchema },
  output: { schema: AttendanceStatusOutputSchema },
  prompt: `You are an expert administrative assistant. Your task is to classify an attendance record based on the provided text.
  The possible classifications are "Leave", "Sick", or "Absent".

  - Use "Leave" for planned absences like holidays, appointments, or other approved reasons.
  - Use "Sick" for medical-related absences.
  - Use "Absent" for unexplained absences, "no show", or unapproved time off.

  Classify the following attendance reason: {{{prompt}}}`,
});

const classifyAttendanceFlow = ai.defineFlow(
  {
    name: 'classifyAttendanceFlow',
    inputSchema: AttendanceStatusInputSchema,
    outputSchema: AttendanceStatusOutputSchema,
  },
  async (promptText) => {
    const { output } = await prompt(promptText);
    if (!output) {
      throw new Error('Failed to get a classification from the AI model.');
    }
    return output;
  }
);
