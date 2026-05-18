"use client";

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { APPOINTMENT_STATUS } from '@/lib/constants';
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
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO, isAfter } from 'date-fns';

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

export default function StudentDashboard() {
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0] || 'Student';

  const [nextAppointment, setNextAppointment] = useState<any>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [wellnessScore, setWellnessScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setIsLoading(true);

      const [
        { data: assessments },
        { data: insightRow },
        { data: profileRow },
        { data: appointments },
      ] = await Promise.all([
        supabase
          .from('assessments')
          .select('id, stress_level, timestamp, emotional_state, summary, date')
          .eq('student_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(7),
        supabase
          .from('ai_insights')
          .select('insight')
          .eq('student_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('wellness_score')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('appointments')
          .select('*')
          .eq('student_id', user.id)
          .eq('status', APPOINTMENT_STATUS.CONFIRMED)
          .order('date', { ascending: true }),
      ]);

      // Chart — reverse so oldest is on the left
      const chart: ChartPoint[] = (assessments ?? [])
        .slice()
        .reverse()
        .map(a => ({
          day: a.timestamp
            ? format(new Date(a.timestamp), 'EEE')
            : (a.date ? format(parseISO(a.date), 'EEE') : '—'),
          stress: a.stress_level ?? 5,
          mood: 10 - (a.stress_level ?? 5),
        }));
      setChartData(chart);

      // Recent sessions for the sidebar card (last 3)
      const sessions: RecentSession[] = (assessments ?? []).slice(0, 3).map(a => ({
        id: a.id,
        date: a.timestamp
          ? format(new Date(a.timestamp), 'MMM d')
          : (a.date ?? '—'),
        timestamp: a.timestamp,
        stressLevel: a.stress_level,
        emotionalState: a.emotional_state,
        summary: a.summary,
      }));
      setRecentSessions(sessions);

      setAiInsight(insightRow?.insight ?? null);
      setWellnessScore(profileRow?.wellness_score ?? null);

      // Next upcoming confirmed appointment
      const upcoming = (appointments ?? []).find(a => isAfter(parseISO(a.date), new Date()));
      setNextAppointment(upcoming ?? null);

      setIsLoading(false);
    };

    load();
  }, [user]);

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
                      <Clock className="h-3 w-3" /> {nextAppointment.time} • {nextAppointment.counselor_name}
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

            {/* Recommended Actions */}
            <Card className="border-none shadow-sm p-6 bg-slate-50/50">
              <h4 className="font-bold text-muted-foreground text-[10px] uppercase tracking-widest mb-6">Recommended Actions</h4>
              <div className="space-y-4">
                <Link href="/student/resources" className="p-3 bg-white rounded-xl border border-primary/5 flex items-center gap-3 hover:shadow-md transition-shadow group">
                  <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                    <Heart className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold">5-Min Box Breathing</p>
                    <p className="text-[10px] text-muted-foreground">Manage immediate stress</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link href="/student/assessments" className="p-3 bg-white rounded-xl border border-primary/5 flex items-center gap-3 hover:shadow-md transition-shadow group">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold">Daily Check-in</p>
                    <p className="text-[10px] text-muted-foreground">Chat with Guidi AI</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
