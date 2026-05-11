
"use client";

import React, { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Paperclip,
  ShieldCheck,
  Zap,
  Activity,
  Meh,
  Smile,
  MessageCircle,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { studentStressAssessment, type StudentStressAssessmentInput } from '@/ai/flows/student-stress-assessment-chatbot';

type Message = {
  role: 'user' | 'model';
  text: string;
  time: string;
};

export default function StudentAssessments() {
  const { user, logout } = useAuth();
  const firstName = user?.name.split(' ')[0] || 'Student';
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: `Maayong adlaw, ${firstName}! I'm Guidi, your wellness companion. How have things been going with your classes this week?`,
      time: '10:02 AM'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: false, href: '/student/dashboard' },
    { icon: Calendar, label: 'Appointments', active: false, href: '/student/appointments' },
    { icon: ClipboardCheck, label: 'Assessments', active: true, href: '/student/assessments' },
    { icon: MessageSquare, label: 'Messages', active: false, href: '/student/messages' },
    { icon: FileText, label: 'Resources', active: false, href: '/student/resources' },
  ];

  const quickResponses = [
    { label: 'Stressed', icon: Zap, color: 'text-red-500 border-red-100 hover:bg-red-50' },
    { label: 'Anxious', icon: Activity, color: 'text-orange-500 border-orange-100 hover:bg-orange-50' },
    { label: 'Okay', icon: Meh, color: 'text-gray-500 border-gray-100 hover:bg-gray-50' },
    { label: 'Good', icon: Smile, color: 'text-emerald-500 border-emerald-100 hover:bg-emerald-50' },
    { label: 'Need to Talk', icon: MessageCircle, color: 'bg-primary text-white border-primary hover:bg-primary/90' },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newUserMessage: Message = { role: 'user', text, time: currentTime };
    
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const result = await studentStressAssessment({
        currentMessage: text,
        history
      });

      const botResponse: Message = {
        role: 'model',
        text: result.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Top Navbar */}
          <header className="h-16 bg-white border-b px-8 flex items-center justify-between shrink-0">
            <h1 className="text-xl font-bold text-primary">Assessments</h1>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full">
                <HelpCircle className="h-5 w-5" />
              </Button>
              <div className="pl-4 border-l">
                <Avatar className="h-9 w-9 ring-2 ring-primary/5">
                  <AvatarImage src={`https://picsum.photos/seed/${user?.id}/64/64`} />
                  <AvatarFallback className="bg-primary/5 text-primary font-bold">{firstName[0]}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto flex flex-col h-full">
              {/* Header Info */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-[#1E293B] mb-1">Weekly Kamustahan</h2>
                  <p className="text-muted-foreground">How are you feeling today, {firstName}?</p>
                </div>
                <div className="text-right w-48">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-primary uppercase">Step 2 of 4</span>
                  </div>
                  <Progress value={50} className="h-2 bg-muted" />
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 bg-white rounded-3xl shadow-sm border overflow-hidden flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b flex items-center gap-3 bg-white">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-white text-[10px]">🤖</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Guidi</h4>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      Wellness Assistant <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span> Online
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                        <div className={`max-w-[80%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`p-4 rounded-2xl text-sm ${
                            msg.role === 'user' 
                              ? 'bg-primary text-white rounded-tr-none shadow-md' 
                              : 'bg-[#F1F5F9] text-[#334155] rounded-tl-none'
                          }`}>
                            {msg.text}
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1.5 font-medium">{msg.time}</span>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-[#F1F5F9] p-4 rounded-2xl rounded-tl-none animate-pulse">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]"></span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-6 border-t bg-white">
                  {/* Quick Responses */}
                  <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-full text-center mb-1">Quick Responses</span>
                    {quickResponses.map((qr) => (
                      <Button
                        key={qr.label}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendMessage(qr.label)}
                        className={`rounded-full px-4 h-9 text-xs font-bold border transition-all active:scale-95 ${qr.color}`}
                      >
                        <qr.icon className="h-3.5 w-3.5 mr-1.5" />
                        {qr.label}
                      </Button>
                    ))}
                  </div>

                  {/* Input Form */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage(inputValue);
                    }}
                    className="relative flex items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <Input 
                        placeholder="Type your response here..." 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="h-14 bg-[#F8FAFC] border-none focus-visible:ring-1 focus-visible:ring-primary rounded-2xl pl-4 pr-12 text-sm"
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:bg-transparent"
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    </div>
                    <Button 
                      type="submit"
                      disabled={!inputValue.trim() || isLoading}
                      className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shrink-0"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 flex items-center justify-between text-muted-foreground">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Your responses are confidential and secure.
                </div>
                <button className="text-xs font-bold hover:text-primary transition-colors flex items-center gap-1 group">
                  Save and finish later
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
