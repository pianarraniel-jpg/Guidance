"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  Send, Plus, Clock, AlertCircle, Search, MessageSquare,
  Calendar, ChevronRight, EyeOff, Lock,
} from 'lucide-react';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  senderRole: string;
  text: string;
  time: string;
  timestamp: number;
  hidden?: boolean;
};

type CounselorContact = any & {
  lastMessage?: ChatMessage;
  isUnread: boolean;
};

const BAD_CONTENT_PATTERNS = [
  'fuck you', 'fuck off', 'go fuck yourself', 'motherfucker',
  'piece of shit', 'asshole', 'stupid bitch', 'dumb bitch',
  'fucking idiot', 'son of a bitch', 'go to hell', 'i hate you',
  'shut the fuck up', 'kill yourself', 'kys', 'bastard', 'jackass', 'dickhead',
  'suicide', 'suicidal', 'kill myself', 'end my life', 'take my life',
  'want to die', 'hurt myself', 'harm myself', 'cut myself', 'self harm', 'self-harm',
];

function isBadContent(text: string): boolean {
  const lower = text.toLowerCase();
  return BAD_CONTENT_PATTERNS.some(p => lower.includes(p));
}

export default function StudentMessages() {
  const { user } = useAuth();
  const { markIdsAsRead } = useNotifications();
  const [counselors, setCounselors] = useState<CounselorContact[]>([]);
  const [activeCounselor, setActiveCounselor] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    const { data: readData } = await supabase
      .from('notifications_read')
      .select('notification_id')
      .eq('user_id', user.id);
    const readSet = new Set((readData ?? []).map((r: any) => r.notification_id));

    const allUsers = await storageService.getAll<any>(STORAGE_KEYS.USERS);
    const counselorList = allUsers.filter(u => u.role === 'counselor');
    const allMessages = await storageService.getAll<ChatMessage>(STORAGE_KEYS.MESSAGES);

    const counselorsWithMetadata = counselorList.map(counselor => {
      const convMessages = allMessages.filter(m =>
        (m.senderId === user.id && m.receiverId === counselor.id) ||
        (m.senderId === counselor.id && m.receiverId === user.id)
      ).sort((a, b) => b.timestamp - a.timestamp);
      const lastMsg = convMessages[0];
      const hasUnread = lastMsg && lastMsg.senderId === counselor.id && !readSet.has(`msg-${lastMsg.id}`);
      return { ...counselor, lastMessage: lastMsg, isUnread: !!hasUnread };
    });

    counselorsWithMetadata.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
    setCounselors(prev => {
      if (prev.length !== counselorsWithMetadata.length) return counselorsWithMetadata;
      const hasDiff = prev.some((c, idx) => {
        const nextC = counselorsWithMetadata[idx];
        return c.id !== nextC.id ||
          c.isUnread !== nextC.isUnread ||
          c.lastMessage?.id !== nextC.lastMessage?.id ||
          c.lastMessage?.timestamp !== nextC.lastMessage?.timestamp;
      });
      return hasDiff ? counselorsWithMetadata : prev;
    });

    if (!activeCounselor && counselorsWithMetadata.length > 0) {
      setActiveCounselor(counselorsWithMetadata[0]);
    }

    if (activeCounselor) {
      const filtered = allMessages.filter(m =>
        (m.senderId === user.id && m.receiverId === activeCounselor.id) ||
        (m.senderId === activeCounselor.id && m.receiverId === user.id)
      ).sort((a, b) => a.timestamp - b.timestamp);
      setChatHistory(prev => {
        if (prev.length !== filtered.length || (prev.length > 0 && prev[prev.length - 1].id !== filtered[filtered.length - 1].id)) {
          return filtered;
        }
        const hasDiff = prev.some((m, idx) => m.id !== filtered[idx].id || m.text !== filtered[idx].text);
        return hasDiff ? filtered : prev;
      });
      const currentActive = counselorsWithMetadata.find(c => c.id === activeCounselor.id);
      if (currentActive && currentActive.lastMessage?.id !== activeCounselor.lastMessage?.id) {
        setActiveCounselor(currentActive);
      }
    }
  }, [activeCounselor?.id, user]);

  useEffect(() => {
    loadData();
    if (!user) return;
    const channel = supabase
      .channel(`chat-student-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as any;
        const oldMsg = payload.old as any;
        const affected = msg?.sender_id || msg?.receiver_id || oldMsg?.sender_id || oldMsg?.receiver_id;
        if (affected === user.id) loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  useEffect(() => {
    if (activeCounselor && user && chatHistory.length > 0) {
      const incoming = chatHistory
        .filter(m => m.senderId === activeCounselor.id && m.receiverId === user.id)
        .sort((a, b) => b.timestamp - a.timestamp);
      if (incoming.length > 0) {
        const latest = incoming[0];
        const ids = incoming.map(m => `msg-${m.id}`);
        ids.push(`group-msg-${activeCounselor.id}-${latest.id}`);
        markIdsAsRead(ids);
      }
    }
  }, [activeCounselor?.id, chatHistory, markIdsAsRead, user?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Turn-based: student can only send if the last message was from the counselor (or no messages)
  const canStudentSend = useMemo(() => {
    if (chatHistory.length === 0) return true;
    const last = chatHistory[chatHistory.length - 1];
    return last.senderId !== user?.id;
  }, [chatHistory, user?.id]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !user || !activeCounselor || !canStudentSend) return;

    const text = inputValue.trim();
    const bad = isBadContent(text);

    const newMessage: Omit<ChatMessage, 'id'> = {
      senderId: user.id,
      receiverId: activeCounselor.id,
      senderRole: user.role,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      hidden: bad,
    };

    setInputValue('');
    await storageService.create(STORAGE_KEYS.MESSAGES, newMessage);
    loadData();
  };

  const filteredCounselors = counselors.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 bg-white border-r flex flex-col shrink-0">
            <div className="p-6 border-b">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search counselors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 bg-[#F1F5F9] border-none focus-visible:ring-1 focus-visible:ring-primary rounded-xl text-xs font-bold"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredCounselors.map(counselor => (
                  <div
                    key={counselor.id}
                    onClick={() => setActiveCounselor(counselor)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 group ${
                      activeCounselor?.id === counselor.id
                        ? 'bg-primary/5 ring-1 ring-primary/20 shadow-sm'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10 ring-2 ring-white">
                        <AvatarImage src={`https://picsum.photos/seed/${counselor.id}/64/64`} />
                        <AvatarFallback className="font-bold text-primary bg-primary/5">{counselor.name[0]}</AvatarFallback>
                      </Avatar>
                      {counselor.isUnread && (
                        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-sm" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h4 className={`text-sm ${counselor.isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-700'} truncate`}>
                          {counselor.name}
                        </h4>
                        {counselor.lastMessage && (
                          <span className="text-[9px] text-slate-300 font-bold uppercase">{counselor.lastMessage.time}</span>
                        )}
                      </div>
                      <p className={`text-[11px] truncate ${counselor.isUnread ? 'font-bold text-slate-600' : 'text-slate-400'}`}>
                        {counselor.lastMessage
                          ? (counselor.lastMessage.text === '[BOOKING_REQUEST]' ? '📅 Session Invitation' : counselor.lastMessage.hidden && counselor.lastMessage.senderId === user?.id ? '[Message hidden]' : counselor.lastMessage.text)
                          : 'Wellness Counselor'}
                      </p>
                    </div>
                  </div>
                ))}
                {filteredCounselors.length === 0 && (
                  <div className="p-10 text-center text-slate-400 text-xs italic">No counselors found.</div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col bg-white">
            {activeCounselor ? (
              <>
                <header className="h-20 border-b px-8 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-md">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-11 w-11 ring-2 ring-primary/5">
                      <AvatarImage src={`https://picsum.photos/seed/${activeCounselor.id}/64/64`} />
                      <AvatarFallback className="font-bold text-primary bg-primary/5">{activeCounselor.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg">{activeCounselor.name}</h3>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Synchronized Support Channel
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2 bg-[#F1F5F9] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-[#334155]">
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
                          <Avatar className="h-8 w-8 border border-white shadow-sm shrink-0">
                            <AvatarImage src={`https://picsum.photos/seed/${msg.senderId}/64/64`} />
                            <AvatarFallback>{msg.senderRole === 'student' ? 'S' : 'C'}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-[70%] flex flex-col ${msg.senderId === user?.id ? 'items-end' : 'items-start'}`}>
                          {/* Hidden message placeholder (student's own hidden msg) */}
                          {msg.hidden && msg.senderId === user?.id ? (
                            <div className="p-3 rounded-2xl bg-slate-100 border border-dashed border-slate-300 flex items-center gap-2">
                              <EyeOff className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="text-xs font-bold text-slate-400 italic">
                                Your message was hidden — it may contain inappropriate content.
                              </span>
                            </div>
                          ) : msg.text === '[BOOKING_REQUEST]' ? (
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
                                  Your counselor has requested that you schedule a follow-up appointment.
                                </p>
                                <Button asChild className="w-full h-12 rounded-xl bg-primary font-black text-xs shadow-lg shadow-primary/20">
                                  <Link href="/student/book" className="flex items-center justify-center gap-2">
                                    Complete Booking Form <ChevronRight className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </CardContent>
                            </Card>
                          ) : (
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm font-medium ${
                              msg.senderId === user?.id
                                ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10'
                                : 'bg-white border border-slate-100 text-[#334155] rounded-tl-none'
                            }`}>
                              {msg.text}
                            </div>
                          )}
                          <span className="text-[9px] text-slate-300 font-bold mt-2 uppercase tracking-widest">{msg.time}</span>
                        </div>
                      </div>
                    ))}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                <div className="p-8 border-t bg-white">
                  <div className="max-w-4xl mx-auto">
                    <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 text-red-700">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <div className="text-[10px] font-bold uppercase tracking-wide">
                        <p className="font-black">Emergency Protocol</p>
                        <p className="opacity-80">This channel is not for crises. Call 988 or 911 if in immediate danger.</p>
                      </div>
                    </div>

                    {/* Turn-lock indicator */}
                    {!canStudentSend && (
                      <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-2 text-amber-700">
                        <Lock className="h-4 w-4 shrink-0" />
                        <span className="text-xs font-black">Waiting for your counselor's reply before you can send another message.</span>
                      </div>
                    )}

                    <form onSubmit={handleSend} className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <Input
                          placeholder={canStudentSend ? 'Type a message to your counselor...' : 'Waiting for counselor reply...'}
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          disabled={!canStudentSend}
                          className="h-14 bg-[#F8FAFC] border-none focus-visible:ring-1 focus-visible:ring-primary rounded-2xl pl-6 pr-4 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="h-14 w-14 rounded-2xl bg-primary shadow-lg shadow-primary/20 transition-all active:scale-95"
                        disabled={!inputValue.trim() || !canStudentSend}
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </form>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                <div className="h-16 w-16 rounded-[2rem] bg-slate-50 flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 opacity-20" />
                </div>
                <p className="font-black text-sm italic uppercase tracking-widest">Select a counselor to begin</p>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
