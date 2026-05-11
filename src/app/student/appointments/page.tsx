"use client";

import React, { useState } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  MapPin, 
  Video, 
  Calendar as CalendarIcon
} from 'lucide-react';
import Link from 'next/link';

export default function StudentAppointments() {
  const [activeTab, setActiveTab] = useState('upcoming');

  const appointments = [
    {
      id: '1',
      date: '24',
      month: 'OCT',
      time: '09:30 AM',
      type: 'KAMUSTAHAN',
      modality: 'Virtual',
      title: 'Initial Consultation',
      counselor: 'Dr. Elena Rodriguez',
      duration: '60 Minutes',
      avatar: 'https://picsum.photos/seed/doc1/64/64',
      status: 'upcoming',
      tagColor: 'bg-[#007055] text-white',
      locationIcon: Video
    },
    {
      id: '2',
      date: '28',
      month: 'OCT',
      time: '02:00 PM',
      type: 'COUNSELING',
      modality: 'Room 302',
      title: 'Stress Management Session',
      counselor: 'Mr. Marcus Jensen',
      duration: '45 Minutes',
      avatar: 'https://picsum.photos/seed/doc2/64/64',
      status: 'upcoming',
      tagColor: 'bg-[#6366F1] text-white',
      locationIcon: MapPin
    }
  ];

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <main className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <h1 className="text-3xl font-bold font-headline text-[#1E293B] mb-8">My Appointments</h1>

            <Tabs defaultValue="upcoming" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="bg-transparent border-none p-0 h-auto gap-8 mb-8 overflow-x-auto justify-start">
                <TabsTrigger 
                  value="upcoming" 
                  className="data-[state=active]:bg-[#007055] data-[state=active]:text-white data-[state=active]:shadow-md rounded-full px-6 py-2 text-sm font-bold text-muted-foreground bg-white border"
                >
                  Upcoming
                </TabsTrigger>
                <TabsTrigger 
                  value="past" 
                  className="data-[state=active]:bg-[#007055] data-[state=active]:text-white rounded-full px-6 py-2 text-sm font-bold text-muted-foreground bg-white border"
                >
                  Past Sessions
                </TabsTrigger>
                <TabsTrigger 
                  value="cancelled" 
                  className="data-[state=active]:bg-[#007055] data-[state=active]:text-white rounded-full px-6 py-2 text-sm font-bold text-muted-foreground bg-white border"
                >
                  Cancelled
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                {appointments.map((app) => (
                  <Card key={app.id} className="border-none shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                    <CardContent className="p-0 flex flex-col md:flex-row items-stretch">
                      <div className="bg-[#EFF6FF] md:w-32 p-6 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-black text-[#1E40AF]">{app.date}</span>
                        <span className="text-sm font-bold text-[#1E40AF]/70 uppercase">{app.month}</span>
                        <div className="mt-3 px-2 py-1 rounded bg-[#DBEAFE] text-[10px] font-black text-[#1E40AF] whitespace-nowrap">
                          {app.time}
                        </div>
                      </div>

                      <div className="flex-1 p-6 relative">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className={`${app.tagColor} text-[10px] font-black px-2 py-0.5 border-none rounded`}>
                            {app.type}
                          </Badge>
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <app.locationIcon className="h-3 w-3" />
                            {app.modality}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-[#1E293B] mb-1">{app.title}</h3>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5 ring-1 ring-primary/10">
                              <AvatarImage src={app.avatar} />
                              <AvatarFallback className="text-[8px]">{app.counselor[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-muted-foreground">{app.counselor}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {app.duration}
                          </div>
                        </div>

                        <div className="mt-6 flex items-center gap-3">
                          <Button className={`${app.id === '1' ? 'bg-[#007055] hover:bg-[#005c46]' : 'bg-[#6366F1] hover:bg-[#4F46E5]'} text-white font-bold rounded-lg px-6`}>
                            Reschedule
                          </Button>
                          <Button variant="outline" className="border-muted-foreground/20 text-muted-foreground font-bold rounded-lg px-6 hover:bg-muted">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <Card className="bg-[#007055] border-none shadow-lg p-8 text-white relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-4">Need to talk?</h3>
                <p className="text-emerald-50/80 text-sm leading-relaxed mb-8">
                  Book a quick Kamustahan session or a full counseling meeting with our specialists.
                </p>
                <Button asChild variant="secondary" className="bg-white text-[#007055] hover:bg-emerald-50 font-black px-8 py-6 rounded-xl w-full shadow-md">
                  <Link href="/student/book">Book Now</Link>
                </Button>
              </div>
              <div className="absolute bottom-[-20%] right-[-10%] opacity-10 pointer-events-none">
                <CalendarIcon className="h-48 w-48 rotate-12" />
              </div>
            </Card>

            <Card className="bg-white border-none shadow-sm p-8">
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-6">Monthly Summary</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F0FDF4] p-6 rounded-2xl flex flex-col items-center">
                  <span className="text-4xl font-black text-[#007055]">02</span>
                  <span className="text-[10px] font-bold text-[#007055]/70 uppercase mt-1">Completed</span>
                </div>
                <div className="bg-[#F5F3FF] p-6 rounded-2xl flex flex-col items-center">
                  <span className="text-4xl font-black text-[#6366F1]">02</span>
                  <span className="text-[10px] font-bold text-[#6366F1]/70 uppercase mt-1">Upcoming</span>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
