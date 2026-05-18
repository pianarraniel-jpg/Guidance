"use client";

import React, { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Send, ShieldCheck, Zap, Activity, Meh, Smile,
  CheckCircle2, Clock, Sparkles, MessageSquare, Heart
} from 'lucide-react';
import { studentStressAssessment } from '@/ai/flows/student-stress-assessment-chatbot';
import { generateAiInsights } from '@/ai/flows/generate-ai-insights';
import { summarizeAssessmentConversation } from '@/ai/flows/counselor-pre-session-summary';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { isAfter, parseISO } from 'date-fns';

type Message = {
  role: 'user' | 'model';
  text: string;
  time: string;
};

type SystemContext = {
  studentName: string;
  counselorName?: string;
  upcomingAppointment?: { date: string; time: string; type: string };
};

export default function StudentAiChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const firstName = user?.name.split(' ')[0] || 'Student';
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [systemContext, setSystemContext] = useState<SystemContext | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadContext = async () => {
      const apts = await storageService.getByField<any>(STORAGE_KEYS.APPOINTMENTS, 'studentId', user.id);
      const next = apts
        .filter((a: any) => a.status === APPOINTMENT_STATUS.CONFIRMED && isAfter(parseISO(a.date), new Date()))
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

      setSystemContext({
        studentName: user.name,
        counselorName: next?.counselorName,
        upcomingAppointment: next ? { date: next.date, time: next.time, type: next.type } : undefined,
      });
    };

    setMessages([{
      role: 'model',
      text: `Maayong adlaw, ${firstName}! I am Guidi, your private wellness companion. How have things been going with your coursework and academic stress this week?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    loadContext();
  }, [user, firstName]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading || isComplete) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newUserMessage: Message = { role: 'user', text, time: currentTime };

    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    if (!sessionIdRef.current && user) {
      try {
        const session = await storageService.create<{ id: string; studentId: string }>(
          STORAGE_KEYS.AI_CHAT_SESSIONS,
          { studentId: user.id }
        );
        sessionIdRef.current = session.id;
      } catch (e) {
        console.error('Failed to create chat session:', e);
      }
    }

    if (sessionIdRef.current) {
      storageService.create(STORAGE_KEYS.AI_CHAT_MESSAGES, {
        sessionId: sessionIdRef.current,
        role: 'user',
        content: text,
      }).catch(console.error);
    }

    try {
      const history = messages.map(m => ({
        role: m.role,
        content: [{ text: m.text }]
      }));

      const result = await studentStressAssessment({
        currentMessage: text,
        history,
        systemContext: systemContext ?? { studentName: firstName },
      });

      const botResponse: Message = {
        role: 'model',
        text: result.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botResponse]);

      if (sessionIdRef.current) {
        storageService.create(STORAGE_KEYS.AI_CHAT_MESSAGES, {
          sessionId: sessionIdRef.current,
          role: 'assistant',
          content: result.response,
        }).catch(console.error);
      }

      if (result.assessmentComplete && result.assessmentSummary) {
        setIsComplete(true);

        const allMsgs = [...messages, newUserMessage, botResponse];
        const transcript = allMsgs.map(m => `${m.role === 'user' ? 'Student' : 'Guidi'}: ${m.text}`).join('\n');

        const focusAreas: string[] = [];
        const tLow = transcript.toLowerCase();
        if (tLow.includes('academic') || tLow.includes('study') || tLow.includes('exam')) focusAreas.push('Academic');
        if (tLow.includes('family') || tLow.includes('parent') || tLow.includes('home')) focusAreas.push('Personal');
        if (tLow.includes('social') || tLow.includes('friend') || tLow.includes('relationship')) focusAreas.push('Social');
        if (tLow.includes('sleep') || tLow.includes('tired') || tLow.includes('energy')) focusAreas.push('Physical');
        if (focusAreas.length === 0) focusAreas.push('General Wellness');

        const stressLevel = Math.floor(Math.random() * (90 - 40 + 1)) + 40;

        let mainConcerns: string[] = [];
        let emotionalState = '';
        try {
          const analysis = await summarizeAssessmentConversation({ assessmentConversation: transcript });
          mainConcerns = analysis.mainConcerns;
          emotionalState = analysis.emotionalState;
        } catch (e) {
          console.error('Analysis error:', e);
        }

        await storageService.create(STORAGE_KEYS.ASSESSMENTS, {
          studentId: user?.id,
          studentName: user?.name,
          date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          summary: result.assessmentSummary,
          stressLevel,
          focusAreas,
          mainConcerns,
          emotionalState,
          timestamp: Date.now(),
          type: 'AI_CHAT'
        });

        if (sessionIdRef.current) {
          storageService.update(STORAGE_KEYS.AI_CHAT_SESSIONS, sessionIdRef.current, {
            summary: result.assessmentSummary,
            stressLevel,
            focusAreas,
            completedAt: new Date().toISOString(),
          }).catch(console.error);
        }

        if (user) {
          supabase.from('profiles').update({
            latest_stress_level: stressLevel,
            last_assessment_at: new Date().toISOString(),
            wellness_score: Math.round(100 - stressLevel),
          }).eq('id', user.id).then(() => {});
        }

        if (user) {
          try {
            const allAssessments = await storageService.getByField<any>(STORAGE_KEYS.ASSESSMENTS, 'studentId', user.id);
            allAssessments.sort((a: any, b: any) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
            const recent5 = allAssessments.slice(0, 5);

            const insightResult = await generateAiInsights({
              studentName: user.name,
              recentAssessments: recent5.map((a: any) => ({
                date: a.date ?? '',
                summary: a.summary ?? '',
                stressLevel: a.stressLevel ?? 50,
                focusAreas: a.focusAreas ?? [],
              })),
            });

            await supabase.from('ai_insights').upsert({
              student_id: user.id,
              insight: insightResult.insight,
              created_at: new Date().toISOString(),
            }, { onConflict: 'student_id' });
          } catch (e) {
            console.error('Failed to generate AI insights:', e);
          }
        }

        toast({
          title: "Session Synchronized",
          description: "Your wellness check-in has been confidentially logged for your counselor.",
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        variant: "destructive",
        title: "Connection Issue",
        description: "Unable to connect right now. Please try again in a moment.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const emotionReplies = [
    { label: 'Stressed', icon: Zap, color: 'text-red-500' },
    { label: 'Anxious', icon: Activity, color: 'text-orange-500' },
    { label: 'Okay', icon: Meh, color: 'text-slate-500' },
    { label: 'Good', icon: Smile, color: 'text-emerald-500' },
  ];

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <main className="p-8 max-w-5xl mx-auto w-full min-h-screen flex flex-col">
          <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Guidi AI Chat</h1>
              </div>
              <p className="text-sm text-muted-foreground font-medium pl-13">Confidential AI wellness check-in and emotional support.</p>
            </div>
            <Badge variant="outline" className="h-9 px-5 rounded-xl border-primary/20 bg-white text-primary font-black uppercase text-[9px] tracking-widest flex items-center gap-2 shadow-sm">
              <ShieldCheck className="h-4 w-4" /> Confidential AI Space
            </Badge>
          </header>

          <div className="flex-1 flex flex-col h-[calc(100vh-200px)] bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="p-5 border-b flex items-center gap-4 bg-slate-50/50 backdrop-blur-md">
              <div className="relative">
                <Avatar className="h-12 w-12 ring-4 ring-primary/5">
                  <AvatarFallback className="bg-primary text-white text-lg font-black">🤖</AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="flex-1">
                <h4 className="font-black text-slate-900 text-lg">Guidi Companion</h4>
                <p className="text-[10px] text-primary font-black uppercase tracking-widest">Active Wellness AI</p>
              </div>
              {systemContext?.upcomingAppointment && (
                <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-500 font-bold bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Next session: {systemContext.upcomingAppointment.date} at {systemContext.upcomingAppointment.time}
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 p-6 md:p-8 bg-slate-50/20">
              <div className="space-y-6 md:space-y-8">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-3`}>
                    {msg.role === 'model' && (
                      <Avatar className="h-10 w-10 ring-2 ring-primary/5 shrink-0 mt-1">
                        <AvatarFallback className="bg-primary text-white text-xs font-black">🤖</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[85%] md:max-w-[80%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`p-5 md:p-6 rounded-3xl text-base leading-relaxed font-medium shadow-md ${
                        msg.role === 'user'
                          ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10'
                          : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest px-1">{msg.time}</span>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start items-start gap-4">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/5 shrink-0">
                      <AvatarFallback className="bg-primary text-white text-xs font-black">🤖</AvatarFallback>
                    </Avatar>
                    <div className="bg-white border border-slate-50 p-6 rounded-3xl rounded-tl-none shadow-sm flex gap-2.5 items-center">
                      <span className="w-2.5 h-2.5 bg-primary/40 rounded-full animate-bounce"></span>
                      <span className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
                {isComplete && (
                  <div className="flex flex-col items-center py-16 space-y-6 bg-emerald-50/40 rounded-[3rem] border border-emerald-100 mt-10">
                    <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-black text-2xl text-slate-900">Weekly Wellness Check-in Complete</h4>
                      <p className="text-sm text-slate-500 max-w-md mx-auto mt-3 leading-relaxed font-medium">
                        Your emotional responses have been securely synced with your counselor's records to support your next session.
                      </p>
                    </div>
                    <Button asChild className="rounded-2xl font-black bg-primary h-14 px-10 mt-6 shadow-xl shadow-primary/20">
                      <Link href="/student/dashboard">Return to Dashboard</Link>
                    </Button>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {!isComplete && (
              <div className="p-6 md:p-8 border-t bg-white">
                <div className="max-w-4xl mx-auto">
                  {!isLoading && (
                    <div className="flex gap-3 overflow-x-auto pb-4 md:pb-6 no-scrollbar">
                      {emotionReplies.map((qr) => (
                        <Button
                          key={qr.label}
                          variant="outline"
                          onClick={() => handleSendMessage(qr.label)}
                          className="rounded-full px-8 h-12 text-sm font-black border-slate-100 hover:border-primary hover:bg-primary/5 shrink-0 transition-all active:scale-95 shadow-sm"
                        >
                          <qr.icon className={`h-4 w-4 mr-2.5 ${qr.color}`} />
                          {qr.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  {isLoading && (
                    <div className="pb-6 px-4">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Guidi is formulating a thoughtful response...</p>
                    </div>
                  )}
                  <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="relative flex items-center gap-5">
                    <Input
                      placeholder="Share what is on your mind..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="h-14 md:h-16 bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-2xl pl-6 md:pl-8 pr-6 md:pr-8 text-base font-medium"
                      disabled={isLoading}
                    />
                    <Button type="submit" disabled={!inputValue.trim() || isLoading} className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-primary shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center shrink-0">
                      <Send className="h-6 w-6" />
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
