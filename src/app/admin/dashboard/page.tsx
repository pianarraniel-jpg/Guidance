"use client";

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS } from '@/lib/constants';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Users, 
  CalendarCheck, 
  FileDown,
  LayoutDashboard
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { format, parseISO, eachDayOfInterval, subDays, startOfDay } from 'date-fns';

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const loadData = () => {
      const allApts = storageService.getAll<any>(STORAGE_KEYS.APPOINTMENTS);
      const allUsers = storageService.getAll<any>(STORAGE_KEYS.USERS);
      setAppointments(allApts);
      setUsers(allUsers);

      // Generate last 7 days chart data
      const last7Days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date(),
      });

      const data = last7Days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const count = allApts.filter(a => a.date === dateStr).length;
        return {
          name: format(day, 'EEE'),
          sessions: count
        };
      });
      setChartData(data);
    };
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const totalStudents = users.filter(u => u.role === 'student').length;
  const activeStudents = new Set(appointments.map(a => a.studentId)).size;
  const engagementRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto w-full">
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold font-headline text-primary mb-2">System Analytics</h1>
              <p className="text-muted-foreground">Monitoring campus-wide wellness engagement across USPF.</p>
            </div>
            <Button className="shadow-lg h-12 rounded-xl font-bold">
              <FileDown className="mr-2 h-4 w-4" /> Export Report
            </Button>
          </header>

          <div className="grid gap-6 md:grid-cols-4">
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                <CalendarCheck className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{appointments.length}</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Platform Engagement</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{engagementRate}%</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Unique Students</CardTitle>
                <BarChart3 className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeStudents}</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-primary text-primary-foreground">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <LayoutDashboard className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Optimal</div>
              </CardContent>
            </Card>

            <Card className="md:col-span-3 border-none shadow-md">
              <CardHeader>
                <CardTitle>Session Volume (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#F0F5F4'}} />
                    <Bar dataKey="sessions" fill="#248F7D" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Staff Load</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Active Counselors</span>
                    <span>100%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[100%]" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">System is currently processing all requests within SLA.</p>
                <Button variant="outline" className="w-full mt-4 font-bold rounded-xl">Audit Logs</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
