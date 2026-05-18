'use server';

import { groq, FAST_MODEL } from '@/ai/groq';

export type AnalyzeClinicalFormInput = {
  questions: string[];
  answers: Record<string, string>;
  studentName: string;
};

export type AnalyzeClinicalFormOutput = {
  summary: string;
  mainConcerns: string[];
  emotionalState: string;
  riskLevel: 'low' | 'moderate' | 'high';
};

const SYSTEM_PROMPT = `You are a clinical AI assistant helping a USPF guidance counselor review a student's self-assessment form.

Analyze the student's responses and respond with valid JSON only (no markdown, no code fences) using this exact structure:
{
  "summary": "2-3 sentence clinical overview of what the student is experiencing",
  "mainConcerns": ["concern 1", "concern 2", "concern 3"],
  "emotionalState": "dominant emotion (e.g. anxious, stressed, hopeful, overwhelmed, calm)",
  "riskLevel": "low"
}

riskLevel must be "low", "moderate", or "high" based on urgency of intervention needed.
mainConcerns should be 2-5 specific issues identified from the responses.`;

export async function analyzeClinicalForm(
  input: AnalyzeClinicalFormInput
): Promise<AnalyzeClinicalFormOutput> {
  const qaTranscript = input.questions
    .map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${input.answers[i] ?? '(no response)'}`)
    .join('\n\n');

  const completion = await groq.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Student: ${input.studentName}\n\n${qaTranscript}`,
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);

  return {
    summary: parsed.summary ?? 'Unable to generate summary.',
    mainConcerns: Array.isArray(parsed.mainConcerns) ? parsed.mainConcerns : [],
    emotionalState: parsed.emotionalState ?? 'Unknown',
    riskLevel: ['low', 'moderate', 'high'].includes(parsed.riskLevel) ? parsed.riskLevel : 'low',
  };
}
