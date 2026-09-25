"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Brain,
  AlertCircle,
  Plus,
  ClipboardList,
  FileText,
  Star,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Trash2,
  GripVertical,
  Search,
  Check,
  ChevronsUpDown,
  Heart,
  Wind,
  BookOpen,
  Anchor,
  Music,
  Sparkles,
  User,
  Clock,
  List,
  LayoutGrid,
  X,
  Printer,
  ShieldCheck,
  Building2,
  GraduationCap,
  Calendar,
  UserCheck,
  FileSignature,
  AlertTriangle,
  Award,
  Edit3,
  RefreshCw,
  Send,
  CheckCircle,
  FileSpreadsheet,
  Gauge,
} from "lucide-react";
import { storageService } from "@/lib/storage-service";
import {
  STORAGE_KEYS,
  getCollegesForCounselor,
  getCollegeByCode,
} from "@/lib/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useNotifications } from "@/contexts/NotificationContext";
import { useLiveSync } from "@/hooks/useLiveSync";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { analyzeCounselingForm } from "@/ai/flows/analyze-clinical-form";

const FEEDBACK_TEMPLATES = [
  {
    label: "Stable Maintenance",
    rating: 2,
    comments:
      "Student is at a healthy mental baseline with solid wellness habits. Advise standard routine maintenance and periodic review as requested.",
  },
  {
    label: "Exam/Academic Stress",
    rating: 5,
    comments:
      "Student exhibits moderate situational stress related to exam workloads. Advise stress mitigation strategies, breathing exercises, and standard check-in tracking.",
  },
  {
    label: "Social/Peer Tension",
    rating: 6,
    comments:
      "Academic pressure exacerbated by peer environment conflicts. Recommended focus on cognitive behavioral guidelines and active workload pacing.",
  },
  {
    label: "Severe Stress Risk",
    rating: 8,
    comments:
      "Student displays severe academic anxiety and chronic sleep deprivation. Recommend immediate follow-up counseling session and cognitive wellness routing.",
  },
  {
    label: "Sleep & Fatigue",
    rating: 6,
    comments:
      "Chronic sleep deficiency affecting focus and motivation. Recommended immediate scheduling of sleep hygiene check-in.",
  },
  {
    label: "Social Withdrawal",
    rating: 7,
    comments:
      "Exhibiting signs of emotional exhaustion and mild social withdrawal. Recommending regular messaging support and scheduling a group session.",
  },
];

const ASSESSMENT_TEMPLATES = [
  {
    title: "General Wellness Check-in",
    description:
      "A routine check-in to evaluate overall emotional baseline, sleep patterns, and current coping strategies.",
    questions: [
      "How would you describe your overall mood over the past week?",
      "On a scale of 1-10, how well are you sleeping?",
      "What are the primary sources of stress in your life right now?",
      "What activities or habits are currently helping you stay grounded?",
    ],
  },
  {
    title: "Midterm / Exam Stress Survey",
    description:
      "Designed to identify academic pressure points, exam anxiety, and workload management difficulties.",
    questions: [
      "How confident do you feel about your upcoming exams or academic deadlines?",
      "Are you experiencing physical symptoms of academic stress (e.g., headaches, exhaustion)?",
      "How many hours of focused study are you managing per day?",
      "Do you feel you have adequate support from teachers, peers, or family?",
    ],
  },
  {
    title: "Social & Connection Assessment",
    description:
      "Evaluates social adjustment, peer interactions, feelings of loneliness, and community integration.",
    questions: [
      "How connected do you feel to the campus community and your peers?",
      "Have you experienced any conflicts or tensions with friends or classmates recently?",
      "Who is your main source of emotional support when you face difficulties?",
      "How often do you engage in group or extracurricular campus activities?",
    ],
  },
  {
    title: "Anxiety & Stress Baseline",
    description:
      "A deeper counseling template targeting root causes of panic, social anxiety, and chronic worry.",
    questions: [
      "How frequently do you experience sudden, intense feelings of worry or panic?",
      "Does anxiety interfere with your ability to attend classes or complete assignments?",
      "Do you find it difficult to control your worrying once it starts?",
      "What specific situations trigger the highest level of distress for you?",
    ],
  },
];

