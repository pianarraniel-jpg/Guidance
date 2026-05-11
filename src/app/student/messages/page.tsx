
"use client";

import React, { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
  Send,
  Plus,
  MoreVertical,
  Clock,
  AlertCircle,
  Paperclip
} from 'lucide-react';
import Link from 'next/link';

type ChatMessage = {
  id: string;
  sender: 'user' | 'other';
  text: string;
  time: string;
  avatar?: string;
};

type Conversation = {
  id: string;
  name: string;
  role?: string;
  lastMessage: string;
  time: string;
  unread?: boolean;
  active?: boolean;
  avatar: string;
  status?: 'online' | 'offline';
};

export default function StudentMessages() {
  const { user, logout } = useAuth();
  const firstName = user?.name.split(' ')[0] || 'Student';
  const scrollRef = useRef<HTMLDivElement>(null);

  const [conversations] = useState<Conversation[]>([
    {
      id: '1',
      name: 'Sarah Jenkins',
      role: 'Wellness Counselor',
      lastMessage: "I've reviewed your latest stress...",
      time: '2m ago',
      unread: false,
      active: true,
      status: 'online',
      avatar: 'https://picsum.photos/seed/sarah/64/64'
    },
    {
      id: '2',
      name: 'Resource Center',
      lastMessage: 'New guide: Managing Final Exams Stress',
      time: '2h ago',
      unread: false,
      avatar: 'https://picsum.photos/seed/resource/64/64'
    },
    {
      id: '3',
      name: 'Peer Support Group',
      lastMessage: 'Welcome to the mindfulness session',
      time: 'Yesterday',
      unread: false,
      avatar: 'https://picsum.photos/seed/peer/64/64'
    }
  ]);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'other',
      text: "Hello Alex! I wanted to check in and see how you're feeling after our session yesterday. How is the breathing exercise working out for you?",
      time: '10:15 AM',
      avatar: 'https://picsum.photos/seed/sarah/64/64'
    },
    {
      id: 'm2',
      sender: 'user',
      text: "Hi Sarah! Honestly, it's been a bit easier to focus on my assignments. I used the technique twice today before my morning lecture.",
      time: '10:20 AM'
    },
    {
      id: 'm3',
      sender: 'other',
      text: "That's wonderful to hear! Consistently applying it in those high-stress moments is key. Would you like to schedule a 10-minute touch-base for Thursday?",
      time: '10:22 AM',
      avatar: 'https://picsum.photos/seed/sarah/64/64'
    }
  ]);

  const [inputValue, setInputValue] = useState('');

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: false, href: '/student/dashboard' },
    { icon: Calendar, label: 'Appointments', active: false, href: '/student/appointments' },
    { icon: ClipboardCheck, label: 'Assessments', active: false, href: '/student/assessments' },
    { icon: MessageSquare, label: 'Messages', active: true, href: '/student/messages' },
    { icon: FileText, label: 'Resources', active: false, href: '/student/resources' },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory([...chatHistory, newMessage]);
    setInputValue('');
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r hidden lg:flex flex-col py-6 shrink-0">
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
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Conversation List Column */}
        <div className="w-80 bg-white border-r flex flex-col shrink-0">
          <div className="p-6 border-b">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search conversations" 
                className="pl-10 h-10 bg-[#F1F5F9] border-none focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.map((conv) => (
                <div 
                  key={conv.id} 
                  className={`p-4 rounded-xl cursor-pointer transition-all relative group ${
                    conv.active 
                      ? 'bg-white shadow-sm ring-1 ring-primary/20' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={conv.avatar} />
                      <AvatarFallback>{conv.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <h4 className="text-sm font-bold text-[#1E293B] truncate">{conv.name}</h4>
                        <span className="text-[10px] text-muted-foreground font-medium">{conv.time}</span>
                      </div>
                      <p className={`text-xs truncate ${conv.unread ? 'text-[#1E293B] font-bold' : 'text-muted-foreground'}`}>
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                  {conv.active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <header className="h-20 border-b px-8 flex items-center justify-between shrink-0 bg-white z-10">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border-2 border-primary/5">
                <AvatarImage src="https://picsum.photos/seed/sarah/64/64" />
                <AvatarFallback>SJ</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-lg text-[#1E293B]">Sarah Jenkins</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Online • Wellness Counselor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-[#F1F5F9] px-4 py-2 rounded-full text-xs font-bold text-[#334155]">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Next Session: Friday, 2 PM
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </header>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-8 bg-[#F8FAFC]">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Date Separator */}
              <div className="flex justify-center">
                <span className="bg-[#E2E8F0] text-[#64748B] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  Today
                </span>
              </div>

              {chatHistory.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex items-start gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
                >
                  {msg.sender === 'other' && (
                    <Avatar className="h-8 w-8 mt-1 border border-primary/5">
                      <AvatarImage src={msg.avatar} />
                      <AvatarFallback>SJ</AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`max-w-[70%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.sender === 'user' 
                        ? 'bg-primary text-white rounded-tr-none' 
                        : 'bg-white border text-[#334155] rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-2 font-medium">{msg.time}</span>
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-8 h-8 flex items-end">
                       <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                    </div>
                  )}
                </div>
              ))}

              <div className="flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse ml-12">
                <span className="flex gap-1">
                  <span className="w-1 h-1 bg-primary rounded-full"></span>
                  <span className="w-1 h-1 bg-primary rounded-full"></span>
                  <span className="w-1 h-1 bg-primary rounded-full"></span>
                </span>
                Sarah is typing...
              </div>
            </div>
            <div ref={scrollRef} />
          </ScrollArea>

          {/* Input Area */}
          <div className="p-8 border-t bg-white">
            <div className="max-w-4xl mx-auto">
              {/* Emergency Alert */}
              <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 text-red-700">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold mb-0.5">This is not for emergencies</p>
                  <p className="opacity-80">If you are in immediate danger or need urgent help, please call <span className="font-bold underline">988</span> (Suicide & Crisis Lifeline) or <span className="font-bold underline">911</span>.</p>
                </div>
              </div>

              {/* Chat Form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-3"
              >
                <div className="flex-1 relative">
                  <Input 
                    placeholder="Type a message..." 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="h-14 bg-[#F8FAFC] border-none focus-visible:ring-1 focus-visible:ring-primary rounded-2xl pl-12 pr-4 text-sm"
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:bg-transparent"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <Button 
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="h-14 w-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shrink-0 transition-transform active:scale-95"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
