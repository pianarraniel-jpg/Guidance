"use client";

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ShieldCheck, FileText, User, CheckCircle2,
  ClipboardList, ArrowRight, Clock, TrendingUp, History, Sparkles
} from 'lucide-react';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const HISTORICAL_FEEDBACKS = [
  {
    id: 'fb-1',
    academicYear: '2024-2025 (Previous Year)',
    date: 'November 14, 2024',
    counselor: 'Dr. Elena Rivera',
    stressRating: 78,
    clinicalScore: 6.4,
    focus: 'Midterm Anxiety & Sleep Deprivation',
    notes: 'Student reported acute academic burnout and sleep deprivation during midterm examinations. Prescribed progressive muscle relaxation and structured study intervals.',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    icon: '📉'
  },
  {
    id: 'fb-2',
    academicYear: '2024-2025 (Previous Year)',
    date: 'March 22, 2025',
    counselor: 'Dr. Elena Rivera',
    stressRating: 68,
    clinicalScore: 7.1,
    focus: 'Exam Preparation & Resilience',
    notes: 'Follow-up evaluation. Coping strategies showing moderate effectiveness. Student successfully managing exam schedule with reduced panic symptoms.',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: '⚖️'
  },
  {
    id: 'fb-3',
    academicYear: '2025-2026 (Current Year)',
    date: 'October 05, 2025',
    counselor: 'Dr. Marcus Santos',
    stressRating: 42,
    clinicalScore: 8.9,
    focus: 'Thesis Resilience & Normalization',
    notes: 'Excellent emotional regulation and proactive communication demonstrated during thesis preparation. Sleep patterns have normalized. Resiliency protocols fully effective.',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: '🌟'
  },
];

