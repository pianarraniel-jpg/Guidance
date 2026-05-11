"use client";

import React, { useState } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
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

const appointmentsData = [
  {
    id: 'app-001',
    date: '2024-06-15',
    time: '10:00 AM',
    counselor: 'Dr. Maria Santos',
    type: 'Wellness Check-in',
    status: 'Upcoming',
    location: 'Room 302 / Physical',
    priority: 'Normal'
  },
  {
    id: 'app-002',
    date: '2024-06-12',
    time: '02:00 PM',
    counselor: 'Mr. Marcus Jensen',
    type: 'Follow-up Session',
    status: 'Completed',
    location: 'Virtual / Zoom',
    priority: 'High'
  },
  {
    id: 'app-003',
    date: '2024-06-05',
    time: '09:00 AM',
    counselor: 'Dr. Maria Santos',
    type: 'Initial Assessment',
    status: 'Completed',
    location: 'Room 302 / Physical',
    priority: 'Normal'
  },
  {
    id: 'app-004',
    date: '2024-05-28',
    time: '11:30 AM',
    counselor: 'Sarah Jenkins',
    type: 'Stress Counseling',
    status: 'Cancelled',
    location: 'Virtual / Zoom',
    priority: 'Low'
  },
  {
    id: 'app-005',
    date: '2024-05-20',
    time: '03:00 PM',
    counselor: 'Dr. Maria Santos',
    type: 'Kamustahan',
    status: 'Completed',
    location: 'Room 302 / Physical',
    priority: 'Normal'
  }
];

export default function StudentAppointments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAppointments = appointmentsData.filter(app => {
    const matchesSearch = app.counselor.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         app.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: 'Total Sessions', value: '12', icon: Calendar, color: 'text-primary' },
    { label: 'Upcoming', value: '1', icon: Timer, color: 'text-blue-500' },
    { label: 'Completed', value: '10', icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Cancelled', value: '1', icon: XCircle, color: 'text-red-500' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'upcoming':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50 font-bold px-3 py-1">Upcoming</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 font-bold px-3 py-1">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-50 text-red-700 border-red-100 hover:bg-red-50 font-bold px-3 py-1">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto w-full">
          {/* Header & Stats Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-bold font-headline text-[#171717] mb-2">Appointment History</h1>
              <p className="text-muted-foreground">Manage and track all your university wellness sessions.</p>
            </div>
            <div className="flex gap-4">
               <Button asChild className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg px-6 h-12 flex items-center gap-2">
                <Link href="/student/book">
                  <Plus className="h-5 w-5" /> Book New Session
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-none shadow-sm bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg bg-slate-50 ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table & Filters Section */}
          <Card className="border-none shadow-md bg-white overflow-hidden">
            <CardHeader className="border-b pb-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  Records Filter
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search counselor or type..." 
                      className="pl-10 w-full sm:w-[300px] h-11 rounded-xl bg-slate-50/50 border-slate-200"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px] h-11 rounded-xl bg-slate-50/50">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="font-bold text-slate-900 h-14 pl-6">Ref ID</TableHead>
                    <TableHead className="font-bold text-slate-900 h-14">Appointment Info</TableHead>
                    <TableHead className="font-bold text-slate-900 h-14">Counselor</TableHead>
                    <TableHead className="font-bold text-slate-900 h-14">Location / Type</TableHead>
                    <TableHead className="font-bold text-slate-900 h-14">Status</TableHead>
                    <TableHead className="font-bold text-slate-900 h-14 pr-6 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((app) => (
                      <TableRow key={app.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                        <TableCell className="font-mono text-[10px] text-muted-foreground pl-6">{app.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">{app.type}</span>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                              <Calendar className="h-3 w-3" /> {app.date} • <Clock className="h-3 w-3" /> {app.time}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-700">{app.counselor}</TableCell>
                        <TableCell>
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase">
                            {app.location}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(app.status)}</TableCell>
                        <TableCell className="pr-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-slate-200">
                              <DropdownMenuItem className="font-bold text-xs cursor-pointer">View Details</DropdownMenuItem>
                              {app.status === 'Upcoming' && (
                                <>
                                  <DropdownMenuItem className="font-bold text-xs cursor-pointer text-primary">Reschedule</DropdownMenuItem>
                                  <DropdownMenuItem className="font-bold text-xs cursor-pointer text-red-600">Cancel Session</DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem className="font-bold text-xs cursor-pointer">Download Receipt</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        No appointment records found matching your filters.
                      </TableCell>
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
