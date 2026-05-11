"use client";

import React, { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send,
  Plus,
  Clock,
  AlertCircle,
  Search
} from 'lucide-react';

type ChatMessage = {
  id: string;
  sender: 'user' | 'other';
  text: string;
  time: string;
  avatar?: string;
};

export default function StudentMessages() {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'other',
      text: "Hello! I wanted to check in and see how you're feeling after our session yesterday. How is the breathing exercise working out for you?",
      time: '10:15 AM',
      avatar: 'https://picsum.photos/seed/sarah/64/64'
    },
    {
      id: 'm2',
      sender: 'user',
      text: "Hi Sarah! Honestly, it's been a bit easier to focus on my assignments. I used the technique twice today before my morning lecture.",
      time: '10:20 AM'
    }
  ]);

  const [inputValue, setInputValue] = useState('');

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
      <DashboardLayout>
        <div className="flex h-full overflow-hidden">
          {/* Conversation List */}
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
                <div className="p-4 rounded-xl cursor-pointer bg-white shadow-sm ring-1 ring-primary/20">
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="https://picsum.photos/seed/sarah/64/64" />
                      <AvatarFallback>SJ</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#1E293B]">Sarah Jenkins</h4>
                      <p className="text-xs truncate text-muted-foreground">I've reviewed your latest stress...</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-white">
            <header className="h-20 border-b px-8 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="https://picsum.photos/seed/sarah/64/64" />
                  <AvatarFallback>SJ</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">Sarah Jenkins</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Online • Wellness Counselor
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 bg-[#F1F5F9] px-4 py-2 rounded-full text-xs font-bold text-[#334155]">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Next Session: Friday, 2 PM
              </div>
            </header>

            <ScrollArea className="flex-1 p-8 bg-[#F8FAFC]">
              <div className="max-w-4xl mx-auto space-y-8">
                {chatHistory.map((msg) => (
                  <div key={msg.id} className={`flex items-start gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                    {msg.sender === 'other' && (
                      <Avatar className="h-8 w-8 border">
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
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="p-8 border-t bg-white">
              <div className="max-w-4xl mx-auto">
                <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 text-red-700">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold">This is not for emergencies</p>
                    <p className="opacity-80">Call 988 (Suicide & Crisis Lifeline) or 911 if in danger.</p>
                  </div>
                </div>
                <form onSubmit={handleSend} className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Input 
                      placeholder="Type a message..." 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="h-14 bg-[#F8FAFC] border-none focus-visible:ring-1 focus-visible:ring-primary rounded-2xl pl-12 pr-4"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2">
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                  <Button type="submit" className="h-14 w-14 rounded-2xl bg-primary" disabled={!inputValue.trim()}>
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
