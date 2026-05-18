'use server';

import { groq, FAST_MODEL } from '@/ai/groq';

export type SummarizeAssessmentConversationInput = {
  assessmentConversation: string;
};

export type SummarizeAssessmentConversationOutput = {
  summary: string;
  mainConcerns: string[];
  emotionalState: string;
};

const SYSTEM_PROMPT = `You are an AI assistant helping guidance counselors understand a student's recent stress assessment conversation.

Analyze the provided transcript and respond with valid JSON only (no markdown, no code fences) using this exact structure:
{
  "summary": "concise summary of the student's main concerns and emotional state",
  "mainConcerns": ["concern 1", "concern 2"],
  "emotionalState": "single word or short phrase describing the dominant emotion"
}

Focus on: key stressors, emotional tone, and actionable insights for the counselor.`;

export async function summarizeAssessmentConversation(
  input: SummarizeAssessmentConversationInput
): Promise<SummarizeAssessmentConversationOutput> {
  const completion = await groq.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Conversation Transcript:\n${input.assessmentConversation}` },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);

  return {
    summary: parsed.summary ?? 'No summary available.',
    mainConcerns: Array.isArray(parsed.mainConcerns) ? parsed.mainConcerns : [],
    emotionalState: parsed.emotionalState ?? 'Unknown',
  };
}
