"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  Users
} from 'lucide-react';
import { format, isThisWeek } from 'date-fns';
import Link from 'next/link';

export default function CounselorDashboard() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  
  useEffect(() => {
    const loadData = async () => {
      const [allApts, allAssessments] = await Promise.all([
        storageService.getAll<any>(STORAGE_KEYS.APPOINTMENTS),
        storageService.getAll<any>(STORAGE_KEYS.ASSESSMENTS),
      ]);
      setAppointments(allApts);
      setAssessments(allAssessments);
    };
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const todaySessions = appointments.filter(a => a.date === format(new Date(), 'yyyy-MM-dd'));
  const pendingCount = appointments.filter(a => a.status === APPOINTMENT_STATUS.PENDING).length;

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
