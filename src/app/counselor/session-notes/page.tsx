"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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
  ClipboardList,
  CheckCircle2
} from 'lucide-react';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

export default function SessionNotesPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedAptId, setSelectedAptId] = useState<string>("");
  const [selectedApt, setSelectedApt] = useState<any>(null);

  const [stressLevel, setStressLevel] = useState([4]);
  const [reflectionsText, setReflectionsText] = useState("");
  const [privateNotesText, setPrivateNotesText] = useState("");
  const [homework, setHomework] = useState<string[]>([
    'Daily breathing exercise (5 mins)',
    'Read chapter 4 of assigned book'
  ]);
  const [newHomework, setNewHomework] = useState("");
  const [topics, setTopics] = useState<string[]>(["Anxiety", "Academics"]);
  const [newTopic, setNewTopic] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      const data = await storageService.getAll<any>(STORAGE_KEYS.APPOINTMENTS);
      const activeApts = data.filter(a => a.status === APPOINTMENT_STATUS.CONFIRMED || a.status === APPOINTMENT_STATUS.PENDING || a.status === 'completed');
      activeApts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAppointments(activeApts);

      // Check query parameter
      let queryId: string | null = null;
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        queryId = params.get('id');
      }

      if (queryId && activeApts.some(a => a.id === queryId)) {
        handleSelectApt(queryId, activeApts);
      } else if (activeApts.length > 0) {
        handleSelectApt(activeApts[0].id, activeApts);
      }
    };
    loadData();
  }, []);

  const handleSelectApt = (id: string, aptList = appointments) => {
    setSelectedAptId(id);
    const apt = aptList.find(a => a.id === id);
    if (apt) {
      setSelectedApt(apt);
      setReflectionsText(apt.counselorNotes || "");
      setPrivateNotesText(apt.privateNotes || "");
      if (apt.actionItems && apt.actionItems.length > 0) {
        setHomework(apt.actionItems);
      }
      if (apt.stressLevel) setStressLevel([apt.stressLevel]);
      if (apt.topics && apt.topics.length > 0) setTopics(apt.topics);
    }
  };

  const addHomework = () => {
    if (newHomework.trim()) {
      setHomework(prev => [...prev, newHomework.trim()]);
      setNewHomework("");
    }
  };

  const addTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics(prev => [...prev, newTopic.trim()]);
      setNewTopic("");
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedApt) return;
    setIsSubmitting(true);

    try {
      // 1. Update appointment status (only valid schema columns)
      await storageService.update(STORAGE_KEYS.APPOINTMENTS, selectedApt.id, {
        status: APPOINTMENT_STATUS.COMPLETED,
      });

      // 2. Save private records to session_notes
      await storageService.create('session_notes', {
        counselorId: selectedApt.counselorId,
        studentId: selectedApt.studentId,
        appointmentId: selectedApt.id,
        stressLevel: stressLevel[0],
        topics: topics,
        clientReflections: reflectionsText,
        privateNotes: privateNotesText,
        homework: homework,
      });

      // 3. Save student-facing notes and action items to appointment_feedback (which students can read)
      await storageService.create('appointment_feedback', {
        appointmentId: selectedApt.id,
        counselorId: selectedApt.counselorId,
        counselorName: selectedApt.counselorName,
        studentId: selectedApt.studentId,
        feedback: JSON.stringify({
          counselorNotes: reflectionsText,
          actionItems: homework
        })
      });

      toast({
        title: "Session Record Saved!",
        description: `Feedback and action items successfully updated for ${selectedApt.studentName}.`,
      });

      setSelectedApt((prev: any) => ({
        ...prev,
        status: APPOINTMENT_STATUS.COMPLETED,
        counselorNotes: reflectionsText,
        privateNotes: privateNotesText,
        actionItems: homework,
      }));
    } catch {
      toast({
        variant: "destructive",
        title: "Error saving record",
        description: "Could not submit session notes. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full pb-32">
      {/* Student Selection Header Card */}
      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 w-full md:w-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/20">
              Active Consultation Record
            </span>
            <div className="pt-1">
              <Label className="text-xs font-bold text-slate-300 block mb-1.5">Select Student Session</Label>
              <Select value={selectedAptId} onValueChange={(val) => handleSelectApt(val)}>
                <SelectTrigger className="w-full md:w-[320px] bg-white/10 border-white/20 text-white rounded-2xl h-12 text-sm font-black focus:ring-primary">
                  <SelectValue placeholder="Select an appointment" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl bg-slate-900 text-white">
                  {appointments.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="focus:bg-primary focus:text-white rounded-xl p-3 cursor-pointer">
                      <div className="flex flex-col">
                        <span className="font-bold text-xs">{a.studentName || 'Student'}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{a.date} • {a.type}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedApt && (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/10">
              <Button variant="outline" onClick={() => handleSelectApt(selectedApt.id)} className="w-full sm:w-auto rounded-xl font-bold bg-white/10 border-white/20 text-white hover:bg-white/20 h-12 px-6">
                Reset
              </Button>
              <Button onClick={handleSaveNotes} disabled={isSubmitting} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-xl font-black h-12 px-8 shadow-lg shadow-primary/30">
                <Save className="h-4 w-4 mr-2" /> {isSubmitting ? "Saving..." : "Submit & Complete"}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {selectedApt ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Metrics & Stats */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white p-6">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Client Metrics</h3>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-700">Observed Stress Level</Label>
                    <span className="text-xs font-black uppercase text-primary px-2.5 py-1 rounded-lg bg-primary/10">{stressLevel}/10</span>
                  </div>
                  <Slider 
                    value={stressLevel} 
                    onValueChange={setStressLevel} 
                    max={10} 
                    step={1} 
                    className="py-2"
                  />
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <Label className="text-xs font-bold text-slate-700 mb-2 block">Discussion Topics</Label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {topics.map((t, idx) => (
                      <Badge key={idx} className="bg-primary/10 text-primary border-none font-bold text-xs py-1 px-3 rounded-xl flex items-center gap-1.5">
                        {t}
                        <button onClick={() => setTopics(prev => prev.filter((_, i) => i !== idx))} className="text-primary/60 hover:text-primary">×</button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="New topic..."
                      value={newTopic}
                      onChange={e => setNewTopic(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }}
                      className="h-9 rounded-xl text-xs font-semibold"
                    />
                    <Button onClick={addTopic} size="sm" variant="secondary" className="rounded-xl font-bold bg-slate-100 hover:bg-slate-200">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-100">
                  <Label className="text-xs font-bold text-slate-700 block">Consultation Reason</Label>
                  <p className="text-xs font-medium text-slate-600 bg-slate-50 p-4 rounded-2xl italic">
                    "{selectedApt.reason || "No specific reason provided."}"
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Narrative Notes */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white p-8">
              <div className="flex items-center gap-2 mb-8">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Session Summary & Reflections</h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-900">Counselor Feedback (Visible to Student)</Label>
                    <Badge className="bg-blue-50 text-blue-700 border-none font-bold text-[10px]">Public Record</Badge>
                  </div>
                  <Textarea 
                    value={reflectionsText}
                    onChange={e => setReflectionsText(e.target.value)}
                    placeholder="Provide constructive feedback, encouragement, and insights for the student to review..."
                    className="min-h-[140px] rounded-2xl bg-slate-50/50 border border-slate-200 p-4 text-xs font-medium leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">This exact text will appear on the student's dashboard when they review completed sessions.</p>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">Private Clinical Notes 🔒</Label>
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-none font-bold text-[10px]">Confidential</Badge>
                  </div>
                  <Textarea 
                    value={privateNotesText}
                    onChange={e => setPrivateNotesText(e.target.value)}
                    placeholder="Clinical observations, diagnostic notes, or sensitive follow-up reminders not visible to student..."
                    className="min-h-[140px] rounded-2xl bg-amber-50/20 border border-amber-200 p-4 text-xs font-medium leading-relaxed"
                  />
                </div>
              </div>
            </Card>

            {/* Actions & Next Steps */}
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white p-8">
              <div className="flex items-center gap-2 mb-8">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Recommended Action Items & Homework</h3>
              </div>

              <div className="space-y-3">
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {homework.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> {item}</span>
                      <Button variant="ghost" size="sm" onClick={() => setHomework(prev => prev.filter((_, i) => i !== idx))} className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {homework.length === 0 && (
                    <p className="text-xs text-slate-400 font-semibold p-4 text-center bg-slate-50 rounded-2xl border border-dashed">No homework recommendations added yet.</p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="Type new action item or recommendation..."
                    value={newHomework}
                    onChange={e => setNewHomework(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHomework(); } }}
                    className="h-12 rounded-2xl text-xs font-bold bg-white border border-slate-200"
                  />
                  <Button onClick={addHomework} className="h-12 px-6 rounded-2xl font-black bg-primary text-white hover:bg-primary/90 shadow-md">
                    <Plus className="h-5 w-5 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] p-16 text-center">
          <p className="text-lg font-bold text-slate-400">Please select an appointment from the dropdown menu above to begin recording session notes.</p>
        </Card>
      )}
    </div>
  );
}
