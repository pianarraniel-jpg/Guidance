
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  CheckCircle2, 
  Zap, 
  MessageSquare, 
  Clock,
  ChevronRight,
  TrendingUp,
  Brain
} from 'lucide-react';

const assessmentData = {
  student: {
    name: "Marcus Thompson",
    year: "3rd Year Computer Science",
    totalSessions: 12,
    attendance: "92%",
    priority: "High",
    nextGoal: "Address exam-related anxiety and family communication barriers."
  },
  latestAssessment: {
    stressLevel: 70,
    date: "October 15, 2023",
    focusAreas: ["Academic", "Family Tension", "Sleep Deprived"],
    summary: "Marcus reports significant pressure from upcoming finals and a lack of support from home regarding his major choice."
  },
  highlights: [
    { role: "model", text: "How are you feeling about the upcoming week, Marcus?", time: "Yesterday, 10:15 PM" },
    { role: "user", text: "Honestly, the exam pressure is starting to feel like too much. I can't focus on my projects anymore.", time: "Yesterday, 10:15 PM" },
    { role: "model", text: "I understand. It sounds like you're carrying a lot. Have you tried the...", time: "Yesterday, 10:16 PM" }
  ],
  history: [
    { date: "Sep 28", status: "Normal", color: "bg-emerald-500" },
    { date: "Oct 05", status: "Moderate", color: "bg-amber-500" },
    { date: "Oct 12", status: "High Stress", color: "bg-red-500" },
    { date: "Oct 19 (Today)", status: "Preparation", color: "border-2 border-emerald-500 bg-white" }
  ]
};

export default function CounselorAssessmentsPage() {
  return (
    <div className="max-w-7xl mx-auto w-full">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-black text-primary tracking-tight">Session Preparation</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Profile Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <Avatar className="h-32 w-32 mb-6 ring-4 ring-slate-50 shadow-lg">
                <AvatarImage src="https://picsum.photos/seed/marcus/256/256" />
                <AvatarFallback>MT</AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-black text-slate-900 mb-1">{assessmentData.student.name}</h2>
              <p className="text-sm font-bold text-slate-400 mb-8">{assessmentData.student.year}</p>

              <div className="w-full space-y-3 mb-10">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-50/50 border border-blue-50">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-bold text-slate-600">Total Sessions</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{assessmentData.student.totalSessions}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/50 border border-emerald-50">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-600">Attendance</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{assessmentData.student.attendance}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50/50 border border-red-50">
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-bold text-slate-600">Current Priority</span>
                  </div>
                  <Badge className="bg-red-100 text-red-600 border-none font-black text-[10px] uppercase">
                    {assessmentData.student.priority}
                  </Badge>
                </div>
              </div>

              <div className="w-full text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Next Session Goal</p>
                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 italic text-sm font-medium text-primary leading-relaxed">
                  "{assessmentData.student.nextGoal}"
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Latest Assessment Card */}
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-4 flex flex-row items-center justify-between border-none">
              <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest">Latest Assessment</CardTitle>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{assessmentData.latestAssessment.date}</span>
            </CardHeader>
            <CardContent className="p-8 pt-2">
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="relative h-32 w-32 shrink-0">
                  <svg className="h-full w-full -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      fill="none"
                      stroke="#F1F5F9"
                      strokeWidth="12"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      fill="none"
                      stroke="#B45309"
                      strokeWidth="12"
                      strokeDasharray="364.4"
                      strokeDashoffset={364.4 * (1 - assessmentData.latestAssessment.stressLevel / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900 leading-none">{assessmentData.latestAssessment.stressLevel}%</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">Stress Level</span>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <p className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Focus Areas Identified</p>
                    {assessmentData.latestAssessment.focusAreas.map(area => (
                      <Badge key={area} className="bg-orange-50 text-orange-700 border-none font-bold py-1.5 px-3 rounded-lg flex items-center gap-2">
                        <Brain className="h-3 w-3" />
                        {area}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed">
                    {assessmentData.latestAssessment.summary}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chatbot Highlights Card */}
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-4 border-none">
              <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-500" />
                Chatbot Highlights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-2 space-y-4">
              {assessmentData.highlights.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-4 rounded-2xl text-xs font-medium max-w-[90%] leading-relaxed ${
                    msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-slate-50 text-slate-700 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] font-bold text-slate-300 mt-2 uppercase tracking-tighter">{msg.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Session History & Trends */}
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-4 flex flex-row items-center justify-between border-none">
              <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest">Session History & Trends</CardTitle>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-[9px] font-black text-slate-400 uppercase">High</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-[9px] font-black text-slate-400 uppercase">Moderate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-black text-slate-400 uppercase">Normal</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-4">
              <div className="relative">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-100 -translate-y-1/2" />
                <div className="flex justify-between relative z-10">
                  {assessmentData.history.map((step, i) => (
                    <div key={i} className="flex flex-col items-center gap-4">
                      <div className={`h-4 w-4 rounded-full ${step.color} shadow-sm`} />
                      <div className="text-center">
                        <p className="text-[10px] font-black text-slate-900 mb-0.5">{step.date}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{step.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
