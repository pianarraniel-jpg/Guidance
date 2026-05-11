
"use client";

import React, { useState } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  Calendar, 
  ClipboardCheck, 
  MessageSquare, 
  FileText, 
  HelpCircle, 
  LogOut,
  Bell,
  Search,
  Settings,
  PlusCircle,
  Clock,
  MapPin,
  Video,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import Link from 'next/link';

export default function StudentAppointments() {
  const { user, logout } = useAuth();
  const firstName = user?.name.split(' ')[0] || 'Student';
  const [activeTab, setActiveTab] = useState('upcoming');

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: false, href: '/student/dashboard' },
    { icon: Calendar, label: 'Appointments', active: true, href: '/student/appointments' },
    { icon: ClipboardCheck, label: 'Assessments', active: false, href: '/student/assessments' },
    { icon: MessageSquare, label: 'Messages', active: false, href: '/student/messages' },
    { icon: FileText, label: 'Resources', active: false, href: '/student/resources' },
  ];

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
      <div className="flex min-h-screen bg-[#F8FAFC]">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r hidden lg:flex flex-col py-6">
          <div className="px-6 mb-10">
            <h2 className="text-2xl font-bold text-primary font-headline">GuidanceSync</h2>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Supportive Wellness</p>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {sidebarItems.map((item) => (
              <Link 
                key={item.label} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  item.active 
                    ? 'bg-[#007055] text-white shadow-md' 
                    : 'text-muted-foreground hover:bg-muted hover:text-primary'
                }`}
              >
                <item.icon className={`h-5 w-5 ${item.active ? 'text-white' : ''}`} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="px-3 space-y-4 mt-auto">
            <Button className="w-full bg-[#007055] hover:bg-[#005c46] text-white font-bold rounded-lg flex items-center justify-start gap-3 h-11">
              <PlusCircle className="h-5 w-5" />
              New Assessment
            </Button>
            <div className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-primary transition-all">
                <HelpCircle className="h-5 w-5" />
                Help Center
              </button>
              <button 
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Navbar */}
          <header className="h-16 bg-white border-b px-8 flex items-center justify-between sticky top-0 z-40">
            <div className="flex-1 max-w-md">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search sessions..." 
                  className="pl-10 h-10 bg-[#F1F5F9] border-none focus-visible:ring-1 focus-visible:ring-primary rounded-full w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 ml-4">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted rounded-full">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted rounded-full">
                <Settings className="h-5 w-5" />
              </Button>
              <div className="pl-4 border-l">
                <Avatar className="h-9 w-9 ring-2 ring-primary/5">
                  <AvatarImage src={`https://picsum.photos/seed/${user?.id}/64/64`} />
                  <AvatarFallback className="bg-primary/5 text-primary font-bold">{firstName[0]}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

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
                        {/* Date Column */}
                        <div className="bg-[#EFF6FF] md:w-32 p-6 flex flex-col items-center justify-center text-center">
                          <span className="text-3xl font-black text-[#1E40AF]">{app.date}</span>
                          <span className="text-sm font-bold text-[#1E40AF]/70 uppercase">{app.month}</span>
                          <div className="mt-3 px-2 py-1 rounded bg-[#DBEAFE] text-[10px] font-black text-[#1E40AF] whitespace-nowrap">
                            {app.time}
                          </div>
                        </div>

                        {/* Content Column */}
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

                          {/* Avatar in corner as seen in UI */}
                          <div className="absolute top-6 right-6">
                             <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                <AvatarImage src={app.avatar} />
                                <AvatarFallback>{app.counselor[0]}</AvatarFallback>
                             </Avatar>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="past" className="py-12 text-center bg-white rounded-xl border border-dashed">
                   <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                   <p className="text-muted-foreground font-medium">No past sessions found.</p>
                </TabsContent>

                <TabsContent value="cancelled" className="py-12 text-center bg-white rounded-xl border border-dashed">
                   <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                   <p className="text-muted-foreground font-medium">No cancelled sessions found.</p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-4 space-y-8">
              {/* Need to talk Card */}
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
                {/* Decorative Pattern or Background */}
                <div className="absolute bottom-[-20%] right-[-10%] opacity-10 pointer-events-none">
                  <Calendar className="h-48 w-48 rotate-12" />
                </div>
              </Card>

              {/* Monthly Summary Card */}
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
        </div>
      </div>
    </ProtectedRoute>
  );
}
