"use client";

import React from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Navbar from '@/components/common/Navbar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Users, 
  CalendarCheck, 
  AlertCircle, 
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const data = [
  { name: 'Mon', sessions: 12 },
  { name: 'Tue', sessions: 19 },
  { name: 'Wed', sessions: 15 },
  { name: 'Thu', sessions: 22 },
  { name: 'Fri', sessions: 30 },
];

const COLORS = ['#248F7D', '#F4AF25', '#F0F5F4', '#171717'];

export default function AdminDashboard() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8 max-w-7xl">
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
            {/* High-level KPIs */}
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                <CalendarCheck className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,248</div>
                <p className="text-[10px] text-green-600 font-bold">+12% vs last month</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Platform Engagement</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">84%</div>
                <p className="text-[10px] text-muted-foreground">Active students this semester</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Assessment Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">6.8 / 10</div>
                <p className="text-[10px] text-muted-foreground">Medium Stress Level Average</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-primary text-primary-foreground">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <LayoutDashboard className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Optimal</div>
                <p className="text-[10px] opacity-80">All services operational</p>
              </CardContent>
            </Card>

            {/* Charts Section */}
            <Card className="md:col-span-3 border-none shadow-md">
              <CardHeader>
                <CardTitle>Session Volume Trends</CardTitle>
                <CardDescription>Daily appointments across all counselors</CardDescription>
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

            {/* Role Breakdown / Sidebar Info */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Counselor Workload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Dr. Maria Santos</span>
                    <span>88%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[88%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Prof. Jose Rizal</span>
                    <span>65%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[65%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Ms. Gabriela Silang</span>
                    <span>42%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[42%]" />
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4">Generate Report</Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
