"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, Brain, AlertCircle, Plus, ClipboardList,
  FileText, Star, ChevronRight, BarChart3, Trash2, GripVertical,
  Search, Check, ChevronsUpDown, Heart, Wind, BookOpen, Anchor,
  Music, Sparkles, User, Clock,
  List, LayoutGrid, X
} from 'lucide-react';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, getCollegesForCounselor } from '@/lib/constants';
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
import { useLiveSync } from '@/hooks/useLiveSync';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';

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
  const { toast } = useToast();

  // Active Main Tab
  const [activeMainTab, setActiveMainTab] = useState<'forms' | 'protocols'>('forms');

  // Assessments state
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

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

  // Self-Care Protocols State
  const [globalProtocols, setGlobalProtocols] = useState<any[]>([]);
  const [studentProtocols, setStudentProtocols] = useState<any[]>([]);
  const [isAddingTool, setIsAddingTool] = useState(false);
  const [toolName, setToolName] = useState('');
  const [toolDuration, setToolDuration] = useState('10');
  const [toolCategory, setToolCategory] = useState<'breathing' | 'journaling' | 'grounding' | 'meditation' | 'wellness'>('wellness');
  const [toolInstructions, setToolInstructions] = useState('');
  const [applyToAll, setApplyToAll] = useState(true);
  const [selectedSelfCareStudentIds, setSelectedSelfCareStudentIds] = useState<string[]>([]);
  const [selfCareStudentSearch, setSelfCareStudentSearch] = useState('');
  const [selfCareViewMode, setSelfCareViewMode] = useState<'list' | 'grid'>('list');
  const [protocolSearch, setProtocolSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Counselor handled colleges
  const handledColleges = useMemo(() => {
    return getCollegesForCounselor(counselor?.department);
  }, [counselor?.department]);

  const isDepartmentScoped = useMemo(() => {
    return Boolean(counselor?.department && counselor.department.trim().toLowerCase() !== 'all');
  }, [counselor?.department]);

  // Scoped students for this counselor
  const scopedStudents = useMemo(() => {
    if (!isDepartmentScoped) return students;
    return students.filter(s =>
      !s.department || handledColleges.some(c => s.department === c.code || c.aliases?.includes(s.department))
    );
  }, [students, isDepartmentScoped, handledColleges]);

  // Filtered target students for multi-select assignment list
  const filteredSelfCareTargetStudents = useMemo(() => {
    if (!selfCareStudentSearch.trim()) return scopedStudents;
    const q = selfCareStudentSearch.toLowerCase();
    return scopedStudents.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q) ||
      s.student_id?.toLowerCase().includes(q)
    );
  }, [scopedStudents, selfCareStudentSearch]);

  const toggleSelfCareStudentSelection = (id: string) => {
    setSelectedSelfCareStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllSelfCareFiltered = () => {
    const ids = filteredSelfCareTargetStudents.map(s => s.id);
    setSelectedSelfCareStudentIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const clearSelfCareStudentSelection = () => {
    setSelectedSelfCareStudentIds([]);
  };

  // Load Assessments & Users
  const loadData = useCallback(async () => {
    const [allAssessments, allUsers] = await Promise.all([
      storageService.getAll<any>(STORAGE_KEYS.ASSESSMENTS),
      storageService.getAll<any>(STORAGE_KEYS.USERS),
    ]);
    allAssessments.sort((a, b) => b.timestamp - a.timestamp);
    setAssessments(allAssessments);
    if (allAssessments.length > 0 && !selectedAssessment) {
      setSelectedAssessment(allAssessments[0]);
    }
    const studentList = allUsers.filter(u => u.role === 'student');
    setStudents(studentList);
  }, [selectedAssessment]);

  // Load Self-Care Protocols from Supabase
  const loadSelfCareProtocols = useCallback(async () => {
    try {
      // 1. Global tools
      const { data: globalData, error: globalErr } = await supabase
        .from('global_self_care_tools')
        .select('*')
        .order('created_at', { ascending: false });

      if (!globalErr && globalData) {
        setGlobalProtocols(globalData);
      }

      // 2. Student-assigned tools from profiles
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('id, name, self_care_tools')
        .not('self_care_tools', 'is', null);

      if (!profileErr && profileData) {
        const studentToolsList: any[] = [];
        profileData.forEach((p: any) => {
          if (Array.isArray(p.self_care_tools)) {
            p.self_care_tools.forEach((tool: any, idx: number) => {
              studentToolsList.push({
                ...tool,
                id: tool.id || `${p.id}-tool-${idx}`,
                studentId: p.id,
                studentName: p.name,
                isStudentSpecific: true,
              });
            });
          }
        });
        setStudentProtocols(studentToolsList);
      }
    } catch (err) {
      console.error('Error loading self-care protocols:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadSelfCareProtocols();
  }, [loadData, loadSelfCareProtocols]);

  useLiveSync(loadData);

  // Real-time subscription to global_self_care_tools
  useEffect(() => {
    const channel = supabase
      .channel('counselor-self-care-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_self_care_tools' }, () => {
        loadSelfCareProtocols();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSelfCareProtocols]);

  useEffect(() => {
    const unread = notifications.filter(n => n.type === 'assessment' && !n.isRead);
    if (unread.length > 0) unread.forEach(n => markAsRead(n.id));
  }, [notifications, markAsRead]);

  // ── Form Builder Handlers ──────────────────────────────────────────────────
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

    if (selectedStudentIds.length === scopedStudents.length) {
      toast({
        title: "Assessment Broadcasted",
        description: `New analysis form sent to all ${scopedStudents.length} assigned students successfully.`,
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

    try {
      await storageService.update(STORAGE_KEYS.ASSESSMENTS, selectedAssessment.id, {
        status: 'evaluated',
        counselorRating: evalRating[0],
        counselorComments: evalComments,
        evaluatedAt: Date.now(),
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
        description: "Student data has been updated with your clinical analysis.",
      });

      setIsEvalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit evaluation.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Self-Care Tool Actions (media_1789069135148.png) ─────────────────────────
  const handleAddSelfCareTool = async (e: React.FormEvent) => {
    e.preventDefault();
    const durationNum = parseInt(String(toolDuration).replace(/\D/g, ''), 10);
    if (!toolName.trim() || isNaN(durationNum) || durationNum <= 0) {
      toast({ variant: 'destructive', title: 'Invalid inputs', description: 'Please provide Tool Name and Duration in minutes (e.g. 10).' });
      return;
    }

    setIsAddingTool(true);
    const durationMinutes = Math.max(1, Math.min(180, durationNum));
    const durationFormatted = `${durationMinutes} min`;

    try {
      if (applyToAll) {
        // Global self-care protocol
        const { error } = await supabase
          .from('global_self_care_tools')
          .insert([{
            label: toolName.trim(),
            time: durationFormatted,
            duration: durationMinutes,
            type: toolCategory,
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;

        toast({
          title: "Global Protocol Assigned",
          description: `Assigned "${toolName.trim()}" (${durationFormatted}) to all students.`,
        });
      } else {
        // BATCH Student Assignment - prevents backend & server overload
        if (selectedSelfCareStudentIds.length === 0) {
          toast({
            variant: 'destructive',
            title: 'No students selected',
            description: 'Please select at least one student from the list.',
          });
          setIsAddingTool(false);
          return;
        }

        // 1. Fetch profiles of selected students in ONE query
        const { data: targetProfiles, error: fetchErr } = await supabase
          .from('profiles')
          .select('id, name, self_care_tools')
          .in('id', selectedSelfCareStudentIds);

        if (fetchErr) throw fetchErr;

        const profileMap = new Map((targetProfiles || []).map(p => [p.id, p]));

        // 2. Perform updates in parallel batch
        const updatePromises = selectedSelfCareStudentIds.map(async (stId) => {
          const profile = profileMap.get(stId);
          const existingTools = Array.isArray(profile?.self_care_tools) ? profile.self_care_tools : [];
          const newToolObj = {
            id: `tool-${Date.now()}-${stId.slice(0, 6)}`,
            label: toolName.trim(),
            time: durationFormatted,
            duration: durationMinutes,
            type: toolCategory,
            instructions: toolInstructions.trim() || undefined,
            assignedBy: counselor?.name || 'Counselor',
            createdAt: new Date().toISOString(),
          };

          const updatedTools = [...existingTools, newToolObj];
          return supabase
            .from('profiles')
            .update({ self_care_tools: updatedTools })
            .eq('id', stId);
        });

        await Promise.all(updatePromises);

        toast({
          title: "Batch Protocol Assigned",
          description: `Assigned "${toolName.trim()}" directly to ${selectedSelfCareStudentIds.length} student${selectedSelfCareStudentIds.length > 1 ? 's' : ''} in a single batch.`,
        });
      }

      setToolName('');
      setToolDuration('10');
      setToolInstructions('');
      setApplyToAll(true);
      setSelectedSelfCareStudentIds([]);
      setSelfCareStudentSearch('');
      loadSelfCareProtocols();
    } catch (err: any) {
      console.error('Failed to assign self-care protocol:', err);
      toast({
        variant: 'destructive',
        title: 'Assignment Failed',
        description: err.message || 'Could not save the self-care protocol.',
      });
    } finally {
      setIsAddingTool(false);
    }
  };

  const handleDeleteGlobalProtocol = async (id: string, label: string) => {
    try {
      const { error } = await supabase
        .from('global_self_care_tools')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGlobalProtocols(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Protocol Removed",
        description: `Unassigned "${label}" from all students.`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Could not delete protocol.' });
    }
  };

  const handleDeleteStudentProtocol = async (studentId: string, toolId: string, label: string) => {
    try {
      const { data: currentProfile, error: fetchErr } = await supabase
        .from('profiles')
        .select('self_care_tools')
        .eq('id', studentId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      const existingTools = Array.isArray(currentProfile?.self_care_tools) ? currentProfile.self_care_tools : [];
      const updatedTools = existingTools.filter((t: any, idx: number) => (t.id || `${studentId}-tool-${idx}`) !== toolId);

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ self_care_tools: updatedTools })
        .eq('id', studentId);

      if (updateErr) throw updateErr;

      setStudentProtocols(prev => prev.filter(p => p.id !== toolId));
      toast({
        title: "Protocol Removed",
        description: `Unassigned "${label}" from student.`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Could not remove student protocol.' });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'breathing': return Wind;
      case 'journaling': return BookOpen;
      case 'grounding': return Anchor;
      case 'meditation': return Music;
      default: return Heart;
    }
  };

  const pendingEvaluations = assessments.filter(a => a.type === 'CLINICAL_FORM' && a.status === 'submitted');
  const totalActiveProtocolsCount = globalProtocols.length + studentProtocols.length;

  const allFilteredProtocols = useMemo(() => {
    const combined = [
      ...globalProtocols.map(g => ({ ...g, isGlobal: true })),
      ...studentProtocols.map(s => ({ ...s, isGlobal: false }))
    ];

    return combined.filter(p => {
      const matchQuery = !protocolSearch || (p.label?.toLowerCase().includes(protocolSearch.toLowerCase()));
      const matchCategory = categoryFilter === 'all' || p.type?.toLowerCase() === categoryFilter.toLowerCase();
      return matchQuery && matchCategory;
    });
  }, [globalProtocols, studentProtocols, protocolSearch, categoryFilter]);

  return (
    <div className="w-full pb-10 space-y-6">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Assessments & Oversight</h1>
            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
              Counselor Portal
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Review student clinical assessments, build custom guidance forms, and assign self-care protocols.
          </p>
        </div>

        {activeMainTab === 'forms' && (
          <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl font-black bg-primary h-11 gap-2 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" /> Create Analysis Form
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-2xl font-black">Assign Guidance Assessment</DialogTitle>
                <p className="text-xs text-slate-400 font-medium mt-1">Build a custom form or load a prebuilt template below.</p>
              </DialogHeader>
              <div className="space-y-6 py-4 flex-1 overflow-y-auto pr-2">
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
                        <span className="text-[10px] text-slate-400 font-semibold mt-1 line-clamp-1">{tmpl.questions.length} guidance questions</span>
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
                          checked={selectedStudentIds.length === scopedStudents.length && scopedStudents.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStudentIds(scopedStudents.map(s => s.id));
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
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={scopedStudents.length === 0}
                          className="h-12 w-full rounded-xl border-slate-100 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 justify-between text-left font-bold text-xs shadow-none text-slate-700 px-3 disabled:opacity-80"
                        >
                          <span className="truncate">
                            {selectedStudentIds.length === 0 && "Select student(s)..."}
                            {selectedStudentIds.length === scopedStudents.length && scopedStudents.length > 0 && `📢 Broadcast to ALL (${scopedStudents.length})`}
                            {selectedStudentIds.length > 0 && selectedStudentIds.length < scopedStudents.length && (
                              selectedStudentIds.length === 1 
                                ? scopedStudents.find(s => s.id === selectedStudentIds[0])?.name
                                : `👥 ${selectedStudentIds.length} students selected`
                            )}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-4 rounded-2xl border-none shadow-2xl bg-white" align="start">
                        <div 
                          className="space-y-3"
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="relative flex items-center">
                            <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              placeholder="Search students..."
                              value={studentSearchQuery}
                              onChange={(e) => setStudentSearchQuery(e.target.value)}
                              className="h-9 pl-8 text-xs rounded-xl bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                          </div>

                          <ScrollArea className="h-48">
                            <div className="space-y-1.5 pr-1">
                              {scopedStudents
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
                                      <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                        <User className="h-3 w-3" />
                                      </div>
                                      <div className="flex-1 min-w-0 text-left">
                                        <p className="text-xs font-bold text-slate-800 truncate">{student.name}</p>
                                        <p className="text-[9px] font-semibold text-slate-400 truncate">
                                          {student.studentId || student.email}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
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

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Description / Context</Label>
                  <Textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Why is this form being assigned?" className="min-h-[60px] rounded-xl" />
                </div>

                {/* Question builder */}
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
                </div>
              </div>
              <DialogFooter className="flex-shrink-0 pt-4">
                <Button onClick={handleCreateTask} disabled={selectedStudentIds.length === 0 || !taskTitle} className="w-full h-12 rounded-xl font-black bg-primary">
                  Assign Student Task ({questions.length || 1} {questions.length === 1 ? 'question' : 'questions'})
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveMainTab('forms')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeMainTab === 'forms'
              ? 'bg-primary text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Clinical Assessments & Forms</span>
          {pendingEvaluations.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeMainTab === 'forms' ? 'bg-white text-primary' : 'bg-red-500 text-white'
            }`}>
              {pendingEvaluations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMainTab('protocols')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeMainTab === 'protocols'
              ? 'bg-primary text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Heart className="h-4 w-4 text-rose-500" />
          <span>Assigned Self-Care Protocols</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeMainTab === 'protocols' ? 'bg-white text-primary' : 'bg-slate-100 text-slate-600'
          }`}>
            {totalActiveProtocolsCount}
          </span>
        </button>
      </div>

      {/* ── TAB 1: CLINICAL FORMS & OVERSIGHT ───────────────────────────────── */}
      {activeMainTab === 'forms' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left column: assessment list */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-headline text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessment Form Responses</h3>
                {pendingEvaluations.length > 0 && (
                  <span className="h-5 w-5 rounded-full bg-primary text-[10px] text-white flex items-center justify-center font-black">
                    {pendingEvaluations.length}
                  </span>
                )}
              </div>
              <ScrollArea className="h-[500px]">
                <div className="p-3 space-y-1">
                  {pendingEvaluations.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => handleOpenEvaluation(a)}
                      className="p-4 rounded-2xl cursor-pointer flex items-center gap-3 bg-primary/5 ring-1 ring-primary/10 hover:bg-primary/10 transition-all"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-white shadow-sm">
                        <User className="h-4 w-4" />
                      </div>
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
                      onClick={() => {
                        setSelectedAssessment(a);
                        markAsRead(`asmt-${a.id}`);
                      }}
                      className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-3 ${selectedAssessment?.id === a.id ? 'bg-slate-50 ring-1 ring-slate-100' : 'hover:bg-slate-50/50'}`}
                    >
                      <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <User className="h-3.5 w-3.5" />
                      </div>
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
          </div>

          {/* Right column: detail view */}
          <div className="lg:col-span-8 space-y-6">
            {selectedAssessment ? (
              <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
                <CardHeader className="px-8 pt-8 pb-4 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                      <User className="h-6 w-6" />
                    </div>
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
                    <div className="shrink-0 space-y-4 w-full md:w-auto">
                      {selectedAssessment.status === 'evaluated' ? (
                        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center w-full md:w-36">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Clinical Rating</p>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-2xl font-black text-emerald-700">{selectedAssessment.counselorRating}</span>
                            <span className="text-xs font-bold text-emerald-400">/10</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 text-center w-full md:w-36">
                          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Status</p>
                          <p className="text-xs font-black text-amber-700 uppercase">Needs Evaluation</p>
                        </div>
                      )}
                    </div>

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

                      {selectedAssessment.status === 'submitted' && (
                        <Button onClick={() => handleOpenEvaluation(selectedAssessment)} className="w-full h-14 rounded-2xl bg-primary font-black shadow-lg shadow-primary/20 gap-2">
                          <Star className="h-5 w-5 fill-current" /> Begin Clinical Evaluation
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 py-20">
                <ClipboardList className="h-16 w-16 opacity-10" />
                <p className="italic font-bold">Select a student record to begin professional analysis</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: ASSIGNED SELF-CARE PROTOCOLS (media_1789069135148.png) ──── */}
      {activeMainTab === 'protocols' && (
        <div className="space-y-8">
          
          {/* Top Banner & Header matching user's reference image */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Heart className="h-5 w-5 text-rose-500 fill-rose-50" />
              <h2 className="text-sm font-black text-slate-900 tracking-wider uppercase">
                ASSIGNED SELF-CARE PROTOCOLS
              </h2>
            </div>
            <Badge variant="outline" className="text-xs font-bold border-slate-200 text-slate-500 px-3 py-1 bg-white shadow-sm">
              {totalActiveProtocolsCount} active
            </Badge>
          </div>

          {/* Form Card: "Assign New Self-Care Tool" (Pixel-accurate to media_1789069135148.png) */}
          <div className="p-6 md:p-8 rounded-[2rem] bg-slate-50/80 border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Assign New Self-Care Tool</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Assign wellness rituals, grounding exercises, or journaling tasks to students.
              </p>
            </div>

            <form onSubmit={handleAddSelfCareTool} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    TOOL NAME
                  </Label>
                  <Input
                    placeholder="e.g. Gratitude Journaling"
                    value={toolName}
                    onChange={(e) => setToolName(e.target.value)}
                    className="h-12 bg-white rounded-xl border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-primary shadow-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      DURATION (MINUTES)
                    </Label>
                    <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                      Integer Mins
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      min="1"
                      max="180"
                      step="1"
                      placeholder="10"
                      value={toolDuration}
                      onChange={(e) => setToolDuration(e.target.value)}
                      className="h-12 bg-white rounded-xl border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-primary shadow-none pr-14"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none">
                      mins
                    </span>
                  </div>
                </div>
              </div>

              {/* Scope row: Apply to all toggle */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyToAll}
                    onChange={(e) => setApplyToAll(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20 accent-primary"
                  />
                  <span className="text-xs font-bold text-slate-800">Apply to all students (Campus-wide protocol)</span>
                </label>
              </div>

              {/* Target Students Multi-Select List (prevents backend overload) */}
              {!applyToAll && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Select Target Students
                      </span>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Select multiple students to batch assign this protocol in a single server request.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {selectedSelfCareStudentIds.length} selected
                      </span>
                      <button
                        type="button"
                        onClick={selectAllSelfCareFiltered}
                        className="text-[10px] font-black text-teal-700 hover:underline hover:text-teal-800"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={clearSelfCareStudentSelection}
                        className="text-[10px] font-black text-slate-400 hover:underline hover:text-slate-600"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Quick Search inside student selection list */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Search students by name, department, or student ID..."
                      value={selfCareStudentSearch}
                      onChange={(e) => setSelfCareStudentSearch(e.target.value)}
                      className="h-9 pl-9 text-xs bg-slate-50 rounded-xl border-slate-200 focus-visible:ring-1"
                    />
                  </div>

                  {/* Scrollable multi-student checklist */}
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200/70 bg-slate-50/40">
                    {filteredSelfCareTargetStudents.length > 0 ? (
                      filteredSelfCareTargetStudents.map((student: any) => {
                        const isSelected = selectedSelfCareStudentIds.includes(student.id);
                        return (
                          <div
                            key={student.id}
                            onClick={() => toggleSelfCareStudentSelection(student.id)}
                            className={`flex items-center justify-between p-2.5 px-3 cursor-pointer transition-colors text-xs ${
                              isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-slate-100/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by row onClick
                                className="h-4 w-4 rounded border-slate-300 text-primary accent-primary pointer-events-none"
                              />
                              <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-700 font-black text-[10px] flex items-center justify-center shrink-0">
                                {student.name?.slice(0, 2)?.toUpperCase() || 'ST'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 leading-tight">{student.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{student.department || 'General'}</p>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400 font-medium">
                        No students found matching &quot;{selfCareStudentSearch}&quot;
                      </div>
                    )}
                  </div>

                  {/* Selected student chips preview */}
                  {selectedSelfCareStudentIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedSelfCareStudentIds.slice(0, 6).map(id => {
                        const st = students.find(s => s.id === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200"
                          >
                            {st?.name || id}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelfCareStudentSelection(id);
                              }}
                              className="hover:text-red-500 font-bold ml-0.5"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                      {selectedSelfCareStudentIds.length > 6 && (
                        <span className="text-[10px] font-bold text-slate-400 px-1.5 py-0.5">
                          +{selectedSelfCareStudentIds.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Category & Action row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end pt-1">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    CATEGORY
                  </Label>
                  <Select value={toolCategory} onValueChange={(val: any) => setToolCategory(val)}>
                    <SelectTrigger className="h-12 bg-white rounded-xl border-slate-200 text-xs font-bold">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breathing" className="text-xs font-bold">Breathing</SelectItem>
                      <SelectItem value="journaling" className="text-xs font-bold">Journaling</SelectItem>
                      <SelectItem value="grounding" className="text-xs font-bold">Grounding</SelectItem>
                      <SelectItem value="meditation" className="text-xs font-bold">Meditation</SelectItem>
                      <SelectItem value="wellness" className="text-xs font-bold">Other / General Wellness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={
                    isAddingTool || 
                    !toolName.trim() || 
                    !toolDuration.trim() || 
                    parseInt(String(toolDuration), 10) <= 0 ||
                    (!applyToAll && selectedSelfCareStudentIds.length === 0)
                  }
                  className="h-12 rounded-xl bg-primary text-white font-black text-xs shadow-md shadow-primary/20 hover:opacity-90 transition-all w-full"
                >
                  {isAddingTool ? 'Assigning...' : applyToAll ? 'Add Global Tool' : `Batch Assign to ${selectedSelfCareStudentIds.length} Student${selectedSelfCareStudentIds.length === 1 ? '' : 's'}`}
                </Button>
              </div>
            </form>
          </div>

          {/* Active Protocols List Section (List / Grid View) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative group w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search active protocols..."
                    value={protocolSearch}
                    onChange={(e) => setProtocolSearch(e.target.value)}
                    className="pl-9 h-10 bg-white rounded-xl border-slate-200 text-xs shadow-none"
                  />
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {['all', 'breathing', 'journaling', 'grounding', 'meditation', 'wellness'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${
                        categoryFilter === cat
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* List vs Grid View Toggle */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSelfCareViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selfCareViewMode === 'list'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <List className="h-3.5 w-3.5" /> List
                </button>
                <button
                  type="button"
                  onClick={() => setSelfCareViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selfCareViewMode === 'grid'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Grid
                </button>
              </div>
            </div>

            {/* Protocols Display (List view by default or Grid view) */}
            {allFilteredProtocols.length > 0 ? (
              selfCareViewMode === 'list' ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                  {/* Table Header */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <div className="col-span-4">Protocol / Tool Name</div>
                    <div className="col-span-2">Category</div>
                    <div className="col-span-2">Duration</div>
                    <div className="col-span-3">Target Audience / Assigned</div>
                    <div className="col-span-1 text-right">Action</div>
                  </div>

                  {/* List Rows */}
                  {allFilteredProtocols.map((tool) => {
                    const Icon = getCategoryIcon(tool.type);
                    return (
                      <div
                        key={tool.id}
                        className="p-4 md:px-6 md:py-4 flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Tool Name & Icon */}
                        <div className="md:col-span-4 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">{tool.label}</h4>
                            <p className="text-[10px] text-slate-400 font-medium truncate">
                              {tool.isGlobal ? 'Campus-Wide Standard Protocol' : 'Student-Specific Protocol'}
                            </p>
                          </div>
                        </div>

                        {/* Category */}
                        <div className="md:col-span-2 flex items-center">
                          <Badge className="bg-slate-100 text-slate-600 border-none text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md">
                            {tool.type || 'wellness'}
                          </Badge>
                        </div>

                        {/* Duration */}
                        <div className="md:col-span-2 flex items-center">
                          <Badge className="bg-emerald-50 text-emerald-600 border-none text-[10px] font-black px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> {typeof tool.time === 'number' ? `${tool.time} min` : (tool.time || `${tool.duration || 10} min`)}
                          </Badge>
                        </div>

                        {/* Target Audience */}
                        <div className="md:col-span-3 flex items-center">
                          <span className={`text-[11px] font-bold inline-flex items-center gap-1.5 ${
                            tool.isGlobal 
                              ? 'text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100' 
                              : 'text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100'
                          }`}>
                            {tool.isGlobal ? (
                              <>📢 All Students (Campus-wide)</>
                            ) : (
                              <span className="truncate max-w-[200px]" title={tool.studentName}>
                                👤 {tool.studentName || 'Single Student'}
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Action */}
                        <div className="md:col-span-1 flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (tool.isGlobal) {
                                handleDeleteGlobalProtocol(tool.id, tool.label);
                              } else {
                                handleDeleteStudentProtocol(tool.studentId, tool.id, tool.label);
                              }
                            }}
                            className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Remove Protocol"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allFilteredProtocols.map((tool) => {
                    const Icon = getCategoryIcon(tool.type);
                    return (
                      <Card key={tool.id} className="border border-slate-200/70 shadow-sm bg-white rounded-2xl p-5 relative group hover:border-primary/30 transition-all">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-slate-100 text-slate-600 border-none text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                              {tool.type || 'wellness'}
                            </Badge>
                            <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" /> {typeof tool.time === 'number' ? `${tool.time} min` : (tool.time || `${tool.duration || 10} min`)}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">{tool.label}</h4>
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-3">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${
                              tool.isGlobal ? 'text-primary' : 'text-indigo-600'
                            }`}>
                              {tool.isGlobal ? '📢 All Students' : `👤 ${tool.studentName || 'Single Student'}`}
                            </span>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (tool.isGlobal) {
                                  handleDeleteGlobalProtocol(tool.id, tool.label);
                                } else {
                                  handleDeleteStudentProtocol(tool.studentId, tool.id, tool.label);
                                }
                              }}
                              className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg ml-auto opacity-70 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 space-y-2">
                <Heart className="h-10 w-10 text-slate-300 mx-auto opacity-50" />
                <p className="text-xs text-slate-400 italic font-bold">
                  No custom self-care tools assigned yet.
                </p>
                <p className="text-[11px] text-slate-400">
                  Use the form above to assign wellness protocols to students.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evaluation Dialog */}
      <Dialog open={isEvalOpen} onOpenChange={setIsEvalOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="p-8 bg-slate-50 border-b flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                <User className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-900">Clinical Evaluation</DialogTitle>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedAssessment?.studentName}</p>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-8 flex-1 overflow-y-auto">
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
          </div>
          <div className="p-8 pt-4 bg-white border-t flex gap-3 flex-shrink-0">
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
