
"use client";

import React, { useState } from 'react';
import CounselorLayout from '@/app/counselor/layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Trash2, 
  Save, 
  Calendar, 
  Clock, 
  Activity, 
  BookOpen, 
  ShieldAlert,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SessionNotesPage() {
  const [stressLevel, setStressLevel] = useState([4]);
  const [progressRating, setProgressRating] = useState(3);
  const [homework, setHomework] = useState([
    { id: 'h1', text: 'Daily breathing exercise (5 mins)', completed: true },
    { id: 'h2', text: 'Read chapter 4 of assigned book', completed: true },
  ]);

  return (
    <CounselorLayout>
      <div className="p-8 max-w-5xl mx-auto w-full pb-32">
        {/* Student Header Card */}
        <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/30 p-8 flex items-center justify-between">
            <div>
              <div className="h-2 w-12 bg-primary rounded-full mb-4" />
              <h1 className="text-3xl font-black text-slate-900 mb-2">Jordan Henderson</h1>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Session Duration: 52m 14s</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Oct 24, 2023</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-xl font-bold border-slate-200">Discard</Button>
              <Button className="bg-primary hover:bg-primary/90 rounded-xl font-black px-6">Submit Record</Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Metrics & Stats */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-sm rounded-3xl bg-white p-6">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Client Stats & Metrics</h3>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-700">Self-Reported Stress Level</Label>
                    <span className="text-[10px] font-black uppercase text-primary">Low Stress ({stressLevel}/10)</span>
                  </div>
                  <Slider 
                    value={stressLevel} 
                    onValueChange={setStressLevel} 
                    max={10} 
                    step={1} 
                    className="py-4"
                  />
                  <div className="flex justify-between text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                    <span>Low</span>
                    <span>Mod</span>
                    <span>High</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-xs font-bold text-slate-700">Focus Topics</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-primary/10 text-primary border-none hover:bg-primary/20 px-3 py-1 font-bold">Anxiety</Badge>
                    <Badge className="bg-primary/10 text-primary border-none hover:bg-primary/20 px-3 py-1 font-bold">Work-Life Balance</Badge>
                    <Button variant="outline" size="sm" className="h-7 rounded-lg border-dashed text-[10px] font-bold text-slate-400 gap-1">
                      <Plus className="h-3 w-3" /> Add Topic
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Narrative Notes */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-none shadow-sm rounded-3xl bg-white p-8">
              <div className="flex items-center gap-2 mb-8">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Session Summary & Notes</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    Client Reflections <span className="text-slate-300">ⓘ</span>
                  </Label>
                  <div className="relative">
                    <Textarea 
                      placeholder="Describe the client's breakthroughs or insights during this session..."
                      className="min-h-[160px] rounded-2xl bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary/20 p-4 text-xs font-medium leading-relaxed"
                    />
                    <div className="absolute bottom-3 right-3 flex gap-1">
                       <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-white shadow-sm border border-slate-100 font-serif">B</Button>
                       <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-white shadow-sm border border-slate-100"><ClipboardList className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    Confidential Private Notes <span className="text-slate-300">🔒</span>
                  </Label>
                  <Textarea 
                    placeholder="Clinical observations and internal assessments (not visible to student)..."
                    className="min-h-[160px] rounded-2xl bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary/20 p-4 text-xs font-medium leading-relaxed"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Row 2: Homework & Actions */}
          <div className="lg:col-span-12">
            <Card className="border-none shadow-sm rounded-3xl bg-white p-8">
              <div className="flex items-center gap-2 mb-8">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Homework & Actions</h3>
              </div>

              <div className="space-y-3">
                {homework.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 group transition-colors hover:bg-blue-50/30">
                    <Checkbox checked={item.completed} className="h-5 w-5 rounded-lg border-primary data-[state=checked]:bg-primary" />
                    <span className="flex-1 text-xs font-bold text-slate-700">{item.text}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" className="w-full h-12 rounded-2xl border-2 border-dashed border-slate-100 text-slate-400 font-bold text-xs hover:bg-slate-50 gap-2">
                  <Plus className="h-4 w-4" /> Add Homework Item
                </Button>
              </div>
            </Card>
          </div>

          {/* Row 3: Progress & Next Steps */}
          <div className="lg:col-span-12">
            <Card className="border-none shadow-sm rounded-3xl bg-white p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Progress Rating</h3>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setProgressRating(rating)}
                        className={cn(
                          "h-12 w-12 rounded-full font-bold text-xs transition-all border-2",
                          progressRating === rating 
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-110" 
                            : "bg-white text-slate-400 border-slate-100 hover:border-primary/30"
                        )}
                      >
                        {rating}
                      </button>
                    ))}
                    <div className="ml-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right flex-1">
                      Steady Progress
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-bold text-slate-700">Next Steps</Label>
                  <div className="p-5 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-between group cursor-pointer hover:bg-orange-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-white/50 flex items-center justify-center">
                         <ShieldAlert className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-orange-900">Standard Follow-up Plan</p>
                        <p className="text-[10px] text-orange-600/70 font-medium mt-0.5">Automated wellness check-in every 14 days.</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-orange-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Standard 45-minute follow-up session within 14 days based on current progress rating.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Floating Footer Actions */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t p-6 px-12 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
        <div className="max-w-5xl mx-auto flex items-center justify-end gap-4">
          <Button variant="outline" className="h-12 px-8 rounded-2xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
            Save Notes
          </Button>
          <Button className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black shadow-xl shadow-primary/20 flex items-center gap-2">
            Save & Schedule Follow-up <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </CounselorLayout>
  );
}
