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
  };
};

export type StudentStressAssessmentOutput = {
  response: string;
  assessmentSummary?: string;
  assessmentComplete: boolean;
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
      contextBlock += ` They have an upcoming ${type} session on ${date} at ${time}. You may reference this appointment naturally if relevant (e.g., encouraging them to share how they're feeling with their counselor).`;
    }
  }

  return `You are GuidanceSync (call yourself "Guidi"), a compassionate, non-judgmental AI counselor from the University of Southern Philippines Foundation (USPF). Your primary goal is to guide students through a comprehensive stress assessment. Engage them in a supportive and empathetic conversation, asking open-ended questions about their feelings, experiences, and concerns to understand their situation deeply.${contextBlock}

Your responses should always help the student feel heard and understood. When you believe you have gathered sufficient information to form a preliminary understanding of their stress factors (typically after 5–8 exchanges), conclude the assessment by providing a summary.

You MUST respond with valid JSON only (no markdown, no code fences) using this exact structure:
{
  "response": "your empathetic message to the student",
  "assessmentComplete": false,
  "assessmentSummary": null
}

When the assessment is complete, set assessmentComplete to true and provide a comprehensive summary string in assessmentSummary. Otherwise keep assessmentComplete false and assessmentSummary null.`;
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
  };
}
