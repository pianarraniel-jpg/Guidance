
"use client";

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  MoreHorizontal, 
  Filter,
  Plus,
  CheckCircle2,
  XCircle,
  Timer,
  Info
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

export default function StudentAppointments() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [appointments, setAppointments] = useState<any[]>([]);

  const loadAppointments = () => {
    if (user) {
      const data = storageService.getByField<any>(STORAGE_KEYS.APPOINTMENTS, 'studentId', user.id);
      // Sort by date descending
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAppointments(data);
    }
  };

  useEffect(() => {
    loadAppointments();
    
    // Listen for storage changes in case of cross-tab updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.APPOINTMENTS) {
        loadAppointments();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

  const filteredAppointments = appointments.filter(app => {
    const matchesSearch = app.counselorName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         app.type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Get dates for confirmed appointments to mark in calendar
  const confirmedDates = appointments
    .filter(app => app.status === APPOINTMENT_STATUS.CONFIRMED)
    .map(app => parseISO(app.date));

  const stats = [
    { label: 'Total Sessions', value: appointments.length, icon: CalendarIcon, color: 'text-primary' },
    { label: 'Upcoming', value: appointments.filter(a => a.status === APPOINTMENT_STATUS.CONFIRMED).length, icon: Timer, color: 'text-blue-500' },
    { label: 'Completed', value: appointments.filter(a => a.status === 'completed').length, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Pending', value: appointments.filter(a => a.status === APPOINTMENT_STATUS.PENDING).length, icon: Clock, color: 'text-amber-500' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'upcoming':
        return <Badge className="bg-emerald-50 text-emerald-700 border-none font-black text-[9px] uppercase tracking-wider px-3">Confirmed</Badge>;
      case 'completed':
        return <Badge className="bg-blue-50 text-blue-700 border-none font-black text-[9px] uppercase tracking-wider px-3">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-50 text-red-700 border-none font-black text-[9px] uppercase tracking-wider px-3">Cancelled</Badge>;
      case 'pending':
        return <Badge className="bg-amber-50 text-amber-700 border-none font-black text-[9px] uppercase tracking-wider px-3">Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider">{status}</Badge>;
    }
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto w-full">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">My Appointments</h1>
              <p className="text-muted-foreground font-medium">Manage your wellness journey and synchronized schedules.</p>
            </div>
            <Button asChild className="bg-primary hover:bg-primary/90 text-white font-black rounded-2xl h-14 px-8 shadow-xl shadow-primary/20">
              <Link href="/student/book" className="flex items-center gap-2">
                <Plus className="h-5 w-5" /> Book New Session
              </Link>
            </Button>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-none shadow-sm bg-white rounded-2xl">
                <CardContent className="pt-6">
                  <div className={`p-2 w-fit rounded-lg bg-slate-50 ${stat.color} mb-3`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* List View */}
            <div className="lg:col-span-8">
              <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
                <CardHeader className="p-8 border-b">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-lg font-black flex items-center gap-2">
                      <Filter className="h-5 w-5 text-primary" /> Session Records
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          placeholder="Search counselor..." 
                          className="pl-10 w-full sm:w-[220px] h-11 bg-slate-50 border-none rounded-xl text-xs font-bold"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[130px] h-11 bg-slate-50 border-none rounded-xl text-xs font-bold">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-b border-slate-100 h-14">
                        <TableHead className="pl-8 font-black text-[10px] uppercase tracking-widest text-slate-400">Reference</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Schedule</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Counselor</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                        <TableHead className="pr-8 text-right font-black text-[10px] uppercase tracking-widest text-slate-400">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.map((app) => (
                        <TableRow key={app.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all py-4">
                          <TableCell className="pl-8 font-mono text-[10px] text-slate-400 font-bold">#{app.id.slice(-4).toUpperCase()}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 text-xs">{format(parseISO(app.date), 'MMM dd, yyyy')}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">{app.time}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-black text-slate-700">{app.counselorName}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell className="pr-8 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-primary">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl p-1 border-slate-100 shadow-xl">
                                <DropdownMenuItem className="font-bold text-xs p-2.5 rounded-lg cursor-pointer">
                                  <Info className="h-3.5 w-3.5 mr-2" /> View Info
                                </DropdownMenuItem>
                                {(app.status === APPOINTMENT_STATUS.PENDING || app.status === APPOINTMENT_STATUS.CONFIRMED) && (
                                  <DropdownMenuItem className="font-bold text-xs p-2.5 rounded-lg cursor-pointer text-red-600 hover:bg-red-50">
                                    <XCircle className="h-3.5 w-3.5 mr-2" /> Cancel Session
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredAppointments.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-slate-300 font-bold text-sm italic">
                            No appointment records found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Calendar View */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    Wellness Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex flex-col items-center">
                  <Calendar
                    mode="multiple"
                    selected={confirmedDates}
                    className="rounded-2xl border-none p-0"
                    modifiers={{ confirmed: confirmedDates }}
                    modifiersClassNames={{
                      confirmed: "bg-emerald-500 text-white font-bold rounded-full hover:bg-emerald-600 focus:bg-emerald-500"
                    }}
                  />
                  <div className="w-full mt-6 pt-6 border-t border-slate-50 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Confirmed Session</span>
                    </div>
                    <p className="text-[10px] text-slate-400 italic leading-relaxed">
                      Dates marked in green have been approved by your counselor. Ensure you arrive at the designated location on time.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg shadow-slate-200/30 bg-primary rounded-[2rem] p-6 text-white overflow-hidden relative group">
                <div className="relative z-10">
                  <h3 className="font-black text-lg mb-2">Need Help?</h3>
                  <p className="text-xs text-white/80 font-medium mb-4">Talk to Guidi, our AI companion, if you're feeling overwhelmed before your session.</p>
                  <Button asChild variant="secondary" className="w-full bg-white text-primary hover:bg-white/90 rounded-xl font-black">
                    <Link href="/student/assessments">Launch Guidi</Link>
                  </Button>
                </div>
                <Timer className="absolute -bottom-4 -right-4 h-32 w-32 text-white/10 group-hover:scale-110 transition-transform" />
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