export default function StudentAssessments() {
  const { user } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [taskAnswers, setTaskAnswers] = useState<Record<string, string>>({});

  const loadTasks = async () => {
    if (user) {
      const allTasks = await storageService.getByField<any>(STORAGE_KEYS.ASSESSMENT_TASKS, 'studentId', user.id);
      allTasks.sort((a, b) => b.timestamp - a.timestamp);
      setTasks(allTasks);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadTasks();
  }, [user]);

  useEffect(() => {
    const unread = notifications.filter(n => n.type === 'assessment' && !n.isRead);
    if (unread.length > 0) unread.forEach(n => markAsRead(n.id));
  }, [notifications, markAsRead]);

  const handleOpenTask = (task: any) => {
    setActiveTask(task);
    setTaskAnswers({});
    markAsRead(`asmt-task-${task.id}`);
    markAsRead(`asmt-eval-${task.id}`);
  };

  const handleSubmitTask = async () => {
    if (!activeTask || !user) return;

    const questions = activeTask.questions || ['Please describe your current stress level.'];
    const unanswered = questions.some((_: string, i: number) => !taskAnswers[i]);

    if (unanswered) {
      toast({
        variant: "destructive",
        title: "Incomplete Form",
        description: "Please answer all clinical questions before submitting.",
      });
      return;
    }

    const submissionDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    await storageService.create(STORAGE_KEYS.ASSESSMENTS, {
      studentId: user.id,
      studentName: user.name,
      date: submissionDate,
      summary: `Clinical Response to: ${activeTask.title}`,
      answers: taskAnswers,
      questions,
      stressLevel: 50,
      focusAreas: ['Clinical Assignment'],
      timestamp: Date.now(),
      taskId: activeTask.id,
      type: 'CLINICAL_FORM',
      status: 'submitted'
    });

    await storageService.update(STORAGE_KEYS.ASSESSMENT_TASKS, activeTask.id, {
      status: 'submitted',
      lastUpdate: Date.now()
    });

    supabase.from('profiles').update({
      last_assessment_at: new Date().toISOString(),
    }).eq('id', user.id).then(() => {});

    toast({
      title: "Task Submitted",
      description: "Your answers have been sent to your counselor for analysis.",
    });

    setActiveTask(null);
    loadTasks();
  };

  const pastYearFeedbacks = HISTORICAL_FEEDBACKS.filter(f => f.academicYear.includes('2024'));
  const currentYearFeedbacks = HISTORICAL_FEEDBACKS.filter(f => f.academicYear.includes('2025'));

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <main className="p-8 max-w-7xl mx-auto w-full min-h-screen">
          <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1">Clinical Oversight & Growth</h1>
              <p className="text-sm text-muted-foreground font-medium">Review your assigned clinical forms and compare historical counselor feedback across academic years.</p>
            </div>
            <Badge variant="outline" className="h-9 px-5 rounded-xl border-primary/20 bg-white text-primary font-black uppercase text-[9px] tracking-widest flex items-center gap-2 shadow-sm">
              <ShieldCheck className="h-4 w-4" /> Professional Clinical Space
            </Badge>
          </header>

          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mb-8 bg-slate-100/60 p-1.5 h-14 rounded-2xl shadow-inner">
              <TabsTrigger value="tasks" className="rounded-xl font-black text-sm gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary transition-all relative">
                <ClipboardList className="h-4 w-4" /> Clinical Tasks
                {tasks.filter(t => t.status === 'pending').length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-[10px] text-white font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {tasks.filter(t => t.status === 'pending').length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="feedback" className="rounded-xl font-black text-sm gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary transition-all">
                <History className="h-4 w-4" /> YoY Growth & Feedback
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Clinical Tasks */}
            <TabsContent value="tasks" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.map(task => (
                  <Card key={task.id} className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2rem] overflow-hidden flex flex-col group hover:shadow-2xl transition-all">
                    <div className={`h-2.5 w-full ${task.status === 'completed' || task.status === 'submitted' ? 'bg-emerald-500' : 'bg-primary'}`} />
                    <CardHeader className="p-8 pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold">
                          📋
                        </div>
                        <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest border-none px-3 py-1 ${task.status === 'completed' || task.status === 'submitted' ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                          {task.status === 'completed' ? 'Evaluated' : task.status === 'submitted' ? 'Awaiting Review' : 'New Assignment'}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors">{task.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest pt-2 text-slate-400">
                        <User className="h-3 w-3" /> Dr. {task.counselorName?.split(' ').pop()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 flex-1 flex flex-col">
                      <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">{task.description}</p>
                      <div className="mt-auto space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <Clock className="h-3 w-3" /> Assigned: {task.date}
                        </div>
                        {task.status === 'pending' ? (
                          <Button onClick={() => handleOpenTask(task)} className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-black gap-2 group/btn shadow-lg shadow-primary/20">
                            Complete Clinical Form <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          </Button>
                        ) : task.status === 'submitted' ? (
                          <div className="flex items-center gap-2 text-emerald-600 font-black text-xs pt-2">
                            <CheckCircle2 className="h-4 w-4" /> Form Submitted
                          </div>
                        ) : (
                          <div className="space-y-4 pt-4 border-t border-slate-50">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Rating</span>
                              <div className="flex items-center gap-1">
                                <span className="text-lg font-black text-primary">{task.counselorRating}</span>
                                <span className="text-[10px] font-bold text-slate-300">/10</span>
                              </div>
                            </div>
                            <div className="p-3.5 rounded-xl bg-slate-50 text-xs font-medium text-slate-600 italic border border-slate-100">
                              "{task.counselorComments || 'Reviewed by counselor.'}"
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {tasks.length === 0 && (
                  <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-400 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200/60 shadow-sm">
                    <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-4 text-slate-300">
                      <ClipboardList className="h-8 w-8" />
                    </div>
                    <p className="font-black text-xl text-slate-700 mb-1">No assigned tasks currently</p>
                    <p className="text-sm font-medium text-slate-400">Your counselor has not assigned any clinical intake forms or follow-up questionnaires.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 2: YoY Growth & Historical Feedback Comparison */}
            <TabsContent value="feedback" className="space-y-10 animate-in fade-in-50 duration-300">
              {/* Year-over-Year Summary Header */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[2rem] overflow-hidden p-8 flex flex-col justify-between relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10 font-black text-8xl">2024</div>
                  <div>
                    <Badge className="bg-white/10 hover:bg-white/20 text-white border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 mb-6">
                      Previous Year Baseline
                    </Badge>
                    <h3 className="text-2xl font-black mb-1">2024 — 2025</h3>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">Academic stress baseline recorded during freshman/sophomore transitions.</p>
                  </div>
                  <div className="pt-8 border-t border-white/10 mt-6 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Avg Stress</p>
                      <p className="text-3xl font-black text-red-400">73 <span className="text-xs text-slate-400 font-bold">/100</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Clinical Score</p>
                      <p className="text-3xl font-black text-amber-400">6.7 <span className="text-xs text-slate-400 font-bold">/10</span></p>
                    </div>
                  </div>
                </Card>

                <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-[2rem] overflow-hidden p-8 flex flex-col justify-between relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10 font-black text-8xl">2025</div>
                  <div>
                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 mb-6">
                      Current Year Growth
                    </Badge>
                    <h3 className="text-2xl font-black mb-1">2025 — 2026</h3>
                    <p className="text-xs text-emerald-100 font-medium leading-relaxed">Substantial emotional resilience and normalized coping mechanisms achieved.</p>
                  </div>
                  <div className="pt-8 border-t border-white/20 mt-6 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest text-emerald-200">Avg Stress</p>
                      <p className="text-3xl font-black text-white">42 <span className="text-xs text-emerald-200 font-bold">/100</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest text-emerald-200">Clinical Score</p>
                      <p className="text-3xl font-black text-white">8.9 <span className="text-xs text-emerald-200 font-bold">/10</span></p>
                    </div>
                  </div>
                </Card>

                <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden p-8 flex flex-col justify-between border border-slate-100">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-[10px] uppercase tracking-widest px-3 py-1">
                        YoY Improvement
                      </Badge>
                      <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 mb-2">-42% Stress Drop</h3>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                      Your clinical progression indicates highly successful stress management adaptation and improved academic coping capacity.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3 mt-6 border border-slate-100">
                    <Sparkles className="h-5 w-5 text-primary shrink-0" />
                    <p className="text-xs font-bold text-slate-700">Counselor status: Ready for independent graduation transition.</p>
                  </div>
                </Card>
              </div>

              {/* Side-by-Side Evaluation Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Past Year Column */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-4 bg-slate-100/80 rounded-2xl border border-slate-200">
                    <div className="h-8 w-8 rounded-xl bg-slate-300 text-slate-700 flex items-center justify-center font-black text-xs">24</div>
                    <div>
                      <h4 className="font-black text-slate-800 text-base">2024 — 2025 Evaluations</h4>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Historical Baseline Records</p>
                    </div>
                  </div>

                  {pastYearFeedbacks.map(fb => (
                    <Card key={fb.id} className="border-none shadow-lg bg-white rounded-3xl overflow-hidden hover:shadow-xl transition-all border border-slate-100">
                      <CardHeader className="p-6 pb-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-2xl">{fb.icon}</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${fb.badgeColor}`}>
                            Stress Rating: {fb.stressRating}/100
                          </span>
                        </div>
                        <CardTitle className="text-lg font-black text-slate-900">{fb.focus}</CardTitle>
                        <CardDescription className="flex items-center gap-2 font-bold text-xs pt-1 text-slate-400">
                          <Clock className="h-3 w-3" /> {fb.date} — {fb.counselor}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 pt-2">
                        <div className="p-4 bg-slate-50 rounded-2xl text-xs font-medium text-slate-600 leading-relaxed italic border border-slate-100">
                          "{fb.notes}"
                        </div>
                        <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <span>Clinical Resilience Score</span>
                          <span className="font-black text-slate-700 text-sm">{fb.clinicalScore} / 10</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Current Year Column */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <div className="h-8 w-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs">25</div>
                    <div>
                      <h4 className="font-black text-emerald-950 text-base">2025 — 2026 Evaluations</h4>
                      <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest">Current Active Progress</p>
                    </div>
                  </div>

                  {currentYearFeedbacks.map(fb => (
                    <Card key={fb.id} className="border-none shadow-lg bg-white rounded-3xl overflow-hidden hover:shadow-xl transition-all border-2 border-emerald-100">
                      <CardHeader className="p-6 pb-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-2xl">{fb.icon}</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${fb.badgeColor}`}>
                            Stress Rating: {fb.stressRating}/100
                          </span>
                        </div>
                        <CardTitle className="text-lg font-black text-slate-900">{fb.focus}</CardTitle>
                        <CardDescription className="flex items-center gap-2 font-bold text-xs pt-1 text-slate-400">
                          <Clock className="h-3 w-3" /> {fb.date} — {fb.counselor}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 pt-2">
                        <div className="p-4 bg-emerald-50/50 rounded-2xl text-xs font-medium text-emerald-900 leading-relaxed italic border border-emerald-100/50">
                          "{fb.notes}"
                        </div>
                        <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <span>Clinical Resilience Score</span>
                          <span className="font-black text-emerald-600 text-sm">{fb.clinicalScore} / 10</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Glowing AI Summary Growth Card */}
              <Card className="border-none shadow-2xl bg-gradient-to-r from-primary/10 via-emerald-500/10 to-teal-500/10 p-8 rounded-[2.5rem] border border-primary/20 flex flex-col md:flex-row items-center gap-6">
                <div className="h-16 w-16 rounded-3xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xl shadow-primary/30">
                  <Sparkles className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 mb-2">Guidi AI Growth Insight</h4>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed">
                    "Comparing your historical clinical intake records from November 2024 with recent evaluations shows exceptional growth. You have successfully replaced exam panic responses with structured study breaks and open counselor communication. Your overall emotional stability score ranks in the top 15% of university progress cohorts."
                  </p>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

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
                        <span className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
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
                <Button onClick={handleSubmitTask} className="flex-1 h-14 rounded-2xl font-black bg-primary text-white shadow-lg shadow-primary/20">Submit Analysis</Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
