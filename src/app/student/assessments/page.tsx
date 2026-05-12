"use client";

import React, { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Clock,
  Target,
  FileText,
  User,
  Star
} from 'lucide-react';
import { studentStressAssessment } from '@/ai/flows/student-stress-assessment-chatbot';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS } from '@/lib/constants';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Message = {
  role: 'user' | 'model';
  text: string;
  time: string;
};

export default function StudentAssessments() {
  const { user } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const { toast } = useToast();
  const firstName = user?.name.split(' ')[0] || 'Student';
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Chatbot State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Assessment Tasks State
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [taskAnswers, setTaskAnswers] = useState<Record<string, string>>({});

  const loadTasks = () => {
    if (user) {
      const allTasks = storageService.getByField<any>(STORAGE_KEYS.ASSESSMENT_TASKS, 'studentId', user.id);
      allTasks.sort((a, b) => b.timestamp - a.timestamp);
      setTasks(allTasks);
    }
  };

  useEffect(() => {
    // Initialize welcome message after mount to avoid hydration mismatch
    setMessages([
      {
        role: 'model',
        text: `Maayong adlaw, ${firstName}! I'm Guidi, your wellness companion. How have things been going with your classes this week?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    loadTasks();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.ASSESSMENT_TASKS) loadTasks();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user, firstName]);

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
        content: [{ text: m.text }]
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
        
        const transcript = [...messages, newUserMessage].map(m => m.text).join(' ');
        const focusAreas = [];
        if (transcript.toLowerCase().includes('academic')) focusAreas.push('Academic');
        if (transcript.toLowerCase().includes('family')) focusAreas.push('Personal');
        if (transcript.toLowerCase().includes('social')) focusAreas.push('Social');
        if (focusAreas.length === 0) focusAreas.push('General Wellness');

        storageService.create(STORAGE_KEYS.ASSESSMENTS, {
          studentId: user?.id,
          studentName: user?.name,
          date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          summary: result.assessmentSummary,
          stressLevel: Math.floor(Math.random() * (90 - 40 + 1)) + 40,
          focusAreas: focusAreas,
          timestamp: Date.now(),
          type: 'AI_CHAT'
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

  const handleOpenTask = (task: any) => {
    setActiveTask(task);
    setTaskAnswers({});
    // Explicit read: mark assignment task AND evaluation as read when opening
    markAsRead(`asmt-task-${task.id}`);
    markAsRead(`asmt-eval-${task.id}`);
  };

  const handleSubmitTask = () => {
    if (!activeTask || !user) return;

    const questions = activeTask.questions || ['Please describe your current stress level.'];
    const unanswered = questions.some((_, i: number) => !taskAnswers[i]);
    
    if (unanswered) {
      toast({
        variant: "destructive",
        title: "Incomplete Form",
        description: "Please answer all clinical questions before submitting.",
      });
      return;
    }

    const submissionDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    storageService.create(STORAGE_KEYS.ASSESSMENTS, {
      studentId: user.id,
      studentName: user.name,
      date: submissionDate,
      summary: `Clinical Response to: ${activeTask.title}`,
      answers: taskAnswers,
      questions: questions,
      stressLevel: 50,
      focusAreas: ['Clinical Assignment'],
      timestamp: Date.now(),
      taskId: activeTask.id,
      type: 'CLINICAL_FORM',
      status: 'submitted'
    });

    storageService.update(STORAGE_KEYS.ASSESSMENT_TASKS, activeTask.id, { 
      status: 'submitted',
      lastUpdate: Date.now()
    });

    toast({
      title: "Task Submitted",
      description: "Your answers have been sent to your counselor for analysis.",
    });

    setActiveTask(null);
    loadTasks();
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
        <main className="p-8 max-w-7xl mx-auto w-full min-h-screen">
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Weekly Wellness</h1>
              <p className="text-muted-foreground font-medium">Synchronize your emotional health with professional clinical oversight.</p>
            </div>
            <Badge variant="outline" className="h-10 px-6 rounded-xl border-primary/20 bg-white text-primary font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> University Security Active
            </Badge>
          </header>

          <Tabs defaultValue="chatbot" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mb-8 bg-slate-100/50 p-1 h-14 rounded-2xl">
              <TabsTrigger value="chatbot" className="rounded-xl font-black text-xs gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <MessageSquare className="h-4 w-4" /> Guidi AI Chat
              </TabsTrigger>
              <TabsTrigger value="forms" className="rounded-xl font-black text-xs gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm relative">
                <ClipboardList className="h-4 w-4" /> Clinical Tasks
                {tasks.filter(t => t.status === 'pending').length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-[9px] text-white rounded-full flex items-center justify-center border-2 border-white">
                    {tasks.filter(t => t.status === 'pending').length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chatbot">
              <div className="flex flex-col h-[calc(100vh-340px)] w-full bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-6 border-b flex items-center gap-4 bg-white/80 backdrop-blur-md">
                  <div className="relative">
                    <Avatar className="h-12 w-12 ring-4 ring-primary/5">
                      <AvatarFallback className="bg-primary text-white text-sm font-black">🤖</AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"></span>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900">Guidi</h4>
                    <p className="text-[10px] text-primary font-black uppercase tracking-widest">Active Wellness Analysis</p>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-8 bg-slate-50/20">
                  <div className="max-w-4xl mx-auto space-y-8">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                        <div className={`max-w-[75%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`p-5 rounded-2xl text-sm leading-relaxed font-medium shadow-sm ${
                            msg.role === 'user' 
                              ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10' 
                              : 'bg-white text-slate-700 rounded-tl-none border border-slate-50'
                          }`}>
                            {msg.text}
                          </div>
                          <span className="text-[9px] text-slate-300 font-bold mt-2 uppercase tracking-widest">{msg.time}</span>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-50 p-5 rounded-2xl rounded-tl-none shadow-sm flex gap-2 items-center">
                          <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                      </div>
                    )}
                    {isComplete && (
                      <div className="flex flex-col items-center py-12 space-y-4">
                        <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-inner">
                           <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <div className="text-center">
                          <h4 className="font-black text-xl text-slate-900">Weekly Kamustahan Complete</h4>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed">
                            Guidi has synchronized your wellness data with your counselor's records. Thank you for your openness.
                          </p>
                        </div>
                        <Button asChild className="rounded-xl font-black bg-primary h-12 px-8 mt-4">
                          <Link href="/student/dashboard">Return to Overview</Link>
                        </Button>
                      </div>
                    )}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                {!isComplete && (
                  <div className="p-8 border-t bg-white">
                    <div className="max-w-4xl mx-auto">
                      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                        {emotionReplies.map((qr) => (
                          <Button
                            key={qr.label}
                            variant="outline"
                            onClick={() => handleSendMessage(qr.label)}
                            className="rounded-full px-6 h-10 text-xs font-black border-slate-100 hover:border-primary hover:bg-primary/5 shrink-0 transition-all active:scale-95"
                          >
                            <qr.icon className={`h-3.5 w-3.5 mr-2 ${qr.color}`} />
                            {qr.label}
                          </Button>
                        ))}
                      </div>
                      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="relative flex items-center gap-4">
                        <Input 
                          placeholder="Type your wellness response..." 
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          className="h-14 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary rounded-2xl pl-6 pr-6 font-medium"
                          disabled={isLoading}
                        />
                        <Button type="submit" disabled={!inputValue.trim() || isLoading} className="h-14 w-14 rounded-2xl bg-primary shadow-lg shadow-primary/20 transition-all active:scale-95">
                          <Send className="h-5 w-5" />
                        </Button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="forms">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.map(task => (
                  <Card key={task.id} className="border-none shadow-lg shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden flex flex-col group">
                    <div className={`h-2 w-full ${task.status === 'completed' || task.status === 'submitted' ? 'bg-emerald-500' : 'bg-primary'}`} />
                    <CardHeader className="p-8 pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest border-none ${task.status === 'completed' || task.status === 'submitted' ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                          {task.status === 'completed' ? 'Evaluated' : task.status === 'submitted' ? 'Awaiting Review' : 'New Assignment'}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors">{task.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest pt-2">
                        <User className="h-3 w-3" /> Dr. {task.counselorName?.split(' ').pop()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 flex-1 flex flex-col">
                      <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
                        {task.description}
                      </p>
                      <div className="mt-auto space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <Clock className="h-3 w-3" /> Assigned: {task.date}
                        </div>
                        {task.status === 'pending' ? (
                          <Button onClick={() => handleOpenTask(task)} className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-black gap-2 group/btn shadow-lg shadow-primary/10">
                            Complete Form <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          </Button>
                        ) : task.status === 'submitted' ? (
                          <div className="flex items-center gap-2 text-emerald-600 font-black text-xs pt-2">
                            <CheckCircle2 className="h-4 w-4" /> Form Submitted
                          </div>
                        ) : (
                          <div className="space-y-4 pt-4 border-t border-slate-50">
                            <div className="flex items-center justify-between" onClick={() => markAsRead(`asmt-eval-${task.id}`)}>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Rating</span>
                              <div className="flex items-center gap-1">
                                <span className="text-lg font-black text-primary">{task.counselorRating}</span>
                                <span className="text-[10px] font-bold text-slate-300">/10</span>
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 text-[11px] font-medium text-slate-500 italic">
                              "{task.counselorComments || 'Reviewed by counselor.'}"
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {tasks.length === 0 && (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                    <ClipboardList className="h-16 w-16 opacity-10 mb-4" />
                    <p className="font-black text-lg">No assigned tasks found</p>
                    <p className="text-sm font-medium">Your counselor hasn't assigned any clinical forms to you yet.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Clinical Task Form Dialog */}
          <Dialog open={!!activeTask} onOpenChange={(open) => !open && setActiveTask(null)}>
            <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="p-8 bg-slate-50 border-b">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black text-slate-900">{activeTask?.title}</DialogTitle>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Clinical Evaluation Form</p>
                  </div>
                </div>
              </DialogHeader>
              <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/50 text-xs font-medium text-blue-700 leading-relaxed italic">
                  "{activeTask?.description}"
                </div>

                <div className="space-y-8">
                  {(activeTask?.questions || ['Please describe your current state.']).map((q: string, i: number) => (
                    <div key={i} className="space-y-3">
                      <Label className="text-sm font-black text-slate-700 flex items-center gap-2">
                        <span className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px]">{i + 1}</span>
                        {q}
                      </Label>
                      <Textarea 
                        placeholder="Your clinical response..."
                        className="min-h-[120px] rounded-2xl bg-slate-50 border-none p-4 text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary/20"
                        value={taskAnswers[i] || ''}
                        onChange={(e) => setTaskAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-8 pt-4 bg-white border-t flex gap-3">
                <Button variant="outline" onClick={() => setActiveTask(null)} className="flex-1 h-14 rounded-2xl font-bold border-slate-200">Cancel</Button>
                <Button onClick={handleSubmitTask} className="flex-1 h-14 rounded-2xl font-black bg-primary">Submit Analysis</Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </DashboardLayout>
    </ProtectedRoute>
  );
}