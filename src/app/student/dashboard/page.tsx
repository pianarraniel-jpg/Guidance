"use client";

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Calendar,
  ChevronRight,
  Heart,
  TrendingUp,
  Brain,
  Zap,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ClipboardList,
  Play,
  Plus,
  Trash2,
  ListTodo,
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { useLiveSync } from '@/hooks/useLiveSync';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import BreathingExerciseModal from '@/components/wellness/BreathingExerciseModal';

interface ChartPoint {
  day: string;
  stress: number;
  mood: number;
}

interface RecentSession {
  id: string;
  date: string;
  timestamp: number;
  stressLevel: number | null;
  emotionalState: string | null;
  summary: string | null;
}

interface ChecklistItem {
  id: string;
  text: string;
  category: 'counselor' | 'ai' | 'custom';
  isCompleted: boolean;
  duration?: number;
  dateAssigned: string;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const firstName = user?.name.split(' ')[0] || 'Student';

  const [nextAppointment, setNextAppointment] = useState<any>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [wellnessScore, setWellnessScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Daily Wellness Checklist States
  const [todoList, setTodoList] = useState<ChecklistItem[]>([]);
  const [customTaskText, setCustomTaskText] = useState('');

  // Guided Breathing Modal States
  const [isBreathingModalOpen, setIsBreathingModalOpen] = useState(false);
  const [modalDuration, setModalDuration] = useState(300);
  const [modalTitle, setModalTitle] = useState('Mindfulness Breathing');
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null);

