"use client";

import React from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
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
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

const moodData = [
  { day: 'Mon', mood: 6, stress: 8 },
  { day: 'Tue', mood: 7, stress: 7 },
  { day: 'Wed', mood: 5, stress: 9 },
  { day: 'Thu', mood: 8, stress: 5 },
  { day: 'Fri', mood: 8, stress: 4 },
  { day: 'Sat', mood: 9, stress: 3 },
  { day: 'Sun', mood: 9, stress: 2 },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0] || 'Student';

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto w-full">
          {/* Hero Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-bold font-headline text-[#171717] mb-2">Kumusta, {firstName}?</h1>
              <p className="text-muted-foreground">Here is a look at your wellness data for this week.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-xl font-bold h-12 px-6 border-primary/20 text-primary hover:bg-primary/5">
                Download Report
              </Button>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg px-6 h-12 flex items-center gap-2">
                <Heart className="h-5 w-5 fill-current" /> Daily Check-in
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Wellness Trends Analysis */}
            <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden flex flex-col bg-white">
              <CardHeader className="pb-2 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Wellness Trends
                    </CardTitle>
                    <CardDescription>Visualizing your mood and stress levels over the last 7 days.</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-3 py-1">
                    Improving
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={moodData}>
                    <defs>
                      <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#248F7D" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#248F7D" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 12}}
                    />
                    <YAxis 
                      hide
                      domain={[0, 10]}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="mood" 
                      stroke="#248F7D" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorMood)" 
                      name="Mood Level"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="stress" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Stress Level"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
              <div className="p-4 border-t bg-slate-50/50 flex items-center justify-around gap-4">
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Avg Mood</p>
                  <p className="text-xl font-black text-primary">7.5</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Peak Stress</p>
                  <p className="text-xl font-black text-orange-500">Wed</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Assessments</p>
                  <p className="text-xl font-black text-blue-600">4/4</p>
                </div>
              </div>
            </Card>

            {/* Quick Insights Sidebar */}
            <div className="flex flex-col gap-6">
              <Card className="bg-primary border-none shadow-md p-6 text-white relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                    <Brain className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">AI Insights</h3>
                  <p className="text-emerald-50/80 text-sm leading-relaxed mb-6">
                    "Your mood peaks when you engage in social activities on weekends. Try scheduling a study group for mid-week."
                  </p>
                  <Button variant="secondary" className="bg-white text-primary hover:bg-emerald-50 font-bold w-full rounded-xl">
                    Full Analysis
                  </Button>
                </div>
                <Zap className="absolute -bottom-4 -right-4 h-32 w-32 text-white/5 group-hover:scale-110 transition-transform duration-500" />
              </Card>

              <Card className="border-none shadow-sm p-6 bg-white flex-1">
                <h4 className="font-bold text-muted-foreground text-[10px] uppercase tracking-widest mb-4">Wellness Goals</h4>
                <div className="space-y-4">
                  {[
                    { label: 'Sleep Quality', value: 85, color: 'bg-indigo-500' },
                    { label: 'Activity Level', value: 45, color: 'bg-emerald-500' },
                    { label: 'Stress Management', value: 70, color: 'bg-orange-500' },
                  ].map((goal) => (
                    <div key={goal.label} className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span>{goal.label}</span>
                        <span className="text-muted-foreground">{goal.value}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${goal.color} transition-all duration-1000`} 
                          style={{ width: `${goal.value}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Personal Wellness Score */}
            <Card className="border-none shadow-sm p-6 flex flex-col justify-between overflow-hidden relative">
              <div>
                <h4 className="font-bold text-muted-foreground text-[10px] uppercase tracking-widest mb-6">Overall Score</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-primary tracking-tighter">84</span>
                  <span className="text-lg font-bold text-muted-foreground">/100</span>
                </div>
                <p className="text-sm font-medium text-emerald-600 mt-4 flex items-center gap-1">
                  <ArrowUpRight className="h-4 w-4" /> 12% improvement from last week
                </p>
              </div>
              <div className="mt-8 flex gap-2">
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none font-bold">Resilient</Badge>
                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none font-bold">Consistent</Badge>
              </div>
            </Card>

            {/* Next Appointment Card */}
            <Card className="border-none shadow-sm p-6 relative group overflow-hidden">
              <h4 className="font-bold text-muted-foreground text-[10px] uppercase tracking-widest mb-6">Upcoming Session</h4>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-primary border border-primary/10">
                  <span className="text-xs font-black uppercase tracking-tighter">Jun</span>
                  <span className="text-xl font-black leading-none">15</span>
                </div>
                <div>
                  <p className="font-bold text-sm">Follow-up Session</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" /> 10:00 AM • Dr. Ramos
                  </p>
                </div>
              </div>
              <Button variant="outline" className="w-full font-bold rounded-xl border-primary/20 text-primary hover:bg-primary/5 group-hover:bg-primary group-hover:text-white transition-all">
                Reschedule
              </Button>
            </Card>

            {/* Quick Actions / Tips */}
            <Card className="border-none shadow-sm p-6 bg-slate-50/50">
              <h4 className="font-bold text-muted-foreground text-[10px] uppercase tracking-widest mb-6">Recommended Actions</h4>
              <div className="space-y-4">
                <div className="p-3 bg-white rounded-xl border border-primary/5 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                    <Heart className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold">5-Min Box Breathing</p>
                    <p className="text-[10px] text-muted-foreground">Manage immediate stress</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="p-3 bg-white rounded-xl border border-primary/5 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold">Weekly Review</p>
                    <p className="text-[10px] text-muted-foreground">Complete your summary</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
