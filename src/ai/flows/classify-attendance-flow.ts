
'use server';
/**
 * @fileOverview An AI flow to classify a batch of attendance records.
 *
 * - classifyAttendanceBatch - A function that classifies a list of attendance texts.
 * - ClassifyAttendanceBatchInput - The input type for the function.
 * - ClassifyAttendanceBatchOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AttendanceClassificationSchema = z.object({
    text: z.string().describe('The original attendance comment text.'),
    status: z
        .enum(['Leave', 'Sick', 'Absent'])
        .describe(
        'The classified status. "Leave" for approved leave. "Sick" for medical reasons. "Absent" for unexplained absences.'
        ),
});

export const ClassifyAttendanceBatchInputSchema = z.object({
  texts: z.array(z.string()).describe('An array of attendance comment texts to classify.'),
});
export type ClassifyAttendanceBatchInput = z.infer<typeof ClassifyAttendanceBatchInputSchema>;


export const ClassifyAttendanceBatchOutputSchema = z.object({
    classifications: z.array(AttendanceClassificationSchema),
});
export type ClassifyAttendanceBatchOutput = z.infer<typeof ClassifyAttendanceBatchOutputSchema>;


export async function classifyAttendanceBatch(
  input: ClassifyAttendanceBatchInput
): Promise<ClassifyAttendanceBatchOutput> {
  return classifyAttendanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'classifyAttendanceBatchPrompt',
  input: { schema: ClassifyAttendanceBatchInputSchema },
  output: { schema: ClassifyAttendanceBatchOutputSchema },
  prompt: `You are an expert administrative assistant. Your task is to classify a list of attendance records based on the provided text for each.
The possible classifications are "Leave", "Sick", or "Absent".

- Use "Leave" for planned absences like holidays, appointments, or other approved reasons.
- Use "Sick" for medical-related absences.
- Use "Absent" for unexplained absences, "no show", or unapproved time off.

For each of the following attendance reasons, provide its classification. Return the results as a JSON object containing a 'classifications' array.

{{#each texts}}
- "{{this}}"
{{/each}}
`,
});

const classifyAttendanceFlow = ai.defineFlow(
  {
    name: 'classifyAttendanceFlow',
    inputSchema: ClassifyAttendanceBatchInputSchema,
    outputSchema: ClassifyAttendanceBatchOutputSchema,
  },
  async (input) => {
    if (input.texts.length === 0) {
      return { classifications: [] };
    }
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to get a classification from the AI model.');
    }
    return output;
  }
);
