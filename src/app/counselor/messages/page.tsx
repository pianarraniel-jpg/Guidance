
"use client";

import React, { useState, useRef, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { summarizeAssessmentConversation } from '@/ai/flows/counselor-pre-session-summary';
import { useToast } from '@/hooks/use-toast';

type Message = {
  id: string;
  sender: 'counselor' | 'student';
  text: string;
  time: string;
};

type StudentContact = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  status: 'online' | 'offline';
  riskLevel: 'Stable' | 'Moderate' | 'Critical';
};

const initialContacts: StudentContact[] = [
  { id: 'st-1', name: 'Alex Martinez', lastMessage: 'Thank you for the session yesterday.', time: '10:30 AM', unreadCount: 0, status: 'online', riskLevel: 'Stable' },
  { id: 'st-2', name: 'Elena Rodriguez', lastMessage: 'Can we move our session to 2 PM?', time: 'Yesterday', unreadCount: 2, status: 'offline', riskLevel: 'Moderate' },
  { id: 'st-3', name: 'Marcus Thompson', lastMessage: 'The exam pressure is feeling like a lot.', time: '2 days ago', unreadCount: 0, status: 'online', riskLevel: 'Critical' },
  { id: 'st-4', name: 'Jordan Lee', lastMessage: 'I practiced the breathing exercises.', time: 'Oct 20', unreadCount: 0, status: 'offline', riskLevel: 'Stable' },
];

export default function CounselorMessagesPage() {
  const [activeStudent, setActiveStudent] = useState<StudentContact>(initialContacts[0]);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'student', text: "Hi Dr. Santos, I'm feeling a bit overwhelmed today.", time: '10:00 AM' },
    { id: '2', sender: 'counselor', text: "I'm here for you, Alex. Would you like to talk about what's specifically on your mind?", time: '10:05 AM' },
    { id: '3', sender: 'student', text: "Mainly the midterms and some issues at home. It's hard to focus.", time: '10:10 AM' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'counselor',
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMessage]);
    setInputValue('');
  };

  const handleAISummarize = async () => {
    setIsSummarizing(true);
    try {
      const transcript = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
      const result = await summarizeAssessmentConversation({ assessmentConversation: transcript });
      
      toast({
        title: "🤖 AI Insight Generated",
        description: (
          <div className="mt-2 space-y-2">
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

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6">
      {/* Contact List Sidebar */}
      <Card className="w-80 border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-50">
          <div className="relative group mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search students..." 
              className="pl-10 h-11 bg-slate-50 border-none rounded-xl text-xs font-medium"
            />
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Chats</span>
            <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black">{initialContacts.length}</Badge>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {initialContacts.map((contact) => (
              <div 
                key={contact.id}
                onClick={() => setActiveStudent(contact)}
                className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 group ${
                  activeStudent.id === contact.id 
                    ? 'bg-primary/5 ring-1 ring-primary/10' 
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10 ring-2 ring-white">
                    <AvatarImage src={`https://picsum.photos/seed/${contact.name}/64/64`} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{contact.name[0]}</AvatarFallback>
                  </Avatar>
                  {contact.status === 'online' && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="text-sm font-black text-slate-900 truncate">{contact.name}</h4>
                    <span className="text-[9px] font-bold text-slate-300 uppercase">{contact.time}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate font-medium">{contact.lastMessage}</p>
                </div>
                {contact.unreadCount > 0 && (
                  <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[8px] font-black text-white">
                    {contact.unreadCount}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden flex flex-col">
        {/* Chat Header */}
        <header className="px-8 py-5 border-b border-slate-50 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Avatar className="h-11 w-11 ring-2 ring-primary/5">
              <AvatarImage src={`https://picsum.photos/seed/${activeStudent.name}/64/64`} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{activeStudent.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-lg">{activeStudent.name}</h3>
                <Badge className={`text-[9px] font-black uppercase tracking-tighter border-none ${
                  activeStudent.riskLevel === 'Critical' ? 'bg-red-50 text-red-600' :
                  activeStudent.riskLevel === 'Moderate' ? 'bg-orange-50 text-orange-600' :
                  'bg-emerald-50 text-emerald-600'
                }`}>
                  {activeStudent.riskLevel} Risk
                </Badge>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3 w-3" /> Last Active: {activeStudent.time}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAISummarize}
              disabled={isSummarizing}
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
            <Button variant="ghost" size="icon" className="rounded-xl text-slate-300 hover:text-primary"><Phone className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="rounded-xl text-slate-300 hover:text-primary"><Video className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="rounded-xl text-slate-300 hover:text-primary"><Info className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="rounded-xl text-slate-300 hover:text-primary"><MoreVertical className="h-5 w-5" /></Button>
          </div>
        </header>

        {/* Messages List */}
        <ScrollArea className="flex-1 p-8 bg-slate-50/30">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col items-center">
              <Badge variant="outline" className="bg-white border-slate-100 text-slate-300 font-bold text-[10px] uppercase py-1 px-4 rounded-full">
                Conversation Started — Oct 22
              </Badge>
            </div>

            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.sender === 'counselor' ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2`}
              >
                <div className={`max-w-[70%] flex flex-col ${msg.sender === 'counselor' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-5 rounded-2xl text-sm leading-relaxed shadow-sm font-medium ${
                    msg.sender === 'counselor' 
                      ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10' 
                      : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">{msg.time}</span>
                    {msg.sender === 'counselor' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Bar */}
        <div className="p-8 border-t border-slate-50 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="mb-4 flex items-center gap-3 p-3 bg-red-50/50 rounded-xl border border-red-50 text-red-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-wider">Note: This channel is monitored for clinical quality assurance.</p>
            </div>
            
            <form onSubmit={handleSendMessage} className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Input 
                  placeholder="Type your clinical response..." 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="h-14 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary rounded-2xl pl-6 pr-14 text-sm font-medium"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-300 hover:text-primary"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
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
      </Card>
    </div>
  );
}
