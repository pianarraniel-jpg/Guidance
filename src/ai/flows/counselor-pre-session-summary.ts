'use server';
/**
 * @fileOverview A Genkit flow to summarize a student's AI-powered stress assessment conversation.
 *
 * - summarizeAssessmentConversation - A function that generates a summary of a student's stress assessment conversation.
 * - SummarizeAssessmentConversationInput - The input type for the summarizeAssessmentConversation function.
 * - SummarizeAssessmentConversationOutput - The return type for the summarizeAssessmentConversation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SummarizeAssessmentConversationInputSchema = z.object({
  assessmentConversation: z
    .string()
    .describe("The full transcript of the student's AI-powered stress assessment conversation."),
});
export type SummarizeAssessmentConversationInput = z.infer<typeof SummarizeAssessmentConversationInputSchema>;

const SummarizeAssessmentConversationOutputSchema = z.object({
  summary: z.string().describe("A concise summary of the student's main concerns and emotional state."),
  mainConcerns: z
    .array(z.string())
    .describe('A list of the primary issues or concerns identified in the conversation.'),
  emotionalState: z
    .string()
    .describe('The overall emotional state of the student as inferred from the conversation (e.g., anxious, stressed, hopeful, calm).'),
});
export type SummarizeAssessmentConversationOutput = z.infer<typeof SummarizeAssessmentConversationOutputSchema>;

export async function summarizeAssessmentConversation(
  input: SummarizeAssessmentConversationInput
): Promise<SummarizeAssessmentConversationOutput> {
  return counselorPreSessionSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'counselorPreSessionSummaryPrompt',
  input: { schema: SummarizeAssessmentConversationInputSchema },
  output: { schema: SummarizeAssessmentConversationOutputSchema },
  prompt: `You are an AI assistant designed to help guidance counselors quickly understand a student's recent stress assessment conversation.

Your task is to analyze the provided conversation transcript and generate a concise summary of the student's main concerns and their overall emotional state. Additionally, extract a list of specific main concerns and identify their emotional state.

Conversation Transcript:
{{assessmentConversation}}

Focus on:
- Identifying key stressors or problems mentioned by the student.
- Describing the student's emotional tone and feelings.
- Keeping the summary brief and to the point.

Please provide the output in the specified JSON format, ensuring 'mainConcerns' is an array of strings and 'emotionalState' is a single string representing the most prominent emotion.`,
});

const counselorPreSessionSummaryFlow = ai.defineFlow(
  {
    name: 'counselorPreSessionSummaryFlow',
    inputSchema: SummarizeAssessmentConversationInputSchema,
    outputSchema: SummarizeAssessmentConversationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
