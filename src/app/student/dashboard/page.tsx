
"use client";

import React from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Navbar from '@/components/common/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Calendar, 
  Search, 
  Bell, 
  HelpCircle, 
  Heart, 
  Send, 
  ChevronRight,
  Plus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';

export default function StudentDashboard() {
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0] || 'Student';

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Dashboard Header */}
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-8 flex-1">
              <Link href="/" className="font-headline text-xl font-bold text-primary flex items-center gap-2">
                GuidanceSync
              </Link>
              <div className="hidden md:flex relative max-w-md w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search resources..." 
                  className="pl-10 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary h-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-6">
              <Link href="/student/kamustahan" className="hidden lg:block text-sm font-bold text-primary hover:underline underline-offset-4 decoration-2">
                Kamustahan Portal
              </Link>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Bell className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <HelpCircle className="h-5 w-5" />
                </Button>
                <div className="pl-2 ml-2 border-l flex items-center gap-3">
                  <Avatar className="h-8 w-8 border-2 border-primary/10">
                    <AvatarImage src={`https://picsum.photos/seed/${user?.id}/64/64`} />
                    <AvatarFallback>{firstName[0]}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Hero Section */}
          <section className="mb-8">
            <div className="bg-[#007055] rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between min-h-[320px]">
              <div className="relative z-10 max-w-xl text-center md:text-left">
                <h1 className="text-5xl font-bold font-headline mb-4">Kumusta, {firstName}?</h1>
                <p className="text-emerald-50/80 text-lg mb-8 max-w-md">
                  How are you feeling today? We're here to support your journey and provide the care you need.
                </p>
                <Button size="lg" className="bg-white text-[#007055] hover:bg-emerald-50 font-bold rounded-xl shadow-xl px-8 h-12">
                  <Heart className="mr-2 h-5 w-5 fill-current" /> Start Kamustahan Check-in
                </Button>
              </div>
              
              <div className="mt-8 md:mt-0 relative z-10 w-full md:w-auto flex justify-center">
                <div className="relative h-64 w-64 md:h-72 md:w-72">
                  <Image 
                    src="https://picsum.photos/seed/plant1/600/600" 
                    alt="Growth"
                    fill
                    className="object-cover rounded-3xl shadow-2xl border-4 border-white/10"
                    data-ai-hint="potted plant"
                  />
                </div>
              </div>

              {/* Decorative shapes */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column: AI Chat Assessment */}
            <div className="lg:col-span-6">
              <Card className="h-full border-none shadow-md overflow-hidden flex flex-col">
                <div className="p-6 border-b flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">Quick Wellness Check</h3>
                    <p className="text-sm text-muted-foreground">Always available for a quick chat</p>
                  </div>
                </div>
                
                <CardContent className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[400px]">
                  {/* AI Message 1 */}
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src="https://picsum.photos/seed/ai-bot/32/32" />
                      <AvatarFallback>G</AvatarFallback>
                    </Avatar>
                    <div className="bg-primary/10 text-foreground p-4 rounded-2xl rounded-tl-none max-w-[85%] text-sm leading-relaxed">
                      Hi {firstName}! I'm Guidi, your wellness companion. How has your week been going so far?
                    </div>
                  </div>

                  {/* AI Message 2 */}
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src="https://picsum.photos/seed/ai-bot/32/32" />
                      <AvatarFallback>G</AvatarFallback>
                    </Avatar>
                    <div className="bg-primary/10 text-foreground p-4 rounded-2xl rounded-tl-none max-w-[85%] text-sm leading-relaxed">
                      You can pick how you're feeling below, or just type anything on your mind.
                    </div>
                  </div>
                </CardContent>

                <div className="p-6 border-t space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {['Stressed', 'Anxious', 'Doing Okay', 'Happy', 'Tired'].map((mood) => (
                      <Button key={mood} variant="outline" size="sm" className="rounded-full border-muted text-xs font-medium hover:border-primary hover:text-primary transition-all">
                        {mood}
                      </Button>
                    ))}
                  </div>
                  <div className="relative">
                    <Input 
                      placeholder="Type your message..." 
                      className="pr-12 h-12 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
                    />
                    <Button size="icon" className="absolute right-1 top-1 h-10 w-10 rounded-lg bg-primary hover:bg-primary/90">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Middle Column: Appointments & Messages */}
            <div className="lg:col-span-3 space-y-6">
              {/* Book Appointment Card */}
              <Card className="border-none shadow-md p-6 bg-white flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 mb-4">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">Book Appointment</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Schedule a session with your preferred counselor.
                </p>
                <Button variant="link" asChild className="text-primary font-bold h-auto p-0 hover:no-underline flex items-center">
                  <Link href="/student/book">
                    Schedule Now <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </Card>

              {/* My Appointments Status */}
              <Card className="border-none shadow-md p-4 hover:bg-accent/10 transition-colors cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">My Appointments</p>
                      <p className="text-[10px] text-muted-foreground">Next: Oct 24, 2:00 PM</p>
                    </div>
                  </div>
                  <Badge className="bg-primary text-white hover:bg-primary font-bold rounded-full h-6 min-w-[24px] flex items-center justify-center">2</Badge>
                </div>
              </Card>

              {/* Messages Status */}
              <Card className="border-none shadow-md p-4 hover:bg-accent/10 transition-colors cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Messages</p>
                      <p className="text-[10px] text-muted-foreground">Unread from Counselor</p>
                    </div>
                  </div>
                  <Badge className="bg-[#B45309] text-white hover:bg-[#B45309] font-bold rounded-full h-6 min-w-[24px] flex items-center justify-center">5</Badge>
                </div>
              </Card>
            </div>

            {/* Right Column: Counselor List */}
            <div className="lg:col-span-3">
              <Card className="h-full border-none shadow-md p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg">Counselors</h3>
                  <Button variant="link" className="text-xs text-primary font-bold h-auto p-0">View All</Button>
                </div>

                <div className="space-y-6 flex-1">
                  {[
                    { name: 'Dr. Elena Santos', role: 'Clinical Psychologist', online: true },
                    { name: 'Prof. Marco Reyes', role: 'Guidance Specialist', online: true },
                    { name: 'Ms. Clara Cruz', role: 'Stress Management', online: false },
                  ].map((counselor, idx) => (
                    <div key={idx} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={`https://picsum.photos/seed/counselor${idx}/40/40`} />
                            <AvatarFallback>{counselor.name[0]}</AvatarFallback>
                          </Avatar>
                          {counselor.online && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <p className="text-sm font-bold leading-tight group-hover:text-primary transition-colors">{counselor.name}</p>
                          <p className="text-[10px] text-muted-foreground">{counselor.role}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full mt-8 border-dashed border-2 hover:bg-accent/50 group rounded-xl">
                  <Plus className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary" /> 
                  <span className="text-xs font-bold text-muted-foreground group-hover:text-primary">Request New Counselor</span>
                </Button>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
