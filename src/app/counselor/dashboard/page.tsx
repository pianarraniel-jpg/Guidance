"use client";

import React from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import CounselorDashboardLayout from '@/components/layout/CounselorDashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  MessageSquare, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MoreHorizontal, 
  ChevronRight,
  Plus,
  Play
} from 'lucide-react';

export default function CounselorDashboard() {
  const { user } = useAuth();
  const lastName = user?.name.split(' ').pop() || 'Counselor';

  const stats = [
    { label: "Today's Sessions", value: "6", icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50", badge: "Today" },
    { label: "Pending Confirmations", value: "4", icon: CheckCircle2, color: "text-amber-600", bg: "bg-amber-50", badge: "Action Req." },
    { label: "Unread Messages", value: "12", icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50", badge: "New" },
    { label: "Students This Week", value: "28", icon: Users, color: "text-slate-600", bg: "bg-slate-50", badge: "Week" },
  ];

  const schedule = [
    { 
      id: 1, 
      name: "Marcus Thompson", 
      time: "9:00 AM", 
      type: "General Anxiety Follow-up", 
      status: "High Stress Warning",
      statusColor: "text-red-500 bg-red-50",
      action: "Start Session",
      primaryAction: true
    },
    { 
      id: 2, 
      name: "Elena Rodriguez", 
      time: "10:30 AM", 
      type: "Mid-term Stress Review", 
      action: "Reschedule",
      primaryAction: false
    },
    { 
      id: 3, 
      name: "David Chen", 
      time: "1:15 PM", 
      type: "Vocational Guidance", 
      status: "Upcoming",
      statusColor: "text-blue-500 bg-blue-50",
      action: "View Profile",
      primaryAction: false
    }
  ];

  const studentQueue = [
    { name: "Sarah Miller", status: "Critical Stress Spike (Level 4)", risk: true },
    { name: "James Wilson", status: "Awaiting Intake Review", risk: false },
  ];

  const recentSummaries = ["#Thompson_Oct24", "#Chen_Oct21", "#Mendoza_Oct20"];

  return (
    <ProtectedRoute allowedRoles={['counselor']}>
      <CounselorDashboardLayout>
        <div className="p-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <header className="mb-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              Good morning, Dr. {lastName}
            </h1>
            <p className="text-muted-foreground font-medium">
              Here is an overview of your wellness support queue for Tuesday, Oct 24th.
            </p>
          </header>

          {/* Quick Stats Cards */}
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
            {/* Main Schedule Timeline */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
                <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-black text-slate-900">Today's Schedule</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs font-bold text-primary hover:bg-primary/5">
                    View Calendar
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-50">
                    {schedule.map((item, idx) => (
                      <div key={item.id} className="p-8 flex items-center gap-8 relative">
                        {/* Timeline Marker */}
                        <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-100" />
                        <div className={`relative z-10 h-8 w-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${idx === 0 ? 'bg-primary' : 'bg-slate-200'}`}>
                           {idx === 0 ? <Play className="h-3 w-3 text-white fill-current" /> : <div className="h-2 w-2 rounded-full bg-slate-400" />}
                        </div>

                        {/* Session Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-black text-slate-900">{item.name}</h4>
                            {item.status && (
                              <Badge className={`text-[9px] font-black uppercase tracking-tighter ${item.statusColor} border-none`}>
                                {item.status}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                            <Clock className="h-3 w-3" /> {item.time} — {item.type}
                          </div>
                        </div>

                        {/* Action */}
                        <Button 
                          variant={item.primaryAction ? "default" : "outline"} 
                          className={`rounded-xl font-black text-xs h-10 px-6 ${
                            item.primaryAction ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20' : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {item.action}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Widgets */}
            <div className="lg:col-span-4 space-y-6">
              {/* Availability Picker */}
              <Card className="border-0 shadow-lg shadow-slate-200/40 bg-white rounded-3xl overflow-hidden">
                <CardHeader className="p-6 border-b flex flex-row items-center justify-between pb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-black">Your Availability</CardTitle>
                  </div>
                  <MoreHorizontal className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-7 gap-2 mb-6">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-300">{day}</span>
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${i === 1 ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-50'}`}>
                          {23 + i}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-xs font-bold text-slate-700">Morning Block</span>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black uppercase">Busy</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-xs font-bold text-slate-700">Lunch Hour</span>
                      <Badge variant="outline" className="bg-slate-100 text-slate-400 border-none text-[9px] font-black uppercase">Locked</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Student Queue */}
              <Card className="border-0 shadow-lg shadow-slate-200/40 bg-white rounded-3xl overflow-hidden">
                <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <CardTitle className="text-sm font-black">Student Queue</CardTitle>
                  </div>
                  <Badge className="bg-red-500 text-white border-none font-black text-[9px] px-2 h-5">2 Alerts</Badge>
                </CardHeader>
                <CardContent className="p-4 pt-4 space-y-2">
                  {studentQueue.map((student, i) => (
                    <div key={i} className="p-3 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-colors flex items-center gap-3 cursor-pointer group">
                      <Avatar className="h-10 w-10 ring-2 ring-white">
                        <AvatarImage src={`https://picsum.photos/seed/${student.name}/64/64`} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{student.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 mb-0.5">{student.name}</p>
                        <p className={`text-[10px] font-medium truncate ${student.risk ? 'text-red-500' : 'text-slate-400'}`}>
                          {student.status}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Summaries */}
              <Card className="border-0 shadow-lg shadow-slate-200/40 bg-white rounded-3xl overflow-hidden">
                <CardHeader className="p-6 pb-2">
                   <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-black">Recent Summaries</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 flex flex-wrap gap-2">
                  {recentSummaries.map((tag) => (
                    <div key={tag} className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-500 hover:text-primary hover:border-primary/20 transition-all cursor-pointer">
                      {tag}
                    </div>
                  ))}
                  <div className="px-3 py-1.5 rounded-lg border border-dashed border-slate-200 text-[10px] font-black text-slate-300 hover:text-primary hover:border-primary/20 transition-all cursor-pointer flex items-center gap-1">
                    <Plus className="h-3 w-3" /> More
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </CounselorDashboardLayout>
    </ProtectedRoute>
  );
}
