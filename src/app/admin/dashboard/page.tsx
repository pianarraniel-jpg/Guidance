"use client";

import React from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
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

const data = [
  { name: 'Mon', sessions: 12 },
  { name: 'Tue', sessions: 19 },
  { name: 'Wed', sessions: 15 },
  { name: 'Thu', sessions: 22 },
  { name: 'Fri', sessions: 30 },
];

export default function AdminDashboard() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto w-full">
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold font-headline text-primary mb-2">System Analytics</h1>
              <p className="text-muted-foreground">Monitoring campus-wide wellness engagement.</p>
            </div>
            <Button className="shadow-lg">
              <FileDown className="mr-2 h-4 w-4" /> Export Monthly Report
            </Button>
          </header>

          <div className="grid gap-6 md:grid-cols-4">
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                <CalendarCheck className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,248</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Platform Engagement</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">84%</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Assessment Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">6.8 / 10</div>
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
                <CardTitle>Session Volume Trends</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
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
                <CardTitle>Workload Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Counseling Staff</span>
                    <span>88%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[88%]" />
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4">Generate Detailed Report</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
