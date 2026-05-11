
"use client";

import React, { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Send,
  ShieldCheck,
  Zap,
  Activity,
  Meh,
  Smile,
  ChevronRight,
  Brain,
  Home,
  GraduationCap,
  Heart,
  CheckCircle2
} from 'lucide-react';
import { studentStressAssessment } from '@/ai/flows/student-stress-assessment-chatbot';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS } from '@/lib/constants';
import Link from 'next/link';

type Message = {
  role: 'user' | 'model';
  text: string;
  time: string;
};

export default function StudentAssessments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const firstName = user?.name.split(' ')[0] || 'Student';
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: `Maayong adlaw, ${firstName}! I'm Guidi, your wellness companion. How have things been going with your classes this week?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading || isComplete) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newUserMessage: Message = { role: 'user', text, time: currentTime };
    
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const result = await studentStressAssessment({
        currentMessage: text,
        history
      });

      const botResponse: Message = {
        role: 'model',
        text: result.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botResponse]);

      if (result.assessmentComplete && result.assessmentSummary) {
        setIsComplete(true);
        // Save the assessment to storage
        storageService.create(STORAGE_KEYS.ASSESSMENTS, {
          studentId: user?.id,
          studentName: user?.name,
          date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          summary: result.assessmentSummary,
          stressLevel: Math.floor(Math.random() * (90 - 40 + 1)) + 40, // Random stress level for demo
          focusAreas: ['Academic', 'Personal'], // Mocked focus areas
          timestamp: Date.now()
        });

        toast({
          title: "Assessment Complete",
          description: "Your wellness check-in has been synchronized with your counselor.",
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
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

  const concernReplies = [
    { label: 'Academic Pressure', icon: GraduationCap },
    { label: 'Family Problems', icon: Home },
    { label: 'Personal Health', icon: Heart },
    { label: 'Mental Fatigue', icon: Brain },
  ];

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <main className="flex-1 p-4 md:p-8 bg-[#F8FAFC] min-h-screen">
          <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-140px)] w-full">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Weekly Kamustahan</h2>
                <p className="text-sm text-muted-foreground font-medium">Your progress is being synced with your records.</p>
              </div>
              <div className="text-right w-48">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-primary uppercase tracking-wider">
                    {isComplete ? 'Complete' : 'Step 2 of 4'}
                  </span>
                </div>
                <Progress value={isComplete ? 100 : 50} className="h-2 bg-slate-200" />
              </div>
            </div>

            {/* Chat Container */}
            <div className="flex-1 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col">
              {/* Chat Header */}
              <div className="p-5 border-b flex items-center gap-3 bg-white/50 backdrop-blur-md">
                <div className="relative">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                    <AvatarFallback className="bg-primary text-white text-xs font-bold">🤖</AvatarFallback>
                  </Avatar>
                  <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${isComplete ? 'bg-slate-300' : 'bg-emerald-500'}`}></span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Guidi</h4>
                  <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-1">
                    {isComplete ? 'Session Concluded' : 'AI Wellness Companion'}
                  </p>
                </div>
              </div>

              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-6 bg-slate-50/30">
                <div className="space-y-6">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                      <div className={`max-w-[80%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10' 
                            : 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm'
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-wider">{msg.time}</span>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center">
                        <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  )}
                  {isComplete && (
                    <div className="flex flex-col items-center py-8 space-y-4">
                      <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                         <CheckCircle2 className="h-10 w-10" />
                      </div>
                      <div className="text-center">
                        <h4 className="font-black text-slate-900">Assessment Complete</h4>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                          Guidi has gathered enough insights. You can now close this session or head back to your dashboard.
                        </p>
                      </div>
                      <Button asChild variant="outline" className="rounded-xl font-bold">
                        <Link href="/student/dashboard">Return to Dashboard</Link>
                      </Button>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Chat Controls */}
              {!isComplete && (
                <div className="p-6 border-t bg-white">
                  {/* Quick Replies Strip */}
                  <div className="space-y-4 mb-6">
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">How are you feeling?</p>
                      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {emotionReplies.map((qr) => (
                          <Button
                            key={qr.label}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendMessage(qr.label)}
                            className="rounded-full px-4 h-9 text-xs font-bold transition-all active:scale-95 border-slate-200 hover:border-primary hover:bg-primary/5 shrink-0"
                          >
                            <qr.icon className={`h-3.5 w-3.5 mr-2 ${qr.color}`} />
                            {qr.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">What's on your mind?</p>
                      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {concernReplies.map((qr) => (
                          <Button
                            key={qr.label}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendMessage(qr.label)}
                            className="rounded-full px-4 h-9 text-xs font-bold transition-all active:scale-95 border-slate-200 hover:border-primary hover:bg-primary/5 shrink-0"
                          >
                            <qr.icon className="h-3.5 w-3.5 mr-2 text-primary" />
                            {qr.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Message Input */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage(inputValue);
                    }}
                    className="relative flex items-center gap-3"
                  >
                    <div className="flex-1 relative">
                      <Input 
                        placeholder="Type your response here..." 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="h-14 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary rounded-2xl pl-5 pr-12 text-sm font-medium"
                        disabled={isLoading}
                      />
                    </div>
                    <Button 
                      type="submit"
                      disabled={!inputValue.trim() || isLoading}
                      className="h-14 w-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 shrink-0 transition-transform active:scale-95"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                </div>
              )}
            </div>

            {/* Footer Footer */}
            <div className="mt-6 flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                University Wellness Encryption Active
              </div>
              {!isComplete && (
                <button className="text-[11px] font-black text-slate-700 hover:text-primary transition-colors flex items-center gap-1 group">
                  SAVE & FINISH LATER
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </main>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
