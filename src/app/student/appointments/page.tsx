"use client";

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS } from '@/lib/constants';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Search, 
  Calendar, 
  Clock, 
  MoreHorizontal, 
  Filter,
  Plus,
  CheckCircle2,
  XCircle,
  Timer
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';

export default function StudentAppointments() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      const data = storageService.getByField<any>(STORAGE_KEYS.APPOINTMENTS, 'studentId', user.id);
      // Sort by date descending
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAppointments(data);
    }
  }, [user]);

  const filteredAppointments = appointments.filter(app => {
    const matchesSearch = app.counselorName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         app.type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: 'Total Sessions', value: appointments.length, icon: Calendar, color: 'text-primary' },
    { label: 'Upcoming', value: appointments.filter(a => a.status === 'confirmed').length, icon: Timer, color: 'text-blue-500' },
    { label: 'Completed', value: appointments.filter(a => a.status === 'completed').length, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Cancelled', value: appointments.filter(a => a.status === 'cancelled').length, icon: XCircle, color: 'text-red-500' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'upcoming':
        return <Badge className="bg-blue-50 text-blue-700 border-none font-bold px-3 py-1">Confirmed</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold px-3 py-1">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-50 text-red-700 border-none font-bold px-3 py-1">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto w-full">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">My Appointments</h1>
              <p className="text-muted-foreground font-medium">Track your personal wellness journey.</p>
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

          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="p-8 border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" /> Record History
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search appointments..." 
                      className="pl-10 w-full sm:w-[260px] h-11 bg-slate-50 border-none rounded-xl text-xs"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] h-11 bg-slate-50 border-none rounded-xl text-xs font-bold">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="pl-8 font-black text-[10px] uppercase tracking-widest text-slate-400">Reference</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Appointment</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Counselor</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                    <TableHead className="pr-8 text-right font-black text-[10px] uppercase tracking-widest text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((app) => (
                    <TableRow key={app.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all">
                      <TableCell className="pl-8 font-mono text-[10px] text-slate-400">#{app.id.slice(-6).toUpperCase()}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{app.type}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{app.date} • {app.time}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-bold text-slate-700">{app.counselorName}</TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="pr-8 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem className="font-bold text-xs">View Summary</DropdownMenuItem>
                            {app.status === 'confirmed' && (
                              <DropdownMenuItem className="font-bold text-xs text-red-600">Cancel</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAppointments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-bold">No appointments found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
