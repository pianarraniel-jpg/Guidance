'use server';

import { groq, FAST_MODEL } from '@/ai/groq';

export type GenerateAiInsightsInput = {
  recentAssessments: Array<{
    date: string;
    summary: string;
    stressLevel: number;
    focusAreas: string[];
  }>;
  studentName: string;
};

export type GenerateAiInsightsOutput = {
  insight: string;
};

const SYSTEM_PROMPT = `You are GuidanceSync, a wellness AI at USPF. Based on a student's recent assessment history, generate one short, personalized, encouraging insight (2-3 sentences max).

Respond with valid JSON only (no markdown) using this structure:
{ "insight": "your personalized insight here" }

Be specific to the data — mention patterns you notice. Keep it warm, supportive, and actionable.`;

export async function generateAiInsights(
  input: GenerateAiInsightsInput
): Promise<GenerateAiInsightsOutput> {
  if (input.recentAssessments.length === 0) {
    return {
      insight: `Welcome, ${input.studentName.split(' ')[0]}! Complete your first wellness check-in with Guidi to receive personalized insights based on your data.`,
    };
  }

  const assessmentSummary = input.recentAssessments
    .map(a => `[${a.date}] Stress: ${a.stressLevel}/100 | Areas: ${a.focusAreas.join(', ')} | Notes: ${a.summary}`)
    .join('\n');

  const completion = await groq.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Student: ${input.studentName}\nRecent assessments:\n${assessmentSummary}`,
      },
    ],
    temperature: 0.8,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);

  return {
    insight: parsed.insight ?? 'Keep up your wellness check-ins to unlock personalized insights.',
  };
}
