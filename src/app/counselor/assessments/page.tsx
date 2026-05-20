"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, Brain, AlertCircle, Plus, ClipboardList,
  FileText, Star, ChevronRight, BarChart3, Trash2, GripVertical,
  Search, Check, ChevronsUpDown
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

const RISK_COLORS: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-600',
  moderate: 'bg-amber-50 text-amber-600',
  high: 'bg-red-50 text-red-600',
};

const FEEDBACK_TEMPLATES = [
  {
    label: "Stable Maintenance",
    rating: 2,
    comments: "Student is at a healthy mental baseline with solid wellness habits. Advise standard routine maintenance and periodic review as requested."
  },
  {
    label: "Exam/Academic Stress",
    rating: 5,
    comments: "Student exhibits moderate situational stress related to exam workloads. Advise stress mitigation strategies, breathing exercises, and standard check-in tracking."
  },
  {
    label: "Social/Peer Tension",
    rating: 6,
    comments: "Academic pressure exacerbated by peer environment conflicts. Recommended focus on cognitive behavioral guidelines and active workload pacing."
  },
  {
    label: "Severe Clinical Risk",
    rating: 8,
    comments: "Student displays severe academic anxiety and chronic sleep deprivation. Recommend immediate follow-up clinical session and cognitive wellness routing."
  },
  {
    label: "Sleep & Fatigue",
    rating: 6,
    comments: "Chronic sleep deficiency affecting focus and motivation. Recommended immediate scheduling of sleep hygiene check-in."
  },
  {
    label: "Social Withdrawal",
    rating: 7,
    comments: "Exhibiting signs of emotional exhaustion and mild social withdrawal. Recommending regular messaging support and scheduling a group session."
  }
];

const ASSESSMENT_TEMPLATES = [
  {
    title: "General Wellness Check-in",
    description: "A routine check-in to evaluate overall emotional baseline, sleep patterns, and current coping strategies.",
    questions: [
      "How would you describe your overall mood over the past week?",
      "On a scale of 1-10, how well are you sleeping?",
      "What are the primary sources of stress in your life right now?",
      "What activities or habits are currently helping you stay grounded?"
    ]
  },
  {
    title: "Midterm / Exam Stress Survey",
    description: "Designed to identify academic pressure points, exam anxiety, and workload management difficulties.",
    questions: [
      "How confident do you feel about your upcoming exams or academic deadlines?",
      "Are you experiencing physical symptoms of academic stress (e.g., headaches, exhaustion)?",
      "How many hours of focused study are you managing per day?",
      "Do you feel you have adequate support from teachers, peers, or family?"
    ]
  },
  {
    title: "Social & Connection Assessment",
    description: "Evaluates social adjustment, peer interactions, feelings of loneliness, and community integration.",
    questions: [
      "How connected do you feel to the campus community and your peers?",
      "Have you experienced any conflicts or tensions with friends or classmates recently?",
      "Who is your main source of emotional support when you face difficulties?",
      "How often do you engage in group or extracurricular campus activities?"
    ]
  },
  {
    title: "Clinical Anxiety Baseline",
    description: "A deeper clinical template targeting root causes of panic, social anxiety, and chronic worry.",
    questions: [
      "How frequently do you experience sudden, intense feelings of worry or panic?",
      "Does anxiety interfere with your ability to attend classes or complete assignments?",
      "Do you find it difficult to control your worrying once it starts?",
      "What specific situations trigger the highest level of distress for you?"
    ]
  }
];

