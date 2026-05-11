
"use client";

import React from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  ChevronRight,
  Send,
  Heart,
  Clock
} from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const firstName = user?.name.split(' ')[0] || 'Student';

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true, href: '/student/dashboard' },
    { icon: Calendar, label: 'Appointments', active: false, href: '/student/appointments' },
    { icon: ClipboardCheck, label: 'Assessments', active: false, href: '/student/assessments' },
    { icon: MessageSquare, label: 'Messages', active: false, href: '/student/messages' },
    { icon: FileText, label: 'Resources', active: false, href: '/student/resources' },
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
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-muted-foreground hover:bg-muted hover:text-primary'
                }`}
              >
                <item.icon className={`h-5 w-5 ${item.active ? 'text-white' : ''}`} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="px-3 space-y-1 mt-auto">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-muted-foreground hover:bg-muted hover:text-primary transition-all">
              <HelpCircle className="h-5 w-5" />
              Help Center
            </button>
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-all"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Navbar */}
          <header className="h-16 bg-white border-b px-8 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-8">
              <h3 className="lg:hidden font-bold text-primary">GuidanceSync</h3>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/student/dashboard" className="text-sm font-bold text-primary border-b-2 border-primary pb-5 mt-5">Dashboard</Link>
                <Link href="/student/appointments" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Appointments</Link>
                <Link href="/student/assessments" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Assessments</Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <HelpCircle className="h-5 w-5" />
              </Button>
              <div className="pl-4 border-l">
                <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                  <AvatarImage src={`https://picsum.photos/seed/${user?.id}/64/64`} />
                  <AvatarFallback className="bg-primary/5 text-primary">{firstName[0]}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <main className="p-8 max-w-7xl mx-auto w-full">
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
                
                {/* Decorative Icon */}
                <Calendar className="absolute -bottom-4 -right-4 h-32 w-32 text-white/5 group-hover:scale-110 transition-transform duration-500" />
              </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Available Counselors */}
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

              {/* My Appointments */}
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

                  <div className="p-4 rounded-xl border bg-[#F8FAFC] opacity-60 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Oct 12, 02:30 PM</p>
                        <p className="font-bold text-sm">Consultation - Wellness</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-600 hover:bg-emerald-100 text-[9px] font-black uppercase">Completed</Badge>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Recent Messages */}
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
                  <div className="flex items-start gap-3 group cursor-pointer">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">New Assessment Result</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Your Stress Level Analysis is ready.</p>
                    </div>
                  </div>
                </div>
                <Button variant="link" className="w-full mt-6 text-xs text-muted-foreground hover:text-primary font-bold">
                  See all messages
                </Button>

                {/* Floating Help Widget */}
                <div className="absolute bottom-[-10px] right-[-10px]">
                   <Button size="icon" className="h-12 w-12 rounded-full bg-[#B45309] shadow-xl hover:bg-[#92400E] hover:scale-110 transition-all">
                     <HelpCircle className="h-6 w-6 text-white" />
                   </Button>
                </div>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