  const loadDashboardData = React.useCallback(async (isBackground = false) => {
    if (!user) return;
    if (!isBackground) {
      setIsLoading(true);
    }

    const [allAssessments, allAppointments, { data: insightRow }, { data: profileRow }] = await Promise.all([
      storageService.getByField<any>(STORAGE_KEYS.ASSESSMENTS, 'studentId', user.id),
      storageService.getByField<any>(STORAGE_KEYS.APPOINTMENTS, 'studentId', user.id),
      supabase.from('ai_insights').select('insight').eq('student_id', user.id).maybeSingle(),
      supabase.from('profiles').select('wellness_score').eq('id', user.id).maybeSingle(),
    ]);

    const assessments = allAssessments.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 7);
    const appointments = allAppointments.filter(a => a.status === APPOINTMENT_STATUS.CONFIRMED);

    const chart: ChartPoint[] = assessments
      .slice()
      .reverse()
      .map(a => {
        const stress = a.stressLevel ?? a.stress_level ?? 5;
        return {
          day: a.timestamp
            ? format(new Date(a.timestamp), 'EEE')
            : (a.date ? format(parseISO(a.date), 'EEE') : '—'),
          stress: stress,
          mood: 10 - stress,
        };
      });
    setChartData(chart);

    const sessions: RecentSession[] = assessments.slice(0, 3).map(a => ({
      id: a.id,
      date: a.timestamp
        ? format(new Date(a.timestamp), 'MMM d')
        : (a.date ?? '—'),
      timestamp: a.timestamp,
      stressLevel: a.stressLevel ?? a.stress_level ?? null,
      emotionalState: a.emotionalState ?? a.emotional_state ?? null,
      summary: a.summary ?? null,
    }));
    setRecentSessions(sessions);

    setAiInsight(insightRow?.insight ?? null);
    setWellnessScore(profileRow?.wellness_score ?? null);

    const startOfToday = startOfDay(new Date());
    const upcoming = appointments.find(a => !isBefore(parseISO(a.date), startOfToday));
    setNextAppointment(upcoming ?? null);

    // Initialize/Load Daily Checklist
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const storageKey = `guidance_todo_${user.id}_${todayStr}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      setTodoList(JSON.parse(saved));
    } else {
      const newItems: ChecklistItem[] = [];
      
      // 1. Counselor Homework (completed actionItems)
      const completedApps = allAppointments.filter(
        a => a.status === 'completed' && a.actionItems && Array.isArray(a.actionItems)
      );
      
      completedApps.forEach(app => {
        app.actionItems.forEach((act: string, index: number) => {
          const isBreath = /(breath|meditat|calm|mindful|inhale|exhale|relax)/i.test(act);
          const durationMatch = act.match(/(\d+)\s*(min|minute)/i);
          const mins = durationMatch ? parseInt(durationMatch[1], 10) : 5;
          
          newItems.push({
            id: `counselor-${app.id}-${index}`,
            text: act,
            category: 'counselor',
            isCompleted: false,
            duration: isBreath ? mins * 60 : undefined,
            dateAssigned: app.date
          });
        });
      });
      
      // 2. Parse AI Insight suggestions
      if (insightRow?.insight) {
        const text: string = insightRow.insight;
        const lines = text
          .split(/[.\n]/)
          .map(l => l.trim())
          .filter(l => l.length > 10 && (
            l.toLowerCase().includes('try') || 
            l.toLowerCase().includes('recommend') || 
            l.toLowerCase().includes('practice') || 
            l.toLowerCase().includes('limit') || 
            l.toLowerCase().includes('journal')
          ));
        
        if (lines.length > 0) {
          lines.slice(0, 2).forEach((line, index) => {
            const cleanText = line.replace(/^(try to|you should|i recommend|try|recommend)\s+/i, '');
            newItems.push({
              id: `ai-${index}`,
              text: cleanText.charAt(0).toUpperCase() + cleanText.slice(1),
              category: 'ai',
              isCompleted: false,
              dateAssigned: todayStr
            });
          });
        }
      }
      
      // 3. Fallbacks
      if (newItems.length === 0) {
        newItems.push({
          id: 'default-1',
          text: '5-Min Box Breathing Exercise',
          category: 'ai',
          isCompleted: false,
          duration: 300,
          dateAssigned: todayStr
        });
        newItems.push({
          id: 'default-2',
          text: 'Daily Assessment with Guidi AI',
          category: 'ai',
          isCompleted: false,
          dateAssigned: todayStr
        });
        newItems.push({
          id: 'default-3',
          text: 'Write down 3 gratitude points in your notes',
          category: 'ai',
          isCompleted: false,
          dateAssigned: todayStr
        });
      }
      
      localStorage.setItem(storageKey, JSON.stringify(newItems));
      setTodoList(newItems);
    }

    setIsLoading(false);
  }, [user]);


  useEffect(() => {
    loadDashboardData(false);
  }, [loadDashboardData]);

  useLiveSync(() => {
    loadDashboardData(true);
  });

  // Toggle checklist item status
  const toggleTodo = (id: string) => {
    if (!user) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const storageKey = `guidance_todo_${user.id}_${todayStr}`;
    
    const updated = todoList.map(item => {
      if (item.id === id) {
        const nextState = !item.isCompleted;
        if (nextState) {
          toast({
            title: "Task Accomplished! 🎉",
            description: `You checked off: "${item.text}"`,
          });
        }
        return { ...item, isCompleted: nextState };
      }
      return item;
    });
    
    setTodoList(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // Add custom wellness task
  const addCustomTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTaskText.trim() || !user) return;
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const storageKey = `guidance_todo_${user.id}_${todayStr}`;
    
    const isBreath = /(breath|meditat|calm|mindful|inhale|exhale|relax)/i.test(customTaskText);
    const durationMatch = customTaskText.match(/(\d+)\s*(min|minute)/i);
    const mins = durationMatch ? parseInt(durationMatch[1], 10) : 5;
    
    const newItem: ChecklistItem = {
      id: `custom-${Date.now()}`,
      text: customTaskText.trim(),
      category: 'custom',
      isCompleted: false,
      duration: isBreath ? mins * 60 : undefined,
      dateAssigned: todayStr
    };
    
    const updated = [...todoList, newItem];
    setTodoList(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setCustomTaskText('');
    
    toast({
      title: "Wellness Task Added",
      description: `"${newItem.text}" has been added to your daily habits list.`,
    });
  };

  // Delete custom checklist item
  const deleteTodo = (id: string) => {
    if (!user) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const storageKey = `guidance_todo_${user.id}_${todayStr}`;
    
    const updated = todoList.filter(item => item.id !== id);
    setTodoList(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    
    toast({
      title: "Task Removed",
      description: "Mindfulness checklist item has been deleted.",
    });
  };

  // Complete breathing exercise callback
  const handleBreathingComplete = () => {
    if (activeTodoId && user) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const storageKey = `guidance_todo_${user.id}_${todayStr}`;
      
      const updated = todoList.map(item => {
        if (item.id === activeTodoId) {
          return { ...item, isCompleted: true };
        }
        return item;
      });
      
      setTodoList(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setActiveTodoId(null);
    }
  };

  // Computed stats from real chart data
  const avgMood = chartData.length
    ? (chartData.reduce((s, d) => s + d.mood, 0) / chartData.length).toFixed(1)
    : null;
  const peakStressEntry = chartData.length
    ? chartData.reduce((max, d) => (d.stress > max.stress ? d : max), chartData[0])
    : null;

  const getTrendInfo = () => {
    if (chartData.length < 2) return null;
    const recent = chartData.slice(-3);
    const older = chartData.slice(0, Math.max(1, chartData.length - 3));
    const recentAvg = recent.reduce((s, d) => s + d.stress, 0) / recent.length;
    const olderAvg = older.reduce((s, d) => s + d.stress, 0) / older.length;
    if (recentAvg < olderAvg - 0.5) return { label: 'Improving', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', Icon: ArrowDownRight };
    if (recentAvg > olderAvg + 0.5) return { label: 'Increasing Stress', color: 'bg-red-50 text-red-600 border-red-100', Icon: ArrowUpRight };
    return { label: 'Stable', color: 'bg-blue-50 text-blue-700 border-blue-100', Icon: Minus };
  };
  const trend = getTrendInfo();

  const getEmotionalBadgeColor = (state: string | null) => {
    if (!state) return 'bg-slate-100 text-slate-500';
    const s = state.toLowerCase();
    if (s.includes('anxious') || s.includes('stressed') || s.includes('overwhelm')) return 'bg-orange-50 text-orange-600';
    if (s.includes('sad') || s.includes('depress') || s.includes('low')) return 'bg-blue-50 text-blue-600';
    if (s.includes('calm') || s.includes('good') || s.includes('positive')) return 'bg-emerald-50 text-emerald-600';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-bold font-headline text-[#171717] mb-2">Kumusta, {firstName}?</h1>
              <p className="text-muted-foreground">Here is a look at your wellness data.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild className="rounded-xl font-bold h-12 px-6 border-primary/20 text-primary">
                <Link href="/student/appointments">My Schedule</Link>
              </Button>
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg px-6 h-12">
                <Link href="/student/assessments" className="flex items-center gap-2">
                  <Heart className="h-5 w-5 fill-current" /> Daily Check-in
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Wellness Trends Chart */}
            <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden flex flex-col bg-white">
              <CardHeader className="pb-2 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Wellness Trends
                    </CardTitle>
                    <CardDescription>Mood and stress from your check-in sessions.</CardDescription>
                  </div>
                  {trend && (
                    <Badge variant="outline" className={`font-bold px-3 py-1 ${trend.color}`}>
                      <trend.Icon className="h-3 w-3 mr-1" />
                      {trend.label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 h-[320px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#248F7D" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#248F7D" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                      <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickCount={6} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)', fontSize: 12 }}
                        formatter={(val: number, name: string) => [val.toFixed(1), name]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 8 }}
                        formatter={(value) => value === 'mood' ? 'Mood Level' : 'Stress Level'}
                      />
                      <Area type="monotone" dataKey="mood" stroke="#248F7D" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMood)" name="mood" dot={{ fill: '#248F7D', r: 3, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                      <Area type="monotone" dataKey="stress" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorStress)" name="stress" strokeDasharray="5 3" dot={{ fill: '#f97316', r: 3, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                    <TrendingUp className="h-10 w-10 text-slate-100" />
                    <p className="text-sm font-bold text-slate-400">No check-in data yet</p>
                    <p className="text-xs text-slate-300">Complete a session with Guidi to see your trends here.</p>
                  </div>
                )}
              </CardContent>
              <div className="p-4 border-t bg-slate-50/50 flex items-center justify-around gap-4">
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Avg Mood</p>
                  <p className="text-xl font-black text-primary">{avgMood ?? '—'}</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Peak Stress Day</p>
                  <p className="text-xl font-black text-orange-500">{peakStressEntry?.day ?? '—'}</p>
                </div>
              </div>
            </Card>

            <div className="flex flex-col gap-6">
              {/* AI Insights */}
              <Card className="bg-primary border-none shadow-md p-6 text-white relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                    <Brain className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">AI Insights</h3>
                  <p className="text-emerald-50/80 text-sm leading-relaxed mb-6">
                    {aiInsight ?? 'Complete your first check-in with Guidi to receive personalized wellness insights.'}
                  </p>
                  <Button asChild variant="secondary" className="bg-white text-primary hover:bg-emerald-50 font-bold w-full rounded-xl">
                    <Link href="/student/resources">Explore Tips</Link>
                  </Button>
                </div>
                <Zap className="absolute -bottom-4 -right-4 h-32 w-32 text-white/5 group-hover:scale-110 transition-transform" />
              </Card>

              {/* Recent Sessions */}
              <Card className="border-none shadow-sm p-6 bg-white flex-1">
                <h4 className="font-bold text-muted-foreground text-[10px] uppercase tracking-widest mb-4">Recent Sessions</h4>
                {recentSessions.length > 0 ? (
                  <div className="space-y-3">
                    {recentSessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                            <ClipboardList className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{s.date}</p>
                            {s.emotionalState && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${getEmotionalBadgeColor(s.emotionalState)}`}>
                                {s.emotionalState}
                              </span>
                            )}
                          </div>
                        </div>
                        {s.stressLevel != null && (
                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Stress</p>
                            <p className={`text-sm font-black ${s.stressLevel >= 7 ? 'text-red-500' : s.stressLevel >= 4 ? 'text-orange-500' : 'text-emerald-600'}`}>
                              {s.stressLevel}/10
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <ClipboardList className="h-6 w-6 text-slate-100" />
                    <p className="text-xs font-bold text-slate-300 italic">No sessions yet</p>
                  </div>
                )}
                <Link href="/student/assessments" className="mt-4 flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-wider hover:underline">
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              </Card>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Overall Wellness Score */}
            <Card className="border-none shadow-sm p-6 flex flex-col justify-between overflow-hidden relative">
              <div>
                <h4 className="font-bold text-muted-foreground text-[10px] uppercase tracking-widest mb-6">Overall Score</h4>
                {wellnessScore != null ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-black text-primary tracking-tighter">{wellnessScore}</span>
                      <span className="text-lg font-bold text-muted-foreground">/100</span>
                    </div>
                    <p className="text-sm font-medium text-emerald-600 mt-4 flex items-center gap-1">
                      <ArrowUpRight className="h-4 w-4" /> Based on your latest check-in
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <span className="text-4xl font-black text-slate-200 tracking-tighter">—</span>
                    <p className="text-xs text-slate-400 font-medium mt-2">
                      Complete a check-in to generate your wellness score.
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-8 flex gap-2 flex-wrap">
                {wellnessScore != null && wellnessScore >= 70 && <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold">Resilient</Badge>}
                {chartData.length >= 3 && <Badge className="bg-blue-50 text-blue-700 border-none font-bold">Active</Badge>}
              </div>
            </Card>

            {/* Upcoming Session */}
            <Card className="border-none shadow-sm p-6 relative group overflow-hidden">
              <h4 className="font-bold text-muted-foreground text-[10px] uppercase tracking-widest mb-6">Upcoming Session</h4>
              {nextAppointment ? (
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-14 w-14 rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-primary border border-primary/10">
                    <span className="text-xs font-black uppercase tracking-tighter">{format(parseISO(nextAppointment.date), 'MMM')}</span>
                    <span className="text-xl font-black leading-none">{format(parseISO(nextAppointment.date), 'dd')}</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{nextAppointment.type}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" /> {nextAppointment.time} • {nextAppointment.counselorName || nextAppointment.counselor_name}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <p className="text-xs font-bold text-slate-400 italic">No upcoming sessions found.</p>
                </div>
              )}
              <Button asChild variant="outline" className="w-full font-bold rounded-xl border-primary/20 text-primary hover:bg-primary hover:text-white transition-all">
                <Link href="/student/appointments">Manage Bookings</Link>
              </Button>
            </Card>

            {/* Dynamic Daily Wellness Checklist */}
            <Card className="border-none shadow-sm p-6 bg-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-bold text-muted-foreground text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                    <ListTodo className="h-4 w-4 text-primary" /> Daily Wellness Checklist
                  </h4>
                  <Badge className="bg-primary/5 text-primary border-none font-bold text-[9px] px-2 py-0.5 rounded-full">
                    {todoList.filter(t => t.isCompleted).length}/{todoList.length} Done
                  </Badge>
                </div>

                {/* To-Do Items Scroll Container */}
                <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                  {todoList.length > 0 ? (
                    todoList.map((item) => (
                      <div 
                        key={item.id} 
                        className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                          item.isCompleted 
                            ? 'bg-slate-50/50 border-slate-100 opacity-70' 
                            : 'bg-white border-slate-100 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox 
                            id={item.id} 
                            checked={item.isCompleted} 
                            onCheckedChange={() => toggleTodo(item.id)}
                            className="h-4.5 w-4.5 border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary rounded-md transition-all active:scale-90"
                          />
                          <div className="min-w-0">
                            <label 
                              htmlFor={item.id}
                              className={`text-xs font-bold block cursor-pointer truncate ${
                                item.isCompleted ? 'line-through text-slate-400 font-medium' : 'text-slate-700'
                              }`}
                            >
                              {item.text}
                            </label>
                            
                            {/* Tags by Category */}
                            <span className="inline-block mt-1">
                              {item.category === 'counselor' ? (
                                <Badge className="bg-emerald-50 hover:bg-emerald-50 text-emerald-600 border-none font-black text-[9px] h-4.5 px-1.5 py-0 rounded-md">
                                  Counselor Recommended
                                </Badge>
                              ) : item.category === 'ai' ? (
                                <Badge className="bg-purple-50 hover:bg-purple-50 text-purple-600 border-none font-black text-[9px] h-4.5 px-1.5 py-0 rounded-md">
                                  Guidi Recommendation
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-50 hover:bg-blue-50 text-blue-600 border-none font-black text-[9px] h-4.5 px-1.5 py-0 rounded-md">
                                  My Habit
                                </Badge>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Actions Badge/Trigger */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          {item.duration && !item.isCompleted && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setModalDuration(item.duration || 300);
                                setModalTitle(item.text);
                                setActiveTodoId(item.id);
                                setIsBreathingModalOpen(true);
                              }}
                              className="h-7 w-7 p-0 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-all animate-pulse"
                            >
                              <Play className="h-3 w-3 fill-current ml-0.5" />
                            </Button>
                          )}
                          {item.category === 'custom' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteTodo(item.id)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full flex items-center justify-center transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center flex flex-col items-center gap-2">
                      <ListTodo className="h-6 w-6 text-slate-200" />
                      <p className="text-xs text-slate-400 italic font-medium">Your wellness checklist is empty.</p>
                    </div>
                  )}
                </div>

                {/* Checklist Add Form */}
                <form onSubmit={addCustomTask} className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                  <input
                    type="text"
                    placeholder="Add wellness task (e.g. Drink water)..."
                    value={customTaskText}
                    onChange={(e) => setCustomTaskText(e.target.value)}
                    className="flex-1 text-xs border border-slate-100 bg-slate-50/50 rounded-xl px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/30"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="h-8 w-8 bg-primary hover:bg-primary/95 text-white rounded-xl shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>
              </div>

              {/* Quick Guided breathing exercises triggers */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Guided Exercises</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setModalDuration(300);
                      setModalTitle("5-Min Box Breathing");
                      setActiveTodoId(null);
                      setIsBreathingModalOpen(true);
                    }}
                    className="flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-slate-100/70 rounded-2xl text-left border border-slate-100/40 group transition-all"
                  >
                    <div className="h-7 w-7 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                      <Heart className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-700 truncate group-hover:text-primary transition-colors">5-Min Box Breath</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setModalDuration(600);
                      setModalTitle("10-Min Deep Calm Breathing");
                      setActiveTodoId(null);
                      setIsBreathingModalOpen(true);
                    }}
                    className="flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-slate-100/70 rounded-2xl text-left border border-slate-100/40 group transition-all"
                  >
                    <div className="h-7 w-7 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
                      <Brain className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-700 truncate group-hover:text-primary transition-colors">10-Min Deep Calm</p>
                    </div>
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Guided Breathing Exercise Modal */}
        <BreathingExerciseModal
          isOpen={isBreathingModalOpen}
          onClose={() => setIsBreathingModalOpen(false)}
          duration={modalDuration}
          title={modalTitle}
          onComplete={handleBreathingComplete}
        />

      </DashboardLayout>
    </ProtectedRoute>
  );
}
