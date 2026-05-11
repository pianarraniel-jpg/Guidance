"use client";

import React from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MessageSquare, 
  Calendar, 
  FileText, 
  HelpCircle, 
  ChevronRight, 
  Send, 
  Heart,
  Bell
} from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboard() {
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0] || 'Student';

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto w-full">
          {/* Hero Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl font-bold font-headline text-[#171717] mb-2">Kumusta, {firstName}?</h1>
              <p className="text-muted-foreground">How are you feeling today? Take a moment to check in with yourself.</p>
            </div>
            <Button size="lg" className="bg-[#007055] hover:bg-[#005c46] text-white font-bold rounded-xl shadow-lg px-6 h-12 flex items-center gap-2">
              <Heart className="h-5 w-5 fill-current" /> Start Kamustahan Check-in
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* AI Chat Card */}
            <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden flex flex-col min-h-[440px]">
              <div className="p-4 border-b flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Quick Wellness Check</h4>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">AI Assistant Online</span>
              </div>
              
              <CardContent className="flex-1 p-6 space-y-6 bg-[#F8FAFC]">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 mt-1 border border-primary/10">
                    <AvatarFallback className="bg-primary text-white text-[10px]">GS</AvatarFallback>
                  </Avatar>
                  <div className="bg-white border text-foreground p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm shadow-sm">
                    Hi {firstName}! I'm here to listen. How's your week been so far?
                  </div>
                </div>

                <div className="flex items-start justify-end gap-3">
                  <div className="bg-[#007055] text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm shadow-md">
                    It's been a bit stressful with the upcoming exams, to be honest.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 mt-1 border border-primary/10">
                    <AvatarFallback className="bg-primary text-white text-[10px]">GS</AvatarFallback>
                  </Avatar>
                  <div className="bg-white border text-foreground p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm shadow-sm">
                    I understand. Exams can be tough! Would you like to try a 2-minute breathing exercise or talk to a...
                  </div>
                </div>
              </CardContent>

              <div className="p-4 border-t bg-white">
                <div className="relative flex items-center gap-2">
                  <Input 
                    placeholder="Type your feelings here..." 
                    className="flex-1 h-12 bg-[#F8FAFC] border-none focus-visible:ring-1 focus-visible:ring-primary rounded-xl px-4"
                  />
                  <Button size="icon" className="h-10 w-10 rounded-lg bg-[#007055] hover:bg-[#005c46]">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Book Appointment CTA Card */}
            <Card className="bg-[#005c46] border-none shadow-sm p-8 flex flex-col justify-between text-white relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3">Need to talk?</h3>
                <p className="text-emerald-50/70 text-sm leading-relaxed mb-8">
                  Schedule a 1-on-1 session with our professional counselors.
                </p>
                <Button asChild variant="secondary" className="bg-white text-[#005c46] hover:bg-emerald-50 font-bold px-8 py-6 rounded-xl w-full">
                  <Link href="/student/book">Book Appointment</Link>
                </Button>
              </div>
              
              <Calendar className="absolute -bottom-4 -right-4 h-32 w-32 text-white/5 group-hover:scale-110 transition-transform duration-500" />
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm p-6">
              <h4 className="font-bold text-muted-foreground text-sm mb-6 uppercase tracking-wider">Available Counselors</h4>
              <div className="space-y-6">
                {[
                  { name: 'Dr. Elena Ramos', role: 'Stress Management', img: 'counselor1' },
                  { name: 'Prof. Marco Cruz', role: 'Academic Anxiety', img: 'counselor2' },
                ].map((c, i) => (
                  <div key={i} className="flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-primary/5">
                        <AvatarImage src={`https://picsum.photos/seed/${c.img}/64/64`} />
                        <AvatarFallback>{c.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-sm group-hover:text-primary transition-colors">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">{c.role}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-8 border-primary/20 text-primary font-bold hover:bg-primary/5 rounded-xl">
                View All Experts
              </Button>
            </Card>

            <Card className="border-none shadow-sm p-6">
              <h4 className="font-bold text-muted-foreground text-sm mb-6 uppercase tracking-wider">My Appointments</h4>
              <div className="space-y-4">
                <div className="p-4 rounded-xl border bg-white space-y-3 relative overflow-hidden group hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tomorrow, 10:00 AM</p>
                      <p className="font-bold text-sm mt-1">Session with Dr. Ramos</p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-600 hover:bg-orange-100 text-[9px] font-black uppercase">Confirmed</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <HelpCircle className="h-3 w-3" />
                    Guidance Room 204
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-none shadow-sm p-6 relative">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">Messages</h4>
                <Badge className="bg-[#007055] text-white rounded-full h-5 min-w-[20px] flex items-center justify-center text-[10px] font-bold">2</Badge>
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-3 group cursor-pointer">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Appointment Reminder</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Don't forget your session tomorrow...</p>
                  </div>
                </div>
              </div>
              <Button variant="link" className="w-full mt-6 text-xs text-muted-foreground hover:text-primary font-bold">
                See all messages
              </Button>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
