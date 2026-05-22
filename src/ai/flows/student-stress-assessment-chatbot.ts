'use server';

import Groq from 'groq-sdk';
import { groq, CHAT_MODEL } from '@/ai/groq';

export type StudentStressAssessmentInput = {
  currentMessage: string;
  history: Array<{
    role: 'user' | 'model';
    content: Array<{ text: string }>;
  }>;
  systemContext?: {
    studentName: string;
    counselorName?: string;
    upcomingAppointment?: {
      date: string;
      time: string;
      type: string;
    };
    previousSessions?: Array<{
      date: string;
      summary: string;
      riskLevel: string;
      stressScore: number;
    }>;
  };
};

export type StudentStressAssessmentOutput = {
  response: string;
  assessmentSummary?: string;
  assessmentComplete: boolean;
  riskLevel: 'low' | 'moderate' | 'high';
  stressScore: number;
  suggestAppointment: boolean;
};

function buildSystemPrompt(ctx?: StudentStressAssessmentInput['systemContext']): string {
  let contextBlock = '';
  if (ctx) {
    contextBlock += `\n\nYou are speaking with ${ctx.studentName}.`;
    if (ctx.counselorName) {
      contextBlock += ` Their guidance counselor is ${ctx.counselorName}.`;
    }
    if (ctx.upcomingAppointment) {
      const { date, time, type } = ctx.upcomingAppointment;
      contextBlock += ` They have an upcoming ${type} session on ${date} at ${time}. You may reference this appointment naturally if relevant.`;
    }
    if (ctx.previousSessions && ctx.previousSessions.length > 0) {
      contextBlock += `\n\nSTUDENT MEMORY — Previous Wellness Sessions (most recent first):`;
      ctx.previousSessions.forEach(s => {
        contextBlock += `\n• ${s.date}: ${s.summary} [Risk: ${s.riskLevel}, Stress: ${s.stressScore}/100]`;
      });
      contextBlock += `\n\nUse this history to personalize your responses. Reference patterns you notice (e.g., "Last time you mentioned academic pressure — how has that been since?"). Do NOT repeat what you already know — build on it naturally.`;
    }
  }

  return `You are GuidanceSync (call yourself "Guidi"), a compassionate, non-judgmental AI counselor from the University of Southern Philippines Foundation (USPF). Your primary goal is to guide students through a comprehensive stress assessment. Engage them in a supportive and empathetic conversation, asking open-ended questions about their feelings, experiences, and concerns to understand their situation deeply.${contextBlock}

Your responses should always help the student feel heard and understood. When you believe you have gathered sufficient information to form a preliminary understanding of their stress factors (typically after 5–8 exchanges), conclude the assessment by providing a summary.

RISK CLASSIFICATION GUIDELINES — evaluate on EVERY response:
- "low": Student shows normal academic or life stress with healthy coping. No crisis language. Functioning well overall.
- "moderate": Elevated distress, signs of functional impairment (sleep issues, concentration problems, withdrawal). Needs counseling support but not in immediate danger.
- "high": Any indication of suicidal ideation, self-harm intent, severe hopelessness, panic attacks, or mental breakdown. Requires immediate counselor intervention.

STRESS SCORE — estimate 0–100 on EVERY response:
- 0–30: Minimal stress, generally positive
- 31–55: Mild to moderate stress, some concern areas
- 56–74: Significant stress, multiple areas affected
- 75–100: Severe stress or crisis level

APPOINTMENT SUGGESTION — set suggestAppointment to true when:
- riskLevel is "high" (suicidal ideation, self-harm, severe hopelessness)
- The student expresses acute distress, crisis language, or breakdown
- You believe immediate professional counselor support is needed beyond what Guidi can provide

You MUST respond with valid JSON only (no markdown, no code fences) using this exact structure:
{
  "response": "your empathetic message to the student",
  "assessmentComplete": false,
  "assessmentSummary": null,
  "riskLevel": "low",
  "stressScore": 30,
  "suggestAppointment": false
}

When the assessment is complete, set assessmentComplete to true and provide a comprehensive summary string in assessmentSummary. Always include riskLevel, stressScore, and suggestAppointment on every response based on the full conversation so far.`;
}

export async function studentStressAssessment(
  input: StudentStressAssessmentInput
): Promise<StudentStressAssessmentOutput> {
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(input.systemContext) },
    ...input.history.map(m => ({
      role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content.map(c => c.text).join(' '),
    })),
    { role: 'user', content: input.currentMessage },
  ];

  const completion = await groq.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);

  return {
    response: parsed.response ?? "I'm here to listen. Can you tell me more?",
    assessmentSummary: parsed.assessmentSummary ?? undefined,
    assessmentComplete: parsed.assessmentComplete === true,
    riskLevel: (['low', 'moderate', 'high'].includes(parsed.riskLevel) ? parsed.riskLevel : 'low') as 'low' | 'moderate' | 'high',
    stressScore: typeof parsed.stressScore === 'number' ? Math.min(100, Math.max(0, parsed.stressScore)) : 40,
    suggestAppointment: parsed.suggestAppointment === true,
  };
}
