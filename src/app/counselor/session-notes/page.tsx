"use client";

import React, { useState } from 'react';
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

export default function SessionNotesPage() {
  const [stressLevel, setStressLevel] = useState([4]);
  const [homework, setHomework] = useState([
    { id: 'h1', text: 'Daily breathing exercise (5 mins)', completed: true },
    { id: 'h2', text: 'Read chapter 4 of assigned book', completed: true },
  ]);

  return (
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
        {/* Metrics & Stats */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-sm rounded-3xl bg-white p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Client Stats</h3>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-700">Stress Level</Label>
                  <span className="text-[10px] font-black uppercase text-primary">{stressLevel}/10</span>
                </div>
                <Slider 
                  value={stressLevel} 
                  onValueChange={setStressLevel} 
                  max={10} 
                  step={1} 
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label className="text-xs font-bold text-slate-700">Topics</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-primary/10 text-primary border-none font-bold">Anxiety</Badge>
                  <Badge className="bg-primary/10 text-primary border-none font-bold">Academics</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Narrative Notes */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none shadow-sm rounded-3xl bg-white p-8">
            <div className="flex items-center gap-2 mb-8">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Session Summary</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-700">Client Reflections</Label>
                <Textarea 
                  placeholder="Insights from this session..."
                  className="min-h-[120px] rounded-2xl bg-slate-50 border-none p-4 text-xs font-medium"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-700">Private Clinical Notes 🔒</Label>
                <Textarea 
                  placeholder="Not visible to student..."
                  className="min-h-[120px] rounded-2xl bg-slate-50 border-none p-4 text-xs font-medium"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Actions & Next Steps */}
        <div className="lg:col-span-12">
          <Card className="border-none shadow-sm rounded-3xl bg-white p-8">
            <div className="flex items-center gap-2 mb-8">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Homework & Actions</h3>
            </div>

            <div className="space-y-3">
              {homework.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Checkbox checked={item.completed} className="h-5 w-5 rounded-lg" />
                  <span className="flex-1 text-xs font-bold text-slate-700">{item.text}</span>
                </div>
              ))}
              <Button variant="ghost" className="w-full h-12 rounded-2xl border-2 border-dashed border-slate-100 text-slate-400 font-bold text-xs">
                <Plus className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
