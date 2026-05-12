"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Search, 
  Sparkles, 
  MoreVertical, 
  Phone, 
  Video, 
  Info,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Plus,
  Calendar
} from 'lucide-react';
import { summarizeAssessmentConversation } from '@/ai/flows/counselor-pre-session-summary';
import { useToast } from '@/hooks/use-toast';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';

type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  senderRole: string;
  text: string;
  time: string;
  timestamp: number;
};

type Contact = any & {
  lastMessage?: Message;
  isUnread?: boolean;
};

export default function CounselorMessagesPage() {
  const { user } = useAuth();
  const { markAsRead } = useNotifications();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeStudent, setActiveStudent] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(() => {
    if (!user) return;

    // Load read notification IDs to determine unread status
    const readIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_READ) || '[]');
    const readSet = new Set(readIds);

    // Load all students
    const allUsers = storageService.getAll<any>(STORAGE_KEYS.USERS);
    const students = allUsers.filter(u => u.role === 'student');
    
    // Load all messages
    const allMessages = storageService.getAll<Message>(STORAGE_KEYS.MESSAGES);

    const studentsWithMetadata = students.map(student => {
      const studentMessages = allMessages.filter(m => 
        (m.senderId === user.id && m.receiverId === student.id) ||
        (m.senderId === student.id && m.receiverId === user.id)
      ).sort((a, b) => b.timestamp - a.timestamp);
      
      const lastMsg = studentMessages[0];
      // Only mark as unread if the student was the sender and not marked read
      const isUnread = lastMsg && 
                       lastMsg.senderId === student.id && 
                       !readSet.has(`msg-${lastMsg.id}`) &&
                       !readSet.has(`group-msg-${student.id}`);

      return {
        ...student,
        lastMessage: lastMsg,
        isUnread
      };
    });

    // Sort contacts by last message timestamp (most recent first)
    studentsWithMetadata.sort((a, b) => {
      const timeA = a.lastMessage?.timestamp || 0;
      const timeB = b.lastMessage?.timestamp || 0;
      return timeB - timeA;
    });

    setContacts(studentsWithMetadata);

    if (!activeStudent && studentsWithMetadata.length > 0) {
      setActiveStudent(studentsWithMetadata[0]);
    }

    // Load messages for the active conversation
    if (activeStudent) {
      const filtered = allMessages.filter(m => 
        (m.senderId === user.id && m.receiverId === activeStudent.id) ||
        (m.senderId === activeStudent.id && m.receiverId === user.id)
      ).sort((a, b) => a.timestamp - b.timestamp);
      setMessages(filtered);
      
      // Update current active metadata if list item updated
      const currentActive = studentsWithMetadata.find(s => s.id === activeStudent.id);
      if (currentActive && currentActive.lastMessage?.id !== activeStudent.lastMessage?.id) {
        setActiveStudent(currentActive);
      }
    }
  }, [activeStudent, user]);

  useEffect(() => {
    loadData();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.MESSAGES || e.key === STORAGE_KEYS.USERS || e.key === STORAGE_KEYS.NOTIFICATIONS_READ) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadData]);

  // AUTOMATIC READ: Mark messages as read when active student changes OR when a new message arrives from the current active student
  useEffect(() => {
    if (activeStudent && activeStudent.lastMessage && activeStudent.lastMessage.senderId === activeStudent.id) {
      const msgId = `msg-${activeStudent.lastMessage.id}`;
      const groupId = `group-msg-${activeStudent.id}`;
      
      markAsRead(msgId);
      markAsRead(groupId);
    }
  }, [activeStudent?.id, activeStudent?.lastMessage?.id, markAsRead]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSelectStudent = (student: any) => {
    setActiveStudent(student);
    // Explicit read: Clear notifications for this student upon selection
    markAsRead(`group-msg-${student.id}`);
    if (student.lastMessage && student.lastMessage.senderId === student.id) {
      markAsRead(`msg-${student.lastMessage.id}`);
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !user || !activeStudent) return;

    const newMessage: Omit<Message, 'id'> = {
      senderId: user.id,
      receiverId: activeStudent.id,
      senderRole: user.role,
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    storageService.create(STORAGE_KEYS.MESSAGES, newMessage);
    
    // Also clear notifications for this student if replying
    markAsRead(`group-msg-${activeStudent.id}`);
    if (activeStudent.lastMessage && activeStudent.lastMessage.senderId === activeStudent.id) {
      markAsRead(`msg-${activeStudent.lastMessage.id}`);
    }

    setInputValue('');
    loadData(); // Local refresh
  };

  const handleSendBookingForm = () => {
    if (!user || !activeStudent) return;
    
    const newMessage: Omit<Message, 'id'> = {
      senderId: user.id,
      receiverId: activeStudent.id,
      senderRole: user.role,
      text: '[BOOKING_REQUEST]',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    storageService.create(STORAGE_KEYS.MESSAGES, newMessage);
    loadData();
    toast({
      title: "Invitation Sent",
      description: `A session booking request has been sent to ${activeStudent.name}.`,
    });
  };

  const handleAISummarize = async () => {
    if (messages.length === 0) return;
    setIsSummarizing(true);
    try {
      const transcript = messages.map(m => `${m.senderRole === 'counselor' ? 'Counselor' : 'Student'}: ${m.text}`).join('\n');
      const result = await summarizeAssessmentConversation({ assessmentConversation: transcript });
      
      toast({
        title: "🤖 AI Insight Generated",
        description: (
          <div className="mt-2 space-y-2 text-left">
            <p className="text-xs font-bold text-slate-700">{result.summary}</p>
            <div className="flex flex-wrap gap-1">
              {result.mainConcerns.map(c => (
                <Badge key={c} variant="outline" className="text-[9px] bg-slate-50">{c}</Badge>
              ))}
            </div>
          </div>
        ),
        duration: 8000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Summarization failed",
        description: "Could not generate AI insight at this time.",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6">
      {/* Contact List Sidebar */}
      <Card className="w-80 border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-50">
          <div className="relative group mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search students..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-slate-50 border-none rounded-xl text-xs font-medium"
            />
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Roster</span>
            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black">{filteredContacts.length}</Badge>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {filteredContacts.map((contact) => (
              <div 
                key={contact.id}
                onClick={() => handleSelectStudent(contact)}
                className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 group ${
                  activeStudent?.id === contact.id 
                    ? 'bg-primary/5 ring-1 ring-primary/10' 
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10 ring-2 ring-white">
                    <AvatarImage src={`https://picsum.photos/seed/${contact.id}/64/64`} />
                    <AvatarFallback className="bg-primary/5 text-primary font-bold">{contact.name[0]}</AvatarFallback>
                  </Avatar>
                  {contact.isUnread && (
                    <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-sm"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className={`text-sm ${contact.isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-900'} truncate`}>{contact.name}</h4>
                    {contact.lastMessage && (
                      <span className="text-[9px] text-slate-300 font-bold uppercase">{contact.lastMessage.time}</span>
                    )}
                  </div>
                  <p className={`text-xs truncate ${contact.isUnread ? 'font-bold text-slate-700' : 'font-medium text-slate-400'}`}>
                    {contact.lastMessage 
                      ? (contact.lastMessage.text === '[BOOKING_REQUEST]' ? 'Sent session invitation' : contact.lastMessage.text)
                      : 'Click to open chat'
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden flex flex-col">
        {activeStudent ? (
          <>
            <header className="px-8 py-5 border-b border-slate-50 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <Avatar className="h-11 w-11 ring-2 ring-primary/5">
                  <AvatarImage src={`https://picsum.photos/seed/${activeStudent.id}/64/64`} />
                  <AvatarFallback className="bg-primary/5 text-primary font-bold">{activeStudent.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-lg">{activeStudent.name}</h3>
                    <Badge className="text-[9px] font-black uppercase tracking-tighter border-none bg-emerald-50 text-emerald-600">
                      Active Session
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                    <Clock className="h-3 w-3" /> University Support Channel
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAISummarize}
                  disabled={isSummarizing || messages.length === 0}
                  className="rounded-xl border-primary/20 text-primary hover:bg-primary/5 font-black text-xs gap-2 h-10 px-4"
                >
                  {isSummarizing ? (
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  AI Insight
                </Button>
                <div className="h-8 w-px bg-slate-100 mx-2" />
                <Button variant="ghost" size="icon" className="rounded-xl text-slate-300 hover:text-primary"><MoreVertical className="h-5 w-5" /></Button>
              </div>
            </header>

            <ScrollArea className="flex-1 p-8 bg-slate-50/30">
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex flex-col items-center">
                  <Badge variant="outline" className="bg-white border-slate-100 text-slate-300 font-bold text-[10px] uppercase py-1 px-4 rounded-full">
                    Conversation Sync Enabled
                  </Badge>
                </div>

                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2`}
                  >
                    <div className={`max-w-[70%] flex flex-col ${msg.senderId === user?.id ? 'items-end' : 'items-start'}`}>
                      {msg.text === '[BOOKING_REQUEST]' ? (
                        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 flex flex-col items-center gap-3 w-64">
                          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-slate-500" />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Session Invitation Sent</p>
                        </div>
                      ) : (
                        <div className={`p-5 rounded-2xl text-sm leading-relaxed shadow-sm font-medium ${
                          msg.senderId === user?.id 
                            ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10' 
                            : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 px-1">
                        <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">{msg.time}</span>
                        {msg.senderId === user?.id && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="p-8 border-t border-slate-50 bg-white">
              <div className="max-w-4xl mx-auto">
                <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                  <div className="flex-1 relative flex items-center gap-2">
                    <Button 
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleSendBookingForm}
                      className="h-14 w-14 rounded-2xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shrink-0"
                    >
                      <Plus className="h-6 w-6" />
                    </Button>
                    <Input 
                      placeholder="Type your clinical response..." 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="h-14 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary rounded-2xl pl-6 pr-6 text-sm font-medium w-full"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="h-14 w-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 shrink-0 transition-all active:scale-95" 
                    disabled={!inputValue.trim()}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
            <MessageSquare className="h-12 w-12 opacity-20" />
            <p className="font-bold text-sm italic">Select a student to begin consultation</p>
          </div>
        )}
      </Card>
    </div>
  );
}
