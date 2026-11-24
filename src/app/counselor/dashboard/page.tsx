"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { storageService } from "@/lib/storage-service";
import { STORAGE_KEYS, APPOINTMENT_STATUS, getCollegesForCounselor } from "@/lib/constants";
import { autoExpirePassedAppointments, isAppointmentPassed } from "@/lib/appointment-utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Activity,
  ShieldAlert,
  MonitorSmartphone,
  User,
} from "lucide-react";
import { format, isThisWeek, isThisMonth } from "date-fns";
import Link from "next/link";
import { useLiveSync } from "@/hooks/useLiveSync";
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
  Cell,
} from "recharts";

export default function CounselorDashboard() {
  const { toast } = useToast();
  const { user: counselor } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [unackAlertCount, setUnackAlertCount] = useState(0);
  const [analyticsTab, setAnalyticsTab] = useState<"volume" | "concerns">(
    "volume",
  );

  const loadData = React.useCallback(async () => {
    const isThisCounselor = (apt: any) => {
      if (!counselor) return true;
      const cId = apt.counselorId || apt.counselor_id;
      const cName = apt.counselorName || apt.counselor_name;
      if (cId && counselor.id && cId === counselor.id) return true;
      if (cName && counselor.name && cName.trim().toLowerCase() === counselor.name.trim().toLowerCase()) return true;
      if (!cId && !cName) {
        return !counselor.department || counselor.department.trim().toLowerCase() === 'all';
      }
      return false;
    };
    const handledColleges = getCollegesForCounselor(counselor?.department);
    const isDeptScoped = Boolean(counselor?.department && counselor.department.trim().toLowerCase() !== 'all');
    const [allApts, allAssessments, allUsers, alertsRes] = await Promise.all([
      storageService.getAll<any>(STORAGE_KEYS.APPOINTMENTS),
      storageService.getAll<any>(STORAGE_KEYS.ASSESSMENTS),
      storageService.getAll<any>(STORAGE_KEYS.USERS),
      supabase.from('chat_alerts').select('id, student_id', { count: 'exact' }).eq('acknowledged', false),
    ]);
    const scopedApts = counselor ? allApts.filter(isThisCounselor) : allApts;
    const processedApts = await autoExpirePassedAppointments(scopedApts);
    setAppointments(processedApts);
    let scopedAssessments = allAssessments;
    let alertCount = alertsRes.count ?? 0;

    if (isDeptScoped) {
      const validStudentIds = new Set(
        allUsers
          .filter(u => u.role === 'student' && handledColleges.some(c => u.department === c.code || c.aliases?.includes(u.department)))
          .map(u => u.id)
      );
      scopedAssessments = allAssessments.filter(a => validStudentIds.has(a.studentId));
      if (alertsRes.data) {
        alertCount = alertsRes.data.filter((al: any) => validStudentIds.has(al.student_id)).length;
      }
    }

    setAssessments(scopedAssessments);
    setUnackAlertCount(alertCount);
  }, [counselor]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(`counselor-dashboard-${counselor?.id || 'live'}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_alerts' }, (payload) => {
        const alert = payload.new as any;
        setUnackAlertCount(prev => prev + 1);
        toast({
          variant: 'destructive',
          title: `High-Risk Alert — ${alert.student_name}`,
          description: `Triggered by: "${alert.trigger_phrase}". Go to Chat Monitor to review.`,
          duration: 8000,
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_alerts' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assessments' }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [counselor?.id, loadData, toast]);

  useLiveSync(() => {
    loadData();
  });

  const todaySessions = appointments.filter(
    (a) => a.date === format(new Date(), "yyyy-MM-dd") && a.status !== APPOINTMENT_STATUS.CANCELLED,
  );
  const pendingCount = appointments.filter(
    (a) => a.status === APPOINTMENT_STATUS.PENDING && !isAppointmentPassed(a.date, a.time),
  ).length;

  // Safe local date parser
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const thisWeeksSessions = appointments.filter((a) => {
    if (!a.date) return false;
    return isThisWeek(parseLocalDate(a.date), { weekStartsOn: 1 });
  });

  const thisMonthsSessions = appointments.filter((a) => {
    if (!a.date) return false;
    return isThisMonth(parseLocalDate(a.date));
  });

  const completedWeeksSessions = thisWeeksSessions.filter(
    (a) => a.status === "completed",
  );
  const weeklyCompletionRate = Math.min(
    100,
    Math.round((completedWeeksSessions.length / 10) * 100),
  );

  // Dynamic Recharts Data: Session Volume over the last 7 days (including today)
  const sessionVolumeData = React.useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return format(d, "yyyy-MM-dd");
    }).reverse();

    return last7Days.map((dateStr) => {
      const count = appointments.filter((a) => a.date === dateStr).length;
      const completed = appointments.filter(
        (a) => a.date === dateStr && a.status === "completed",
      ).length;
      const parsed = parseLocalDate(dateStr);
      const label = format(parsed, "eee dd");
      return {
        day: label,
        "Total Sessions": count,
        "Completed Sessions": completed,
      };
    });
  }, [appointments]);

  // Dynamic Recharts Data: Student Concerns Breakdown (from live appointments)
  const sessionTypeBreakdown = React.useMemo(() => {
    const counts: Record<string, number> = {
      "Wellness Check-in": 0,
      "Academic Stress": 0,
      "Personal Concerns": 0,
      "Career Guidance": 0,
      "Mental Health Support": 0,
    };

    appointments.forEach((a) => {
      if (a.type && a.type in counts) {
        counts[a.type] += 1;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      Sessions: value,
    }));
  }, [appointments]);

  const stats = [
    {
      label: "Today's Sessions",
      value: todaySessions.length.toString(),
      icon: Calendar,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      badge: "Today",
    },
    {
      label: "Pending Requests",
      value: pendingCount.toString(),
      icon: CheckCircle2,
      color: "text-amber-600",
      bg: "bg-amber-50",
      badge: "Queue",
    },
    {
      label: "Total Assessments",
      value: assessments.length.toString(),
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50",
      badge: "History",
    },
    {
      label: "Priority Cases",
      value: assessments.filter((a) => a.stressLevel > 75).length.toString(),
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      badge: "Review",
    },
  ];

  const incomingQueue = appointments
    .filter((a) => a.status === APPOINTMENT_STATUS.PENDING)
    .sort((a, b) => {
      const timeB = new Date(b.createdAt || b.created_at || b.date).getTime();
      const timeA = new Date(a.createdAt || a.created_at || a.date).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    })
    .slice(0, 4);

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Maayong Adlaw, Guidance Office
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Managing campus wellness and student consultation schedule for{" "}
            {format(new Date(), "EEEE, MMM do")}.
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            asChild
            className="rounded-xl font-bold h-10 sm:h-11 px-4 sm:px-5 bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm shadow-xs w-full sm:w-auto"
          >
            <Link href="/counselor/appointments">
              <Calendar className="h-4 w-4 mr-2" /> View Queue
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden"
          >
            <CardContent className="p-3.5 sm:p-6">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] font-black uppercase tracking-wider border-slate-200 text-slate-500 bg-slate-50"
                >
                  {stat.badge}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">
                  {stat.label}
                </p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900">
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          {/* Recharts Guidance Analytics Card */}
          <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
            <CardHeader className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                <div>
                  <CardTitle className="text-base sm:text-lg font-black text-slate-900">
                    Guidance Analytics
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Real-time consultation volume and category trends.
                  </CardDescription>
                </div>
              </div>

              {/* Clean toggle buttons for chart views */}
              <div className="flex bg-slate-100 p-1 rounded-xl items-center gap-1 self-start sm:self-auto">
                <button
                  onClick={() => setAnalyticsTab("volume")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    analyticsTab === "volume"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Session Activity
                </button>
                <button
                  onClick={() => setAnalyticsTab("concerns")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    analyticsTab === "concerns"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Student Concerns
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 h-[260px] sm:h-[340px]">
              {analyticsTab === "volume" ? (
                sessionVolumeData.some((d) => d["Total Sessions"] > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={sessionVolumeData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#64748b",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                        tickCount={5}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      />
                      <Legend
                        wrapperStyle={{
                          fontSize: 10,
                          fontWeight: 800,
                          paddingTop: 8,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Total Sessions"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fillOpacity={0.08}
                        fill="#6366f1"
                        dot={{
                          fill: "#6366f1",
                          r: 3,
                          strokeWidth: 2,
                          stroke: "#fff",
                        }}
                        activeDot={{ r: 5 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Completed Sessions"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={0.08}
                        fill="#10b981"
                        dot={{
                          fill: "#10b981",
                          r: 3,
                          strokeWidth: 2,
                          stroke: "#fff",
                        }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                    <TrendingUp className="h-10 w-10 text-slate-200" />
                    <p className="text-sm font-bold text-slate-400">
                      No session volume logged this week
                    </p>
                    <p className="text-xs text-slate-300">
                      New appointments scheduled on GuidanceSync will show up
                      here automatically.
                    </p>
                  </div>
                )
              ) : sessionTypeBreakdown.some((d) => d.Sessions > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sessionTypeBreakdown}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickCount={5}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    />
                    <Bar dataKey="Sessions" radius={[8, 8, 0, 0]} barSize={40}>
                      {sessionTypeBreakdown.map((entry, index) => {
                        const colors = [
                          "#6366f1",
                          "#3b82f6",
                          "#8b5cf6",
                          "#f97316",
                          "#ec4899",
                        ];
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={colors[index % colors.length]}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                  <Activity className="h-10 w-10 text-slate-200" />
                  <p className="text-sm font-bold text-slate-400">
                    No category concerns breakdown yet
                  </p>
                  <p className="text-xs text-slate-300">
                    Complete student consultation profiles to display your
                    primary wellness segments.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
            <CardHeader className="p-4 sm:p-6 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <CardTitle className="text-base sm:text-lg font-black text-slate-900">
                  Today's Schedule
                </CardTitle>
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-primary hover:bg-primary/5 h-8 px-2.5"
              >
                <Link href="/counselor/appointments">View Full Queue</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {todaySessions.length > 0 ? (
                  todaySessions.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                            idx === 0
                              ? "bg-primary text-white shadow-xs"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {idx === 0 ? (
                            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <h4 className="font-bold text-sm text-slate-900 truncate">
                              {item.studentName}
                            </h4>
                            <Badge
                              className={`text-[9px] font-black uppercase tracking-tight ${
                                item.status === "confirmed"
                                  ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                                  : "text-sky-700 bg-sky-50 border border-sky-100"
                              }`}
                            >
                              {item.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 font-medium truncate">
                            {item.time} — {item.type}
                          </p>
                        </div>
                      </div>
                      <Button
                        asChild
                        variant={idx === 0 ? "default" : "outline"}
                        className="rounded-xl font-bold text-xs h-9 px-4 w-full sm:w-auto"
                      >
                        <Link href="/counselor/appointments">Manage</Link>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-8 sm:p-12 text-center text-slate-400 font-bold italic text-xs sm:text-sm">
                    No sessions scheduled for today.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
            <CardHeader className="p-4 sm:p-5 pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm font-black text-slate-900">
                  Incoming Queue
                </CardTitle>
              </div>
              <Badge className="bg-primary text-white border-none font-black text-[9px] px-2 h-5">
                {pendingCount} New
              </Badge>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-2 space-y-2">
              {incomingQueue.map((student, i) => (
                <Link
                  key={i}
                  href="/counselor/appointments"
                  className="p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex items-center gap-3 cursor-pointer group"
                >
                  <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-200 shrink-0">
                    {student.studentName ? student.studentName.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {student.studentName}
                    </p>
                    <p className="text-[10px] font-medium truncate text-slate-400">
                      {student.type}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors shrink-0" />
                </Link>
              ))}
              {incomingQueue.length === 0 && (
                <p className="text-xs text-center text-slate-400 py-4 italic">
                  No pending requests in queue.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl p-4 sm:p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-sky-600" />
                <CardTitle className="text-sm font-black text-slate-900">
                  Consultation Load
                </CardTitle>
              </div>
              <Badge className="bg-sky-50 text-sky-700 border border-sky-100 font-black text-[9px] px-2 h-5">
                Real-time
              </Badge>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">
                    This Week
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {thisWeeksSessions.length}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">
                    This Month
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {thisMonthsSessions.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-500">Weekly Target Progress</span>
                  <span className="text-slate-800">
                    {completedWeeksSessions.length} / 10 Sessions
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((completedWeeksSessions.length / 10) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-tight pt-1">
                  Completed {completedWeeksSessions.length} consultations against target.
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="w-full rounded-xl border-slate-200 text-xs font-bold h-10 hover:bg-slate-50"
              >
                <Link
                  href="/counselor/session-records"
                  className="flex items-center justify-center gap-1"
                >
                  View Detailed Records{" "}
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              </Button>
            </div>
          </Card>

          <Card className="border-none shadow-xs bg-primary/95 rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="font-black text-base sm:text-lg mb-1.5">Student Insights</h3>
              <p className="text-white/85 text-xs mb-5 leading-relaxed">
                Analyze {assessments.length} student wellness assessments to prepare for consultations.
              </p>
              <Button
                asChild
                variant="secondary"
                className="w-full bg-white text-primary hover:bg-slate-50 font-bold rounded-xl text-xs h-10 shadow-xs"
              >
                <Link href="/counselor/assessments">Go to Assessments</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
