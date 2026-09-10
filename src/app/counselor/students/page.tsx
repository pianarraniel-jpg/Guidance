"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search, MoreVertical, Trash2, ExternalLink, Users, User,
  Brain, TrendingUp, GraduationCap, Building2, Pencil, Filter,
  Heart, Wind, BookOpen, Anchor, Music, X
} from 'lucide-react';
import { storageService } from '@/lib/storage-service';
import { 
  STORAGE_KEYS, 
  USER_ROLES, 
  DEPARTMENTS, 
  YEAR_LEVELS, 
  COLLEGES_AND_PROGRAMS, 
  getProgramsForCollege, 
  getCollegeByCode,
  getCollegesForCounselor,
  getProgramsForCounselor
} from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from '@/lib/supabase';

export default function CounselorStudentsPage() {
  const { user: counselor } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [assessmentsMap, setAssessmentsMap] = useState<Record<string, any[]>>({});
  const [insightsMap, setInsightsMap] = useState<Record<string, string>>({});

  // Handled Colleges for this counselor based on assigned department
  const handledColleges = useMemo(() => {
    return getCollegesForCounselor(counselor?.department);
  }, [counselor?.department]);

  const isDepartmentScoped = useMemo(() => {
    return Boolean(counselor?.department && counselor.department.trim().toLowerCase() !== 'all');
  }, [counselor?.department]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [collegeFilter, setCollegeFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  // Auto-focus to counselor's college if they handle a single college (e.g. CCS)
  useEffect(() => {
    if (isDepartmentScoped && handledColleges.length === 1) {
      setCollegeFilter(handledColleges[0].code);
      setEnrollDepartment(handledColleges[0].code);
    }
  }, [isDepartmentScoped, handledColleges]);

  // Modals
  const [profileStudent, setProfileStudent] = useState<any>(null);
  const [editStudent, setEditStudent] = useState<any>(null);

  const [assignedSelfCare, setAssignedSelfCare] = useState<any[]>([]);
  const [globalSelfCare, setGlobalSelfCare] = useState<any[]>([]);
  const [newToolLabel, setNewToolLabel] = useState('');
  const [newToolTime, setNewToolTime] = useState('');
  const [newToolType, setNewToolType] = useState('wellness');
  const [applyToAll, setApplyToAll] = useState(false);
  const [isAddingTool, setIsAddingTool] = useState(false);

  // Enroll form
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [enrollName, setEnrollName] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollDepartment, setEnrollDepartment] = useState('');
  const [enrollProgram, setEnrollProgram] = useState('');
  const [enrollYearLevel, setEnrollYearLevel] = useState('');
  const [enrollError, setEnrollError] = useState('');
  const [isEnrollSubmitting, setIsEnrollSubmitting] = useState(false);

  // Edit form
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editProgram, setEditProgram] = useState('');
  const [editYearLevel, setEditYearLevel] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const { toast } = useToast();

  const loadStudents = async () => {
    const [allUsers, allAssessments, allInsights] = await Promise.all([
      storageService.getAll<any>(STORAGE_KEYS.USERS),
      storageService.getAll<any>(STORAGE_KEYS.ASSESSMENTS),
      storageService.getAll<any>(STORAGE_KEYS.AI_INSIGHTS),
    ]);
    const studentList = allUsers
      .filter(u => u.role === USER_ROLES.STUDENT)
      .map(u => ({
        ...u,
        program: u.program || u.course || undefined,
        yearLevel: u.yearLevel || u.year || undefined,
      }));
    setStudents(studentList);

    const aMap: Record<string, any[]> = {};
    for (const a of allAssessments) {
      if (!aMap[a.studentId]) aMap[a.studentId] = [];
      aMap[a.studentId].push(a);
    }
    Object.values(aMap).forEach(list => list.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)));
    setAssessmentsMap(aMap);

    const iMap: Record<string, string> = {};
    for (const ins of allInsights) iMap[ins.studentId] = ins.insight;
    setInsightsMap(iMap);
  };

  useEffect(() => { loadStudents(); }, []);

  useEffect(() => {
    const fetchGlobalAndStudentTools = async () => {
      // 1. Fetch global tools
      try {
        const { data, error } = await supabase
          .from('global_self_care_tools')
          .select('*');
        if (!error && data) {
          setGlobalSelfCare(data);
        }
      } catch (err) {
        console.error("Error fetching global tools:", err);
      }

      // 2. Set student-specific tools
      if (profileStudent) {
        setAssignedSelfCare(profileStudent.selfCareTools || []);
      } else {
        setAssignedSelfCare([]);
        setGlobalSelfCare([]);
        setNewToolLabel('');
        setNewToolTime('');
        setNewToolType('wellness');
        setApplyToAll(false);
      }
    };

    fetchGlobalAndStudentTools();
  }, [profileStudent]);

  useEffect(() => {
    if (!profileStudent && !editStudent) {
      document.body.style.pointerEvents = 'auto';
    }
  }, [profileStudent, editStudent]);

  // Handle College Filter change
  const handleCollegeFilterChange = (col: string) => {
    setCollegeFilter(col);
    if (col !== 'all' && col !== 'unassigned') {
      const allowedPrograms = getProgramsForCollege(col);
      if (programFilter !== 'all' && programFilter !== 'unassigned' && !allowedPrograms.includes(programFilter)) {
        setProgramFilter('all');
      }
    }
  };

  const availableProgramsForFilter = useMemo(() => {
    return getProgramsForCounselor(
      counselor?.department, 
      collegeFilter === 'all' || collegeFilter === 'unassigned' ? undefined : collegeFilter
    );
  }, [counselor?.department, collegeFilter]);

  // ── Enroll ────────────────────────────────────────────────────────────────
  const handleEnrollSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEnrollError('');
    setIsEnrollSubmitting(true);
    const name = enrollName.trim();
    const email = enrollEmail.trim().toLowerCase();
    const studentId = enrollStudentId.trim();

    if (!name || !email || !studentId) {
      setEnrollError('Please complete all required fields.');
      setIsEnrollSubmitting(false);
      return;
    }
    if (!email.endsWith('@uspf.edu.ph')) {
      setEnrollError('Email must use the @uspf.edu.ph domain.');
      setIsEnrollSubmitting(false);
      return;
    }

    try {
      const { data: existingEmail } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
      if (existingEmail) { setEnrollError('Email already registered.'); setIsEnrollSubmitting(false); return; }

      const { data: existingId } = await supabase.from('profiles').select('id').eq('student_id', studentId).maybeSingle();
      if (existingId) { setEnrollError('Student ID already registered.'); setIsEnrollSubmitting(false); return; }

      const { data, error: signUpError } = await supabase.auth.signUp({ email, password: studentId });
      if (signUpError || !data.user) {
        setEnrollError(signUpError?.message || 'Enrollment failed.');
        setIsEnrollSubmitting(false);
        return;
      }

      const enrollPayload: any = {
        name,
        role: USER_ROLES.STUDENT,
        student_id: studentId,
        department: (enrollDepartment && enrollDepartment !== 'none') ? enrollDepartment : null,
        course: (enrollProgram && enrollProgram !== 'none') ? enrollProgram : null,
        year_level: (enrollYearLevel && enrollYearLevel !== 'none') ? enrollYearLevel : null,
      };
      if (enrollProgram && enrollProgram !== 'none') {
        enrollPayload.program = enrollProgram;
      }

      let { error: enrollError } = await supabase.from('profiles').update(enrollPayload).eq('id', data.user.id);
      if (enrollError && enrollError.message?.includes('program')) {
        delete enrollPayload.program;
        await supabase.from('profiles').update(enrollPayload).eq('id', data.user.id);
      }

      toast({ title: 'Student Enrolled', description: `${name} has been added to the directory.` });
      setIsEnrollDialogOpen(false);
      setEnrollName(''); setEnrollEmail(''); setEnrollStudentId('');
      setEnrollDepartment(''); setEnrollProgram(''); setEnrollYearLevel('');
      loadStudents();
    } catch {
      setEnrollError('Unable to enroll student. Please try again.');
    } finally {
      setIsEnrollSubmitting(false);
    }
  };

  // ── Edit / Update ─────────────────────────────────────────────────────────
  const openEditDialog = (student: any) => {
    setEditStudent(student);
    setEditName(student.name ?? '');
    setEditDepartment(student.department ?? '');
    setEditProgram(student.program ?? '');
    setEditYearLevel(student.yearLevel ?? '');
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editStudent) return;
    setIsEditSubmitting(true);
    try {
      const editPayload: any = {
        name: editName.trim() || editStudent.name,
        department: (editDepartment && editDepartment !== 'none') ? editDepartment : null,
        course: (editProgram && editProgram !== 'none') ? editProgram : null,
        year_level: (editYearLevel && editYearLevel !== 'none') ? editYearLevel : null,
      };
      if (editProgram && editProgram !== 'none') {
        editPayload.program = editProgram;
      }

      let { error } = await supabase.from('profiles').update(editPayload).eq('id', editStudent.id);
      if (error && error.message?.includes('program')) {
        delete editPayload.program;
        const res = await supabase.from('profiles').update(editPayload).eq('id', editStudent.id);
        error = res.error;
      }

      if (error) throw error;

      toast({ title: 'Profile Updated', description: `${editStudent.name}'s profile has been updated.` });
      setEditStudent(null);
      loadStudents();
    } catch {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save changes. Please try again.' });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // ── Self-Care Tool Actions ────────────────────────────────────────────────
  const handleAddSelfCare = async () => {
    if (!profileStudent || !newToolLabel || !newToolTime) return;
    setIsAddingTool(true);
    const newTool = {
      label: newToolLabel.trim(),
      time: newToolTime.trim(),
      type: newToolType
    };

    try {
      if (applyToAll) {
        const { data, error } = await supabase
          .from('global_self_care_tools')
          .insert(newTool)
          .select()
          .single();

        if (error) throw error;

        setGlobalSelfCare(prev => [...prev, data]);
        setNewToolLabel('');
        setNewToolTime('');
        setApplyToAll(false);
        toast({ title: 'Global Self-Care Tool Added', description: `Assigned "${newTool.label}" to all students.` });
      } else {
        const updatedTools = [...assignedSelfCare, newTool];
        const { error } = await supabase
          .from('profiles')
          .update({ self_care_tools: updatedTools })
          .eq('id', profileStudent.id);

        if (error) throw error;

        setAssignedSelfCare(updatedTools);
        setStudents(prev => prev.map(s => s.id === profileStudent.id ? { ...s, selfCareTools: updatedTools } : s));
        setNewToolLabel('');
        setNewToolTime('');
        toast({ title: 'Self-Care Tool Added', description: `Assigned "${newTool.label}" to ${profileStudent.name}.` });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to assign self-care tool.' });
    } finally {
      setIsAddingTool(false);
    }
  };

  const handleRemoveSelfCare = async (idxToRemove: number) => {
    if (!profileStudent) return;
    const updatedTools = assignedSelfCare.filter((_, idx) => idx !== idxToRemove);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ self_care_tools: updatedTools })
        .eq('id', profileStudent.id);

      if (error) throw error;

      setAssignedSelfCare(updatedTools);
      setStudents(prev => prev.map(s => s.id === profileStudent.id ? { ...s, selfCareTools: updatedTools } : s));
      toast({ title: 'Self-Care Tool Removed', description: 'Unassigned the tool from student.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove self-care tool.' });
    }
  };

  const handleRemoveGlobalSelfCare = async (id: string) => {
    try {
      const { error } = await supabase
        .from('global_self_care_tools')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGlobalSelfCare(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Global Self-Care Tool Removed', description: 'Removed the tool for all students.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove global self-care tool.' });
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteStudent = async (id: string) => {
    await storageService.delete(STORAGE_KEYS.USERS, id);
    toast({ title: 'Record Removed', description: 'The student wellness profile has been deactivated.' });
    loadStudents();
  };

  // ── Derived counts & data ─────────────────────────────────────────────────
  const collegeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      const d = s.department || 'Unassigned';
      counts[d] = (counts[d] ?? 0) + 1;
    });
    return counts;
  }, [students]);

  const programCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      const matchCol = collegeFilter === 'all' ? true :
        collegeFilter === 'unassigned' ? !s.department :
        (s.department === collegeFilter || getCollegeByCode(collegeFilter)?.aliases?.includes(s.department));
      if (matchCol) {
        const p = s.program || 'Unassigned';
        counts[p] = (counts[p] ?? 0) + 1;
      }
    });
    return counts;
  }, [students, collegeFilter]);

  const yearCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      const y = s.yearLevel || 'Unassigned';
      counts[y] = (counts[y] ?? 0) + 1;
    });
    return counts;
  }, [students]);

  const handledStudentCount = useMemo(() => {
    if (!isDepartmentScoped) return students.length;
    return students.filter(s => 
      !s.department || handledColleges.some(c => s.department === c.code || c.aliases?.includes(s.department))
    ).length;
  }, [students, isDepartmentScoped, handledColleges]);

  const filteredStudents = useMemo(() => students.filter(s => {
    const matchSearch =
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentId?.includes(searchTerm) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCollege =
      collegeFilter === 'all' ? (
        !isDepartmentScoped || !s.department || handledColleges.some(c => s.department === c.code || c.aliases?.includes(s.department))
      ) :
      collegeFilter === 'unassigned' ? !s.department :
      (s.department === collegeFilter || getCollegeByCode(collegeFilter)?.aliases?.includes(s.department));

    const matchProgram =
      programFilter === 'all' ? true :
      programFilter === 'unassigned' ? !s.program :
      s.program === programFilter;

    const matchYear =
      yearFilter === 'all' ? true :
      yearFilter === 'unassigned' ? !s.yearLevel :
      s.yearLevel === yearFilter;

    return matchSearch && matchCollege && matchProgram && matchYear;
  }), [students, searchTerm, collegeFilter, programFilter, yearFilter, isDepartmentScoped, handledColleges]);

  const getWellnessLabel = (stressLevel?: number) => {
    if (stressLevel == null) return { label: 'No data', color: 'bg-slate-100 text-slate-400' };
    if (stressLevel > 75) return { label: 'At Risk', color: 'bg-red-50 text-red-600' };
    if (stressLevel > 50) return { label: 'Moderate', color: 'bg-amber-50 text-amber-600' };
    return { label: 'Stable', color: 'bg-emerald-50 text-emerald-600' };
  };

  const getDeptCode = (code?: string) => {
    if (!code) return null;
    const col = getCollegeByCode(code);
    return col ? col.code : (DEPARTMENTS.find(d => d.value === code)?.value ?? code);
  };

  const profileAssessments = profileStudent ? (assessmentsMap[profileStudent.id] ?? []) : [];
  const profileInsight = profileStudent ? insightsMap[profileStudent.id] : null;
  const latestAssessment = profileAssessments[0];
  const avgStress = profileAssessments.length > 0
    ? Math.round(profileAssessments.slice(0, 5).reduce((s, a) => s + (a.stressLevel ?? 50), 0) / Math.min(5, profileAssessments.length))
    : null;

  const hasActiveFilters = collegeFilter !== 'all' || programFilter !== 'all' || yearFilter !== 'all';

  return (
    <div className="w-full pb-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Student Directory</h1>
          <p className="text-slate-500 font-medium">Monitoring wellness profiles for the USPF community.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search name, ID, or email..."
              className="pl-10 h-12 w-[280px] bg-white border-none shadow-sm rounded-2xl text-xs font-bold"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Enroll Dialog */}
          <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-[0.25em] shadow-lg shadow-primary/10">
                Create / Enroll Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-[2rem] p-6 border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black">Enroll New Student</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500">
                  Create a student wellness account using official USPF credentials.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEnrollSubmit} className="mt-5 space-y-4">
                {enrollError && (
                  <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-red-700 text-xs font-bold">{enrollError}</div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Full Name <span className="text-red-500">*</span></Label>
                  <Input placeholder="Juan Dela Cruz" value={enrollName} onChange={e => setEnrollName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">University Email <span className="text-red-500">*</span></Label>
                  <Input type="email" placeholder="student@uspf.edu.ph" value={enrollEmail} onChange={e => setEnrollEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Student ID <span className="text-red-500">*</span></Label>
                  <Input placeholder="202300958" value={enrollStudentId} onChange={e => setEnrollStudentId(e.target.value)} required />
                  <p className="text-[10px] text-slate-400">Student ID is also the initial login password.</p>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">College</Label>
                    <Select value={enrollDepartment} onValueChange={(d) => { setEnrollDepartment(d); setEnrollProgram(''); }}>
                      <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                        <SelectValue placeholder="Select college" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {handledColleges.map(d => (
                          <SelectItem key={d.code} value={d.code} className="text-xs font-bold">
                            <span className="font-black text-primary">[{d.code}]</span> — {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Program</Label>
                      <Select 
                        value={enrollProgram} 
                        onValueChange={setEnrollProgram}
                        disabled={!enrollDepartment}
                      >
                        <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                          <SelectValue placeholder={!enrollDepartment ? "Pick college" : "Select program"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {getProgramsForCollege(enrollDepartment).map(p => (
                            <SelectItem key={p} value={p} className="text-xs font-medium">
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Year Level</Label>
                      <Select value={enrollYearLevel} onValueChange={setEnrollYearLevel}>
                        <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {YEAR_LEVELS.map(y => (
                            <SelectItem key={y} value={y} className="text-xs font-bold">{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 bg-primary text-white font-black rounded-2xl mt-2" disabled={isEnrollSubmitting}>
                  {isEnrollSubmitting ? 'Enrolling...' : 'Enroll Student'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <div className="bg-primary/5 px-4 h-12 rounded-2xl flex items-center gap-2 border border-primary/10">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs font-black text-primary">
              {isDepartmentScoped ? `${handledStudentCount} Assigned` : `${students.length} Enrolled`}
            </span>
          </div>
        </div>
      </header>

      {/* ── Filters Dropdown Bar ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Filter className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Filter Students</p>
              <p className="text-[11px] text-slate-400 font-medium">Filter directory by college, degree program, and year level</p>
            </div>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { setCollegeFilter('all'); setProgramFilter('all'); setYearFilter('all'); }}
              className="text-xs font-bold text-primary hover:underline"
            >
              Reset all filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* 1. College Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-primary" /> College
            </Label>
            <Select value={collegeFilter} onValueChange={handleCollegeFilterChange}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50/70 border-slate-200 text-xs font-bold">
                <SelectValue placeholder="All Colleges" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all" className="text-xs font-bold">
                  {isDepartmentScoped && handledColleges.length < COLLEGES_AND_PROGRAMS.length
                    ? `All Handled Colleges (${handledStudentCount})`
                    : `All Colleges (${students.length})`}
                </SelectItem>
                {handledColleges.map(c => (
                  <SelectItem key={c.code} value={c.code} className="text-xs font-bold py-2">
                    <span className="font-black text-primary mr-1.5">[{c.code}]</span>
                    <span>{c.name}</span>
                    <span className="ml-2 text-slate-400 font-normal">({collegeCounts[c.code] ?? 0})</span>
                  </SelectItem>
                ))}
                {collegeCounts['Unassigned'] > 0 && (
                  <SelectItem value="unassigned" className="text-xs font-bold text-slate-500">
                    Unassigned ({collegeCounts['Unassigned']})
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Program Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <BookOpen className="h-3 w-3 text-primary" /> Program / Degree
            </Label>
            <Select 
              value={programFilter} 
              onValueChange={setProgramFilter}
            >
              <SelectTrigger className="h-11 rounded-xl bg-slate-50/70 border-slate-200 text-xs font-bold">
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all" className="text-xs font-bold">
                  All Programs
                </SelectItem>
                {availableProgramsForFilter.map(p => (
                  <SelectItem key={p} value={p} className="text-xs font-medium py-2">
                    <span className="font-semibold">{p}</span>
                    <span className="ml-2 text-slate-400 font-normal">({programCounts[p] ?? 0})</span>
                  </SelectItem>
                ))}
                {programCounts['Unassigned'] > 0 && (
                  <SelectItem value="unassigned" className="text-xs font-bold text-slate-500">
                    Unassigned Program ({programCounts['Unassigned']})
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Year Level Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <GraduationCap className="h-3 w-3 text-primary" /> Year Level
            </Label>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50/70 border-slate-200 text-xs font-bold">
                <SelectValue placeholder="All Year Levels" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all" className="text-xs font-bold">
                  All Year Levels ({students.length})
                </SelectItem>
                {YEAR_LEVELS.map(y => (
                  <SelectItem key={y} value={y} className="text-xs font-bold py-2">
                    <span>{y}</span>
                    <span className="ml-2 text-slate-400 font-normal">({yearCounts[y] ?? 0})</span>
                  </SelectItem>
                ))}
                {yearCounts['Unassigned'] > 0 && (
                  <SelectItem value="unassigned" className="text-xs font-bold text-slate-500">
                    Unassigned ({yearCounts['Unassigned']})
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filter Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
          <p className="text-[11px] font-bold text-slate-500">
            Showing <span className="text-primary font-black">{filteredStudents.length}</span> of {students.length} students
          </p>

          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {collegeFilter !== 'all' && (
                <Badge variant="outline" className="gap-1 bg-primary/5 text-primary border-primary/20 text-[10px] font-bold py-1">
                  College: {collegeFilter}
                  <button onClick={() => setCollegeFilter('all')} className="hover:text-red-500 ml-1">✕</button>
                </Badge>
              )}
              {programFilter !== 'all' && (
                <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold py-1">
                  Program: {programFilter.length > 25 ? programFilter.substring(0, 25) + '...' : programFilter}
                  <button onClick={() => setProgramFilter('all')} className="hover:text-red-500 ml-1">✕</button>
                </Badge>
              )}
              {yearFilter !== 'all' && (
                <Badge variant="outline" className="gap-1 bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold py-1">
                  Year: {yearFilter}
                  <button onClick={() => setYearFilter('all')} className="hover:text-red-500 ml-1">✕</button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden mb-10">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16 pl-8">Student</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16">ID Number</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16">College & Program</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16">Year</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16">Wellness</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16 pr-8 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map(student => {
                const latestA = assessmentsMap[student.id]?.[0];
                const { label, color } = getWellnessLabel(latestA?.stressLevel ?? student.latestStressLevel);
                return (
                  <TableRow key={student.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all group">
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm shrink-0">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">{student.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{student.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-lg bg-slate-50 border-none font-black text-[10px] uppercase px-3 py-1 text-slate-500">
                        {student.studentId || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 max-w-[240px]">
                        {student.department ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                            <span className="text-xs font-black text-primary">[{getDeptCode(student.department)}]</span>
                          </div>
                        ) : null}
                        {student.program ? (
                          <span className="text-[11px] font-semibold text-slate-600 line-clamp-1" title={student.program}>
                            {student.program}
                          </span>
                        ) : !student.department ? (
                          <span className="text-xs text-slate-300 font-bold">—</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {student.yearLevel ? (
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs font-bold text-slate-600">{student.yearLevel}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 font-bold">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`border-none font-black text-[9px] uppercase ${color}`}>{label}</Badge>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 group-hover:text-primary">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 border-slate-100 shadow-xl">
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setProfileStudent(student);
                            }}
                            className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-bold text-xs text-slate-700 hover:bg-slate-50"
                          >
                            <ExternalLink className="h-4 w-4 text-slate-400" /> Clinical Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              openEditDialog(student);
                            }}
                            className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-bold text-xs text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-4 w-4 text-slate-400" /> Update Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1" />
                          <DropdownMenuItem
                            onSelect={() => handleDeleteStudent(student.id)}
                            className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-bold text-xs text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" /> Deactivate Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-2">
                      <Users className="h-8 w-8 opacity-30" />
                      <p className="font-bold text-sm italic">No students match the current filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Update Profile Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!editStudent} onOpenChange={open => { if (!open) setEditStudent(null); }}>
        <DialogContent className="max-w-md rounded-[2rem] p-6 border-none shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black">Update Student Profile</DialogTitle>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editStudent?.studentId}</p>
              </div>
            </div>
            <DialogDescription className="text-sm text-slate-500">
              Edit college, academic program, year level, or display name for this student.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Display Name</Label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder={editStudent?.name}
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">College</Label>
                <Select value={editDepartment} onValueChange={(d) => { setEditDepartment(d); setEditProgram(''); }}>
                  <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Select college" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="none" className="text-xs font-bold text-slate-400">— None —</SelectItem>
                    {handledColleges.map(d => (
                      <SelectItem key={d.code} value={d.code} className="text-xs font-bold">
                        <span className="font-black text-primary">[{d.code}]</span> — {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Program</Label>
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
                        <SelectItem key={p} value={p} className="text-xs font-medium">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Year Level</Label>
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
                className="flex-1 rounded-2xl font-black"
                onClick={() => setEditStudent(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-2xl font-black bg-primary"
                disabled={isEditSubmitting}
              >
                {isEditSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Clinical Profile Modal ──────────────────────────────────────────── */}
      <Dialog open={!!profileStudent} onOpenChange={open => !open && setProfileStudent(null)}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-slate-50 border-b">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm shrink-0">
                <User className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-2xl font-black text-slate-900">{profileStudent?.name}</DialogTitle>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {profileStudent?.studentId || profileStudent?.email}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {profileStudent?.department && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      <Building2 className="h-3 w-3" />[{getDeptCode(profileStudent.department)}]
                    </span>
                  )}
                  {profileStudent?.program && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                      <BookOpen className="h-3 w-3" />{profileStudent.program}
                    </span>
                  )}
                  {profileStudent?.yearLevel && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                      <GraduationCap className="h-3 w-3" />{profileStudent.yearLevel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Avg Stress</p>
                <p className="text-2xl font-black text-slate-900">{avgStress != null ? `${avgStress}%` : '--'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Sessions</p>
                <p className="text-2xl font-black text-slate-900">{profileAssessments.length}</p>
              </div>
              <div className={`p-4 rounded-2xl border text-center ${avgStress != null ? getWellnessLabel(avgStress).color : 'bg-slate-50 text-slate-400'}`}>
                <p className="text-[9px] font-black uppercase opacity-60 mb-2">Status</p>
                <p className="text-2xl font-black">{avgStress != null ? getWellnessLabel(avgStress).label : 'No Data'}</p>
              </div>
            </div>

            {profileInsight && (
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Brain className="h-3.5 w-3.5" /> Latest AI Insight
                </p>
                <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{profileInsight}"</p>
              </div>
            )}

            {latestAssessment?.emotionalState && (
              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Latest Assessment Analytics</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className="bg-primary/10 text-primary border-none font-bold text-xs capitalize">{latestAssessment.emotionalState}</Badge>
                  {latestAssessment.mainConcerns?.map((c: string, i: number) => (
                    <Badge key={i} className="bg-amber-50 text-amber-700 border-none font-bold text-xs capitalize">{c}</Badge>
                  ))}
                  {latestAssessment.focusAreas?.map((f: string, i: number) => (
                    <Badge key={i} className="bg-blue-50 text-blue-700 border-none font-bold text-xs">{f}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" /> Assessment History
              </p>
              {profileAssessments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No formal wellness assessments recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {profileAssessments.slice(0, 5).map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold">
                      <span className="text-slate-600">{new Date(a.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span className="capitalize text-slate-500">{a.emotionalState || 'General'}</span>
                      <Badge className={`border-none ${getWellnessLabel(a.stressLevel).color}`}>{a.stressLevel}% Stress</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Self-Care Assignment */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Heart className="h-3.5 w-3.5 text-rose-500" /> Assigned Self-Care Protocols
                </p>
                <span className="text-[10px] font-bold text-slate-400">
                  {globalSelfCare.length + assignedSelfCare.length} active
                </span>
              </div>

              {(globalSelfCare.length > 0 || assignedSelfCare.length > 0) ? (
                <div className="space-y-2">
                  {/* Global Tools */}
                  {globalSelfCare.map((tool: any) => {
                    const typeIcon = tool.type === 'breathing' ? Wind : tool.type === 'journaling' ? BookOpen : tool.type === 'grounding' ? Anchor : tool.type === 'meditation' ? Music : Brain;
                    return (
                      <div key={`global-${tool.id}`} className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                            {React.createElement(typeIcon, { className: "h-4 w-4 text-primary" })}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-800 truncate">{tool.label}</p>
                              <Badge variant="outline" className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-1.5 py-0">
                                Global
                              </Badge>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold capitalize">{tool.time} • {tool.type}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          type="button"
                          variant="ghost"
                          onClick={() => handleRemoveGlobalSelfCare(tool.id)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}

                  {/* Individual Tools */}
                  {assignedSelfCare.map((tool: any, idx: number) => {
                    const typeIcon = tool.type === 'breathing' ? Wind : tool.type === 'journaling' ? BookOpen : tool.type === 'grounding' ? Anchor : tool.type === 'meditation' ? Music : Brain;
                    return (
                      <div key={`individual-${idx}`} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center border border-slate-100 shrink-0">
                            {React.createElement(typeIcon, { className: "h-4 w-4 text-primary" })}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{tool.label}</p>
                            <p className="text-[10px] text-slate-400 font-bold capitalize">{tool.time} • {tool.type}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          type="button"
                          variant="ghost"
                          onClick={() => handleRemoveSelfCare(idx)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic font-bold">No custom self-care tools assigned yet.</p>
              )}

              {/* Form to add self-care tool */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <p className="text-xs font-bold text-slate-700">Assign New Self-Care Tool</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black text-slate-400 uppercase">Tool Name</Label>
                    <Input
                      placeholder="e.g. Gratitude Journaling"
                      value={newToolLabel}
                      onChange={e => setNewToolLabel(e.target.value)}
                      className="h-9 text-xs bg-white border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black text-slate-400 uppercase">Duration</Label>
                    <Input
                      placeholder="e.g. 10 min"
                      value={newToolTime}
                      onChange={e => setNewToolTime(e.target.value)}
                      className="h-9 text-xs bg-white border-slate-200"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1 pb-1">
                  <Checkbox 
                    id="apply-to-all"
                    checked={applyToAll}
                    onCheckedChange={(checked) => setApplyToAll(!!checked)}
                  />
                  <Label htmlFor="apply-to-all" className="text-xs font-bold text-slate-600 cursor-pointer">
                    Apply to all students
                  </Label>
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black text-slate-400 uppercase">Category</Label>
                    <Select value={newToolType} onValueChange={setNewToolType}>
                      <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breathing">Breathing</SelectItem>
                        <SelectItem value="journaling">Journaling</SelectItem>
                        <SelectItem value="grounding">Grounding</SelectItem>
                        <SelectItem value="meditation">Meditation</SelectItem>
                        <SelectItem value="wellness">Other / General Wellness</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddSelfCare}
                    disabled={isAddingTool || !newToolLabel || !newToolTime}
                    className="h-9 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl w-full"
                  >
                    Add Tool
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
