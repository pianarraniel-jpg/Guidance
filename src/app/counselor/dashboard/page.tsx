"use client";

import React from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Navbar from '@/components/common/Navbar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, ClipboardCheck, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function CounselorDashboard() {
  return (
    <ProtectedRoute allowedRoles={['counselor']}>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <header className="mb-8">
            <h1 className="text-4xl font-bold font-headline text-primary mb-2">Welcome, Dr. Santos</h1>
            <p className="text-muted-foreground">You have 4 sessions scheduled for today.</p>
          </header>

          <div className="grid gap-6 md:grid-cols-4">
            {/* Quick Stats */}
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-[10px] text-muted-foreground">+2 from last week</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sessions Today</CardTitle>
                <Calendar className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4</div>
                <p className="text-[10px] text-muted-foreground">1 completed, 3 remaining</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Notes Pending</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
                <p className="text-[10px] text-muted-foreground">Needs review by EOD</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Wellness</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Stable</div>
                <p className="text-[10px] text-muted-foreground">Based on recent assessments</p>
              </CardContent>
            </Card>

            {/* Agenda/Schedule */}
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
                    { time: '01:30 PM', name: 'Andres Bonifacio', type: 'Wellness Check', status: 'Upcoming' },
                    { time: '03:00 PM', name: 'Leonor Rivera', type: 'Crisis Support', status: 'Upcoming' },
                  ].map((session, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-4 rounded-lg border ${session.status === 'Completed' ? 'bg-muted/50' : 'bg-white'}`}>
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-bold text-primary w-20">{session.time}</div>
                        <div>
                          <p className="font-bold">{session.name}</p>
                          <p className="text-xs text-muted-foreground">{session.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${session.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {session.status.toUpperCase()}
                        </span>
                        <Button variant="ghost" size="sm">Details</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pre-session Summaries */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Recent AI Summaries</CardTitle>
                <CardDescription>Generated from student assessments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-3 hover:bg-accent transition-colors cursor-pointer">
                  <p className="text-sm font-bold">Juan Dela Cruz</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    Student reports high anxiety regarding upcoming finals. Main concern: Time management...
                  </p>
                </div>
                <div className="rounded-lg border p-3 hover:bg-accent transition-colors cursor-pointer">
                  <p className="text-sm font-bold">Maria Clara</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    Feeling overwhelmed by family expectations. Needs guidance on healthy boundaries...
                  </p>
                </div>
                <Button variant="outline" className="w-full text-xs">View All Summaries</Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
