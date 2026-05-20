"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Activity,
  Heart,
  BookOpen,
  Brain,
  Sparkles,
  Briefcase,
  MapPin,
  TrendingUp,
  Users,
  FileEdit,
  Check
} from 'lucide-react';
import { format, isThisWeek, isThisMonth, isThisYear, parseISO } from 'date-fns';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import Link from 'next/link';

const SESSION_TYPE_ICONS: Record<string, any> = {
  'Wellness Check-in': Heart,
  'Academic Stress': BookOpen,
  'Personal Concerns': Brain,
  'Career Guidance': Briefcase,
  'Mental Health Support': Sparkles,
};

export default function SessionRecordsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activePeriod, setActivePeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadData = async () => {
      const allApts = await storageService.getAll<any>(STORAGE_KEYS.APPOINTMENTS);
      // Sort newest first
      allApts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAppointments(allApts);
    };
    loadData();
  }, []);

  // Safe local date parsing to prevent timezone offset shifts
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Dynamic Date Filter logic
  const filteredByPeriod = useMemo(() => {
    return appointments.filter((apt) => {
      if (!apt.date) return false;
      const localDate = parseLocalDate(apt.date);

      switch (activePeriod) {
        case 'week':
          return isThisWeek(localDate, { weekStartsOn: 1 }); // Start week on Monday
        case 'month':
          return isThisMonth(localDate);
        case 'year':
          return isThisYear(localDate);
        case 'all':
        default:
          return true;
      }
    });
  }, [appointments, activePeriod]);

  // Search logic
  const finalFilteredAppointments = useMemo(() => {
    return filteredByPeriod.filter((apt) => {
      const matchSearch =
        apt.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.studentId?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [filteredByPeriod, searchTerm]);

  // Group filtered appointments by Student
  const groupedByStudent = useMemo(() => {
    const groups: Record<string, {
      studentId: string;
      studentName: string;
      email?: string;
      sessions: any[];
    }> = {};

    finalFilteredAppointments.forEach((apt) => {
      const sId = apt.studentId || apt.studentName || 'unknown';
      if (!groups[sId]) {
        groups[sId] = {
          studentId: sId,
          studentName: apt.studentName || 'Student',
          email: apt.studentEmail || `${sId.toLowerCase()}@uspf.edu.ph`,
          sessions: [],
        };
      }
      groups[sId].sessions.push(apt);
    });

    return Object.values(groups).sort((a, b) => b.sessions.length - a.sessions.length);
  }, [finalFilteredAppointments]);

  // General Period Stats
  const stats = useMemo(() => {
    const total = filteredByPeriod.length;
    const uniqueStudents = new Set(filteredByPeriod.map((a) => a.studentId)).size;
    const completed = filteredByPeriod.filter((a) => a.status === APPOINTMENT_STATUS.COMPLETED).length;
    
    // Sessions that are completed/confirmed but still have no counselorNotes
    const awaitingNotes = filteredByPeriod.filter(
      (a) => (a.status === APPOINTMENT_STATUS.COMPLETED || a.status === APPOINTMENT_STATUS.CONFIRMED) && !a.counselorNotes
    ).length;

    // High stress cases (stress > 7)
    const highStress = filteredByPeriod.filter((a) => a.stressLevel > 7).length;

    return {
      total,
      uniqueStudents,
      completedRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      awaitingNotes,
      highStress,
    };
  }, [filteredByPeriod]);

  const toggleStudentExpand = (studentId: string) => {
    setExpandedStudents((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return <Badge className="bg-blue-50 text-blue-700 border-none font-black text-[9px] uppercase">Confirmed</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-50 text-emerald-700 border-none font-black text-[9px] uppercase">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-50 text-red-700 border-none font-black text-[9px] uppercase">Cancelled</Badge>;
      case 'pending':
        return <Badge className="bg-amber-50 text-amber-700 border-none font-black text-[9px] uppercase">Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px] font-black uppercase">{status}</Badge>;
    }
  };

  const getWellnessLabel = (stressLevel?: number) => {
    if (stressLevel == null) return { label: 'No Data', color: 'bg-slate-100 text-slate-400' };
    if (stressLevel > 7) return { label: 'At Risk', color: 'bg-red-50 text-red-600' };
    if (stressLevel > 4) return { label: 'Moderate', color: 'bg-amber-50 text-amber-600' };
    return { label: 'Stable', color: 'bg-emerald-50 text-emerald-600' };
  };

  return (
    <div className="max-w-7xl mx-auto w-full pb-16">
      {/* Header section */}
      <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Session Records & Analytics</h1>
          <p className="text-slate-500 font-medium">Review and audit comprehensive student consultation timelines and capacity logs.</p>
        </div>

        {/* Premium Date period selector tabs */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 items-center gap-1">
          {(['week', 'month', 'year', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activePeriod === period
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              {period === 'all' ? 'All-Time' : `This ${period}`}
            </button>
          ))}
        </div>
      </header>

      {/* Analytics stats dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card className="border-0 shadow-sm bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Sessions</p>
              <p className="text-3xl font-black text-slate-900">{stats.total}</p>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5">Consultations in active range</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-teal-50 text-teal-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Unique Students</p>
              <p className="text-3xl font-black text-slate-900">{stats.uniqueStudents}</p>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5">Roster load in active range</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Awaiting Notes</p>
              <p className="text-3xl font-black text-slate-900">{stats.awaitingNotes}</p>
              <p className="text-[9px] font-bold text-amber-600 mt-0.5">Requires feedback update</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">At Risk cases</p>
              <p className="text-3xl font-black text-slate-900">{stats.highStress}</p>
              <p className="text-[9px] font-bold text-red-600 mt-0.5">Stress levels above score 7</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and roster search row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by student name, ID or session type..."
            className="pl-10 h-12 bg-white border-none shadow-sm rounded-2xl text-xs font-bold w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-xs font-bold text-slate-400">
          Showing {groupedByStudent.length} students with session records in this timeframe
        </div>
      </div>

      {/* Grouped Student Registry Accordions */}
      <div className="space-y-4">
        {groupedByStudent.map((group) => {
          const isExpanded = !!expandedStudents[group.studentId];
          const totalSessions = group.sessions.length;
          
          // Compute average stress score for this student's sessions in this timeframe
          const validStressLevels = group.sessions.filter(s => s.stressLevel != null).map(s => s.stressLevel);
          const avgStress = validStressLevels.length > 0 
            ? Math.round(validStressLevels.reduce((a, b) => a + b, 0) / validStressLevels.length)
            : undefined;

          const wellness = getWellnessLabel(avgStress);

          return (
            <Card key={group.studentId} className="border-0 shadow-sm overflow-hidden bg-white rounded-3xl transition-all hover:shadow-md">
              {/* Accordion Trigger Header */}
              <div
                onClick={() => toggleStudentExpand(group.studentId)}
                className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none group/trigger"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 ring-2 ring-slate-100">
                    <AvatarImage src={`https://picsum.photos/seed/${group.studentName}/128/128`} />
                    <AvatarFallback className="bg-slate-100 text-slate-700 font-black text-sm">
                      {group.studentName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover/trigger:text-primary transition-colors">
                      {group.studentName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="border-none bg-slate-50 font-black text-[9px] text-slate-500 uppercase px-2 h-5">
                        {group.studentId}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-bold">{group.email}</span>
                    </div>
                  </div>
                </div>

                {/* Session details overview tags */}
                <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                  <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-0.5">Session Count</span>
                    <span className="text-xs font-black text-slate-950">
                      {totalSessions} {totalSessions === 1 ? 'session' : 'sessions'}
                    </span>
                  </div>

                  {avgStress != null && (
                    <div className={`px-3.5 py-1.5 rounded-xl border border-slate-100 text-center ${wellness.color}`}>
                      <span className="text-[9px] font-black uppercase opacity-60 block leading-none mb-0.5">Avg Stress</span>
                      <span className="text-xs font-black">
                        {avgStress}/10 — {wellness.label}
                      </span>
                    </div>
                  )}

                  <div className="h-9 w-9 rounded-xl bg-slate-50 border flex items-center justify-center text-slate-400 group-hover/trigger:bg-slate-100 group-hover/trigger:text-slate-800 transition-all">
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>
              </div>

              {/* Accordion Content: Vertical Session Timeline */}
              {isExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-50 bg-slate-50/20">
                  <div className="relative pl-8 space-y-8 py-4">
                    {/* Vertical timeline connector line */}
                    <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-slate-200" />

                    {group.sessions.map((session, idx) => {
                      const SessionIcon = SESSION_TYPE_ICONS[session.type] || Calendar;
                      const hasNotes = !!session.counselorNotes;
                      const hasActionItems = session.actionItems && session.actionItems.length > 0;

                      return (
                        <div key={session.id} className="relative group/node">
                          {/* Left node circle point */}
                          <div className={`absolute -left-[28px] top-1.5 h-6.5 w-6.5 rounded-full border-4 border-white shadow-sm flex items-center justify-center transition-all ${
                            session.status === APPOINTMENT_STATUS.COMPLETED
                              ? 'bg-emerald-500 text-white'
                              : session.status === APPOINTMENT_STATUS.CONFIRMED
                              ? 'bg-blue-500 text-white'
                              : 'bg-amber-400 text-white'
                          }`}>
                            {session.status === APPOINTMENT_STATUS.COMPLETED ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <div className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </div>

                          {/* Timeline node details card */}
                          <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl overflow-hidden">
                            <CardHeader className="p-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white border shadow-sm text-slate-600">
                                  <SessionIcon className="h-4 w-4" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-slate-900">{session.type}</h4>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Session ID: #{session.id.slice(-6).toUpperCase()}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="h-5 px-2 bg-white font-bold text-[9px] uppercase tracking-tight text-slate-500 border-slate-100">
                                  <Clock className="h-3 w-3 mr-1 text-slate-400" /> {session.time}
                                </Badge>
                                <Badge variant="outline" className="h-5 px-2 bg-white font-bold text-[9px] uppercase tracking-tight text-slate-500 border-slate-100">
                                  <Calendar className="h-3 w-3 mr-1 text-slate-400" /> {session.date}
                                </Badge>
                                {getStatusBadge(session.status)}
                              </div>
                            </CardHeader>
                            <CardContent className="p-5 space-y-4">
                              {/* Session Reason */}
                              {session.reason && (
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Consultation Reason</p>
                                  <p className="text-xs font-semibold text-slate-700 leading-relaxed italic bg-slate-50/50 p-3.5 rounded-xl border border-slate-100/50">
                                    "{session.reason}"
                                  </p>
                                </div>
                              )}

                              {/* Observed Stress score */}
                              {session.stressLevel != null && (
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/30 border border-slate-100/30">
                                  <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-700">Observed Stress Level</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-900">{session.stressLevel}/10</span>
                                    <div className="w-20 bg-slate-100 rounded-full h-1.5">
                                      <div
                                        className={`h-1.5 rounded-full ${
                                          session.stressLevel > 7
                                            ? 'bg-red-500'
                                            : session.stressLevel > 4
                                            ? 'bg-amber-400'
                                            : 'bg-emerald-500'
                                        }`}
                                        style={{ width: `${session.stressLevel * 10}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Discussion Topics */}
                              {session.topics && session.topics.length > 0 && (
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Discussion Topics</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {session.topics.map((topic: string, i: number) => (
                                      <Badge key={i} className="bg-slate-100 text-slate-700 border-none font-bold text-[10px] py-0.5 px-2.5 rounded-lg">
                                        {topic}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Clinical counselor notes */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Public Record (Visible to Student)</span>
                                  <div className="p-3.5 rounded-xl border border-slate-100 text-xs font-semibold text-slate-600 min-h-[70px] bg-slate-50/20">
                                    {session.counselorNotes ? (
                                      <p className="leading-relaxed whitespace-pre-wrap">{session.counselorNotes}</p>
                                    ) : (
                                      <span className="text-slate-400 italic">No public notes recorded for this session.</span>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Confidential Notes (Counselor Only 🔒)</span>
                                  <div className="p-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-amber-800 min-h-[70px] bg-amber-50/10">
                                    {session.privateNotes ? (
                                      <p className="leading-relaxed whitespace-pre-wrap">{session.privateNotes}</p>
                                    ) : (
                                      <span className="text-amber-600/60 italic">No confidential clinical observations recorded.</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Action Items/Homework */}
                              {hasActionItems && (
                                <div className="pt-2 border-t border-slate-50">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">Assigned homework & recommendations</span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {session.actionItems.map((item: string, i: number) => (
                                      <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100/50 text-xs font-bold text-slate-700">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span className="truncate">{item}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Direct action shortcut to edit/update session notes */}
                              <div className="flex justify-end pt-3 border-t border-slate-50">
                                <Button asChild variant="outline" size="sm" className="h-9 px-4 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900">
                                  <Link href={`/counselor/session-notes?id=${session.id}`}>
                                    <FileEdit className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                    {hasNotes ? 'Update Session Record' : 'Record Session Notes'}
                                  </Link>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {groupedByStudent.length === 0 && (
          <Card className="border-0 shadow-sm p-16 text-center bg-white rounded-3xl">
            <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="font-bold text-slate-400">No student session records found for the selected active range.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
