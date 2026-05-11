"use client";

import React from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, ClipboardCheck, TrendingUp } from 'lucide-react';

export default function CounselorDashboard() {
  return (
    <ProtectedRoute allowedRoles={['counselor']}>
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto w-full">
          <header className="mb-8">
            <h1 className="text-4xl font-bold font-headline text-primary mb-2">Welcome, Counselor</h1>
            <p className="text-muted-foreground">You have 4 sessions scheduled for today.</p>
          </header>

          <div className="grid gap-6 md:grid-cols-4">
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sessions Today</CardTitle>
                <Calendar className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Notes Pending</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Wellness</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Stable</div>
              </CardContent>
            </Card>

            <Card className="md:col-span-3 border-none shadow-md">
              <CardHeader>
                <CardTitle>Today's Agenda</CardTitle>
                <CardDescription>Wednesday, June 12, 2024</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { time: '09:00 AM', name: 'Maria Clara', type: 'Initial Intake', status: 'Completed' },
                    { time: '10:00 AM', name: 'Juan Dela Cruz', type: 'Follow-up', status: 'Upcoming' },
                  ].map((session, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-lg border bg-white">
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-bold text-primary w-20">{session.time}</div>
                        <div>
                          <p className="font-bold">{session.name}</p>
                          <p className="text-xs text-muted-foreground">{session.type}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">Details</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Recent AI Summaries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-bold">Juan Dela Cruz</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    Student reports high anxiety regarding upcoming finals.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