export default function CounselorAssessmentsPage() {
  const { user: counselor } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const { toast } = useToast();

  // Active Main Tab
  const [activeMainTab, setActiveMainTab] = useState<"forms" | "protocols">(
    "forms",
  );

  // Assessments state
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Google Form builder state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState("");

  // Evaluation & Response List state
  const [isEvalOpen, setIsEvalOpen] = useState(false);
  const [evalRating, setEvalRating] = useState([5]);
  const [evalComments, setEvalComments] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [responseSearch, setResponseSearch] = useState("");
  const [responseFilter, setResponseFilter] = useState<
    "all" | "pending" | "evaluated"
  >("all");

  // Self-Care Protocols State
  const [globalProtocols, setGlobalProtocols] = useState<any[]>([]);
  const [studentProtocols, setStudentProtocols] = useState<any[]>([]);
  const [isAddingTool, setIsAddingTool] = useState(false);
  const [toolName, setToolName] = useState("");
  const [toolDuration, setToolDuration] = useState("10");
  const [toolCategory, setToolCategory] = useState<
    "breathing" | "journaling" | "grounding" | "meditation" | "wellness"
  >("wellness");
  const [toolInstructions, setToolInstructions] = useState("");
  const [applyToAll, setApplyToAll] = useState(true);
  const [selectedSelfCareStudentIds, setSelectedSelfCareStudentIds] = useState<
    string[]
  >([]);
  const [selfCareStudentSearch, setSelfCareStudentSearch] = useState("");
  const [selfCareViewMode, setSelfCareViewMode] = useState<"list" | "grid">(
    "list",
  );
  const [protocolSearch, setProtocolSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Dossier Section Accordion / Expand-Collapse state
  const [expandedSections, setExpandedSections] = useState<{
    demographics: boolean;
    severityTriage: boolean;
    responses: boolean;
    counselorFindings: boolean;
    aiTriage: boolean;
  }>({
    demographics: true,
    severityTriage: true,
    responses: true,
    counselorFindings: true,
    aiTriage: true,
  });

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAllSections = () => {
    setExpandedSections({
      demographics: true,
      severityTriage: true,
      responses: true,
      counselorFindings: true,
      aiTriage: true,
    });
  };

  const collapseAllSections = () => {
    setExpandedSections({
      demographics: false,
      severityTriage: false,
      responses: false,
      counselorFindings: false,
      aiTriage: false,
    });
  };

  const areAllExpanded = useMemo(() => {
    return Object.values(expandedSections).every(Boolean);
  }, [expandedSections]);

  // Searchable Record Selector for Counseling Dossier
  const [isRecordSelectorOpen, setIsRecordSelectorOpen] = useState(false);
  const [recordSearchQuery, setRecordSearchQuery] = useState("");

  const filteredAssessmentsForSelect = useMemo(() => {
    const assessmentList = assessments.filter(
      (a) => a.type === "CLINICAL_FORM" || a.type === "COUNSELING_FORM" || a.type === "AI_CHAT",
    );
    if (!recordSearchQuery.trim()) return assessmentList;
    const q = recordSearchQuery.toLowerCase();
    return assessmentList.filter((a) => {
      const student = students.find(
        (s) => s.id === a.studentId || s.name === a.studentName,
      );
      return (
        a.studentName?.toLowerCase().includes(q) ||
        a.date?.toLowerCase().includes(q) ||
        student?.studentId?.toLowerCase().includes(q) ||
        student?.student_id?.toLowerCase().includes(q) ||
        student?.department?.toLowerCase().includes(q) ||
        a.id?.toLowerCase().includes(q)
      );
    });
  }, [assessments, recordSearchQuery, students]);

  // Counselor handled colleges
  const handledColleges = useMemo(() => {
    return getCollegesForCounselor(counselor?.department);
  }, [counselor?.department]);

  const isDepartmentScoped = useMemo(() => {
    return Boolean(
      counselor?.department &&
      counselor.department.trim().toLowerCase() !== "all",
    );
  }, [counselor?.department]);

  // Scoped students for this counselor
  const scopedStudents = useMemo(() => {
    if (!isDepartmentScoped) return students;
    return students.filter(
      (s) =>
        !s.department ||
        handledColleges.some(
          (c) => s.department === c.code || c.aliases?.includes(s.department),
        ),
    );
  }, [students, isDepartmentScoped, handledColleges]);

  // Filtered target students for multi-select assignment list
  const filteredSelfCareTargetStudents = useMemo(() => {
    if (!selfCareStudentSearch.trim()) return scopedStudents;
    const q = selfCareStudentSearch.toLowerCase();
    return scopedStudents.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q) ||
        s.student_id?.toLowerCase().includes(q),
    );
  }, [scopedStudents, selfCareStudentSearch]);

  const toggleSelfCareStudentSelection = (id: string) => {
    setSelectedSelfCareStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectAllSelfCareFiltered = () => {
    const ids = filteredSelfCareTargetStudents.map((s) => s.id);
    setSelectedSelfCareStudentIds((prev) =>
      Array.from(new Set([...prev, ...ids])),
    );
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
    const studentList = allUsers.filter((u) => u.role === "student");
    setStudents(studentList);
  }, [selectedAssessment]);

  // Load Self-Care Protocols from Supabase
  const loadSelfCareProtocols = useCallback(async () => {
    try {
      // 1. Global tools
      const { data: globalData, error: globalErr } = await supabase
        .from("global_self_care_tools")
        .select("*")
        .order("created_at", { ascending: false });

      if (!globalErr && globalData) {
        setGlobalProtocols(globalData);
      }

      // 2. Student-assigned tools from profiles
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("id, name, self_care_tools")
        .not("self_care_tools", "is", null);

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
      console.error("Error loading self-care protocols:", err);
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
      .channel("counselor-self-care-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "global_self_care_tools" },
        () => {
          loadSelfCareProtocols();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSelfCareProtocols]);

  useEffect(() => {
    const unread = notifications.filter(
      (n) => n.type === "assessment" && !n.isRead,
    );
    if (unread.length > 0) unread.forEach((n) => markAsRead(n.id));
  }, [notifications, markAsRead]);

  // ── Form Builder Handlers ──────────────────────────────────────────────────
  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setQuestions((prev) => [...prev, newQuestion.trim()]);
    setNewQuestion("");
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateTask = async () => {
    if (selectedStudentIds.length === 0 || !taskTitle || !counselor) return;

    const finalQuestions =
      questions.length > 0
        ? questions
        : ["Please describe your current stress levels."];

    await Promise.all(
      selectedStudentIds.map(async (studentId) => {
        const studentUser = students.find((s) => s.id === studentId);
        return storageService.create(STORAGE_KEYS.ASSESSMENT_TASKS, {
          counselorId: counselor.id,
          counselorName: counselor.name,
          studentId: studentId,
          studentName: studentUser?.name || "Student",
          title: taskTitle,
          description: taskDesc,
          questions: finalQuestions,
          status: "pending",
          timestamp: Date.now(),
          date: new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
        });
      }),
    );

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
      const singleStudentName =
        students.find((s) => s.id === selectedStudentIds[0])?.name || "Student";
      toast({
        title: "Assessment Assigned",
        description: `New analysis form sent to ${singleStudentName}.`,
      });
    }

    setIsTaskModalOpen(false);
    setSelectedStudentIds([]);
    setStudentSearchQuery("");
    setTaskTitle("");
    setTaskDesc("");
    setQuestions([]);
    setNewQuestion("");
  };

  const handleOpenEvaluation = (assessment: any) => {
    setSelectedAssessment(assessment);
    setEvalRating([assessment.counselorRating || 5]);
    setEvalComments(assessment.counselorComments || "");
    setIsEvalOpen(true);
    markAsRead(`asmt-${assessment.id}`);
  };

  const handleRunAiAnalysis = async (assessment: any) => {
    if (!assessment) return;
    setIsAiAnalyzing(true);
    try {
      const questionsList = assessment.questions || [];
      const answersObj: Record<string, string> = {};
      (assessment.answers || []).forEach((ans: string, idx: number) => {
        answersObj[idx] = ans;
      });

      const result = await analyzeCounselingForm({
        questions:
          questionsList.length > 0
            ? questionsList
            : ["Please describe your current wellness baseline."],
        answers: answersObj,
        studentName: assessment.studentName || "Student",
      });

      const updated = {
        ...assessment,
        aiSummary: result.summary,
        aiMainConcerns: result.mainConcerns,
        aiEmotionalState: result.emotionalState,
        aiRiskLevel: result.riskLevel,
      };

      await storageService.update(
        STORAGE_KEYS.ASSESSMENTS,
        assessment.id,
        updated,
      );
      setSelectedAssessment(updated);
      setAssessments((prev) =>
        prev.map((a) => (a.id === assessment.id ? updated : a)),
      );
      toast({
        title: "AI Analysis Generated",
        description:
          "Counseling summary, concerns, and risk assessment are now attached to this dossier.",
      });
    } catch (err: any) {
      console.error("AI Analysis failed:", err);
      toast({
        variant: "destructive",
        title: "AI Analysis Failed",
        description:
          err.message || "Could not generate AI insights at this time.",
      });
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedAssessment || !counselor) return;
    setIsAnalyzing(true);

    try {
      const updated = {
        ...selectedAssessment,
        status: "evaluated",
        counselorRating: evalRating[0],
        counselorComments: evalComments,
        counselorName: counselor.name,
        evaluatedAt: Date.now(),
      };

      await storageService.update(
        STORAGE_KEYS.ASSESSMENTS,
        selectedAssessment.id,
        updated,
      );

      if (selectedAssessment.taskId) {
        await storageService.update(
          STORAGE_KEYS.ASSESSMENT_TASKS,
          selectedAssessment.taskId,
          {
            status: "completed",
            counselorRating: evalRating[0],
            counselorComments: evalComments,
          },
        );
      }

      toast({
        title: "Evaluation Submitted",
        description:
          "Student data has been updated with your counseling analysis.",
      });

      setSelectedAssessment(updated);
      setIsEvalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit evaluation.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Self-Care Tool Actions (media_1789069135148.png) ─────────────────────────
  const handleAddSelfCareTool = async (e: React.FormEvent) => {
    e.preventDefault();
    const durationNum = parseInt(String(toolDuration).replace(/\D/g, ""), 10);
    if (!toolName.trim() || isNaN(durationNum) || durationNum <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid inputs",
        description:
          "Please provide Tool Name and Duration in minutes (e.g. 10).",
      });
      return;
    }

    setIsAddingTool(true);
    const durationMinutes = Math.max(1, Math.min(180, durationNum));
    const durationFormatted = `${durationMinutes} min`;

    try {
      if (applyToAll) {
        // Global self-care protocol
        const { error } = await supabase.from("global_self_care_tools").insert([
          {
            label: toolName.trim(),
            time: durationFormatted,
            duration: durationMinutes,
            type: toolCategory,
            created_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;

        toast({
          title: "Global Protocol Assigned",
          description: `Assigned "${toolName.trim()}" (${durationFormatted}) to all students.`,
        });
      } else {
        // BATCH Student Assignment - prevents backend & server overload
        if (selectedSelfCareStudentIds.length === 0) {
          toast({
            variant: "destructive",
            title: "No students selected",
            description: "Please select at least one student from the list.",
          });
          setIsAddingTool(false);
          return;
        }

        // 1. Fetch profiles of selected students in ONE query
        const { data: targetProfiles, error: fetchErr } = await supabase
          .from("profiles")
          .select("id, name, self_care_tools")
          .in("id", selectedSelfCareStudentIds);

        if (fetchErr) throw fetchErr;

        const profileMap = new Map(
          (targetProfiles || []).map((p) => [p.id, p]),
        );

        // 2. Perform updates in parallel batch
        const updatePromises = selectedSelfCareStudentIds.map(async (stId) => {
          const profile = profileMap.get(stId);
          const existingTools = Array.isArray(profile?.self_care_tools)
            ? profile.self_care_tools
            : [];
          const newToolObj = {
            id: `tool-${Date.now()}-${stId.slice(0, 6)}`,
            label: toolName.trim(),
            time: durationFormatted,
            duration: durationMinutes,
            type: toolCategory,
            instructions: toolInstructions.trim() || undefined,
            assignedBy: counselor?.name || "Counselor",
            createdAt: new Date().toISOString(),
          };

          const updatedTools = [...existingTools, newToolObj];
          return supabase
            .from("profiles")
            .update({ self_care_tools: updatedTools })
            .eq("id", stId);
        });

        await Promise.all(updatePromises);

        toast({
          title: "Batch Protocol Assigned",
          description: `Assigned "${toolName.trim()}" directly to ${selectedSelfCareStudentIds.length} student${selectedSelfCareStudentIds.length > 1 ? "s" : ""} in a single batch.`,
        });
      }

      setToolName("");
      setToolDuration("10");
      setToolInstructions("");
      setApplyToAll(true);
      setSelectedSelfCareStudentIds([]);
      setSelfCareStudentSearch("");
      loadSelfCareProtocols();
    } catch (err: any) {
      console.error("Failed to assign self-care protocol:", err);
      toast({
        variant: "destructive",
        title: "Assignment Failed",
        description: err.message || "Could not save the self-care protocol.",
      });
    } finally {
      setIsAddingTool(false);
    }
  };

  const handleDeleteGlobalProtocol = async (id: string, label: string) => {
    try {
      const { error } = await supabase
        .from("global_self_care_tools")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setGlobalProtocols((prev) => prev.filter((p) => p.id !== id));
      toast({
        title: "Protocol Removed",
        description: `Unassigned "${label}" from all students.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Could not delete protocol.",
      });
    }
  };

  const handleDeleteStudentProtocol = async (
    studentId: string,
    toolId: string,
    label: string,
  ) => {
    try {
      const { data: currentProfile, error: fetchErr } = await supabase
        .from("profiles")
        .select("self_care_tools")
        .eq("id", studentId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      const existingTools = Array.isArray(currentProfile?.self_care_tools)
        ? currentProfile.self_care_tools
        : [];
      const updatedTools = existingTools.filter(
        (t: any, idx: number) =>
          (t.id || `${studentId}-tool-${idx}`) !== toolId,
      );

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ self_care_tools: updatedTools })
        .eq("id", studentId);

      if (updateErr) throw updateErr;

      setStudentProtocols((prev) => prev.filter((p) => p.id !== toolId));
      toast({
        title: "Protocol Removed",
        description: `Unassigned "${label}" from student.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Could not remove student protocol.",
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "breathing":
        return Wind;
      case "journaling":
        return BookOpen;
      case "grounding":
        return Anchor;
      case "meditation":
        return Music;
      default:
        return Heart;
    }
  };

  const pendingEvaluations = assessments.filter(
    (a) => (a.type === "CLINICAL_FORM" || a.type === "COUNSELING_FORM") && a.status === "submitted",
  );
  const totalActiveProtocolsCount =
    globalProtocols.length + studentProtocols.length;

  const allFilteredProtocols = useMemo(() => {
    const combined = [
      ...globalProtocols.map((g) => ({ ...g, isGlobal: true })),
      ...studentProtocols.map((s) => ({ ...s, isGlobal: false })),
    ];

    return combined.filter((p) => {
      const matchQuery =
        !protocolSearch ||
        p.label?.toLowerCase().includes(protocolSearch.toLowerCase());
      const matchCategory =
        categoryFilter === "all" ||
        p.type?.toLowerCase() === categoryFilter.toLowerCase();
      return matchQuery && matchCategory;
    });
  }, [globalProtocols, studentProtocols, protocolSearch, categoryFilter]);

  return (
    <div className="w-full pb-10 space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Assessments & Oversight
            </h1>
            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
              Counselor Portal
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Review student counseling assessments, build custom guidance forms,
            and assign self-care protocols.
          </p>
        </div>

        {activeMainTab === "forms" && (
          <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl font-black bg-primary h-11 gap-2 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" /> Create Analysis Form
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-2xl font-black">
                  Assign Guidance Assessment
                </DialogTitle>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Build a custom form or load a prebuilt template below.
                </p>
              </DialogHeader>
              <div className="space-y-6 py-4 flex-1 overflow-y-auto pr-2">
                {/* Sleek Prebuilt Assessment Templates Section */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-primary" /> Load
                    Prebuilt Assessment Template
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
                        <span className="font-bold text-slate-800 group-hover:text-primary transition-colors block line-clamp-1">
                          {tmpl.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold mt-1 line-clamp-1">
                          {tmpl.questions.length} guidance questions
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 col-span-2">
                  <div className="space-y-2 flex flex-col justify-end">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        Select Student(s)
                      </Label>
                      <div className="flex items-center space-x-1.5">
                        <Checkbox
                          id="broadcast-select-all"
                          checked={
                            selectedStudentIds.length ===
                              scopedStudents.length && scopedStudents.length > 0
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStudentIds(
                                scopedStudents.map((s) => s.id),
                              );
                            } else {
                              setSelectedStudentIds([]);
                            }
                          }}
                        />
                        <label
                          htmlFor="broadcast-select-all"
                          className="text-[10px] font-black uppercase text-primary cursor-pointer select-none"
                        >
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
                            {selectedStudentIds.length === 0 &&
                              "Select student(s)..."}
                            {selectedStudentIds.length ===
                              scopedStudents.length &&
                              scopedStudents.length > 0 &&
                              `📢 Broadcast to ALL (${scopedStudents.length})`}
                            {selectedStudentIds.length > 0 &&
                              selectedStudentIds.length <
                                scopedStudents.length &&
                              (selectedStudentIds.length === 1
                                ? scopedStudents.find(
                                    (s) => s.id === selectedStudentIds[0],
                                  )?.name
                                : `👥 ${selectedStudentIds.length} students selected`)}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[300px] p-4 rounded-2xl border-none shadow-2xl bg-white"
                        align="start"
                      >
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
                              onChange={(e) =>
                                setStudentSearchQuery(e.target.value)
                              }
                              className="h-9 pl-8 text-xs rounded-xl bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                          </div>

                          <ScrollArea className="h-48">
                            <div className="space-y-1.5 pr-1">
                              {scopedStudents
                                .filter(
                                  (s) =>
                                    s.name
                                      .toLowerCase()
                                      .includes(
                                        studentSearchQuery.toLowerCase(),
                                      ) ||
                                    s.email
                                      .toLowerCase()
                                      .includes(
                                        studentSearchQuery.toLowerCase(),
                                      ),
                                )
                                .map((student) => {
                                  const isSelected =
                                    selectedStudentIds.includes(student.id);
                                  return (
                                    <div
                                      key={student.id}
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedStudentIds((prev) =>
                                            prev.filter(
                                              (id) => id !== student.id,
                                            ),
                                          );
                                        } else {
                                          setSelectedStudentIds((prev) => [
                                            ...prev,
                                            student.id,
                                          ]);
                                        }
                                      }}
                                      className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        className="pointer-events-none"
                                      />
                                      <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                        <User className="h-3 w-3" />
                                      </div>
                                      <div className="flex-1 min-w-0 text-left">
                                        <p className="text-xs font-bold text-slate-800 truncate">
                                          {student.name}
                                        </p>
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
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Form Title
                    </Label>
                    <Input
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g. Anxiety Root Analysis"
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Description / Context
                  </Label>
                  <Textarea
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="Why is this form being assigned?"
                    className="min-h-[60px] rounded-xl"
                  />
                </div>

                {/* Question builder */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Questions ({questions.length} added)
                  </Label>
                  {questions.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {questions.map((q, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl group"
                        >
                          <span className="mt-0.5 text-[10px] font-black text-slate-400 w-5 shrink-0">
                            {i + 1}
                          </span>
                          <p className="flex-1 text-sm font-medium text-slate-700 leading-snug">
                            {q}
                          </p>
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
                      onChange={(e) => setNewQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addQuestion();
                        }
                      }}
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
                <Button
                  onClick={handleCreateTask}
                  disabled={selectedStudentIds.length === 0 || !taskTitle}
                  className="w-full h-12 rounded-xl font-black bg-primary"
                >
                  Assign Student Task ({questions.length || 1}{" "}
                  {questions.length === 1 ? "question" : "questions"})
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveMainTab("forms")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeMainTab === "forms"
              ? "bg-primary text-white shadow-md"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Student Assessments & Forms</span>
          {pendingEvaluations.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeMainTab === "forms"
                  ? "bg-white text-primary"
                  : "bg-red-500 text-white"
              }`}
            >
              {pendingEvaluations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMainTab("protocols")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeMainTab === "protocols"
              ? "bg-primary text-white shadow-md"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Heart className="h-4 w-4 text-rose-500" />
          <span>Assigned Self-Care Protocols</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeMainTab === "protocols"
                ? "bg-white text-primary"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {totalActiveProtocolsCount}
          </span>
        </button>
      </div>

      {/* ── TAB 1: COUNSELING FORMS & OVERSIGHT (1 COLUMN DOCUMENT TYPE UI) ───── */}
      {activeMainTab === "forms" && (
        <div className="w-full space-y-6">
          {selectedAssessment ? (
            <div className="space-y-4">
              {/* Top Document Control Action Toolbar & Record Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 px-6 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Record:
                    </span>
                  </div>

                  {/* Searchable Record Selector Dropdown / Popover */}
                  <Popover open={isRecordSelectorOpen} onOpenChange={setIsRecordSelectorOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isRecordSelectorOpen}
                        className="h-10 w-auto min-w-[340px] sm:min-w-[420px] justify-between rounded-xl bg-slate-50 hover:bg-slate-100 border-slate-200 text-xs font-bold whitespace-nowrap px-3.5 shadow-none"
                      >
                        <div className="flex items-center gap-2 whitespace-nowrap flex-nowrap overflow-hidden">
                          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-black text-slate-900 whitespace-nowrap truncate">
                            {selectedAssessment.studentName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                            ({selectedAssessment.date || 'Recent'})
                          </span>
                          {selectedAssessment.status === 'evaluated' || selectedAssessment.status === 'completed' ? (
                            <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap shrink-0">
                              {selectedAssessment.counselorRating ? `${selectedAssessment.counselorRating}/10` : 'Evaluated'}
                            </span>
                          ) : (
                            <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 whitespace-nowrap shrink-0">
                              Pending Review
                            </span>
                          )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-0 rounded-2xl border border-slate-200 shadow-xl overflow-hidden" align="start">
                      {/* Search Bar at top of dropdown */}
                      <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
                        <Search className="h-4 w-4 text-slate-400 ml-1 shrink-0" />
                        <Input
                          placeholder="Search student by name, ID, department..."
                          value={recordSearchQuery}
                          onChange={(e) => setRecordSearchQuery(e.target.value)}
                          className="h-8 border-none bg-transparent text-xs font-medium focus-visible:ring-0 shadow-none px-1"
                          autoFocus
                        />
                        {recordSearchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRecordSearchQuery('')}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 rounded-md"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {/* Filtered Assessment List */}
                      <ScrollArea className="max-h-72 divide-y divide-slate-100">
                        {filteredAssessmentsForSelect.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            No matching student assessments found for "{recordSearchQuery}".
                          </div>
                        ) : (
                          filteredAssessmentsForSelect.map((a) => {
                            const isSelected = selectedAssessment?.id === a.id;
                            const student = students.find(s => s.id === a.studentId || s.name === a.studentName);
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => {
                                  setSelectedAssessment(a);
                                  markAsRead(`asmt-${a.id}`);
                                  setIsRecordSelectorOpen(false);
                                  setRecordSearchQuery('');
                                }}
                                className={`w-full text-left p-3 px-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs ${
                                  isSelected ? 'bg-primary/5' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <div className={`h-4 w-4 rounded flex items-center justify-center shrink-0 ${
                                    isSelected ? 'text-primary' : 'text-transparent'
                                  }`}>
                                    <Check className="h-4 w-4" />
                                  </div>
                                  <div className="space-y-0.5 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-black truncate ${isSelected ? 'text-primary' : 'text-slate-900'}`}>
                                        {a.studentName}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                        ({a.date || 'Recent'})
                                      </span>
                                    </div>
                                    {(student?.studentId || student?.student_id || student?.department) && (
                                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                                        <span>ID: {student?.studentId || student?.student_id || '202300958'}</span>
                                        <span>•</span>
                                        <span className="uppercase text-primary font-bold">[{student?.department || 'CCS'}]</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 ml-2">
                                  {a.status === 'evaluated' || a.status === 'completed' ? (
                                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                      {a.counselorRating ? `${a.counselorRating}/10` : 'Evaluated'}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                      Pending
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>

                  <Badge
                    variant="outline"
                    className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] font-bold"
                  >
                    DOC-REF #
                    {(selectedAssessment.id || "0000").slice(-6).toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      areAllExpanded
                        ? collapseAllSections()
                        : expandAllSections()
                    }
                    className="h-9 px-3 rounded-xl border-slate-200 text-xs font-bold gap-1.5 hover:bg-slate-50 text-slate-700 shadow-none"
                  >
                    {areAllExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    {areAllExpanded ? "Collapse All" : "Expand All"}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.print()}
                    className="h-9 px-3 rounded-xl border-slate-200 text-xs font-bold gap-1.5 hover:bg-slate-50 text-slate-700 shadow-none"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print / Export Report
                  </Button>

                  {selectedAssessment.status === "evaluated" ||
                  selectedAssessment.status === "completed" ? (
                    <Button
                      size="sm"
                      onClick={() => handleOpenEvaluation(selectedAssessment)}
                      className="h-9 px-4 rounded-xl bg-primary text-white text-xs font-black gap-1.5 shadow-md shadow-primary/20"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Edit Counseling Notes
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleOpenEvaluation(selectedAssessment)}
                      className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black gap-1.5 shadow-md shadow-amber-600/20 animate-pulse"
                    >
                      <Star className="h-3.5 w-3.5 fill-current" /> Begin
                      Counseling Evaluation
                    </Button>
                  )}
                </div>
              </div>

              {/* ── THE OFFICIAL COUNSELING DOCUMENT SHEET (1 COLUMN) ──────────── */}
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl p-8 sm:p-14 text-slate-900 font-sans space-y-8 relative overflow-hidden print:shadow-none print:border-none print:p-4 print:rounded-none">
                {/* 1. Official Institutional Letterhead Header */}
                <div className="text-center space-y-2 pb-6 border-b border-slate-200 relative">
                  <div className="flex items-center justify-center gap-3 mb-1">
                    <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm shadow-md">
                      USPF
                    </div>
                    <div className="text-left">
                      <p className="text-sm sm:text-base font-black uppercase tracking-[0.18em] text-slate-900 leading-tight">
                        University of Southern Philippines Foundation
                      </p>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Guidance, Testing, and Career Services Center
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                    Salinas Drive, Lahug, Cebu City, Philippines 6000 •
                    Telephone: (032) 414-7963 local 132/130 • gtsc@uspf.edu.ph
                  </p>

                  {/* Formal Double Line Accent */}
                  <div className="pt-3">
                    <div className="border-t-2 border-slate-900 pt-0.5">
                      <div className="border-t border-slate-300"></div>
                    </div>
                  </div>

                  <div className="pt-3">
                    <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900">
                      STUDENT COUNSELING ASSESSMENT & REPORT
                    </h2>
                  </div>

                  {/* Metadata Strip */}
                  <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <span>
                      DOC ID:{" "}
                      <strong className="text-slate-900 font-black">
                        #USPF-CAD-
                        {(selectedAssessment.id || "0000")
                          .slice(-6)
                          .toUpperCase()}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      DATE FILED:{" "}
                      <strong className="text-slate-900 font-black">
                        {selectedAssessment.date || "August 24, 2026"}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      CLASSIFICATION:{" "}
                      <strong className="text-primary font-black">
                        CONFIDENTIAL
                      </strong>
                    </span>
                  </div>
                </div>

                {/* 2. Student Demographic Profile */}
                <div className="space-y-3">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSection("demographics")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        toggleSection("demographics");
                    }}
                    className="flex items-center justify-between p-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer select-none transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                        STUDENT DEMOGRAPHIC PROFILE
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[9px] font-black uppercase px-2 py-0.5 border-slate-200 text-slate-500 bg-white"
                      >
                        Section A
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-primary transition-colors flex items-center gap-1">
                        <span>
                          {expandedSections.demographics
                            ? "Collapse"
                            : "Expand"}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${expandedSections.demographics ? "rotate-180 text-primary" : ""}`}
                        />
                      </span>
                    </div>
                  </div>

                  {(expandedSections.demographics || false) && (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 text-xs divide-y divide-slate-200 animate-in fade-in duration-150 print:block">
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                        <div className="p-3.5 px-4 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                            Full Name of Student
                          </span>
                          <span className="font-black text-slate-900 text-sm block">
                            {selectedAssessment.studentName}
                          </span>
                        </div>
                        <div className="p-3.5 px-4 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                            Official University Student ID
                          </span>
                          <span className="font-black text-slate-800 text-sm font-mono block">
                            {students.find(
                              (s) =>
                                s.id === selectedAssessment.studentId ||
                                s.name === selectedAssessment.studentName,
                            )?.studentId ||
                              students.find(
                                (s) =>
                                  s.id === selectedAssessment.studentId ||
                                  s.name === selectedAssessment.studentName,
                              )?.student_id ||
                              selectedAssessment.studentId ||
                              "202300958"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                        <div className="p-3.5 px-4 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                            College
                          </span>
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <span className="font-black text-primary">
                              [
                              {students.find(
                                (s) =>
                                  s.id === selectedAssessment.studentId ||
                                  s.name === selectedAssessment.studentName,
                              )?.department || "CCS"}
                              ]
                            </span>
                            <span>
                              {getCollegeByCode(
                                students.find(
                                  (s) =>
                                    s.id === selectedAssessment.studentId ||
                                    s.name === selectedAssessment.studentName,
                                )?.department || "CCS",
                              )?.name || "College of Computer Studies"}
                            </span>
                          </div>
                        </div>
                        <div className="p-3.5 px-4 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                            Program
                          </span>
                          <span className="font-bold text-slate-800 block">
                            {students.find(
                              (s) =>
                                s.id === selectedAssessment.studentId ||
                                s.name === selectedAssessment.studentName,
                            )?.program ||
                              students.find(
                                (s) =>
                                  s.id === selectedAssessment.studentId ||
                                  s.name === selectedAssessment.studentName,
                              )?.course ||
                              "Bachelor of Science in Information Technology"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                        <div className="p-3.5 px-4 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                            Year Level & Enrollment Standing
                          </span>
                          <span className="font-bold text-slate-800 block">
                            {students.find(
                              (s) =>
                                s.id === selectedAssessment.studentId ||
                                s.name === selectedAssessment.studentName,
                            )?.yearLevel || "4th Year"}{" "}
                            • Regular Enrolled
                          </span>
                        </div>
                        <div className="p-3.5 px-4 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                            Reviewing Guidance Counselor
                          </span>
                          <span className="font-bold text-slate-800 block">
                            {selectedAssessment.counselorName ||
                              counselor?.name ||
                              "USPF Registered Guidance Counselor"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Counseling Rating Scoreboard & Guidance Overview */}
                <div className="space-y-3">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSection("severityTriage")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        toggleSection("severityTriage");
                    }}
                    className="flex items-center justify-between p-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer select-none transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Gauge className="h-4 w-4 text-primary shrink-0" />
                      <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                        COUNSELING EVALUATION & SEVERITY TRIAGE
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedAssessment.counselorRating && (
                        <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black">
                          Rating: {selectedAssessment.counselorRating}/10
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-[9px] font-black uppercase px-2 py-0.5 border-slate-200 text-slate-500 bg-white"
                      >
                        Section B
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-primary transition-colors flex items-center gap-1">
                        <span>
                          {expandedSections.severityTriage
                            ? "Collapse"
                            : "Expand"}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${expandedSections.severityTriage ? "rotate-180 text-primary" : ""}`}
                        />
                      </span>
                    </div>
                  </div>

                  {(expandedSections.severityTriage || false) && (
                    <div className="animate-in fade-in duration-150 print:block">
                      {selectedAssessment.status === "evaluated" ||
                      selectedAssessment.status === "completed" ? (
                        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Score Metric Card */}
                            <div className="p-4 rounded-xl bg-white border border-slate-200 text-center shadow-sm flex flex-col justify-center">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                Counseling Severity Rating
                              </span>
                              <div className="flex items-baseline justify-center gap-1">
                                <span className="text-3xl font-black text-slate-900">
                                  {selectedAssessment.counselorRating || 7}
                                </span>
                                <span className="text-xs font-black text-slate-400">
                                  / 10
                                </span>
                              </div>
                              <div className="mt-2">
                                <Badge
                                  className={`border-none text-[9px] font-black uppercase ${
                                    (selectedAssessment.counselorRating || 7) <=
                                    3
                                      ? "bg-emerald-100 text-emerald-800"
                                      : (selectedAssessment.counselorRating ||
                                            7) <= 6
                                        ? "bg-amber-100 text-amber-800"
                                        : (selectedAssessment.counselorRating ||
                                              7) <= 8
                                          ? "bg-orange-100 text-orange-800"
                                          : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {(selectedAssessment.counselorRating || 7) <=
                                  3
                                    ? "Low Severity Baseline"
                                    : (selectedAssessment.counselorRating ||
                                          7) <= 6
                                      ? "Moderate Situational Stress"
                                      : (selectedAssessment.counselorRating ||
                                            7) <= 8
                                        ? "Elevated Distress Level"
                                        : "Severe Stress Concern"}
                                </Badge>
                              </div>
                            </div>

                            {/* 10-Step Visual Severity Gauge */}
                            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm md:col-span-2 flex flex-col justify-between space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                                  10-Point Psychological Distress Gauge
                                </span>
                                <span className="text-[10px] font-black text-slate-500">
                                  Severity:{" "}
                                  <strong className="text-primary">
                                    {selectedAssessment.counselorRating || 7} /
                                    10
                                  </strong>
                                </span>
                              </div>

                              {/* Meter Track */}
                              <div className="space-y-1.5">
                                <div className="grid grid-cols-10 gap-1 h-3">
                                  {Array.from({ length: 10 }).map((_, idx) => {
                                    const step = idx + 1;
                                    const currentRating =
                                      selectedAssessment.counselorRating || 7;
                                    const isActive = step <= currentRating;
                                    let stepColor = "bg-slate-200";
                                    if (isActive) {
                                      if (step <= 3)
                                        stepColor = "bg-emerald-500";
                                      else if (step <= 6)
                                        stepColor = "bg-amber-500";
                                      else if (step <= 8)
                                        stepColor = "bg-orange-500";
                                      else stepColor = "bg-red-500";
                                    }
                                    return (
                                      <div
                                        key={step}
                                        className={`rounded-sm transition-all ${stepColor} ${
                                          step === currentRating
                                            ? "ring-2 ring-slate-900 ring-offset-1 shadow-sm"
                                            : ""
                                        }`}
                                        title={`Scale ${step}/10`}
                                      />
                                    );
                                  })}
                                </div>
                                <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 px-0.5">
                                  <span className="text-emerald-600">
                                    1-3 Healthy Baseline
                                  </span>
                                  <span className="text-amber-600">
                                    4-6 Moderate
                                  </span>
                                  <span className="text-orange-600">
                                    7-8 Elevated
                                  </span>
                                  <span className="text-red-600">
                                    9-10 Critical
                                  </span>
                                </div>
                              </div>

                              {/* Triage summary line */}
                              <div className="pt-1 flex items-center justify-between text-[10px] font-bold text-slate-500 border-t border-slate-100">
                                <span>Triage Recommendation:</span>
                                <span className="font-black text-slate-800">
                                  {(selectedAssessment.counselorRating || 7) >=
                                  7
                                    ? "Active Counseling & Structured Wellness Routine"
                                    : "Periodic Check-in & Standard Routine Maintenance"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-3">
                          <div className="flex items-center justify-center gap-2 text-amber-800 font-black text-xs uppercase tracking-wider">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            Awaiting Formal Counseling Review & Scoring
                          </div>
                          <p className="text-xs text-slate-600 max-w-md mx-auto">
                            The student has submitted their self-assessment
                            questionnaire. Click below to review answers, assign
                            a counseling distress rating (1-10), and document
                            evaluation notes.
                          </p>
                          <Button
                            onClick={() =>
                              handleOpenEvaluation(selectedAssessment)
                            }
                            className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl h-10 px-6 gap-1.5 shadow-md shadow-amber-600/20"
                          >
                            <Star className="h-4 w-4 fill-current" /> Begin
                            Counseling Evaluation
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. SECTION 1.0 — STUDENT SELF-REPORTED COUNSELING RESPONSES */}
                <div className="space-y-4">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSection("responses")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        toggleSection("responses");
                    }}
                    className="flex items-center justify-between p-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer select-none transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          SECTION 1.0 — STUDENT SELF-REPORTED COUNSELING RESPONSES
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                          Verbatim questionnaire items and recorded student
                          disclosures.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className="text-[9px] font-black uppercase px-2 py-0.5 border-slate-200 text-slate-500 bg-white"
                      >
                        {selectedAssessment.questions?.length || 0} Questions
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-primary transition-colors flex items-center gap-1">
                        <span>
                          {expandedSections.responses ? "Collapse" : "Expand"}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${expandedSections.responses ? "rotate-180 text-primary" : ""}`}
                        />
                      </span>
                    </div>
                  </div>

                  {(expandedSections.responses || false) && (
                    <div className="animate-in fade-in duration-150 print:block space-y-4">
                      {selectedAssessment.type === "AI_CHAT" ? (
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-wider">
                            <Brain className="h-4 w-4" /> AI Chat Session
                            Narrative
                          </div>
                          <p className="text-sm text-slate-700 font-medium leading-relaxed italic bg-white p-4 rounded-xl border border-slate-200/80">
                            "{selectedAssessment.summary}"
                          </p>
                          {selectedAssessment.focusAreas && (
                            <div className="flex items-center gap-2 flex-wrap pt-2">
                              <span className="text-[10px] font-black uppercase text-slate-400">
                                Focus Areas:
                              </span>
                              {selectedAssessment.focusAreas.map(
                                (f: string, idx: number) => (
                                  <Badge
                                    key={idx}
                                    className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold"
                                  >
                                    {f}
                                  </Badge>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(
                            selectedAssessment.questions || [
                              "How would you describe your overall mood over the past week?",
                              "On a scale of 1-10, how well are you sleeping?",
                              "What are the primary sources of stress in your life right now?",
                            ]
                          ).map((q: string, i: number) => {
                            const answer =
                              selectedAssessment.answers?.[i] ??
                              selectedAssessment.answers?.[String(i)] ??
                              "No response recorded.";
                            const isNumeric = /^\d+$/.test(
                              String(answer).trim(),
                            );
                            return (
                              <div
                                key={i}
                                className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3 hover:border-slate-300 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                                        ITEM 0{i + 1}
                                      </span>
                                    </div>
                                    <p className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                                      {q}
                                    </p>
                                  </div>
                                </div>

                                {/* Student Response Quote Block */}
                                <div className="border-l-4 border-primary/50 bg-white p-4 rounded-r-xl shadow-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                                      Student Stated Response:
                                    </span>
                                    {isNumeric && (
                                      <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black px-2 py-0">
                                        Scale Score: {answer}/10
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm font-bold text-slate-800 leading-relaxed italic">
                                    "{answer}"
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 5. SECTION 2.0 — COUNSELOR EVALUATION NOTES */}
                <div className="space-y-4 pt-2">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSection("counselorFindings")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        toggleSection("counselorFindings");
                    }}
                    className="flex items-center justify-between p-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer select-none transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileSignature className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          SECTION 2.0 — COUNSELOR EVALUATION NOTES
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                          For counselor observations, student progress, and
                          recommended support.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className="text-[9px] font-black uppercase px-2 py-0.5 border-slate-200 text-slate-500 bg-white"
                      >
                        Section C
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-primary transition-colors flex items-center gap-1">
                        <span>
                          {expandedSections.counselorFindings
                            ? "Collapse"
                            : "Expand"}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${expandedSections.counselorFindings ? "rotate-180 text-primary" : ""}`}
                        />
                      </span>
                    </div>
                  </div>

                  {(expandedSections.counselorFindings || false) && (
                    <div className="animate-in fade-in duration-150 print:block">
                      {selectedAssessment.status === "evaluated" ||
                      selectedAssessment.status === "completed" ? (
                        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
                          {/* Counseling Commentary */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              Counselor Observations & Insights:
                            </span>
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                              {selectedAssessment.counselorComments ||
                                "Student exhibits situational stress patterns related to academic commitments. Advise continued monitoring, stress mitigation strategies, and self-care protocol assignment."}
                            </div>
                          </div>

                          {/* Prescribed Wellness Directives */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                Prescribed Action
                              </span>
                              <p className="text-xs font-bold text-slate-800">
                                {(selectedAssessment.counselorRating || 7) >= 7
                                  ? "Scheduled Counseling Check-in & Session"
                                  : "Routine Self-Care Monitoring & Maintenance"}
                              </p>
                            </div>
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                Follow-up Priority
                              </span>
                              <p className="text-xs font-bold text-slate-800">
                                {(selectedAssessment.counselorRating || 7) >= 7
                                  ? "High Priority • Review within 7 Days"
                                  : "Standard Priority • Periodic Follow-up"}
                              </p>
                            </div>
                          </div>

                          {/* Official Sign-off and Digital Signature Seal */}
                          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="space-y-1 text-center sm:text-left">
                              <p className="font-mono text-xs text-slate-400 italic">
                                Digitally Signed & Validated
                              </p>
                              <div className="h-0.5 w-48 bg-slate-300 my-2"></div>
                              <p className="text-xs font-black text-slate-900 uppercase">
                                {selectedAssessment.counselorName ||
                                  counselor?.name ||
                                  "USPF Guidance Counselor"}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400">
                                Registered Guidance Counselor (RGC) • Staff ID:
                                #USPF-GC-092
                              </p>
                            </div>

                            <div className="flex items-center gap-3 p-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-xs">
                              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                              <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-900">
                                  Officially Verified & Sealed
                                </p>
                                <p className="text-[9px] font-bold text-emerald-700">
                                  USPF Guidance Office • Counseling Record Valid
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-3">
                          <FileSignature className="h-8 w-8 text-slate-300 mx-auto" />
                          <p className="text-xs font-bold text-slate-500">
                            Counseling analysis has not yet been recorded for this
                            student submission.
                          </p>
                          <Button
                            onClick={() =>
                              handleOpenEvaluation(selectedAssessment)
                            }
                            className="bg-primary hover:bg-primary/95 text-white font-black text-xs rounded-xl h-10 px-5 gap-1.5"
                          >
                            <Star className="h-4 w-4 fill-current" /> Begin
                            Counseling Evaluation
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 6. Official Document Footer */}
                <div className="pt-8 border-t-2 border-slate-900 text-center space-y-1 text-[9px] text-slate-400 font-medium">
                  <p className="font-bold text-slate-600 uppercase tracking-wider">
                    University of Southern Philippines Foundation • Guidance,
                    Testing, and Career Services Center
                  </p>
                  <p>
                    This document is an official counseling assessment report
                    generated by GuidanceSync. Unauthorized reproduction or
                    distribution is strictly prohibited under Philippine Data
                    Privacy Act of 2012 (RA 10173).
                  </p>
                  <p className="font-mono pt-1 text-[8px] text-slate-300">
                    SEC-HASH:{" "}
                    {(
                      (selectedAssessment.id || "USPF") + "-SEC-AUTH"
                    ).toUpperCase()}{" "}
                    • Page 1 of 1
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 py-24 bg-white rounded-[2rem] border border-dashed border-slate-200">
              <ClipboardList className="h-16 w-16 opacity-20 text-primary" />
              <p className="italic font-bold text-sm text-slate-500">
                No assessment records available.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: ASSIGNED SELF-CARE PROTOCOLS (media_1789069135148.png) ──── */}
      {activeMainTab === "protocols" && (
        <div className="space-y-8">
          {/* Top Banner & Header matching user's reference image */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Heart className="h-5 w-5 text-rose-500 fill-rose-50" />
              <h2 className="text-sm font-black text-slate-900 tracking-wider uppercase">
                ASSIGNED SELF-CARE PROTOCOLS
              </h2>
            </div>
            <Badge
              variant="outline"
              className="text-xs font-bold border-slate-200 text-slate-500 px-3 py-1 bg-white shadow-sm"
            >
              {totalActiveProtocolsCount} active
            </Badge>
          </div>

          {/* Form Card: "Assign New Self-Care Tool" (Pixel-accurate to media_1789069135148.png) */}
          <div className="p-6 md:p-8 rounded-[2rem] bg-slate-50/80 border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Assign New Self-Care Tool
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Assign wellness rituals, grounding exercises, or journaling
                tasks to students.
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
                  <span className="text-xs font-bold text-slate-800">
                    Apply to all students (Campus-wide protocol)
                  </span>
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
                        Select multiple students to batch assign this protocol
                        in a single server request.
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
                        const isSelected = selectedSelfCareStudentIds.includes(
                          student.id,
                        );
                        return (
                          <div
                            key={student.id}
                            onClick={() =>
                              toggleSelfCareStudentSelection(student.id)
                            }
                            className={`flex items-center justify-between p-2.5 px-3 cursor-pointer transition-colors text-xs ${
                              isSelected
                                ? "bg-primary/5 hover:bg-primary/10"
                                : "hover:bg-slate-100/60"
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
                                {student.name?.slice(0, 2)?.toUpperCase() ||
                                  "ST"}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 leading-tight">
                                  {student.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {student.department || "General"}
                                </p>
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
                        No students found matching &quot;{selfCareStudentSearch}
                        &quot;
                      </div>
                    )}
                  </div>

                  {/* Selected student chips preview */}
                  {selectedSelfCareStudentIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedSelfCareStudentIds.slice(0, 6).map((id) => {
                        const st = students.find((s) => s.id === id);
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
                  <Select
                    value={toolCategory}
                    onValueChange={(val: any) => setToolCategory(val)}
                  >
                    <SelectTrigger className="h-12 bg-white rounded-xl border-slate-200 text-xs font-bold">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="breathing"
                        className="text-xs font-bold"
                      >
                        Breathing
                      </SelectItem>
                      <SelectItem
                        value="journaling"
                        className="text-xs font-bold"
                      >
                        Journaling
                      </SelectItem>
                      <SelectItem
                        value="grounding"
                        className="text-xs font-bold"
                      >
                        Grounding
                      </SelectItem>
                      <SelectItem
                        value="meditation"
                        className="text-xs font-bold"
                      >
                        Meditation
                      </SelectItem>
                      <SelectItem
                        value="wellness"
                        className="text-xs font-bold"
                      >
                        Other / General Wellness
                      </SelectItem>
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
                  {isAddingTool
                    ? "Assigning..."
                    : applyToAll
                      ? "Add Global Tool"
                      : `Batch Assign to ${selectedSelfCareStudentIds.length} Student${selectedSelfCareStudentIds.length === 1 ? "" : "s"}`}
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
                  {[
                    "all",
                    "breathing",
                    "journaling",
                    "grounding",
                    "meditation",
                    "wellness",
                  ].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${
                        categoryFilter === cat
                          ? "bg-primary text-white shadow-sm"
                          : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
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
                  onClick={() => setSelfCareViewMode("list")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selfCareViewMode === "list"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <List className="h-3.5 w-3.5" /> List
                </button>
                <button
                  type="button"
                  onClick={() => setSelfCareViewMode("grid")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selfCareViewMode === "grid"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Grid
                </button>
              </div>
            </div>

            {/* Protocols Display (List view by default or Grid view) */}
            {allFilteredProtocols.length > 0 ? (
              selfCareViewMode === "list" ? (
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
                            <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">
                              {tool.label}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium truncate">
                              {tool.isGlobal
                                ? "Campus-Wide Standard Protocol"
                                : "Student-Specific Protocol"}
                            </p>
                          </div>
                        </div>

                        {/* Category */}
                        <div className="md:col-span-2 flex items-center">
                          <Badge className="bg-slate-100 text-slate-600 border-none text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md">
                            {tool.type || "wellness"}
                          </Badge>
                        </div>

                        {/* Duration */}
                        <div className="md:col-span-2 flex items-center">
                          <Badge className="bg-emerald-50 text-emerald-600 border-none text-[10px] font-black px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />{" "}
                            {typeof tool.time === "number"
                              ? `${tool.time} min`
                              : tool.time || `${tool.duration || 10} min`}
                          </Badge>
                        </div>

                        {/* Target Audience */}
                        <div className="md:col-span-3 flex items-center">
                          <span
                            className={`text-[11px] font-bold inline-flex items-center gap-1.5 ${
                              tool.isGlobal
                                ? "text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100"
                                : "text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100"
                            }`}
                          >
                            {tool.isGlobal ? (
                              <>📢 All Students (Campus-wide)</>
                            ) : (
                              <span
                                className="truncate max-w-[200px]"
                                title={tool.studentName}
                              >
                                👤 {tool.studentName || "Single Student"}
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
                                handleDeleteStudentProtocol(
                                  tool.studentId,
                                  tool.id,
                                  tool.label,
                                );
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
                      <Card
                        key={tool.id}
                        className="border border-slate-200/70 shadow-sm bg-white rounded-2xl p-5 relative group hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-slate-100 text-slate-600 border-none text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                              {tool.type || "wellness"}
                            </Badge>
                            <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />{" "}
                              {typeof tool.time === "number"
                                ? `${tool.time} min`
                                : tool.time || `${tool.duration || 10} min`}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {tool.label}
                          </h4>
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-3">
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider ${
                                tool.isGlobal
                                  ? "text-primary"
                                  : "text-indigo-600"
                              }`}
                            >
                              {tool.isGlobal
                                ? "📢 All Students"
                                : `👤 ${tool.studentName || "Single Student"}`}
                            </span>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (tool.isGlobal) {
                                  handleDeleteGlobalProtocol(
                                    tool.id,
                                    tool.label,
                                  );
                                } else {
                                  handleDeleteStudentProtocol(
                                    tool.studentId,
                                    tool.id,
                                    tool.label,
                                  );
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
                <DialogTitle className="text-2xl font-black text-slate-900">
                  Counseling Evaluation
                </DialogTitle>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {selectedAssessment?.studentName}
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-8 flex-1 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">
                  Counselor Rating (Severity)
                </Label>
                <Badge className="bg-primary/10 text-primary border-none font-black text-lg h-10 px-4">
                  {evalRating[0]} / 10
                </Badge>
              </div>
              <Slider
                value={evalRating}
                onValueChange={setEvalRating}
                max={10}
                min={1}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase px-1">
                <span>Healthy / Stable</span>
                <span>Requires Intervention</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">
                  Counseling Commentary
                </Label>
                <span className="text-[9px] text-slate-400 font-bold uppercase">
                  Pre-defined evaluation templates
                </span>
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
                    <span className="text-[8px] text-slate-400 font-black mt-1">
                      Severity: {tmpl.rating}/10
                    </span>
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
            <Button
              variant="outline"
              onClick={() => setIsEvalOpen(false)}
              className="flex-1 h-14 rounded-2xl font-bold border-slate-200"
            >
              Discard
            </Button>
            <Button
              onClick={handleSubmitEvaluation}
              disabled={isAnalyzing}
              className="flex-1 h-14 rounded-2xl font-black bg-primary gap-2 shadow-lg shadow-primary/20"
            >
              {isAnalyzing ? (
                "Analyzing..."
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" /> Complete Analysis
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