export default function CounselorAssessmentsPage() {
  const { user: counselor } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const { toast } = useToast();

  // Google Form builder state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
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
    if (selectedStudentIds.length === 0 || !taskTitle || !counselor) return;

    const finalQuestions = questions.length > 0 ? questions : ['Please describe your current stress levels.'];

    // Map each selected student and execute storageService writes in parallel
    await Promise.all(selectedStudentIds.map(async (studentId) => {
      const studentUser = students.find(s => s.id === studentId);
      return storageService.create(STORAGE_KEYS.ASSESSMENT_TASKS, {
        counselorId: counselor.id,
        counselorName: counselor.name,
        studentId: studentId,
        studentName: studentUser?.name || 'Student',
        title: taskTitle,
        description: taskDesc,
        questions: finalQuestions,
        status: 'pending',
        timestamp: Date.now(),
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      });
    }));

    if (selectedStudentIds.length === students.length) {
      toast({
        title: "Assessment Broadcasted",
        description: `New analysis form sent to all ${students.length} students successfully.`,
      });
    } else if (selectedStudentIds.length > 1) {
      toast({
        title: "Assessment Assigned",
        description: `New analysis form sent to ${selectedStudentIds.length} selected students.`,
      });
    } else {
      const singleStudentName = students.find(s => s.id === selectedStudentIds[0])?.name || 'Student';
      toast({
        title: "Assessment Assigned",
        description: `New analysis form sent to ${singleStudentName}.`,
      });
    }

    setIsTaskModalOpen(false);
    setSelectedStudentIds([]);
    setStudentSearchQuery('');
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
              <p className="text-xs text-slate-400 font-medium mt-1">Build a custom form or load a prebuilt template below.</p>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Sleek Prebuilt Assessment Templates Section */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-primary" /> Load Prebuilt Assessment Template
                </Label>
                <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto pr-1">
                  {ASSESSMENT_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setTaskTitle(tmpl.title);
                        setTaskDesc(tmpl.description);
                        setQuestions(tmpl.questions);
                        toast({
                          title: "Template Loaded",
                          description: `"${tmpl.title}" loaded successfully with ${tmpl.questions.length} questions.`,
                        });
                      }}
                      className="p-2.5 text-left border border-slate-100 rounded-xl hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all text-xs bg-slate-50/50 flex flex-col justify-between min-h-[60px] w-full group"
                    >
                      <span className="font-bold text-slate-800 group-hover:text-primary transition-colors block line-clamp-1">{tmpl.title}</span>
                      <span className="text-[10px] text-slate-400 font-semibold mt-1 line-clamp-1">{tmpl.questions.length} clinical questions</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 col-span-2">
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Select Student(s)</Label>
                    <div className="flex items-center space-x-1.5">
                      <Checkbox
                        id="broadcast-select-all"
                        checked={selectedStudentIds.length === students.length && students.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStudentIds(students.map(s => s.id));
                          } else {
                            setSelectedStudentIds([]);
                          }
                        }}
                      />
                      <label htmlFor="broadcast-select-all" className="text-[10px] font-black uppercase text-primary cursor-pointer select-none">
                        Select All
                      </label>
                    </div>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        disabled={selectedStudentIds.length === students.length && students.length > 0}
                        className="h-12 w-full rounded-xl border-slate-100 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 justify-between text-left font-bold text-xs shadow-none text-slate-700 px-3 disabled:opacity-80"
                      >
                        <span className="truncate">
                          {selectedStudentIds.length === 0 && "Select student(s)..."}
                          {selectedStudentIds.length === students.length && students.length > 0 && `📢 Broadcast to ALL (${students.length})`}
                          {selectedStudentIds.length > 0 && selectedStudentIds.length < students.length && (
                            selectedStudentIds.length === 1 
                              ? students.find(s => s.id === selectedStudentIds[0])?.name
                              : `👥 ${selectedStudentIds.length} students selected`
                          )}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-4 rounded-2xl border-none shadow-2xl bg-white" align="start">
                      <div className="space-y-3">
                        {/* Search Input */}
                        <div className="relative flex items-center">
                          <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                          <Input
                            placeholder="Search students..."
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="h-9 pl-8 text-xs rounded-xl bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
                          />
                        </div>

                        {/* Select All Toggle */}
                        {students.length > 0 && (
                          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                            <Checkbox
                              id="select-all-checkbox"
                              checked={
                                students.filter(s =>
                                  s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
                                ).every(s => selectedStudentIds.includes(s.id)) &&
                                students.filter(s =>
                                  s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
                                ).length > 0
                              }
                              onCheckedChange={(checked) => {
                                const filtered = students.filter(s =>
                                  s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
                                );
                                if (checked) {
                                  // Add all filtered that are not already selected
                                  setSelectedStudentIds(prev => {
                                    const next = [...prev];
                                    filtered.forEach(s => {
                                      if (!next.includes(s.id)) next.push(s.id);
                                    });
                                    return next;
                                  });
                                } else {
                                  // Remove all filtered from selection
                                  const filteredIds = filtered.map(s => s.id);
                                  setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
                                }
                              }}
                            />
                            <label
                              htmlFor="select-all-checkbox"
                              className="text-xs font-black text-primary cursor-pointer select-none"
                            >
                              📢 Select All / Broadcast
                            </label>
                          </div>
                        )}

                        {/* Student List */}
                        <ScrollArea className="h-48">
                          <div className="space-y-1.5 pr-1">
                            {students
                              .filter(s =>
                                s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                s.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
                              )
                              .map((student) => {
                                const isSelected = selectedStudentIds.includes(student.id);
                                return (
                                  <div
                                    key={student.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                                      } else {
                                        setSelectedStudentIds(prev => [...prev, student.id]);
                                      }
                                    }}
                                    className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                                  >
                                    <Checkbox checked={isSelected} className="pointer-events-none" />
                                    <Avatar className="h-6 w-6 shrink-0">
                                      <AvatarImage src={`https://picsum.photos/seed/${student.id}/32/32`} />
                                      <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                                        {student.name[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0 text-left">
                                      <p className="text-xs font-bold text-slate-800 truncate">{student.name}</p>
                                      <p className="text-[9px] font-semibold text-slate-400 truncate">
                                        {student.studentId || student.email}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            {students.filter(s =>
                              s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                              s.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
                            ).length === 0 && (
                              <p className="text-[10px] text-center text-slate-400 italic py-4">No students found.</p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Form Title</Label>
                  <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Anxiety Root Analysis" className="h-12 rounded-xl" />
                </div>
              </div>
              {selectedStudentIds.length === students.length && students.length > 0 && (
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl text-xs font-bold text-primary animate-pulse text-center w-full">
                  📢 Broadcast Mode Active: Form will be assigned to all {students.length} students simultaneously.
                </div>
              )}
              {selectedStudentIds.length > 0 && selectedStudentIds.length < students.length && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-blue-600 text-center w-full">
                  👥 Group Assignment Active: Form will be assigned to {selectedStudentIds.length} selected students.
                </div>
              )}
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
              <Button onClick={handleCreateTask} disabled={selectedStudentIds.length === 0 || !taskTitle} className="w-full h-12 rounded-xl font-black bg-primary">
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
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Clinical Commentary</Label>
                <span className="text-[9px] text-slate-400 font-bold uppercase">Pre-defined evaluation templates</span>
              </div>
              
              {/* Sleek feedback templates buttons grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                {FEEDBACK_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setEvalRating([tmpl.rating]);
                      setEvalComments(tmpl.comments);
                    }}
                    className="p-2 text-left border border-slate-100 rounded-xl hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all text-[10px] font-bold text-slate-700 bg-slate-50/50 flex flex-col justify-between min-h-[50px] w-full"
                  >
                    <span className="line-clamp-1">{tmpl.label}</span>
                    <span className="text-[8px] text-slate-400 font-black mt-1">Severity: {tmpl.rating}/10</span>
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="Provide professional insights for this student's progress..."
                className="min-h-[110px] rounded-2xl bg-slate-50 border-none p-5 text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary/20"
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
