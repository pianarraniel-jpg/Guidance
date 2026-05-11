"use client";

import React from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Navbar from '@/components/common/Navbar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Calendar, BookOpen, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboard() {
  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold font-headline text-primary mb-2">Hello, Student!</h1>
              <p className="text-muted-foreground">Your mental wellness is our priority. How are you feeling today?</p>
            </div>
            <div className="flex gap-3">
              <Button asChild className="shadow-lg">
                <Link href="/student/book">
                  <Calendar className="mr-2 h-4 w-4" /> Book Session
                </Link>
              </Button>
            </div>
          </header>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Main Action: AI Assessment */}
            <Card className="md:col-span-2 border-primary/20 bg-gradient-to-br from-white to-accent shadow-sm overflow-hidden">
              <div className="flex h-full flex-col p-6">
                <div className="mb-auto">
                  <div className="inline-flex rounded-full bg-primary/10 p-2 text-primary mb-4">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl mb-2">Quick Wellness Check-in</CardTitle>
                  <CardDescription className="text-base">
                    Take a 2-minute AI-powered stress assessment. It's confidential and helps our counselors support you better.
                  </CardDescription>
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-muted flex items-center justify-center overflow-hidden">
                        <img src={`https://picsum.photos/seed/${i+10}/32/32`} alt="avatar" />
                      </div>
                    ))}
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-muted text-[10px] font-bold">
                      +12
                    </div>
                  </div>
                  <Button variant="secondary" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md">
                    Start Chat <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Upcoming Appointment */}
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-secondary" /> Next Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">Wellness Check-in</p>
                      <p className="text-sm text-muted-foreground">Dr. Maria Santos</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">CONFIRMED</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>June 15, 2024</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>10:00 AM - 11:00 AM</span>
                  </div>
                </div>
                <Button variant="link" asChild className="w-full mt-4 h-auto p-0 text-primary">
                  <Link href="/student/appointments">View all appointments</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Counseling Tips / Resources */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Resource Hub</CardTitle>
                <CardDescription>Support articles and tips</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="group cursor-pointer flex items-center gap-3 hover:bg-accent/50 p-2 rounded-md transition-colors">
                  <div className="bg-primary/10 p-2 rounded-md text-primary">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Managing Exam Anxiety</p>
                    <p className="text-[10px] text-muted-foreground">5 min read</p>
                  </div>
                </div>
                <div className="group cursor-pointer flex items-center gap-3 hover:bg-accent/50 p-2 rounded-md transition-colors">
                  <div className="bg-primary/10 p-2 rounded-md text-primary">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Building Better Sleep Habits</p>
                    <p className="text-[10px] text-muted-foreground">8 min read</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Messages */}
            <Card className="md:col-span-2 border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Recent Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                   <div className="flex items-start gap-3 border-b pb-4">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">MS</div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="text-sm font-bold">Dr. Maria Santos</p>
                          <span className="text-[10px] text-muted-foreground">2 hours ago</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">Good morning! Just a reminder for our session tomorrow...</p>
                      </div>
                   </div>
                </div>
                <Button variant="outline" asChild className="w-full mt-4">
                  <Link href="/student/messages">Open Message Center</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
