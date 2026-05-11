"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  CheckCircle2, 
  Users, 
  Brain,
  AlertCircle,
  TrendingUp,
  Clock,
  Heart
} from 'lucide-react';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS } from '@/lib/constants';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CounselorAssessmentsPage() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);

  useEffect(() => {
    const loadData = () => {
      const allAssessments = storageService.getAll<any>(STORAGE_KEYS.ASSESSMENTS);
      allAssessments.sort((a, b) => b.timestamp - a.timestamp);
      setAssessments(allAssessments);
      
      if (allAssessments.length > 0 && !selectedAssessment) {
        setSelectedAssessment(allAssessments[0]);
      }
    };
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [selectedAssessment]);

  if (assessments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400 gap-4">
        <AlertCircle className="h-16 w-16 opacity-10" />
        <div className="text-center">
          <p className="text-xl font-black">No assessments in queue</p>
          <p className="text-sm font-medium">Data will appear here once students complete their Weekly Kamustahan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full pb-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Session Preparation</h1>
        <Badge variant="outline" className="bg-white text-primary border-primary/20 font-black px-4 py-1.5 rounded-xl">
          {assessments.length} Active Records
        </Badge>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Student Selector */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
             <CardHeader className="p-6 border-b border-slate-50">
                <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                   <Users className="h-4 w-4 text-primary" />
                   Assessment Queue
                </CardTitle>
             </CardHeader>
             <ScrollArea className="h-[400px]">
                <div className="p-3 space-y-1">
                   {assessments.map((a) => (
                      <div 
                        key={a.id} 
                        onClick={() => setSelectedAssessment(a)}
                        className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-3 ${
                          selectedAssessment?.id === a.id 
                            ? 'bg-primary/5 ring-1 ring-primary/10' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                         <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://picsum.photos/seed/${a.studentId}/64/64`} />
                            <AvatarFallback>{a.studentName?.[0]}</AvatarFallback>
                         </Avatar>
                         <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{a.studentName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{a.date}</p>
                         </div>
                         {a.stressLevel > 75 && (
                           <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                         )}
                      </div>
                   ))}
                </div>
             </ScrollArea>
          </Card>

          {selectedAssessment && (
            <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
              <CardContent className="p-8 flex flex-col items-center text-center">
                <Avatar className="h-32 w-32 mb-6 ring-4 ring-slate-50 shadow-lg">
                  <AvatarImage src={`https://picsum.photos/seed/${selectedAssessment.studentId}/256/256`} />
                  <AvatarFallback>{selectedAssessment.studentName?.[0]}</AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-black text-slate-900 mb-1">{selectedAssessment.studentName}</h2>
                <p className="text-sm font-bold text-slate-400 mb-8">University Student</p>

                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-50/50 border border-blue-50">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-bold text-slate-600">Stress Priority</span>
                    </div>
                    <Badge className={`${selectedAssessment.stressLevel > 75 ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'} border-none font-black text-[10px] uppercase`}>
                      {selectedAssessment.stressLevel > 75 ? 'Critical' : 'Moderate'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-8 space-y-6">
          {selectedAssessment ? (
            <>
              <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
                <CardHeader className="px-8 pt-8 pb-4 flex flex-row items-center justify-between border-none">
                  <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest">AI Clinical Insight</CardTitle>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedAssessment.date}</span>
                </CardHeader>
                <CardContent className="p-8 pt-2">
                  <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="relative h-32 w-32 shrink-0">
                      <svg className="h-full w-full -rotate-90">
                        <circle cx="64" cy="64" r="58" fill="none" stroke="#F1F5F9" strokeWidth="12" />
                        <circle
                          cx="64" cy="64" r="58" fill="none"
                          stroke={selectedAssessment.stressLevel > 75 ? "#EF4444" : "#248F7D"}
                          strokeWidth="12"
                          strokeDasharray="364.4"
                          strokeDashoffset={364.4 * (1 - selectedAssessment.stressLevel / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-slate-900 leading-none">{selectedAssessment.stressLevel}%</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">Stress Level</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <p className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Focus Areas Identified</p>
                        {selectedAssessment.focusAreas.map((area: string) => (
                          <Badge key={area} className="bg-orange-50 text-orange-700 border-none font-bold py-1.5 px-3 rounded-lg flex items-center gap-2">
                            <Brain className="h-3 w-3" />
                            {area}
                          </Badge>
                        ))}
                      </div>
                      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Automated Summary</p>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                            "{selectedAssessment.summary}"
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
                <CardHeader className="px-8 pt-8 pb-4 border-none">
                  <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Student Wellness Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Verification</p>
                        <p className="text-sm font-black text-slate-900">AI Analyzed</p>
                      </div>
                   </div>
                   <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                        <Heart className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Recommendation</p>
                        <p className="text-sm font-black text-slate-900">Schedule Follow-up</p>
                      </div>
                   </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 italic font-bold">
              Select a record to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
