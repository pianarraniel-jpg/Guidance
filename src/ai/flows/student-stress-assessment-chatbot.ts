'use server';

/**
 * @fileOverview A Genkit flow for an AI-powered stress assessment chatbot.
 * This flow enables students to interact with an AI counselor to assess their stress levels
 * and express concerns in a non-judgmental environment.
 *
 * - studentStressAssessment - A function that interacts with the AI chatbot for stress assessment.
 * - StudentStressAssessmentInput - The input type for the studentStressAssessment function.
 * - StudentStressAssessmentOutput - The return type for the studentStressAssessment function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the input schema for the stress assessment chatbot
const StudentStressAssessmentInputSchema = z.object({
  currentMessage: z.string().describe('The student\'s current message to the chatbot.'),
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      parts: z.array(
        z.object({
          text: z.string(),
        })
      ),
    })
  ).describe('The conversation history between the student and the AI, including previous turns.'),
});
export type StudentStressAssessmentInput = z.infer<typeof StudentStressAssessmentInputSchema>;

// Define the output schema for the stress assessment chatbot
const StudentStressAssessmentOutputSchema = z.object({
  response: z.string().describe('The AI counselor\'s response to the student.'),
  assessmentSummary: z.string().optional().describe('A summary of the student\'s stress factors, provided when the assessment is complete.'),
  assessmentComplete: z.boolean().describe('True if the AI believes it has gathered enough information and the assessment is complete, otherwise false.'),
});
export type StudentStressAssessmentOutput = z.infer<typeof StudentStressAssessmentOutputSchema>;

/**
 * Initiates or continues an AI-powered stress assessment conversation with a student.
 * @param input Contains the student's current message and the conversation history.
 * @returns The AI counselor's response, an optional assessment summary, and a flag indicating if the assessment is complete.
 */
export async function studentStressAssessment(
  input: StudentStressAssessmentInput
): Promise<StudentStressAssessmentOutput> {
  return studentStressAssessmentFlow(input);
}

// Define the Genkit flow for the stress assessment chatbot
const studentStressAssessmentFlow = ai.defineFlow(
  {
    name: 'studentStressAssessmentFlow',
    inputSchema: StudentStressAssessmentInputSchema,
    outputSchema: StudentStressAssessmentOutputSchema,
  },
  async (input) => {
    const systemPrompt = `You are GuidanceSync, a compassionate, non-judgmental AI counselor from the University of Southern Philippines Foundation (USPF). Your primary goal is to guide students through a comprehensive stress assessment. Engage them in a supportive and empathetic conversation, asking open-ended questions about their feelings, experiences, and concerns to understand their situation deeply.

Your responses should always help the student feel heard and understood. When you believe you have gathered sufficient information to form a preliminary understanding of their stress factors, conclude the assessment by providing a summary of what you've learned. Otherwise, continue the conversation, gently probing for more details or offering encouragement.`;

    const messages = [
      { role: 'system', parts: [{ text: systemPrompt }] },
      ...input.history,
      { role: 'user', parts: [{ text: input.currentMessage }] }
    ];

    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash', // Using a suitable conversational model
      prompt: messages,
      output: { schema: StudentStressAssessmentOutputSchema },
      config: {
        temperature: 0.7, // A moderate temperature for balanced creativity and consistency
      },
    });

    if (!output) {
      throw new Error('No output received from the AI model.');
    }

    return output;
  }
);
