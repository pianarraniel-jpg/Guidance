"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  MonitorSmartphone, Search, ChevronDown, ChevronUp,
  AlertTriangle, ShieldAlert, Info, MessageSquare,
  CheckCircle2, Clock, Filter, BarChart3, CalendarPlus,
  Heart, BookOpen, Brain, Sparkles, Briefcase
} from 'lucide-react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';

type ChatSession = {
  id: string;
  student_id: string;
  student_name: string;
  summary: string | null;
  stress_level: number | null;
  risk_level: 'low' | 'moderate' | 'high' | null;
  focus_areas: string[];
  completed_at: string | null;
  created_at: string;
  message_count?: number;
};

type ChatMessage = {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

type ChatAlert = {
  id: string;
  student_id: string;
  student_name: string;
  session_id: string | null;
  trigger_phrase: string;
  message_content: string;
  severity: 'moderate' | 'high' | 'critical';
  acknowledged: boolean;
  created_at: string;
};

const riskConfig = {
  low: { label: 'Low Stress', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  moderate: { label: 'Moderate Stress', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  high: { label: 'High Risk', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
};

const severityConfig = {
  moderate: { label: 'Moderate', color: 'bg-amber-100 text-amber-700', icon: Info },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700', icon: ShieldAlert },
};

const SESSION_TYPES = [
  { value: 'Wellness Check-in', label: 'Wellness Check-in', icon: Heart, color: 'text-emerald-500 bg-emerald-50' },
  { value: 'Academic Stress', label: 'Academic Stress', icon: BookOpen, color: 'text-blue-500 bg-blue-50' },
  { value: 'Personal Concerns', label: 'Personal Concerns', icon: Brain, color: 'text-purple-500 bg-purple-50' },
  { value: 'Career Guidance', label: 'Career Guidance', icon: Briefcase, color: 'text-orange-500 bg-orange-50' },
  { value: 'Mental Health Support', label: 'Mental Health Support', icon: Sparkles, color: 'text-pink-500 bg-pink-50' },
];

const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
];

export default function ChatMonitorPage() {
  const { toast } = useToast();
  const { user: counselor } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [alerts, setAlerts] = useState<ChatAlert[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Record<string, ChatMessage[]>>({});
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'moderate' | 'high'>('all');
  const [activeTab, setActiveTab] = useState<'sessions' | 'alerts' | 'analytics'>('sessions');
  const [loading, setLoading] = useState(true);

  // Booking from alert
  const [bookingAlert, setBookingAlert] = useState<ChatAlert | null>(null);
  const [bookingType, setBookingType] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingLocation, setBookingLocation] = useState('Room 302');
  const [isBookingSubmit, setIsBookingSubmit] = useState(false);

  const openBookingFromAlert = (alert: ChatAlert) => {
    setBookingAlert(alert);
    setBookingType('Mental Health Support');
    setBookingDate('');
    setBookingTime('');
    setBookingReason(`Follow-up required after alert: "${alert.trigger_phrase}"`);
    setBookingLocation('Room 302');
  };

  const handleBookFromAlert = async () => {
    if (!bookingAlert || !bookingType || !bookingDate || !bookingTime || !bookingReason.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill in all required fields.' });
      return;
    }
    setIsBookingSubmit(true);
    try {
      await storageService.create(STORAGE_KEYS.APPOINTMENTS, {
        studentId: bookingAlert.student_id,
        studentName: bookingAlert.student_name,
        counselorId: counselor?.id,
        counselorName: counselor?.name,
        date: bookingDate,
        time: bookingTime,
        type: bookingType,
        status: APPOINTMENT_STATUS.CONFIRMED,
        location: bookingLocation,
        reason: bookingReason.trim(),
        createdAt: new Date().toISOString(),
      });

      // Also acknowledge the alert if not already done
      if (!bookingAlert.acknowledged) {
        await supabase
          .from('chat_alerts')
          .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
          .eq('id', bookingAlert.id);
        setAlerts(prev => prev.map(a => a.id === bookingAlert.id ? { ...a, acknowledged: true } : a));
      }

      toast({
        title: 'Appointment Booked',
        description: `Confirmed session scheduled for ${bookingAlert.student_name}.`,
      });
      setBookingAlert(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Booking Failed', description: err.message || 'An error occurred.' });
    } finally {
      setIsBookingSubmit(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [sessionsRes, alertsRes] = await Promise.all([
      supabase
        .from('ai_chat_sessions')
        .select('*, ai_chat_messages(count)')
        .order('created_at', { ascending: false }),
      supabase
        .from('chat_alerts')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    if (sessionsRes.data) {
      const mapped = sessionsRes.data.map((s: any) => ({
        ...s,
        message_count: s.ai_chat_messages?.[0]?.count ?? 0,
      }));
      setSessions(mapped);
    }
    if (alertsRes.data) setAlerts(alertsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Real-time subscription for new alerts
    const channel = supabase
      .channel('chat-monitor-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_alerts' }, (payload) => {
        setAlerts(prev => [payload.new as ChatAlert, ...prev]);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_chat_sessions' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ai_chat_sessions' }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const loadMessages = async (sessionId: string) => {
    if (sessionMessages[sessionId]) return;
    const { data } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (data) {
      setSessionMessages(prev => ({ ...prev, [sessionId]: data }));
    }
  };

  const toggleSession = async (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
      await loadMessages(sessionId);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('chat_alerts')
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq('id', alertId);
    if (!error) {
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
      toast({ title: 'Alert acknowledged' });
    }
  };

  const analyticsData = useMemo(() => {
    // Risk distribution
    const riskCounts = { low: 0, moderate: 0, high: 0, unclassified: 0 };
    sessions.forEach(s => {
      if (s.risk_level) riskCounts[s.risk_level]++;
      else riskCounts.unclassified++;
    });
    const riskPie = [
      { name: 'Low Stress', value: riskCounts.low, color: '#10b981' },
      { name: 'Moderate', value: riskCounts.moderate, color: '#f59e0b' },
      { name: 'High Risk', value: riskCounts.high, color: '#ef4444' },
    ].filter(d => d.value > 0);

    // Sessions over last 14 days
    const sessionsByDay = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const count = sessions.filter(s => s.created_at.startsWith(dateStr)).length;
      const highRisk = sessions.filter(s => s.created_at.startsWith(dateStr) && s.risk_level === 'high').length;
      return { day: format(d, 'MMM dd'), Sessions: count, 'High Risk': highRisk };
    });

    // Average stress per day (only completed sessions with stress_level)
    const stressByDay = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const daySessions = sessions.filter(s => s.created_at.startsWith(dateStr) && s.stress_level != null);
      const avg = daySessions.length
        ? Math.round(daySessions.reduce((sum, s) => sum + (s.stress_level ?? 0), 0) / daySessions.length)
        : null;
      return { day: format(d, 'MMM dd'), 'Avg Stress': avg };
    });

    // Focus areas frequency
    const areaCounts: Record<string, number> = {};
    sessions.forEach(s => {
      (s.focus_areas ?? []).forEach((a: string) => { areaCounts[a] = (areaCounts[a] ?? 0) + 1; });
    });
    const focusAreas = Object.entries(areaCounts)
      .map(([name, count]) => ({ name, Sessions: count }))
      .sort((a, b) => b.Sessions - a.Sessions);

    // Alert severity breakdown
    const sevCounts = { moderate: 0, high: 0, critical: 0 };
    alerts.forEach(a => { sevCounts[a.severity]++; });
    const alertSeverity = [
      { name: 'Moderate', value: sevCounts.moderate, color: '#f59e0b' },
      { name: 'High', value: sevCounts.high, color: '#f97316' },
      { name: 'Critical', value: sevCounts.critical, color: '#ef4444' },
    ].filter(d => d.value > 0);

    return { riskPie, sessionsByDay, stressByDay, focusAreas, alertSeverity };
  }, [sessions, alerts]);

  const filteredSessions = sessions.filter(s => {
    const matchSearch = !search || s.student_name.toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === 'all' || s.risk_level === riskFilter;
    return matchSearch && matchRisk;
  });

  const unackAlerts = alerts.filter(a => !a.acknowledged);
  const highRiskCount = sessions.filter(s => s.risk_level === 'high').length;

  return (
    <main className="p-8 max-w-6xl mx-auto w-full">
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <MonitorSmartphone className="h-6 w-6" />
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Chat Monitor</h1>
              {unackAlerts.length > 0 && (
                <span className="h-6 min-w-6 px-2 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center animate-pulse">
                  {unackAlerts.length}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-medium pl-13">
              View student AI chat sessions and monitor high-risk conversations in real time.
            </p>
          </header>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="rounded-2xl border-slate-100 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Sessions</p>
                <p className="text-3xl font-black text-slate-900">{sessions.length}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-100 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">High Risk</p>
                <p className="text-3xl font-black text-red-600">{highRiskCount}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-red-100 shadow-sm bg-red-50/40">
              <CardContent className="p-5">
                <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Unread Alerts</p>
                <p className="text-3xl font-black text-red-600">{unackAlerts.length}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-100 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Alerts</p>
                <p className="text-3xl font-black text-slate-900">{alerts.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tab toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === 'sessions' ? 'default' : 'outline'}
              onClick={() => setActiveTab('sessions')}
              className="rounded-xl font-black"
            >
              <MessageSquare className="h-4 w-4 mr-2" /> Chat Sessions
            </Button>
            <Button
              variant={activeTab === 'alerts' ? 'default' : 'outline'}
              onClick={() => setActiveTab('alerts')}
              className={`rounded-xl font-black ${unackAlerts.length > 0 ? 'border-red-300' : ''}`}
            >
              <AlertTriangle className="h-4 w-4 mr-2" /> Alerts
              {unackAlerts.length > 0 && (
                <span className="ml-2 h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  {unackAlerts.length}
                </span>
              )}
            </Button>
            <Button
              variant={activeTab === 'analytics' ? 'default' : 'outline'}
              onClick={() => setActiveTab('analytics')}
              className="rounded-xl font-black"
            >
              <BarChart3 className="h-4 w-4 mr-2" /> Analytics
            </Button>
          </div>

          {activeTab === 'sessions' && (
            <>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by student name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-slate-200"
                  />
                </div>
                <div className="flex gap-2">
                  {(['all', 'low', 'moderate', 'high'] as const).map(r => (
                    <Button
                      key={r}
                      size="sm"
                      variant={riskFilter === r ? 'default' : 'outline'}
                      onClick={() => setRiskFilter(r)}
                      className="rounded-xl font-black capitalize text-xs h-11"
                    >
                      {r === 'all' ? <><Filter className="h-3 w-3 mr-1" />All</> : r}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Sessions list */}
              {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400 font-bold">Loading sessions...</div>
              ) : filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
                  <p className="font-bold">No chat sessions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSessions.map(session => {
                    const risk = session.risk_level ? riskConfig[session.risk_level] : riskConfig.low;
                    const isExpanded = expandedSession === session.id;
                    const msgs = sessionMessages[session.id] ?? [];

                    return (
                      <Card key={session.id} className={`rounded-2xl border shadow-sm transition-all ${session.risk_level === 'high' ? 'border-red-200 bg-red-50/20' : 'border-slate-100'}`}>
                        <CardContent className="p-0">
                          <button
                            className="w-full p-5 flex items-center gap-4 text-left hover:bg-slate-50/50 transition-colors rounded-2xl"
                            onClick={() => toggleSession(session.id)}
                          >
                            <Avatar className="h-11 w-11 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary font-black text-sm">
                                {(session.student_name || '?').split(' ').map((n: string) => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-slate-900">{session.student_name || 'Unknown Student'}</span>
                                <Badge className={`text-[10px] font-black border ${risk.color} rounded-full px-2 py-0`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${risk.dot} mr-1.5`} />
                                  {risk.label}
                                </Badge>
                                {session.stress_level != null && (
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Stress {session.stress_level}/100
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-500 font-medium mt-0.5 truncate">
                                {session.summary ?? 'No summary yet — session in progress'}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  {session.message_count ?? 0} messages
                                </span>
                                {session.completed_at && (
                                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Complete
                                  </span>
                                )}
                              </div>
                            </div>
                            {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />}
                          </button>

                          {isExpanded && (
                            <div className="border-t border-slate-100 p-5 pt-4">
                              {session.summary && (
                                <div className="mb-4 p-4 bg-slate-50 rounded-2xl">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">AI Summary</p>
                                  <p className="text-sm text-slate-700 font-medium leading-relaxed">{session.summary}</p>
                                </div>
                              )}
                              {session.focus_areas?.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {session.focus_areas.map((area: string) => (
                                    <Badge key={area} variant="outline" className="rounded-full text-xs font-bold border-slate-200 text-slate-600">{area}</Badge>
                                  ))}
                                </div>
                              )}
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Conversation Transcript</p>
                              <ScrollArea className="max-h-80">
                                <div className="space-y-3">
                                  {msgs.length === 0 ? (
                                    <p className="text-sm text-slate-400 font-medium text-center py-4">No messages loaded</p>
                                  ) : msgs.map(msg => (
                                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                      {msg.role === 'assistant' && (
                                        <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                                          <AvatarFallback className="bg-primary text-white text-[10px] font-black">🤖</AvatarFallback>
                                        </Avatar>
                                      )}
                                      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed ${
                                        msg.hidden && msg.role === 'user'
                                          ? 'bg-red-50 border-2 border-dashed border-red-300 text-red-800 rounded-tr-none'
                                          : msg.role === 'user'
                                            ? 'bg-primary text-white rounded-tr-none'
                                            : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                                      }`}>
                                        {msg.content}
                                        <p className={`text-[9px] font-bold mt-1 uppercase tracking-widest ${msg.hidden && msg.role === 'user' ? 'text-red-400' : msg.role === 'user' ? 'text-white/60' : 'text-slate-400'}`}>
                                          {msg.role === 'user' ? session.student_name : 'Guidi'} · {format(new Date(msg.created_at), 'h:mm a')}
                                          {msg.hidden && msg.role === 'user' && ' · 🚫 Hidden from student'}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <ShieldAlert className="h-10 w-10 mb-3 opacity-30" />
                  <p className="font-bold">No alerts recorded</p>
                </div>
              ) : alerts.map(alert => {
                const sev = severityConfig[alert.severity];
                const SevIcon = sev.icon;
                return (
                  <Card key={alert.id} className={`rounded-2xl border shadow-sm ${alert.acknowledged ? 'opacity-60' : 'border-red-200'}`}>
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${sev.color}`}>
                        <SevIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-black text-slate-900">{alert.student_name}</span>
                          <Badge className={`text-[10px] font-black border-0 rounded-full px-2 py-0 ${sev.color}`}>
                            {sev.label}
                          </Badge>
                          {alert.acknowledged && (
                            <Badge variant="outline" className="text-[10px] font-black rounded-full px-2 py-0 border-emerald-200 text-emerald-600">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Acknowledged
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                          Trigger: <span className="text-slate-600 normal-case font-black">"{alert.trigger_phrase}"</span>
                        </p>
                        <p className="text-sm text-slate-700 font-medium bg-slate-50 rounded-xl px-4 py-3 leading-relaxed">
                          "{alert.message_content}"
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => openBookingFromAlert(alert)}
                          className="rounded-xl font-black text-xs bg-primary hover:bg-primary/90 text-white shadow-sm"
                        >
                          <CalendarPlus className="h-3.5 w-3.5 mr-1.5" /> Book Appointment
                        </Button>
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="rounded-xl font-black text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Acknowledge
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <BarChart3 className="h-10 w-10 mb-3 opacity-30" />
                  <p className="font-bold">No data yet — analytics will appear after students complete sessions</p>
                </div>
              ) : (
                <>
                  {/* Row 1: Risk distribution + Alert severity */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="rounded-2xl border-slate-100 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black text-slate-600 uppercase tracking-widest">Risk Level Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analyticsData.riskPie.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-8">No classified sessions yet</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie data={analyticsData.riskPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                                {analyticsData.riskPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                              </Pie>
                              <Tooltip formatter={(v: any) => [`${v} sessions`]} />
                              <Legend iconType="circle" iconSize={10} />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-100 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black text-slate-600 uppercase tracking-widest">Top Concern Areas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analyticsData.focusAreas.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-8">No focus area data yet</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={analyticsData.focusAreas} layout="vertical" margin={{ left: 8, right: 16 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 11, fontWeight: 700 }} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} width={90} />
                              <Tooltip />
                              <Bar dataKey="Sessions" fill="#6366f1" radius={[0, 6, 6, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Row 2: Sessions over time */}
                  <Card className="rounded-2xl border-slate-100 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-black text-slate-600 uppercase tracking-widest">Session Volume — Last 14 Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={analyticsData.sessionsByDay} margin={{ left: 0, right: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="day" tick={{ fontSize: 10, fontWeight: 700 }} interval={1} />
                          <YAxis tick={{ fontSize: 11, fontWeight: 700 }} allowDecimals={false} />
                          <Tooltip />
                          <Legend iconType="circle" iconSize={10} />
                          <Bar dataKey="Sessions" fill="#6366f1" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="High Risk" fill="#ef4444" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Row 3: Average stress trend */}
                  <Card className="rounded-2xl border-slate-100 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-black text-slate-600 uppercase tracking-widest">Average Stress Score Trend (0–100)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={analyticsData.stressByDay} margin={{ left: 0, right: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="day" tick={{ fontSize: 10, fontWeight: 700 }} interval={1} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontWeight: 700 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="Avg Stress" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Row 4: Alert severity breakdown */}
                  {analyticsData.alertSeverity.length > 0 && (
                    <Card className="rounded-2xl border-slate-100 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black text-slate-600 uppercase tracking-widest">Alert Severity Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={analyticsData.alertSeverity} margin={{ left: 0, right: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700 }} />
                            <YAxis tick={{ fontSize: 11, fontWeight: 700 }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                              {analyticsData.alertSeverity.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}
      {/* Book Appointment Dialog (triggered from alert) */}
      <Dialog open={!!bookingAlert} onOpenChange={(o) => { if (!o) setBookingAlert(null); }}>
        <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-slate-50 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <CalendarPlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900">Book Appointment</DialogTitle>
                <p className="text-sm text-slate-500 font-medium mt-0.5">
                  Scheduling for <span className="font-black text-slate-700">{bookingAlert?.student_name}</span> based on alert
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Alert context banner */}
            {bookingAlert && (
              <div className={`flex items-start gap-3 p-4 rounded-2xl border ${severityConfig[bookingAlert.severity].color} border-current/20`}>
                {React.createElement(severityConfig[bookingAlert.severity].icon, { className: 'h-4 w-4 mt-0.5 shrink-0' })}
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1">Alert trigger</p>
                  <p className="text-xs font-semibold leading-relaxed">"{bookingAlert.message_content}"</p>
                </div>
              </div>
            )}

            {/* Session Type */}
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">Session Type *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SESSION_TYPES.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBookingType(value)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      bookingType === value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-primary/30'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-[11px] font-bold ${bookingType === value ? 'text-primary' : 'text-slate-700'}`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">Date *</Label>
                <Input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="h-11 rounded-xl text-xs font-semibold bg-white border border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">Time Slot *</Label>
                <Select value={bookingTime} onValueChange={setBookingTime}>
                  <SelectTrigger className="h-11 bg-white border border-slate-200 rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Choose time..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl border-none">
                    {TIME_SLOTS.map(slot => (
                      <SelectItem key={slot} value={slot} className="text-xs font-bold rounded-lg">{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">Location</Label>
              <Input
                placeholder="e.g. Guidance Office - Room 302"
                value={bookingLocation}
                onChange={(e) => setBookingLocation(e.target.value)}
                className="h-11 rounded-xl text-xs font-semibold bg-white border border-slate-200"
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">Session Reason *</Label>
              <Textarea
                placeholder="Describe the purpose of this session..."
                value={bookingReason}
                onChange={(e) => setBookingReason(e.target.value)}
                className="min-h-[90px] rounded-xl text-xs font-medium bg-white border border-slate-200 p-3 leading-relaxed"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <Button
                onClick={handleBookFromAlert}
                disabled={isBookingSubmit || !bookingType || !bookingDate || !bookingTime || !bookingReason.trim()}
                className="flex-1 h-12 bg-primary hover:bg-primary/90 rounded-xl font-black text-white shadow-lg shadow-primary/20"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isBookingSubmit ? 'Scheduling...' : 'Book & Confirm'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setBookingAlert(null)}
                className="flex-1 h-12 rounded-xl font-bold border-slate-200"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
