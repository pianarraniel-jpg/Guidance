
"use client";

import React, { useState } from 'react';
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
  Settings,
  Wind,
  BookOpen,
  Anchor,
  Music,
  ChevronRight,
  Phone,
  MessageCircle,
  Clock,
  Heart,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function StudentResources() {
  const { user, logout } = useAuth();
  const firstName = user?.name.split(' ')[0] || 'Student';
  const [activeCategory, setActiveCategory] = useState('All Resources');

  const categories = [
    'All Resources', 
    'Stress Management', 
    'Daily Tips', 
    'Mindfulness', 
    'Personal Growth', 
    'Sleep Hygiene'
  ];

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: false, href: '/student/dashboard' },
    { icon: Calendar, label: 'Appointments', active: false, href: '/student/appointments' },
    { icon: ClipboardCheck, label: 'Assessments', active: false, href: '/student/assessments' },
    { icon: MessageSquare, label: 'Messages', active: false, href: '/student/messages' },
    { icon: FileText, label: 'Resources', active: true, href: '/student/resources' },
  ];

  const interactiveTools = [
    { icon: Wind, label: 'Box Breathing', description: 'A simple technique to calm your nervous system instantly.', color: 'text-blue-500', bg: 'bg-blue-50', action: 'Start Timer' },
    { icon: BookOpen, label: 'Journaling', description: 'Daily prompts to help you process thoughts and clear mental fog.', color: 'text-purple-500', bg: 'bg-purple-50', action: 'See Prompts' },
    { icon: Anchor, label: '5-Min Grounding', description: 'Reconnect with the present through the 5-4-3-2-1 sensory method.', color: 'text-emerald-500', bg: 'bg-emerald-50', action: 'Guided Audio' },
    { icon: Music, label: 'Deep Calm', description: 'A curated playlist and white noise generator for better focus.', color: 'text-indigo-500', bg: 'bg-indigo-50', action: 'Open Trail' },
  ];

  const libraryItems = [
    { 
      tag: 'Social Wellness', 
      tagColor: 'bg-emerald-100 text-emerald-700', 
      title: 'Building Connection', 
      desc: 'How to overcome social anxiety and find your community on campus.', 
      readTime: '8-10 min read', 
      image: 'https://picsum.photos/seed/social22/400/250' 
    },
    { 
      tag: 'Mindfulness', 
      tagColor: 'bg-blue-100 text-blue-700', 
      title: 'Healthy Mornings', 
      desc: "A beginner's guide to integrating meditation into a busy schedule.", 
      readTime: '15 min video', 
      image: 'https://picsum.photos/seed/peace11/400/250',
      isVideo: true
    },
    { 
      tag: 'Daily Tips', 
      tagColor: 'bg-orange-100 text-orange-700', 
      title: 'Sustainable Study', 
      desc: 'Productivity hacks that prioritize your mental health over grades.', 
      readTime: '5 min read', 
      image: 'https://picsum.photos/seed/tech33/400/250' 
    },
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
            <Button className="w-full bg-[#B45309] hover:bg-[#92400E] text-white font-bold rounded-lg flex items-center justify-start gap-3 h-11 mb-4 shadow-md">
              <Sparkles className="h-5 w-5" />
              New Assessment
            </Button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-muted-foreground hover:bg-muted hover:text-primary transition-all">
              <HelpCircle className="h-5 w-5" />
              Help Center
            </button>
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
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
            <div className="flex-1 max-w-md">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search resources..." 
                  className="pl-10 h-10 bg-[#F1F5F9] border-none focus-visible:ring-1 focus-visible:ring-primary rounded-full w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 ml-4">
              <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full">
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

          <main className="p-8 max-w-7xl mx-auto w-full">
            <h1 className="text-4xl font-bold font-headline text-[#1E293B] mb-2">Resources & Self-Care</h1>
            <p className="text-muted-foreground mb-8">Tools and guides to help you navigate your university journey with confidence and mental clarity.</p>

            {/* Categories */}
            <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar">
              {categories.map((cat) => (
                <Button 
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-6 whitespace-nowrap text-sm font-bold ${
                    activeCategory === cat 
                      ? 'bg-primary text-white shadow-md' 
                      : 'bg-white border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {cat}
                </Button>
              ))}
            </div>

            {/* Featured & Quick Actions Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
              {/* Hero Card */}
              <Card className="lg:col-span-8 border-none shadow-md overflow-hidden relative min-h-[320px] group">
                <Image 
                  src="https://picsum.photos/seed/study77/1200/600"
                  alt="Managing Midterm Anxiety"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  data-ai-hint="desk lamp"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 p-8 w-full max-w-xl text-white">
                  <Badge className="bg-[#F4AF25] text-black font-black uppercase text-[10px] mb-4 border-none px-3">Featured Guide</Badge>
                  <h2 className="text-3xl font-black mb-3 leading-tight">Managing Midterm Anxiety: A student guide.</h2>
                  <p className="text-white/80 text-sm mb-6 leading-relaxed">
                    Learn practical techniques to maintain focus and calm during the most demanding weeks of the semester.
                  </p>
                  <Button className="bg-white text-black hover:bg-white/90 font-black rounded-xl px-8 py-6 shadow-xl">
                    Read Guide
                  </Button>
                </div>
              </Card>

              {/* Side Action Cards */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <Card className="flex-1 bg-[#8B5CF6] border-none text-white p-6 flex flex-col justify-between shadow-md relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center mb-4">
                      <Heart className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Quick Mood Check</h3>
                    <p className="text-white/80 text-xs leading-relaxed mb-6">
                      Take 2 minutes to reflect on how you feel right now and obtain tailored resources.
                    </p>
                  </div>
                  <Button variant="secondary" className="bg-white text-[#8B5CF6] hover:bg-white/90 font-black w-full shadow-lg rounded-xl h-11 relative z-10">
                    Start Now
                  </Button>
                  <div className="absolute top-[-10%] right-[-10%] opacity-10">
                    <Heart className="h-32 w-32" />
                  </div>
                </Card>

                <Card className="flex-1 bg-[#F97316] border-none text-white p-6 flex flex-col justify-between shadow-md relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center mb-4">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Talk to Guidi</h3>
                    <p className="text-white/80 text-xs leading-relaxed mb-6">
                      Engage with your wellness companion to talk about how today's felt.
                    </p>
                  </div>
                  <Button variant="secondary" className="bg-white text-[#F97316] hover:bg-white/90 font-black w-full shadow-lg rounded-xl h-11 relative z-10">
                    Open Chat
                  </Button>
                  <div className="absolute top-[-10%] right-[-10%] opacity-10">
                    <MessageCircle className="h-32 w-32" />
                  </div>
                </Card>
              </div>
            </div>

            {/* Interactive Toolkit */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#1E293B]">Interactive Toolkit</h3>
                  <p className="text-sm text-muted-foreground">Quick exercises for immediate relief and daily maintenance.</p>
                </div>
                <Button variant="link" className="text-primary font-bold text-sm">
                  View All Tools <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {interactiveTools.map((tool) => (
                  <Card key={tool.label} className="border-none shadow-sm hover:shadow-md transition-all group cursor-pointer">
                    <CardContent className="p-6">
                      <div className={`h-10 w-10 rounded-xl ${tool.bg} ${tool.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <tool.icon className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-sm mb-2">{tool.label}</h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mb-6 h-12 line-clamp-3">
                        {tool.description}
                      </p>
                      <button className="text-[11px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                        {tool.action} <ChevronRight className="h-3 w-3" />
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Resource Library */}
            <div className="mb-12">
              <h3 className="text-xl font-bold text-[#1E293B] mb-6">Resource Library</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {libraryItems.map((item) => (
                  <Card key={item.title} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all">
                    <div className="h-48 relative">
                      <Image 
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        data-ai-hint={item.tag === 'Social Wellness' ? 'students grass' : item.tag === 'Mindfulness' ? 'peaceful room' : 'laptop desk'}
                      />
                      <Badge className={`absolute top-4 left-4 ${item.tagColor} border-none font-bold text-[10px] px-2`}>
                        {item.tag}
                      </Badge>
                    </div>
                    <CardContent className="p-6">
                      <h4 className="font-bold text-lg mb-2">{item.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                        {item.desc}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {item.readTime}
                        </span>
                        <Button variant="link" className="text-primary font-bold text-sm p-0">
                          {item.isVideo ? 'Watch Now' : 'Read More'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-12 flex justify-center">
                <Button variant="outline" className="rounded-full px-12 border-primary/20 text-primary font-bold h-12 hover:bg-primary/5">
                  Load More Resources
                </Button>
              </div>
            </div>

            {/* Crisis Support Section */}
            <Card className="bg-[#EFF6FF] border-none p-8 rounded-3xl relative overflow-hidden group">
              <div className="max-w-3xl relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">Need Immediate Support?</p>
                  <h3 className="text-2xl font-bold text-[#1E293B] mb-4">If you are in a crisis or need to speak with someone right away, please use these confidential resources.</h3>
                  <div className="flex flex-wrap gap-4 mt-6">
                    <div className="bg-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm border border-blue-100">
                      <div className="h-10 w-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Crisis Hotline</p>
                        <p className="text-sm font-black">1-888-578-8200</p>
                      </div>
                    </div>
                    <div className="bg-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm border border-blue-100">
                      <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Crisis Text Line</p>
                        <p className="text-sm font-black">Text HOME to 55152</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button size="lg" className="bg-[#007055] hover:bg-[#005c46] text-white font-black rounded-2xl shadow-xl px-8 h-16 flex items-center gap-3 shrink-0 transition-transform active:scale-95">
                  <MessageCircle className="h-6 w-6" /> Talk to Guidi
                </Button>
              </div>
              
              <div className="absolute right-[-5%] bottom-[-20%] opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                <Heart className="h-64 w-64 text-blue-900" />
              </div>
            </Card>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

