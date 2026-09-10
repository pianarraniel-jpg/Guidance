"use client";

import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { useLiveSync } from '@/hooks/useLiveSync';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO, eachDayOfInterval, subDays } from 'date-fns';
import {
  Users,
  CalendarCheck,
  FileDown,
  LayoutDashboard,
  Search,
  Filter,
  ShieldAlert,
  Activity,
  FileText,
  Database,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Terminal,
  RefreshCw,
  Info,
  User,
} from 'lucide-react';

type AdminTab = 'overview' | 'appointments' | 'users' | 'telemetry';

interface SystemLog {
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error';
  source: string;
  message: string;
}

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Dialog / Details States
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<'appointment' | null>(null);

  // System telemetry mock logs
  const [telemetryLogs, setTelemetryLogs] = useState<SystemLog[]>([]);

  const generateMockLog = useCallback((type?: 'info' | 'success' | 'warn' | 'error'): SystemLog => {
    const sources = ['SupabaseDB', 'RealtimeSync', 'AuthService', 'ClinicalEngine', 'NotificationHub'];
    const messages = {
      info: [
        'Heartbeat telemetry successfully broadcasted.',
        'WebSocket listener refreshed for channel guidance-notif.',
        'Token validation handshake initiated.',
        'Database connections indexed and optimized.'
      ],
      success: [
        'Postgres write replicated to secondary edge-point.',
        'Clinical assessments sync batch completed.',
        'Auth token successfully renewed for system runner.',
        'Supabase real-time channel subscribed.'
      ],
      warn: [
        'API request exceeded standard latency buffer: 280ms.',
        'System detected higher workload than expected; auto-throttled handshake.',
        'Postgres connection pool close to 75% capacity limits.',
        'Real-time listener channel buffer exceeded; auto-flushed.'
      ],
      error: [
        'Supabase handshake timed out, retrying backoff sequence in 2000ms.',
        'Clinical summary API returned parsing exception on profile check.',
        'Write request blocked by temporary local storage constraint.',
        'Auth header verification payload rejected, invalid certificate token.'
      ]
    };

    const logType = type || (['info', 'success', 'warn', 'error'][Math.floor(Math.random() * 4)] as 'info' | 'success' | 'warn' | 'error');
    const source = sources[Math.floor(Math.random() * sources.length)];
    const options = messages[logType];
    const message = options[Math.floor(Math.random() * options.length)];

    return {
      timestamp: new Date().toISOString().slice(11, 19),
      type: logType,
      source,
      message
    };
  }, []);

  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);

    try {
      const [allApts, allUsers] = await Promise.all([
        storageService.getAll<any>(STORAGE_KEYS.APPOINTMENTS),
        storageService.getAll<any>(STORAGE_KEYS.USERS),
      ]);

      setAppointments(prev => {
        if (prev.length !== allApts.length) return allApts;
        const hasDiff = prev.some((a, i) => a.id !== allApts[i].id || a.status !== allApts[i].status || a.date !== allApts[i].date);
        return hasDiff ? allApts : prev;
      });

      setUsers(prev => {
        if (prev.length !== allUsers.length) return allUsers;
        const hasDiff = prev.some((u, i) => u.id !== allUsers[i].id || u.role !== allUsers[i].role || u.name !== allUsers[i].name);
        return hasDiff ? allUsers : prev;
      });

      // Chart sessions computation (Last 7 Days)
      const last7Days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
      const nextChartData = last7Days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return { name: format(day, 'EEE'), sessions: allApts.filter(a => a.date === dateStr).length };
      });

      setChartData(nextChartData);
    } catch (err) {
      console.error('Failed to load admin dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useLiveSync(loadData);

  // Background mock logs generator for telemetry
  useEffect(() => {
    if (activeTab !== 'telemetry') return;

    const initialLogs: SystemLog[] = [
      generateMockLog('success'),
      generateMockLog('info'),
      generateMockLog('info'),
      generateMockLog('warn'),
      generateMockLog('success')
    ];
    setTelemetryLogs(initialLogs);

    const logInterval = setInterval(() => {
      setTelemetryLogs(prev => [generateMockLog(), ...prev].slice(0, 50));
    }, 4500);
    return () => clearInterval(logInterval);
  }, [activeTab, generateMockLog]);

  // Derived metrics calculations
  const totalStudents = users.filter(u => u.role === 'student').length;
  const totalCounselors = users.filter(u => u.role === 'counselor').length;
  const activeStudentsCount = new Set(appointments.map(a => a.studentId)).size;
  const engagementRate = totalStudents > 0 ? Math.round((activeStudentsCount / totalStudents) * 100) : 0;

  const completedAptsCount = appointments.filter(a => a.status === 'completed').length;
  const completionRate = appointments.length > 0 ? Math.round((completedAptsCount / appointments.length) * 100) : 0;

  const pendingAptsCount = appointments.filter(a => a.status === APPOINTMENT_STATUS.PENDING).length;

  const handleManualLogGeneration = () => {
    setTelemetryLogs(prev => [generateMockLog(), ...prev]);
  };

  // Filtered Roster Lists
  const filteredAppointments = appointments.filter(a => {
    const studentMatch = a.studentName?.toLowerCase().includes(searchTerm.toLowerCase());
    const counselorMatch = a.counselorName?.toLowerCase().includes(searchTerm.toLowerCase());
    const typeMatch = a.type?.toLowerCase().includes(searchTerm.toLowerCase());
    const queryMatch = studentMatch || counselorMatch || typeMatch || false;
    const statusMatch = statusFilter === 'all' ? true : a.status === statusFilter;
    return queryMatch && statusMatch;
  });

  const filteredUsersList = users.filter(u => {
    const nameMatch = u.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const roleMatch = roleFilter === 'all' ? true : u.role === roleFilter;
    return (nameMatch || emailMatch) && roleMatch;
  });

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case APPOINTMENT_STATUS.CONFIRMED:
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold text-[10px]">Confirmed</Badge>;
      case APPOINTMENT_STATUS.PENDING:
        return <Badge className="bg-amber-500/10 text-amber-600 border-none font-bold text-[10px]">Pending</Badge>;
      case APPOINTMENT_STATUS.CANCELLED:
        return <Badge className="bg-red-500/10 text-red-600 border-none font-bold text-[10px]">Cancelled</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/10 text-blue-600 border-none font-bold text-[10px]">Completed</Badge>;
      default:
        return <Badge className="text-[10px] border-none font-bold uppercase">{status}</Badge>;
    }
  };



  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="p-8 w-full min-h-screen">
          
          {/* Header */}
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Admin Portal</h1>
                <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  System Monitor
                </Badge>
              </div>
              <p className="text-sm text-slate-400 font-medium">Real-time health, clinical analytics, and live activity queues across USPF campus.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => loadData(false)}
                disabled={isLoading}
                className="h-11 px-4 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Force Refresh
              </Button>
              <Button className="h-11 px-5 rounded-xl bg-primary text-white font-black text-xs shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                <FileDown className="mr-2 h-4 w-4" /> Export System Audit
              </Button>
            </div>
          </header>

          {/* Quick Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden p-6 relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-primary/5 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[9px] font-black tracking-widest border-slate-100 text-slate-400 bg-slate-50/50">ROSTER</Badge>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Users</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-slate-900">{users.length}</p>
                  <span className="text-xs text-slate-400 font-semibold">{totalStudents} Students • {totalCounselors} Counselors</span>
                </div>
              </div>
            </Card>

            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden p-6 relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-500">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[9px] font-black tracking-widest border-slate-100 text-slate-400 bg-slate-50/50">ENGAGEMENT</Badge>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Appointment Rate</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-slate-900">{completionRate}%</p>
                  <span className="text-xs text-emerald-500 font-bold flex items-center gap-0.5"><ArrowUpRight className="h-3.5 w-3.5" />{completedAptsCount} Done</span>
                </div>
              </div>
            </Card>

            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden p-6 relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-500">
                  <Clock className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[9px] font-black tracking-widest border-slate-100 text-slate-400 bg-slate-50/50">OPERATIONS</Badge>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Action Queue</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-amber-600">{pendingAptsCount}</p>
                  <span className="text-xs text-slate-400 font-bold">Pending sessions</span>
                </div>
              </div>
            </Card>

            <Card className="border-none shadow-sm bg-primary rounded-3xl overflow-hidden p-6 text-white relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-white/10 text-white">
                  <Activity className="h-5 w-5 animate-pulse" />
                </div>
                <Badge variant="outline" className="text-[9px] font-black tracking-widest border-white/20 text-white/80 bg-white/5">PLATFORM</Badge>
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">Telemetry Status</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black">99.9%</p>
                  <span className="text-xs text-white/80 font-bold">Optimal Handshake</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Monitoring Center Layout */}
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
            
            {/* Roster tab bar */}
            <div className="px-8 pt-8 pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['overview', 'appointments', 'users', 'telemetry'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setSearchTerm('');
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wider ${
                      activeTab === tab
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Roster Search Filters */}
              {activeTab !== 'overview' && activeTab !== 'telemetry' && (
                <div className="flex items-center gap-3">
                  <div className="relative group w-60">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder={`Search ${activeTab}...`} 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-10 border-slate-100 bg-slate-50 focus-visible:ring-1 focus-visible:ring-primary rounded-xl text-xs font-medium"
                    />
                  </div>

                  {activeTab === 'appointments' && (
                    <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
                      {['all', 'pending', 'confirmed', 'completed'].map(f => (
                        <button
                          key={f}
                          onClick={() => setStatusFilter(f)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                            statusFilter === f 
                              ? 'bg-white text-slate-800 shadow-sm'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTab === 'users' && (
                    <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
                      {['all', 'student', 'counselor', 'admin'].map(f => (
                        <button
                          key={f}
                          onClick={() => setRoleFilter(f)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                            roleFilter === f 
                              ? 'bg-white text-slate-800 shadow-sm'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Content Sheets */}
            <div className="p-8 flex-1">
              
              {/* overview tab */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Recharts graph */}
                  <div className="lg:col-span-8 space-y-6">
                    <Card className="border-slate-50 shadow-sm bg-white p-6 rounded-2xl">
                      <div className="mb-6 flex justify-between items-center">
                        <div>
                          <CardTitle className="text-base font-black text-slate-900">Campus Volume</CardTitle>
                          <CardDescription className="text-xs">Consultation sessions booked over the last 7 calendar days.</CardDescription>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold">Active Sync</Badge>
                      </div>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-[10px] font-bold text-slate-400" />
                            <YAxis axisLine={false} tickLine={false} className="text-[10px] font-bold text-slate-400" />
                            <Tooltip cursor={{fill: '#F8FAFC'}} />
                            <Bar dataKey="sessions" fill="#248F7D" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>

                  {/* Sidebar stats */}
                  <div className="lg:col-span-4 space-y-6">
                    {/* Live active queue alert */}
                    <Card className="border-none shadow-sm bg-slate-50 rounded-2xl p-6">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" /> Pending Review
                      </h4>
                      <div className="space-y-3">
                        {appointments.filter(a => a.status === APPOINTMENT_STATUS.PENDING).slice(0, 3).map((apt) => (
                          <div key={apt.id} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-slate-900 truncate">{apt.studentName || 'Student'}</p>
                              <p className="text-[10px] font-bold text-amber-600 truncate">
                                {apt.type} • {apt.date}
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setSelectedItem(apt);
                                setDetailType('appointment');
                              }}
                              className="text-[10px] font-black text-slate-400 hover:text-primary rounded-lg px-2 h-7"
                            >
                              Check
                            </Button>
                          </div>
                        ))}
                        {pendingAptsCount === 0 && (
                          <p className="text-xs text-slate-400 font-medium italic text-center py-4">All sessions up to date.</p>
                        )}
                      </div>
                    </Card>

                    {/* Staff status */}
                    <Card className="border-slate-50 shadow-sm bg-white p-6 rounded-2xl">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" /> Active Queue Waitlist
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span>Pending Consultations</span>
                          <span className="text-amber-500">{pendingAptsCount} Sessions</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(100, pendingAptsCount * 20)}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                          Guidance staff loads are operating efficiently. Next session is auto-routed to wellness support.
                        </p>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* appointments tab */}
              {activeTab === 'appointments' && (
                <div className="border border-slate-50 rounded-2xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Student</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Session Type</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Staff Assigned</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Location</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Date & Time</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAppointments.map((apt) => (
                          <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-xs font-black text-slate-900">{apt.studentName || 'Student'}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-xs font-bold text-slate-700">{apt.type}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-xs font-medium text-slate-600">{apt.counselorName || 'Assigned counselor'}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-xs font-medium text-slate-400">{apt.location || 'Online Session'}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-[10px] font-bold text-slate-500 flex flex-col">
                                <span>{apt.date}</span>
                                <span className="text-[9px] text-slate-400 font-medium">{apt.time}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {renderStatusBadge(apt.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(apt);
                                  setDetailType('appointment');
                                }}
                                className="h-8 font-black text-primary hover:bg-primary/5 rounded-lg text-[10px]"
                              >
                                View Goals
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {filteredAppointments.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-12 text-slate-400 font-bold italic text-xs">No appointments found matching filters.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* users tab */}
              {activeTab === 'users' && (
                <div className="border border-slate-50 rounded-2xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Account</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Email</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">System Role</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Profile Indicators</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">User Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsersList.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={`https://picsum.photos/seed/${user.id}/64/64`} />
                                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{user.name?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                                <p className="text-xs font-black text-slate-900">{user.name}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-xs font-medium text-slate-500">{user.email}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={`border-none font-black text-[10px] px-2.5 py-0.5 rounded-full ${
                                user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' :
                                user.role === 'counselor' ? 'bg-primary/10 text-primary' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {user.role?.toUpperCase() || 'STUDENT'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.role === 'student' ? (
                                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                  Wellness Score: {user.wellness_score || user.wellnessScore || '—'}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Professional Account</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-[10px] font-mono text-slate-300 font-bold uppercase">#{user.id.slice(-8).toUpperCase()}</span>
                            </td>
                          </tr>
                        ))}
                        {filteredUsersList.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-12 text-slate-400 font-bold italic text-xs">No user matches found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* telemetry tab */}
              {activeTab === 'telemetry' && (
                <div className="space-y-6">
                  {/* System health mock details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border border-slate-100 p-5 rounded-2xl bg-slate-50/30 flex items-center gap-4">
                      <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                        <Database className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase">Database Pools</p>
                        <p className="text-sm font-bold text-slate-800">2 Active Connections</p>
                      </div>
                    </Card>
                    <Card className="border border-slate-100 p-5 rounded-2xl bg-slate-50/30 flex items-center gap-4">
                      <div className="h-10 w-10 bg-primary/5 text-primary rounded-xl flex items-center justify-center shrink-0">
                        <Activity className="h-5 w-5 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase">Sync Protocol</p>
                        <p className="text-sm font-bold text-slate-800">Supabase WebSockets (Live)</p>
                      </div>
                    </Card>
                    <Card className="border border-slate-100 p-5 rounded-2xl bg-slate-50/30 flex items-center gap-4">
                      <div className="h-10 w-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center shrink-0">
                        <Terminal className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase">Active Channels</p>
                        <p className="text-sm font-bold text-slate-800">handshake-uspf-prod</p>
                      </div>
                    </Card>
                  </div>

                  {/* Dark terminal mockup */}
                  <Card className="bg-[#0B132B] text-slate-300 font-mono text-xs rounded-2xl shadow-xl overflow-hidden border border-slate-850">
                    <div className="bg-[#1C2541] px-5 py-3 border-b border-slate-800 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-red-500"></span>
                        <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                        <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase ml-2 flex items-center gap-1.5"><Terminal className="h-3.5 w-3.5" /> telemetry_logs</span>
                      </div>
                      <Button 
                        onClick={handleManualLogGeneration}
                        size="sm"
                        className="h-8 bg-slate-800/80 hover:bg-slate-700 text-[10px] font-bold rounded-lg border-none text-slate-300 gap-1.5"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Trigger Pulse
                      </Button>
                    </div>
                    
                    <div className="p-6 h-80 overflow-y-auto space-y-2 select-text">
                      {telemetryLogs.map((log, idx) => (
                        <div key={idx} className="flex gap-4 items-start leading-relaxed font-mono">
                          <span className="text-slate-500 shrink-0 font-bold">[{log.timestamp}]</span>
                          <span className={`shrink-0 font-black uppercase text-[10px] px-1.5 py-0.5 rounded ${
                            log.type === 'error' ? 'bg-red-500/20 text-red-400' :
                            log.type === 'warn' ? 'bg-amber-500/20 text-amber-400' :
                            log.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-slate-800 text-slate-300'
                          }`}>{log.source}</span>
                          <span className={log.type === 'error' ? 'text-red-300' : log.type === 'warn' ? 'text-amber-200' : 'text-slate-300'}>
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Clinical View / Details Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) { setSelectedItem(null); setDetailType(null); } }}>
          <DialogContent className="max-w-lg rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white select-text">
            
            {detailType === 'appointment' && (
              <>
                <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
                  <DialogTitle className="text-2xl font-black text-slate-900">{selectedItem?.type || 'Consultation Session'}</DialogTitle>
                  <div className="flex items-center gap-2 mt-2">
                    {selectedItem && renderStatusBadge(selectedItem.status)}
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">#{selectedItem?.id?.slice(-8).toUpperCase()}</span>
                  </div>
                </DialogHeader>
                
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Student</p>
                      <p className="text-xs font-bold text-slate-800">{selectedItem?.studentName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Assigned Counselor</p>
                      <p className="text-xs font-bold text-slate-800">{selectedItem?.counselorName || 'Staff Assigned'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Session Location</p>
                      <p className="text-xs font-bold text-slate-800">{selectedItem?.location || 'Room 302 / Online'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Date & Time</p>
                      <p className="text-xs font-bold text-slate-800">{selectedItem?.date} at {selectedItem?.time}</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Student consultation goals</h4>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                      "{selectedItem?.reason || 'Student requested generic support guidelines to optimize stress handling and work workloads.'}"
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button onClick={() => setSelectedItem(null)} className="h-11 px-5 rounded-xl bg-primary text-white font-bold text-xs">
                      Dismiss View
                    </Button>
                  </div>
                </div>
              </>
            )}

          </DialogContent>
        </Dialog>

      </DashboardLayout>
    </ProtectedRoute>
  );
}
