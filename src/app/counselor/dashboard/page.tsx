"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Plus,
  Play,
  ClipboardList,
  Users,
  TrendingUp,
  Activity
} from 'lucide-react';
import { format, isThisWeek, isThisMonth } from 'date-fns';
import Link from 'next/link';
import { useLiveSync } from '@/hooks/useLiveSync';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';

export default function CounselorDashboard() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [analyticsTab, setAnalyticsTab] = useState<'volume' | 'concerns'>('volume');
  
  const loadData = React.useCallback(async () => {
    const [allApts, allAssessments] = await Promise.all([
      storageService.getAll<any>(STORAGE_KEYS.APPOINTMENTS),
      storageService.getAll<any>(STORAGE_KEYS.ASSESSMENTS),
    ]);
    setAppointments(allApts);
    setAssessments(allAssessments);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useLiveSync(() => {
    loadData();
  });

  const todaySessions = appointments.filter(a => a.date === format(new Date(), 'yyyy-MM-dd'));
  const pendingCount = appointments.filter(a => a.status === APPOINTMENT_STATUS.PENDING).length;

  // Safe local date parser
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const thisWeeksSessions = appointments.filter(a => {
    if (!a.date) return false;
    return isThisWeek(parseLocalDate(a.date), { weekStartsOn: 1 });
  });

  const thisMonthsSessions = appointments.filter(a => {
    if (!a.date) return false;
    return isThisMonth(parseLocalDate(a.date));
  });

  const completedWeeksSessions = thisWeeksSessions.filter(a => a.status === 'completed');
  const weeklyCompletionRate = Math.min(100, Math.round((completedWeeksSessions.length / 10) * 100));

  // Dynamic Recharts Data: Session Volume over the last 7 days (including today)
  const sessionVolumeData = React.useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return format(d, 'yyyy-MM-dd');
    }).reverse();

    return last7Days.map(dateStr => {
      const count = appointments.filter(a => a.date === dateStr).length;
      const completed = appointments.filter(a => a.date === dateStr && a.status === 'completed').length;
      const parsed = parseLocalDate(dateStr);
      const label = format(parsed, 'eee dd');
      return {
        day: label,
        'Total Sessions': count,
        'Completed Sessions': completed
      };
    });
  }, [appointments]);

  // Dynamic Recharts Data: Student Concerns Breakdown (from live appointments)
  const sessionTypeBreakdown = React.useMemo(() => {
    const counts: Record<string, number> = {
      'Wellness Check-in': 0,
      'Academic Stress': 0,
      'Personal Concerns': 0,
      'Career Guidance': 0,
      'Mental Health Support': 0,
    };

    appointments.forEach(a => {
      if (a.type && a.type in counts) {
        counts[a.type] += 1;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      'Sessions': value
    }));
  }, [appointments]);

  const stats = [
    { label: "Today's Sessions", value: todaySessions.length.toString(), icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50", badge: "Today" },
    { label: "Pending Requests", value: pendingCount.toString(), icon: CheckCircle2, color: "text-amber-600", bg: "bg-amber-50", badge: "Queue" },
    { label: "Total Assessments", value: assessments.length.toString(), icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50", badge: "History" },
    { label: "Priority Cases", value: assessments.filter(a => a.stressLevel > 75).length.toString(), icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", badge: "Review" },
  ];

  const incomingQueue = appointments
    .filter(a => a.status === APPOINTMENT_STATUS.PENDING)
    .slice(0, 4);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
          Maayong Adlaw, Guidance Office
        </h1>
        <p className="text-muted-foreground font-medium">
          Managing campus wellness and student synchronize schedules for {format(new Date(), 'EEEE, MMM do')}.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-slate-100 text-muted-foreground bg-slate-50/50">
                  {stat.badge}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-black text-slate-900">Today's Schedule</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs font-bold text-primary hover:bg-primary/5">
                <Link href="/counselor/appointments">View Full Queue</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {todaySessions.length > 0 ? todaySessions.map((item, idx) => (
                  <div key={item.id} className="p-8 flex items-center gap-8 relative">
                    <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-100" />
                    <div className={`relative z-10 h-8 w-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${idx === 0 ? 'bg-primary' : 'bg-slate-200'}`}>
                        {idx === 0 ? <Play className="h-3 w-3 text-white fill-current" /> : <div className="h-2 w-2 rounded-full bg-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-black text-slate-900">{item.studentName}</h4>
                        <Badge className={`text-[9px] font-black uppercase tracking-tighter ${item.status === 'confirmed' ? 'text-emerald-500 bg-emerald-50' : 'text-blue-500 bg-blue-50'} border-none`}>
                          {item.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <Clock className="h-3 w-3" /> {item.time} — {item.type}
                      </div>
                    </div>
                    <Button asChild variant={idx === 0 ? "default" : "outline"} className="rounded-xl font-black text-xs h-10 px-6">
                      <Link href="/counselor/appointments">Manage</Link>
                    </Button>
                  </div>
                )) : (
                  <div className="p-12 text-center text-slate-400 font-bold italic">No sessions scheduled for today.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recharts Guidance Analytics Card */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <div>
                  <CardTitle className="text-lg font-black text-slate-900">Guidance Analytics</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Real-time consultation trends and wellness breakdown.</CardDescription>
                </div>
              </div>
              
              {/* Premium toggle buttons for chart views */}
              <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 items-center gap-1">
                <button
                  onClick={() => setAnalyticsTab('volume')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    analyticsTab === 'volume'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Session Activity
                </button>
                <button
                  onClick={() => setAnalyticsTab('concerns')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    analyticsTab === 'concerns'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Student Concerns
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-8 h-[340px]">
              {analyticsTab === 'volume' ? (
                sessionVolumeData.some(d => d['Total Sessions'] > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sessionVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickCount={5} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontSize: 11, fontWeight: 700 }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 10, fontWeight: 800, paddingTop: 10 }}
                      />
                      <Area type="monotone" dataKey="Total Sessions" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" dot={{ fill: '#6366f1', r: 3, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                      <Area type="monotone" dataKey="Completed Sessions" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCompleted)" dot={{ fill: '#10b981', r: 3, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                    <TrendingUp className="h-10 w-10 text-slate-200" />
                    <p className="text-sm font-bold text-slate-400">No session volume logged this week</p>
                    <p className="text-xs text-slate-300">New appointments scheduled on GuidanceSync will show up here automatically.</p>
                  </div>
                )
              ) : (
                sessionTypeBreakdown.some(d => d.Sessions > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sessionTypeBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickCount={5} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontSize: 11, fontWeight: 700 }}
                      />
                      <Bar dataKey="Sessions" radius={[8, 8, 0, 0]} barSize={40}>
                        {sessionTypeBreakdown.map((entry, index) => {
                          const colors = ['#6366f1', '#3b82f6', '#8b5cf6', '#f97316', '#ec4899'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                    <Activity className="h-10 w-10 text-slate-200" />
                    <p className="text-sm font-bold text-slate-400">No category concerns breakdown yet</p>
                    <p className="text-xs text-slate-300">Complete student consultation profiles to display your primary wellness segments.</p>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-0 shadow-lg shadow-slate-200/40 bg-white rounded-3xl overflow-hidden">
            <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm font-black">Incoming Queue</CardTitle>
              </div>
              <Badge className="bg-primary text-white border-none font-black text-[9px] px-2 h-5">{pendingCount} New</Badge>
            </CardHeader>
            <CardContent className="p-4 pt-4 space-y-2">
              {incomingQueue.map((student, i) => (
                <Link key={i} href="/counselor/appointments" className="p-3 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-colors flex items-center gap-3 cursor-pointer group">
                  <Avatar className="h-10 w-10 ring-2 ring-white">
                    <AvatarImage src={`https://picsum.photos/seed/${student.studentId}/64/64`} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{student.studentName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 mb-0.5">{student.studentName}</p>
                    <p className="text-[10px] font-medium truncate text-slate-400">
                      {student.type}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                </Link>
              ))}
              {incomingQueue.length === 0 && <p className="text-xs text-center text-slate-400 py-4 italic">No pending requests.</p>}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-slate-200/40 bg-white rounded-3xl p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                <CardTitle className="text-sm font-black">Consultation Load</CardTitle>
              </div>
              <Badge className="bg-indigo-50 text-indigo-700 border-none font-black text-[9px] px-2 h-5">Real-time</Badge>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">This Week</span>
                  <span className="text-lg font-black text-slate-900">{thisWeeksSessions.length}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">This Month</span>
                  <span className="text-lg font-black text-slate-900">{thisMonthsSessions.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-500">Weekly Target Progress</span>
                  <span className="text-slate-800">{completedWeeksSessions.length} / 10 Sessions</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.round((completedWeeksSessions.length / 10) * 100))}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-bold leading-tight pt-1">
                  Completed {completedWeeksSessions.length} counselor consultations against recommended target.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full rounded-xl border-slate-200 text-xs font-black h-10 hover:bg-slate-50">
                <Link href="/counselor/session-records" className="flex items-center justify-center gap-1">
                  View Detailed Records <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform animate-none" />
                </Link>
              </Button>
            </div>
          </Card>

          <Card className="border-0 shadow-lg shadow-slate-200/40 bg-primary rounded-3xl p-6 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="font-black text-lg mb-2">Clinical Insights</h3>
              <p className="text-white/70 text-xs mb-6">Analyze {assessments.length} student wellness profiles to prepare for professional consultations.</p>
              <Button asChild variant="secondary" className="w-full bg-white text-primary font-black rounded-xl">
                <Link href="/counselor/assessments">Go to Assessments</Link>
              </Button>
            </div>
            <Users className="absolute -bottom-4 -right-4 h-32 w-32 text-white/10 group-hover:scale-110 transition-transform" />
          </Card>
        </div>
      </div>
    </div>
  );
}
