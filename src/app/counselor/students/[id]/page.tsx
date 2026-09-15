"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, User, Building2, BookOpen, GraduationCap,
  Calendar, Mail, Phone, Heart, Brain, TrendingUp,
  FileText, Clock, CheckCircle2, AlertTriangle, ShieldCheck,
  Printer, Pencil, Trash2, Wind, Anchor, Music, Plus,
  Award, Sparkles, Check, ChevronRight, Activity
} from 'lucide-react';
import { storageService } from '@/lib/storage-service';
import {
  STORAGE_KEYS, getCollegeByCode, getCollegesForCounselor,
  getProgramsForCollege, YEAR_LEVELS
} from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { exerciseService, ExerciseCompletionRecord } from '@/lib/exercise-service';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export default function StudentRecordPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user: counselor } = useAuth();
  const studentId = params?.id as string;

  const [student, setStudent] = useState<any>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [sessionNotes, setSessionNotes] = useState<any[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseCompletionRecord[]>([]);
  const [globalSelfCare, setGlobalSelfCare] = useState<any[]>([]);
  const [assignedSelfCare, setAssignedSelfCare] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Profile modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editProgram, setEditProgram] = useState('');
  const [editYearLevel, setEditYearLevel] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Assign Self Care Tool state
  const [isAssignToolOpen, setIsAssignToolOpen] = useState(false);
  const [toolLabel, setToolLabel] = useState('');
  const [toolDuration, setToolDuration] = useState('10');
  const [toolCategory, setToolCategory] = useState<'breathing' | 'journaling' | 'grounding' | 'meditation' | 'wellness'>('breathing');
  const [toolApplyGlobal, setToolApplyGlobal] = useState(false);
  const [isAssigningTool, setIsAssigningTool] = useState(false);

  // Active tab in records view
  const [activeTab, setActiveTab] = useState<'overview' | 'assessments' | 'exercises' | 'notes'>('overview');

  // Load all student data
  const loadStudentRecord = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);

    try {
      // 1. Fetch Student Profile
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .maybeSingle();

      if (profileErr) throw profileErr;

      let studentObj = profile;
      if (!studentObj) {
        // Fallback from storageService users
        const allUsers = await storageService.getAll<any>(STORAGE_KEYS.USERS);
        studentObj = allUsers.find(u => u.id === studentId);
      }

      if (!studentObj) {
        toast({ variant: 'destructive', title: 'Student Not Found', description: 'Could not locate student record.' });
        router.push('/counselor/students');
        return;
      }

      setStudent(studentObj);
      setEditName(studentObj.name || '');
      setEditDepartment(studentObj.department || '');
      setEditProgram(studentObj.program || studentObj.course || '');
      setEditYearLevel(studentObj.yearLevel || studentObj.year_level || '');

      // Parse individual self-care tools
      setAssignedSelfCare(Array.isArray(studentObj.self_care_tools) ? studentObj.self_care_tools : []);

      // 2. Fetch Assessments
      const allAssessments = await storageService.getAll<any>(STORAGE_KEYS.ASSESSMENTS);
      const studentAssessments = allAssessments.filter(
        a => a.studentId === studentId || a.student_id === studentId || a.studentName === studentObj.name
      );
      studentAssessments.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setAssessments(studentAssessments);

      // 3. Fetch Session Notes
      const allNotes = await storageService.getAll<any>(STORAGE_KEYS.SESSION_NOTES);
      const studentNotes = allNotes.filter(n => n.studentId === studentId || n.student_id === studentId);
      studentNotes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setSessionNotes(studentNotes);

      // 4. Fetch Global Self Care Tools
      const { data: globalTools } = await supabase
        .from('global_self_care_tools')
        .select('*')
        .order('created_at', { ascending: false });
      setGlobalSelfCare(globalTools || []);

      // 5. Fetch Completed Exercises
      const completions = await exerciseService.getAllCompletions(studentId);
      setExerciseLogs(completions);

    } catch (err: any) {
      console.error('Error loading student record:', err);
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to load student record.' });
    } finally {
      setIsLoading(false);
    }
  }, [studentId, router, toast]);

  useEffect(() => {
    loadStudentRecord();
  }, [loadStudentRecord]);

  // Compute stats
  const avgStress = useMemo(() => {
    const scored = assessments.filter(a => typeof a.stressLevel === 'number');
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((acc, a) => acc + a.stressLevel, 0) / scored.length);
  }, [assessments]);

  const latestAssessment = assessments[0];

  const getWellnessLabel = (stress: number | null) => {
    if (stress === null) return { label: 'No Assessment Data', color: 'bg-slate-100 text-slate-600', border: 'border-slate-200' };
    if (stress < 30) return { label: 'Optimal Wellness', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' };
    if (stress <= 60) return { label: 'Moderate Stress', color: 'bg-amber-50 text-amber-700', border: 'border-amber-200' };
    return { label: 'Requires Attention', color: 'bg-red-50 text-red-700', border: 'border-red-200' };
  };

  const wellnessStatus = getWellnessLabel(avgStress);

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setIsSavingEdit(true);

    try {
      const updates = {
        name: editName.trim() || student.name,
        department: editDepartment === 'none' ? null : editDepartment,
        program: editProgram === 'none' ? null : editProgram,
        year_level: editYearLevel === 'none' ? null : editYearLevel,
        yearLevel: editYearLevel === 'none' ? null : editYearLevel,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', student.id);

      if (error) throw error;

      await storageService.update(STORAGE_KEYS.USERS, student.id, updates);

      toast({ title: "Profile Updated", description: "Student records have been saved successfully." });
      setStudent((prev: any) => ({ ...prev, ...updates }));
      setIsEditOpen(false);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message || 'Could not save profile changes.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Assign Self Care Tool
  const handleAssignSelfCare = async (e: React.FormEvent) => {
    e.preventDefault();
    const durationNum = parseInt(String(toolDuration).replace(/\D/g, ''), 10);
    if (!toolLabel.trim() || isNaN(durationNum) || durationNum <= 0) {
      toast({ variant: 'destructive', title: 'Invalid inputs', description: 'Please provide Tool Name and Duration in minutes.' });
      return;
    }

    setIsAssigningTool(true);
    const durationFormatted = `${durationNum} min`;

    try {
      if (toolApplyGlobal) {
        const { error } = await supabase
          .from('global_self_care_tools')
          .insert([{
            label: toolLabel.trim(),
            time: durationFormatted,
            duration: durationNum,
            type: toolCategory,
            created_at: new Date().toISOString()
          }]);
        if (error) throw error;
        toast({ title: "Global Tool Created", description: `Assigned "${toolLabel.trim()}" to all students.` });
      } else {
        const newToolObj = {
          id: `tool-${Date.now()}`,
          label: toolLabel.trim(),
          time: durationFormatted,
          duration: durationNum,
          type: toolCategory,
          assignedBy: counselor?.name || 'Guidance Counselor',
          createdAt: new Date().toISOString(),
        };

        const updatedTools = [...assignedSelfCare, newToolObj];
        const { error } = await supabase
          .from('profiles')
          .update({ self_care_tools: updatedTools })
          .eq('id', student.id);

        if (error) throw error;

        setAssignedSelfCare(updatedTools);
        toast({ title: "Protocol Assigned", description: `Assigned "${toolLabel.trim()}" to ${student.name}.` });
      }

      setToolLabel('');
      setToolDuration('10');
      setToolApplyGlobal(false);
      setIsAssignToolOpen(false);
      loadStudentRecord();
    } catch (err: any) {
      console.error('Error assigning protocol:', err);
      toast({ variant: 'destructive', title: 'Failed to assign protocol', description: err.message || 'Could not save protocol.' });
    } finally {
      setIsAssigningTool(false);
    }
  };

  // Remove individual tool
  const handleRemoveSelfCare = async (toolId: string) => {
    try {
      const updated = assignedSelfCare.filter((t, idx) => (t.id || `tool-${idx}`) !== toolId);
      const { error } = await supabase
        .from('profiles')
        .update({ self_care_tools: updated })
        .eq('id', student.id);

      if (error) throw error;

      setAssignedSelfCare(updated);
      toast({ title: "Protocol Removed", description: "Unassigned protocol from student." });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Could not remove protocol.' });
    }
  };

  const getToolIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'breathing': return Wind;
      case 'journaling': return BookOpen;
      case 'grounding': return Anchor;
      case 'meditation': return Music;
      default: return Heart;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full py-12 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Student Record...</p>
      </div>
    );
  }

  return (
    <div className="w-full pb-10 space-y-6">

          {/* Top Back Navigation & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <Button
              variant="ghost"
              onClick={() => router.push('/counselor/students')}
              className="w-fit text-slate-600 hover:text-slate-900 font-bold text-xs gap-2 -ml-2 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Students Directory
            </Button>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="rounded-xl border-slate-200 text-xs font-bold gap-1.5 hover:bg-slate-50 text-slate-700"
              >
                <Printer className="h-3.5 w-3.5" /> Print / Export Record
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="rounded-xl border-slate-200 text-xs font-bold gap-1.5 hover:bg-slate-50 text-slate-700"
              >
                <Pencil className="h-3.5 w-3.5" /> Update Profile
              </Button>

              <Button
                size="sm"
                onClick={() => setIsAssignToolOpen(true)}
                className="rounded-xl bg-primary text-white text-xs font-black gap-1.5 shadow-md shadow-primary/20"
              >
                <Plus className="h-3.5 w-3.5" /> Assign Self-Care Tool
              </Button>
            </div>
          </div>

          {/* ── STUDENT OFFICIAL RECORD BANNER CARD ──────────────────────────── */}
          <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden bg-white">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-5">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl border border-primary/20 shadow-sm shrink-0">
                  {student?.name?.charAt(0) || 'S'}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {student?.name}
                    </h1>
                    <Badge variant="outline" className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-slate-50 border-slate-200 text-slate-600">
                      ID: {student?.studentId || student?.student_id || '202300958'}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500 font-medium">
                    {student?.email || 'No email registered'}
                  </p>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {student?.department && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full">
                        <Building2 className="h-3 w-3" />
                        [{student.department}] {getCollegeByCode(student.department)?.name || 'College Department'}
                      </span>
                    )}
                    {student?.program && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                        <BookOpen className="h-3 w-3" />
                        {student.program}
                      </span>
                    )}
                    {student?.yearLevel && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                        <GraduationCap className="h-3 w-3" />
                        {student.yearLevel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Overview Chip */}
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Wellness Status</span>
                <Badge className={`border px-3 py-1 text-xs font-black uppercase ${wellnessStatus.color} ${wellnessStatus.border}`}>
                  {wellnessStatus.label}
                </Badge>
                <span className="text-[10px] text-slate-400 font-medium">
                  Active Enrolled Student
                </span>
              </div>
            </div>

            {/* Metric Score Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-slate-50/50 text-center">
              <div className="p-4 sm:p-5 space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Average Stress</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 block">
                  {avgStress != null ? `${avgStress}%` : 'N/A'}
                </span>
              </div>
              <div className="p-4 sm:p-5 space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Assessments Filed</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 block">
                  {assessments.length}
                </span>
              </div>
              <div className="p-4 sm:p-5 space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Exercises Completed</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 block text-emerald-600">
                  {exerciseLogs.length}
                </span>
              </div>
              <div className="p-4 sm:p-5 space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Assigned Protocols</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 block text-primary">
                  {globalSelfCare.length + assignedSelfCare.length}
                </span>
              </div>
            </div>
          </Card>

          {/* ── NAVIGATION TABS FOR STUDENT RECORD SECTIONS ────────────────── */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar print:hidden">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'overview'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Academic & Profile Record
            </button>
            <button
              onClick={() => setActiveTab('assessments')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'assessments'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Assessment History</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'assessments' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {assessments.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('exercises')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'exercises'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Heart className="h-3.5 w-3.5 text-rose-500" />
              <span>Self-Care & Completed Exercises</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'exercises' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {exerciseLogs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'notes'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Counselor Session Notes</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'notes' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {sessionNotes.length}
              </span>
            </button>
          </div>

          {/* ── TAB 1: ACADEMIC & PROFILE INFORMATION RECORD ───────────────── */}
          {(activeTab === 'overview' || activeTab === 'assessments' || activeTab === 'exercises' || activeTab === 'notes') && (
            <div className="space-y-6">

              {/* SECTION: ACADEMIC PROFILE RECORD */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="p-6 bg-slate-50/70 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <GraduationCap className="h-5 w-5 text-primary" />
                          <div>
                            <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900">
                              Official University Academic Record
                            </CardTitle>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Verified student enrollment and institutional records.
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditOpen(true)}
                          className="h-8 text-xs font-bold rounded-xl gap-1"
                        >
                          <Pencil className="h-3 w-3" /> Edit Record
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-slate-100 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        <div className="p-4 px-6 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Full Legal Name</span>
                          <span className="font-black text-slate-900 text-sm block">{student?.name}</span>
                        </div>
                        <div className="p-4 px-6 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Official Student ID Number</span>
                          <span className="font-bold text-slate-800 text-sm font-mono block">
                            {student?.studentId || student?.student_id || '202300958'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        <div className="p-4 px-6 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Handled College / Department</span>
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <span className="font-black text-primary">[{student?.department || 'CCS'}]</span>
                            <span>{getCollegeByCode(student?.department || 'CCS')?.name || 'College Department'}</span>
                          </div>
                        </div>
                        <div className="p-4 px-6 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Enrolled Degree Program</span>
                          <span className="font-bold text-slate-800 block">
                            {student?.program || student?.course || 'Bachelor of Science in Information Technology'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        <div className="p-4 px-6 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Year Level Standing</span>
                          <span className="font-bold text-slate-800 block">{student?.yearLevel || '4th Year'}</span>
                        </div>
                        <div className="p-4 px-6 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Official Registered Email</span>
                          <span className="font-bold text-slate-800 block">{student?.email || 'N/A'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Latest Assessment Summary */}
                  {latestAssessment && (
                    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-primary" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            Latest Wellness Assessment Summary
                          </h3>
                        </div>
                        <Badge className={`border text-[10px] font-black uppercase ${wellnessStatus.color} ${wellnessStatus.border}`}>
                          {latestAssessment.stressLevel}% Stress Score
                        </Badge>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                          <span>Recorded on: {latestAssessment.date || 'Recent'}</span>
                          <span className="capitalize">Mood Tone: <strong className="text-slate-900">{latestAssessment.emotionalState || 'Calm'}</strong></span>
                        </div>
                        {latestAssessment.summary && (
                          <p className="text-xs text-slate-700 italic font-medium leading-relaxed">
                            "{latestAssessment.summary}"
                          </p>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* ── TAB 2: ASSESSMENT HISTORY LEDGER ───────────────────────── */}
              {activeTab === 'assessments' && (
                <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
                  <CardHeader className="p-6 bg-slate-50/70 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900">
                            Assessment & Wellness Submissions
                          </CardTitle>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Historical questionnaire responses and evaluations filed by this student.
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-black px-2.5 py-0.5">
                        {assessments.length} Records
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {assessments.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 space-y-2">
                        <FileText className="h-8 w-8 mx-auto opacity-30" />
                        <p className="text-xs font-bold">No assessments submitted by this student yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 text-xs">
                        {assessments.map((asmt, idx) => (
                          <div key={asmt.id || idx} className="p-5 px-6 hover:bg-slate-50/80 transition-colors space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-slate-900 text-sm">
                                    {asmt.title || 'Student Self-Assessment Questionnaire'}
                                  </span>
                                  <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200 text-slate-500">
                                    {asmt.type || 'CLINICAL_FORM'}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  Filed on {asmt.date || new Date(asmt.timestamp).toLocaleDateString()}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                {asmt.status === 'evaluated' || asmt.status === 'completed' ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black">
                                    {asmt.counselorRating ? `Rating: ${asmt.counselorRating}/10` : 'Evaluated'}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-black">
                                    Pending Review
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {asmt.summary && (
                              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                                "{asmt.summary}"
                              </p>
                            )}

                            {asmt.counselorComments && (
                              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-primary block">
                                  Counselor Notes & Evaluation:
                                </span>
                                <p className="text-xs text-slate-800 font-medium">
                                  {asmt.counselorComments}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ── TAB 3: SELF-CARE & COMPLETED EXERCISES LEDGER ──────────── */}
              {activeTab === 'exercises' && (
                <div className="space-y-6">

                  {/* Completed Exercise Activity Records */}
                  <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="p-6 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <div>
                          <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900">
                            Completed Exercise Activity Log
                          </CardTitle>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Records of breathing, grounding, journaling, and meditation sessions done by this student.
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black">
                        {exerciseLogs.length} Completed
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      {exerciseLogs.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 space-y-2">
                          <Heart className="h-8 w-8 mx-auto opacity-30 text-rose-400" />
                          <p className="text-xs font-bold">No exercise completions recorded yet for this student.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 text-xs">
                          {exerciseLogs.map((log) => {
                            const Icon = getToolIcon(log.category);
                            return (
                              <div key={log.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50/80 transition-colors gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                                    <Icon className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-black text-slate-900 text-xs">{log.exerciseTitle}</h4>
                                      <Badge className="bg-slate-100 text-slate-600 border-none text-[8px] font-black uppercase">
                                        {log.category}
                                      </Badge>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      Completed on {log.date} {log.timeStr ? `• ${log.timeStr}` : ''}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <Badge className="bg-emerald-50 text-emerald-700 border-none text-[10px] font-black flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {log.durationMinutes} min
                                  </Badge>
                                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    ✓ Completed
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Active Assigned Protocols */}
                  <Card className="rounded-2xl border-slate-200 bg-white shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-rose-500" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          Active Assigned Self-Care Protocols
                        </h3>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsAssignToolOpen(true)}
                        className="h-8 text-xs font-bold rounded-xl bg-primary text-white gap-1"
                      >
                        <Plus className="h-3 w-3" /> Assign Protocol
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Global Tools */}
                      {globalSelfCare.map((tool) => {
                        const Icon = getToolIcon(tool.type);
                        return (
                          <div key={`global-${tool.id}`} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-bold text-slate-800">{tool.label}</h4>
                                  <Badge variant="outline" className="text-[8px] font-black uppercase bg-white text-primary border-primary/20">
                                    Campus-Wide
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold">{tool.time || `${tool.duration || 10} min`} • {tool.type}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Student-specific Tools */}
                      {assignedSelfCare.map((tool, idx) => {
                        const Icon = getToolIcon(tool.type);
                        const toolId = tool.id || `tool-${idx}`;
                        return (
                          <div key={toolId} className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-bold text-slate-900">{tool.label}</h4>
                                  <Badge variant="outline" className="text-[8px] font-black uppercase bg-indigo-100 text-indigo-700 border-none">
                                    Individual
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold">{tool.time || `${tool.duration || 10} min`} • {tool.type}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveSelfCare(toolId)}
                              className="h-7 w-7 text-slate-300 hover:text-red-500 rounded-lg"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                </div>
              )}

              {/* ── TAB 4: COUNSELOR SESSION NOTES ─────────────────────────── */}
              {activeTab === 'notes' && (
                <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
                  <CardHeader className="p-6 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900">
                          Counseling & Guidance Session Notes
                        </CardTitle>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Counselor observations, guidance directves, and check-in records.
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {sessionNotes.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 space-y-2">
                        <FileText className="h-8 w-8 mx-auto opacity-30" />
                        <p className="text-xs font-bold">No counseling session notes recorded for this student yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sessionNotes.map((n, i) => (
                          <div key={n.id || i} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                              <span>Recorded: {n.date || new Date(n.timestamp).toLocaleDateString()}</span>
                              <span>Counselor: <strong>{n.counselorName || 'Counselor'}</strong></span>
                            </div>
                            <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                              {n.notes || n.content || 'Session completed.'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

            </div>
          )}

        {/* ── Update Profile Modal ─────────────────────────────────────────── */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md rounded-[2rem] p-6 border-none shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black">Update Student Record</DialogTitle>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student?.studentId || student?.email}</p>
                </div>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Update college department, program, or year level standing for this student.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-400">Display Name</Label>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder={student?.name}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-slate-400">College / Department</Label>
                  <Select value={editDepartment} onValueChange={(d) => { setEditDepartment(d); setEditProgram(''); }}>
                    <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Select college" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value="none" className="text-xs font-bold text-slate-400">— None —</SelectItem>
                      {getCollegesForCounselor(counselor?.department).map(d => (
                        <SelectItem key={d.code} value={d.code} className="text-xs font-bold">
                          <span className="font-black text-primary">[{d.code}]</span> — {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black uppercase tracking-wider text-slate-400">Program</Label>
                    <Select
                      value={editProgram}
                      onValueChange={setEditProgram}
                      disabled={!editDepartment || editDepartment === 'none'}
                    >
                      <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                        <SelectValue placeholder={!editDepartment || editDepartment === 'none' ? "Pick college" : "Select program"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="none" className="text-xs font-bold text-slate-400">— None —</SelectItem>
                        {getProgramsForCollege(editDepartment).map(p => (
                          <SelectItem key={p} value={p} className="text-xs font-medium">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-black uppercase tracking-wider text-slate-400">Year Level</Label>
                    <Select value={editYearLevel} onValueChange={setEditYearLevel}>
                      <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="none" className="text-xs font-bold text-slate-400">— None —</SelectItem>
                        {YEAR_LEVELS.map(y => (
                          <SelectItem key={y} value={y} className="text-xs font-bold">{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl font-bold"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl font-black bg-primary"
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Assign Self Care Tool Modal ──────────────────────────────────── */}
        <Dialog open={isAssignToolOpen} onOpenChange={setIsAssignToolOpen}>
          <DialogContent className="max-w-md rounded-[2rem] p-6 border-none shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black">Assign Self-Care Tool</DialogTitle>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student?.name}</p>
                </div>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Prescribe a structured exercise or mindfulness ritual for this student.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAssignSelfCare} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-400">Tool Name</Label>
                <Input
                  placeholder="e.g. 5-4-3-2-1 Sensory Grounding"
                  value={toolLabel}
                  onChange={e => setToolLabel(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-slate-400">Duration (Minutes)</Label>
                  <Input
                    placeholder="10"
                    value={toolDuration}
                    onChange={e => setToolDuration(e.target.value)}
                    className="rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-slate-400">Category</Label>
                  <Select value={toolCategory} onValueChange={(val: any) => setToolCategory(val)}>
                    <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breathing" className="text-xs font-bold">Breathing</SelectItem>
                      <SelectItem value="journaling" className="text-xs font-bold">Journaling</SelectItem>
                      <SelectItem value="grounding" className="text-xs font-bold">Grounding</SelectItem>
                      <SelectItem value="meditation" className="text-xs font-bold">Meditation</SelectItem>
                      <SelectItem value="wellness" className="text-xs font-bold">General Wellness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1 pb-1">
                <Checkbox
                  id="tool-global-check"
                  checked={toolApplyGlobal}
                  onCheckedChange={(c) => setToolApplyGlobal(!!c)}
                />
                <Label htmlFor="tool-global-check" className="text-xs font-bold text-slate-600 cursor-pointer">
                  Assign globally to all campus students
                </Label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl font-bold"
                  onClick={() => setIsAssignToolOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl font-black bg-primary"
                  disabled={isAssigningTool || !toolLabel.trim()}
                >
                  {isAssigningTool ? 'Assigning...' : 'Assign Tool'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    );
}
