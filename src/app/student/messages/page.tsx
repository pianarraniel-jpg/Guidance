
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Send,
  Plus,
  Clock,
  AlertCircle,
  Search,
  MessageSquare,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS } from '@/lib/constants';
import Link from 'next/link';

type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  senderRole: string;
  text: string;
  time: string;
  timestamp: number;
};

export default function StudentMessages() {
  const { user } = useAuth();
  const [counselors, setCounselors] = useState<any[]>([]);
  const [activeCounselor, setActiveCounselor] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(() => {
    // Load all counselors
    const allUsers = storageService.getAll<any>(STORAGE_KEYS.USERS);
    const counselorList = allUsers.filter(u => u.role === 'counselor');
    setCounselors(counselorList);

    if (!activeCounselor && counselorList.length > 0) {
      setActiveCounselor(counselorList[0]);
    }

    // Load messages for the active conversation
    if (activeCounselor && user) {
      const allMessages = storageService.getAll<ChatMessage>(STORAGE_KEYS.MESSAGES);
      const filtered = allMessages.filter(m => 
        (m.senderId === user.id && m.receiverId === activeCounselor.id) ||
        (m.senderId === activeCounselor.id && m.receiverId === user.id)
      ).sort((a, b) => a.timestamp - b.timestamp);
      setChatHistory(filtered);
    }
  }, [activeCounselor, user]);

  useEffect(() => {
    loadData();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.MESSAGES || e.key === STORAGE_KEYS.USERS) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !user || !activeCounselor) return;

    const newMessage: Omit<ChatMessage, 'id'> = {
      senderId: user.id,
      receiverId: activeCounselor.id,
      senderRole: user.role,
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    storageService.create(STORAGE_KEYS.MESSAGES, newMessage);
    setInputValue('');
    loadData(); // Local refresh
  };

  const filteredCounselors = counselors.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
          {/* Conversation List */}
          <div className="w-80 bg-white border-r flex flex-col shrink-0">
            <div className="p-6 border-b">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search counselors" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-[#F1F5F9] border-none focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredCounselors.map(counselor => (
                  <div 
                    key={counselor.id}
                    onClick={() => setActiveCounselor(counselor)}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      activeCounselor?.id === counselor.id 
                        ? 'bg-primary/5 ring-1 ring-primary/20 shadow-sm' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://picsum.photos/seed/${counselor.id}/64/64`} />
                        <AvatarFallback className="font-bold text-primary bg-primary/5">{counselor.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-[#1E293B]">{counselor.name}</h4>
                        <p className="text-xs truncate text-muted-foreground">Wellness Counselor</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-white">
            {activeCounselor ? (
              <>
                <header className="h-20 border-b px-8 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={`https://picsum.photos/seed/${activeCounselor.id}/64/64`} />
                      <AvatarFallback className="font-bold text-primary bg-primary/5">{activeCounselor.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-lg">{activeCounselor.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        Synchronized • Wellness Counselor
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2 bg-[#F1F5F9] px-4 py-2 rounded-full text-xs font-bold text-[#334155]">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    University Support Line
                  </div>
                </header>

                <ScrollArea className="flex-1 p-8 bg-[#F8FAFC]">
                  <div className="max-w-4xl mx-auto space-y-8">
                    {chatHistory.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`flex items-start gap-4 ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
                      >
                        {msg.senderId !== user?.id && (
                          <Avatar className="h-8 w-8 border">
                            <AvatarImage src={`https://picsum.photos/seed/${msg.senderId}/64/64`} />
                            <AvatarFallback>{msg.senderRole === 'student' ? 'S' : 'C'}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-[70%] flex flex-col ${msg.senderId === user?.id ? 'items-end' : 'items-start'}`}>
                          {msg.text === '[BOOKING_REQUEST]' ? (
                            <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden max-w-sm">
                              <div className="bg-primary p-5 text-white">
                                <div className="flex items-center gap-2 mb-1">
                                  <Calendar className="h-4 w-4" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Session Invitation</span>
                                </div>
                                <h4 className="text-lg font-black">Book Your Next Session</h4>
                              </div>
                              <CardContent className="p-6">
                                <p className="text-xs text-slate-500 mb-6 leading-relaxed font-medium">
                                  Your counselor has requested that you schedule a follow-up appointment to continue your wellness journey.
                                </p>
                                <Button asChild className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-black text-xs shadow-lg shadow-primary/20">
                                  <Link href="/student/book" className="flex items-center justify-center gap-2">
                                    Complete Booking Form <ChevronRight className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </CardContent>
                            </Card>
                          ) : (
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                              msg.senderId === user?.id 
                                ? 'bg-primary text-white rounded-tr-none' 
                                : 'bg-white border text-[#334155] rounded-tl-none'
                            }`}>
                              {msg.text}
                            </div>
                          )}
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
                      </div>
                      <Button type="submit" className="h-14 w-14 rounded-2xl bg-primary shadow-lg shadow-primary/20" disabled={!inputValue.trim()}>
                        <Send className="h-5 w-5" />
                      </Button>
                    </form>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                <MessageSquare className="h-12 w-12 opacity-20" />
                <p className="font-bold text-sm italic">Select a counselor to begin your consultation</p>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
