"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, Brain, AlertCircle, Plus, ClipboardList,
  FileText, Star, ChevronRight, BarChart3, Trash2, GripVertical
} from 'lucide-react';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS } from '@/lib/constants';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from '@/components/ui/slider';
import { useNotifications } from '@/contexts/NotificationContext';
import { analyzeClinicalForm } from '@/ai/flows/analyze-clinical-form';

const RISK_COLORS: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-600',
  moderate: 'bg-amber-50 text-amber-600',
  high: 'bg-red-50 text-red-600',
};

export default function CounselorAssessmentsPage() {
  const { user: counselor } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const { toast } = useToast();

  // Google Form builder state
  const [targetStudent, setTargetStudent] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState('');

  // Evaluation state
  const [isEvalOpen, setIsEvalOpen] = useState(false);
  const [evalRating, setEvalRating] = useState([5]);
  const [evalComments, setEvalComments] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadData = async () => {
    const [allAssessments, allUsers] = await Promise.all([
      storageService.getAll<any>(STORAGE_KEYS.ASSESSMENTS),
      storageService.getAll<any>(STORAGE_KEYS.USERS),
    ]);
    allAssessments.sort((a, b) => b.timestamp - a.timestamp);
    setAssessments(allAssessments);
    if (allAssessments.length > 0 && !selectedAssessment) {
      setSelectedAssessment(allAssessments[0]);
    }
    setStudents(allUsers.filter(u => u.role === 'student'));
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const unread = notifications.filter(n => n.type === 'assessment' && !n.isRead);
    if (unread.length > 0) unread.forEach(n => markAsRead(n.id));
  }, [notifications, markAsRead]);

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setQuestions(prev => [...prev, newQuestion.trim()]);
    setNewQuestion('');
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateTask = async () => {
    if (!targetStudent || !taskTitle || !counselor) return;

    const studentUser = students.find(s => s.id === targetStudent);
    const finalQuestions = questions.length > 0 ? questions : ['Please describe your current stress levels.'];

    await storageService.create(STORAGE_KEYS.ASSESSMENT_TASKS, {
      counselorId: counselor.id,
      counselorName: counselor.name,
      studentId: targetStudent,
      studentName: studentUser?.name,
      title: taskTitle,
      description: taskDesc,
      questions: finalQuestions,
      status: 'pending',
      timestamp: Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    });

    toast({
      title: "Assessment Assigned",
      description: `New analysis form sent to ${studentUser?.name}.`,
    });

    setIsTaskModalOpen(false);
    setTargetStudent('');
    setTaskTitle('');
    setTaskDesc('');
    setQuestions([]);
    setNewQuestion('');
  };

  const handleOpenEvaluation = (assessment: any) => {
    setSelectedAssessment(assessment);
    setEvalRating([5]);
    setEvalComments('');
    setIsEvalOpen(true);
    markAsRead(`asmt-${assessment.id}`);
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedAssessment || !counselor) return;
    setIsAnalyzing(true);

    let aiAnalysis: { summary?: string; mainConcerns?: string[]; emotionalState?: string; riskLevel?: string } = {};

    // Run AI analysis on clinical form responses
    if (selectedAssessment.type === 'CLINICAL_FORM' && selectedAssessment.questions?.length > 0) {
      try {
        const analysis = await analyzeClinicalForm({
          questions: selectedAssessment.questions,
          answers: selectedAssessment.answers ?? {},
          studentName: selectedAssessment.studentName,
        });
        aiAnalysis = analysis;
      } catch (e) {
        console.error('AI analysis failed:', e);
      }
    }

    await storageService.update(STORAGE_KEYS.ASSESSMENTS, selectedAssessment.id, {
      status: 'evaluated',
      counselorRating: evalRating[0],
      counselorComments: evalComments,
      evaluatedAt: Date.now(),
      stressLevel: evalRating[0] * 10,
      ...(aiAnalysis.mainConcerns ? { mainConcerns: aiAnalysis.mainConcerns } : {}),
      ...(aiAnalysis.emotionalState ? { emotionalState: aiAnalysis.emotionalState } : {}),
    });

    if (selectedAssessment.taskId) {
      await storageService.update(STORAGE_KEYS.ASSESSMENT_TASKS, selectedAssessment.taskId, {
        status: 'completed',
        counselorRating: evalRating[0],
        counselorComments: evalComments,
      });
    }

    toast({
      title: "Evaluation Submitted",
      description: aiAnalysis.mainConcerns
        ? "Clinical analysis and AI insights have been saved to the student profile."
        : "Student data has been updated with your clinical analysis.",
    });

    setIsAnalyzing(false);
    setIsEvalOpen(false);
    loadData();
  };

  const pendingEvaluations = assessments.filter(a => a.type === 'CLINICAL_FORM' && a.status === 'submitted');
  const aiInsights = assessments.filter(a => a.type === 'AI_CHAT');

  const selectAssessment = (a: any) => {
    setSelectedAssessment(a);
    markAsRead(`asmt-${a.id}`);
  };

  const riskFlag = selectedAssessment?.stressLevel > 75 ? 'Critical'
    : selectedAssessment?.stressLevel > 50 ? 'Moderate' : 'Routine';
  const riskBg = selectedAssessment?.stressLevel > 75 ? 'bg-red-50 text-red-600'
    : selectedAssessment?.stressLevel > 50 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600';

  return (
    <div className="max-w-7xl mx-auto w-full pb-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Clinical Analysis</h1>
          <p className="text-sm text-slate-500 font-medium">Review student responses and synchronize clinical ratings.</p>
        </div>
        <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl font-black bg-primary h-11 gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Create Analysis Form
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Assign Clinical Assessment</DialogTitle>
              <p className="text-xs text-slate-400 font-medium mt-1">Build a custom form by adding questions one at a time.</p>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Select Student</Label>
                  <Select value={targetStudent} onValueChange={setTargetStudent}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50">
                      <SelectValue placeholder="Student..." />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Form Title</Label>
                  <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Anxiety Root Analysis" className="h-12 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Description / Context</Label>
                <Textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Why is this form being assigned?" className="min-h-[60px] rounded-xl" />
              </div>

              {/* Google Form-style question builder */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Questions ({questions.length} added)
                </Label>
                {questions.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {questions.map((q, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl group">
                        <span className="mt-0.5 text-[10px] font-black text-slate-400 w-5 shrink-0">{i + 1}</span>
                        <p className="flex-1 text-sm font-medium text-slate-700 leading-snug">{q}</p>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeQuestion(i)}
                          className="h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newQuestion}
                    onChange={e => setNewQuestion(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addQuestion(); } }}
                    placeholder="Type a question and press Enter or click +"
                    className="h-11 rounded-xl bg-slate-50 border-slate-100 text-sm"
                  />
                  <Button
                    onClick={addQuestion}
                    disabled={!newQuestion.trim()}
                    variant="outline"
                    className="h-11 px-4 rounded-xl font-black border-primary/20 text-primary shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {questions.length === 0 && (
                  <p className="text-[10px] text-slate-400 italic">No questions yet. Add at least one, or a default question will be used.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateTask} disabled={!targetStudent || !taskTitle} className="w-full h-12 rounded-xl font-black bg-primary">
                Assign Clinical Task ({questions.length || 1} {questions.length === 1 ? 'question' : 'questions'})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: assessment list */}
        <div className="lg:col-span-4 space-y-6">
          <Tabs defaultValue="clinical" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-white/50 p-1 rounded-2xl h-12 shadow-sm">
              <TabsTrigger value="clinical" className="rounded-xl font-black text-[10px] uppercase tracking-widest relative">
                Form Response
                {pendingEvaluations.length > 0 && (
                  <span className="ml-2 h-4 w-4 rounded-full bg-primary text-[8px] text-white flex items-center justify-center">
                    {pendingEvaluations.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="ai" className="rounded-xl font-black text-[10px] uppercase tracking-widest">
                AI Chat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clinical">
              <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
                <ScrollArea className="h-[500px]">
                  <div className="p-3 space-y-1">
                    {pendingEvaluations.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => handleOpenEvaluation(a)}
                        className="p-4 rounded-2xl cursor-pointer flex items-center gap-3 bg-primary/5 ring-1 ring-primary/10 hover:bg-primary/10 transition-all"
                      >
                        <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                          <AvatarImage src={`https://picsum.photos/seed/${a.studentId}/64/64`} />
                          <AvatarFallback>{a.studentName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{a.studentName}</p>
                          <p className="text-[10px] text-primary font-black uppercase tracking-tighter">Needs Evaluation</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-primary" />
                      </div>
                    ))}
                    {assessments.filter(a => a.type === 'CLINICAL_FORM' && a.status === 'evaluated').map(a => (
                      <div
                        key={a.id}
                        onClick={() => selectAssessment(a)}
                        className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-3 ${selectedAssessment?.id === a.id ? 'bg-slate-50 ring-1 ring-slate-100' : 'hover:bg-slate-50/50'}`}
                      >
                        <Avatar className="h-8 w-8 opacity-60">
                          <AvatarImage src={`https://picsum.photos/seed/${a.studentId}/64/64`} />
                          <AvatarFallback>{a.studentName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-500 truncate">{a.studentName}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{a.date}</p>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-black uppercase h-5">Evaluated</Badge>
                      </div>
                    ))}
                    {pendingEvaluations.length === 0 && assessments.filter(a => a.type === 'CLINICAL_FORM').length === 0 && (
                      <div className="p-10 text-center space-y-3">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto opacity-20" />
                        <p className="text-xs font-bold text-slate-400 italic">No forms awaiting review.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>

            <TabsContent value="ai">
              <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
                <ScrollArea className="h-[500px]">
                  <div className="p-3 space-y-1">
                    {aiInsights.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => selectAssessment(a)}
                        className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-3 ${selectedAssessment?.id === a.id ? 'bg-primary/5 ring-1 ring-primary/10' : 'hover:bg-slate-50'}`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://picsum.photos/seed/${a.studentId}/64/64`} />
                          <AvatarFallback>{a.studentName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{a.studentName}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">AI Analysis • {a.date}</p>
                        </div>
                        {a.emotionalState && (
                          <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black capitalize h-5">
                            {a.emotionalState}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {aiInsights.length === 0 && (
                      <div className="p-10 text-center space-y-3">
                        <Brain className="h-10 w-10 text-primary mx-auto opacity-20" />
                        <p className="text-xs font-bold text-slate-400 italic">No AI chat sessions yet.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column: detail view */}
        <div className="lg:col-span-8 space-y-6">
          {selectedAssessment ? (
            <>
              <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
                <CardHeader className="px-8 pt-8 pb-4 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                      <AvatarImage src={`https://picsum.photos/seed/${selectedAssessment.studentId}/128/128`} />
                      <AvatarFallback>{selectedAssessment.studentName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg font-black text-slate-900">{selectedAssessment.studentName}</CardTitle>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {selectedAssessment.type === 'AI_CHAT' ? 'AI Chat Session' : 'Clinical Form Response'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="h-8 rounded-xl font-bold px-4 border-slate-100 bg-slate-50 text-slate-400">
                    {selectedAssessment.date}
                  </Badge>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                  <div className="flex flex-col md:flex-row items-start gap-10">
                    {/* Stress ring */}
                    <div className="shrink-0 space-y-4 w-full md:w-auto">
                      <div className="relative h-36 w-36 mx-auto">
                        <svg className="h-full w-full -rotate-90">
                          <circle cx="72" cy="72" r="62" fill="none" stroke="#F1F5F9" strokeWidth="14" />
                          <circle
                            cx="72" cy="72" r="62" fill="none"
                            stroke={selectedAssessment.stressLevel > 75 ? "#EF4444" : "#248F7D"}
                            strokeWidth="14"
                            strokeDasharray="389.6"
                            strokeDashoffset={389.6 * (1 - (selectedAssessment.stressLevel ?? 0) / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-black text-slate-900 leading-none">{selectedAssessment.stressLevel ?? '--'}%</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Stress</span>
                        </div>
                      </div>

                      {selectedAssessment.emotionalState && (
                        <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 text-center">
                          <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Emotional State</p>
                          <p className="text-sm font-black text-slate-800 capitalize">{selectedAssessment.emotionalState}</p>
                        </div>
                      )}

                      {selectedAssessment.status === 'evaluated' && (
                        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Clinical Rating</p>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xl font-black text-emerald-700">{selectedAssessment.counselorRating}</span>
                            <span className="text-xs font-bold text-emerald-400">/10</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-5 w-full">
                      {selectedAssessment.type === 'AI_CHAT' ? (
                        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" /> AI Session Summary
                          </p>
                          <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{selectedAssessment.summary}"</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" /> Question / Response Log
                          </p>
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                            {(selectedAssessment.questions || []).map((q: string, i: number) => (
                              <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50 space-y-2">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">Q{i + 1}: {q}</p>
                                <p className="text-sm font-bold text-slate-700 leading-relaxed">
                                  "{selectedAssessment.answers?.[i] || 'No response.'}"
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Main concerns */}
                      {selectedAssessment.mainConcerns?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Key Concerns Identified</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedAssessment.mainConcerns.map((c: string, i: number) => (
                              <Badge key={i} className="bg-amber-50 text-amber-700 border-none font-bold text-xs capitalize">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Focus areas */}
                      {selectedAssessment.focusAreas?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Focus Areas</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedAssessment.focusAreas.map((f: string, i: number) => (
                              <Badge key={i} className="bg-blue-50 text-blue-700 border-none font-bold text-xs">
                                {f}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedAssessment.status === 'submitted' && (
                        <Button onClick={() => handleOpenEvaluation(selectedAssessment)} className="w-full h-14 rounded-2xl bg-primary font-black shadow-lg shadow-primary/20 gap-2">
                          <Star className="h-5 w-5 fill-current" /> Begin Clinical Evaluation
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Analytics card */}
              <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
                <CardHeader className="px-8 pt-8 pb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-emerald-500" /> Clinical Synchronization Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2">AI Stress Baseline</p>
                    <p className="text-xl font-black text-slate-900">{selectedAssessment.stressLevel ?? '--'}%</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Emotional State</p>
                    <p className="text-xl font-black text-slate-700 capitalize">{selectedAssessment.emotionalState ?? 'Unknown'}</p>
                  </div>
                  <div className={`p-5 rounded-2xl border text-center ${riskBg}`}>
                    <p className="text-[9px] font-black uppercase mb-2 opacity-70">Priority Flag</p>
                    <p className="text-xl font-black">{riskFlag}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 py-20">
              <ClipboardList className="h-16 w-16 opacity-10" />
              <p className="italic font-bold">Select a student record to begin professional analysis</p>
            </div>
          )}
        </div>
      </div>

      {/* Evaluation Dialog */}
      <Dialog open={isEvalOpen} onOpenChange={setIsEvalOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-slate-50 border-b">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={`https://picsum.photos/seed/${selectedAssessment?.studentId}/128/128`} />
                <AvatarFallback>{selectedAssessment?.studentName?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-900">Clinical Evaluation</DialogTitle>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedAssessment?.studentName}</p>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Counselor Rating (Severity)</Label>
                <Badge className="bg-primary/10 text-primary border-none font-black text-lg h-10 px-4">{evalRating[0]} / 10</Badge>
              </div>
              <Slider value={evalRating} onValueChange={setEvalRating} max={10} min={1} step={1} className="py-4" />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase px-1">
                <span>Healthy / Stable</span>
                <span>Requires Intervention</span>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Clinical Commentary</Label>
              <Textarea
                placeholder="Provide professional insights for this student's progress..."
                className="min-h-[150px] rounded-2xl bg-slate-50 border-none p-5 text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary/20"
                value={evalComments}
                onChange={(e) => setEvalComments(e.target.value)}
              />
            </div>
            {selectedAssessment?.type === 'CLINICAL_FORM' && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-xs font-medium text-primary/70">
                AI will automatically analyze the student's responses when you submit this evaluation.
              </div>
            )}
          </div>
          <div className="p-8 pt-4 bg-white border-t flex gap-3">
            <Button variant="outline" onClick={() => setIsEvalOpen(false)} className="flex-1 h-14 rounded-2xl font-bold border-slate-200">Discard</Button>
            <Button onClick={handleSubmitEvaluation} disabled={isAnalyzing} className="flex-1 h-14 rounded-2xl font-black bg-primary gap-2 shadow-lg shadow-primary/20">
              {isAnalyzing ? 'Analyzing...' : <><CheckCircle2 className="h-5 w-5" /> Complete Analysis</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
