"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Heart,
  Wind,
  BookOpen,
  Anchor,
  Music,
  Trash2,
  Search,
  Clock,
  Plus,
  Sparkles,
  CheckCircle2,
  Users,
  List,
  LayoutGrid,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getCollegesForCounselor, STORAGE_KEYS } from '@/lib/constants';
import { storageService } from '@/lib/storage-service';

const DEFAULT_PROTOCOLS = [
  {
    id: 'default-1',
    label: 'Gratitude Journaling',
    time: '10 min',
    type: 'journaling',
    isGlobal: true,
  },
  {
    id: 'default-2',
    label: 'Box Breathing (4-4-4-4)',
    time: '5 min',
    type: 'breathing',
    isGlobal: true,
  },
  {
    id: 'default-3',
    label: '5-4-3-2-1 Sensory Grounding',
    time: '8 min',
    type: 'grounding',
    isGlobal: true,
  },
  {
    id: 'default-4',
    label: 'Mindful Body Scan Meditation',
    time: '12 min',
    type: 'meditation',
    isGlobal: true,
  }
];

export default function CounselorSelfCarePage() {
  const { user: counselor } = useAuth();
  const { toast } = useToast();

  const [students, setStudents] = useState<any[]>([]);
  const [globalProtocols, setGlobalProtocols] = useState<any[]>([]);
  const [studentProtocols, setStudentProtocols] = useState<any[]>([]);

  // Form states
  const [toolName, setToolName] = useState('');
  const [toolDuration, setToolDuration] = useState('10');
  const [toolCategory, setToolCategory] = useState<'breathing' | 'journaling' | 'grounding' | 'meditation' | 'wellness'>('wellness');
  const [applyToAll, setApplyToAll] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [isAddingTool, setIsAddingTool] = useState(false);

  // View Mode: 'list' (default) or 'grid'
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Search & Filter
  const [protocolSearch, setProtocolSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Counselor handled colleges
  const handledColleges = useMemo(() => {
    return getCollegesForCounselor(counselor?.department);
  }, [counselor?.department]);

  const isDepartmentScoped = useMemo(() => {
    return Boolean(counselor?.department && counselor.department.trim().toLowerCase() !== 'all');
  }, [counselor?.department]);

  const scopedStudents = useMemo(() => {
    if (!isDepartmentScoped) return students;
    return students.filter(s =>
      !s.department || handledColleges.some(c => s.department === c.code || c.aliases?.includes(s.department))
    );
  }, [students, isDepartmentScoped, handledColleges]);

  // Filtered target students for multi-select assignment list
  const filteredTargetStudents = useMemo(() => {
    if (!studentSearch.trim()) return scopedStudents;
    const q = studentSearch.toLowerCase();
    return scopedStudents.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q) ||
      s.student_id?.toLowerCase().includes(q)
    );
  }, [scopedStudents, studentSearch]);

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const ids = filteredTargetStudents.map(s => s.id);
    setSelectedStudentIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const clearStudentSelection = () => {
    setSelectedStudentIds([]);
  };

  // Load students & protocols
  const loadData = useCallback(async () => {
    try {
      // 1. Fetch students from profiles
      const allUsers = await storageService.getAll<any>(STORAGE_KEYS.USERS);
      const studentList = allUsers.filter(u => u.role === 'student');
      setStudents(studentList);

      // 2. Fetch global protocols (with localStorage fallback)
      let loadedGlobals: any[] = [];
      try {
        const { data, error } = await supabase.from('global_self_care_tools').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          loadedGlobals = data;
        }
      } catch (e) {
        // Table might not exist yet
      }

      if (loadedGlobals.length === 0 && typeof window !== 'undefined') {
        const cached = localStorage.getItem('guidance_global_self_care');
        if (cached) {
          try { loadedGlobals = JSON.parse(cached); } catch {}
        }
        if (!loadedGlobals || loadedGlobals.length === 0) {
          loadedGlobals = DEFAULT_PROTOCOLS;
          localStorage.setItem('guidance_global_self_care', JSON.stringify(DEFAULT_PROTOCOLS));
        }
      }
      setGlobalProtocols(loadedGlobals);

      // 3. Fetch student-specific assigned tools
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, self_care_tools')
        .not('self_care_tools', 'is', null);

      if (profileData) {
        const studentToolsList: any[] = [];
        profileData.forEach((p: any) => {
          if (Array.isArray(p.self_care_tools)) {
            p.self_care_tools.forEach((tool: any, idx: number) => {
              studentToolsList.push({
                ...tool,
                id: tool.id || `${p.id}-tool-${idx}`,
                studentId: p.id,
                studentName: p.name,
                isGlobal: false,
              });
            });
          }
        });
        setStudentProtocols(studentToolsList);
      }
    } catch (err) {
      console.error('Error loading self-care data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Add Self-Care Tool
  const handleAddSelfCare = async (e: React.FormEvent) => {
    e.preventDefault();
    const durationNum = parseInt(String(toolDuration).replace(/\D/g, ''), 10);
    if (!toolName.trim() || isNaN(durationNum) || durationNum <= 0) {
      toast({ variant: 'destructive', title: 'Invalid fields', description: 'Please provide Tool Name and Duration in minutes (e.g. 10).' });
      return;
    }

    setIsAddingTool(true);
    const durationMinutes = Math.max(1, Math.min(180, durationNum));
    const durationFormatted = `${durationMinutes} min`;
    const newToolItem = {
      id: `tool-${Date.now()}`,
      label: toolName.trim(),
      time: durationFormatted,
      duration: durationMinutes,
      type: toolCategory,
      createdAt: new Date().toISOString(),
    };

    try {
      if (applyToAll) {
        // Global Assignment
        let savedToDb = false;
        try {
          const { error } = await supabase
            .from('global_self_care_tools')
            .insert([{ label: newToolItem.label, time: newToolItem.time, duration: newToolItem.duration, type: newToolItem.type }]);
          if (!error) savedToDb = true;
        } catch {}

        const updatedGlobals = [newToolItem, ...globalProtocols];
        setGlobalProtocols(updatedGlobals);
        if (typeof window !== 'undefined') {
          localStorage.setItem('guidance_global_self_care', JSON.stringify(updatedGlobals));
        }

        toast({
          title: "Global Protocol Added",
          description: `Assigned "${newToolItem.label}" (${durationFormatted}) to all students.`,
        });
      } else {
        // BATCH Student Assignment - prevents backend & server overload
        if (selectedStudentIds.length === 0) {
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
          .in('id', selectedStudentIds);

        if (fetchErr) throw fetchErr;

        const profileMap = new Map((targetProfiles || []).map(p => [p.id, p]));

        // 2. Perform updates in parallel batch
        const newStudentEntries: any[] = [];
        const updatePromises = selectedStudentIds.map(async (stId) => {
          const profile = profileMap.get(stId);
          const studentObj = students.find(s => s.id === stId);
          const studentName = profile?.name || studentObj?.name || 'Student';
          const currentTools = Array.isArray(profile?.self_care_tools) ? profile.self_care_tools : [];
          const studentToolItem = {
            ...newToolItem,
            id: `tool-${Date.now()}-${stId.slice(0, 6)}`,
            studentId: stId,
            studentName: studentName,
            isGlobal: false,
          };
          newStudentEntries.push(studentToolItem);
          const updatedTools = [...currentTools, studentToolItem];

          return supabase
            .from('profiles')
            .update({ self_care_tools: updatedTools })
            .eq('id', stId);
        });

        await Promise.all(updatePromises);

        setStudentProtocols(prev => [...newStudentEntries, ...prev]);

        toast({
          title: "Batch Assignment Complete",
          description: `Successfully assigned "${newToolItem.label}" to ${selectedStudentIds.length} student${selectedStudentIds.length > 1 ? 's' : ''} at once.`,
        });
      }

      setToolName('');
      setToolDuration('10');
      setApplyToAll(true);
      setSelectedStudentIds([]);
      setStudentSearch('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to save tool.' });
    } finally {
      setIsAddingTool(false);
    }
  };

  // Handle Remove Tool
  const handleRemoveGlobalTool = async (id: string, label: string) => {
    try {
      try {
        await supabase.from('global_self_care_tools').delete().eq('id', id);
      } catch {}

      const updated = globalProtocols.filter(p => p.id !== id);
      setGlobalProtocols(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('guidance_global_self_care', JSON.stringify(updated));
      }
      toast({ title: 'Protocol Removed', description: `Unassigned "${label}".` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove tool.' });
    }
  };

  const handleRemoveStudentTool = async (studentId: string, toolId: string, label: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('self_care_tools')
        .eq('id', studentId)
        .maybeSingle();

      const currentTools = Array.isArray(profile?.self_care_tools) ? profile.self_care_tools : [];
      const updated = currentTools.filter((t: any, idx: number) => (t.id || `${studentId}-tool-${idx}`) !== toolId);

      await supabase.from('profiles').update({ self_care_tools: updated }).eq('id', studentId);
      setStudentProtocols(prev => prev.filter(p => p.id !== toolId));
      toast({ title: 'Protocol Removed', description: `Unassigned "${label}" from student.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove tool.' });
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

  const allFilteredProtocols = useMemo(() => {
    const combined = [
      ...globalProtocols.map(g => ({ ...g, isGlobal: true })),
      ...studentProtocols.map(s => ({ ...s, isGlobal: false }))
    ];

    return combined.filter(p => {
      const matchQuery = !protocolSearch || p.label?.toLowerCase().includes(protocolSearch.toLowerCase());
      const matchCategory = categoryFilter === 'all' || p.type?.toLowerCase() === categoryFilter.toLowerCase();
      return matchQuery && matchCategory;
    });
  }, [globalProtocols, studentProtocols, protocolSearch, categoryFilter]);

  const totalActiveCount = globalProtocols.length + studentProtocols.length;

  return (
    <div className="w-full pb-12 space-y-8">
      
      {/* Top Title & Header matching media_1789069135148.png */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Heart className="h-6 w-6 text-rose-500 fill-rose-50" />
            <h1 className="text-xl font-black text-slate-900 tracking-wider uppercase">
              ASSIGNED SELF-CARE PROTOCOLS
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Prescribe structured wellness protocols, journaling, breathing rituals, and grounding routines.
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-bold border-slate-200 text-slate-600 px-3 py-1 bg-white shadow-sm self-start sm:self-auto">
          {totalActiveCount} active
        </Badge>
      </div>

      {/* Form Card: "Assign New Self-Care Tool" (Pixel-accurate to media_1789069135148.png) */}
      <div className="p-6 md:p-8 rounded-[2rem] bg-slate-50/80 border border-slate-200/80 shadow-sm space-y-6">
        <div>
          <h2 className="text-sm font-black text-slate-900 tracking-tight">Assign New Self-Care Tool</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Configure an exercise for campus-wide guidance or assign directly to a specific student.
          </p>
        </div>

        <form onSubmit={handleAddSelfCare} className="space-y-4">
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
                    {selectedStudentIds.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="text-[10px] font-black text-teal-700 hover:underline hover:text-teal-800"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={clearStudentSelection}
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
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="h-9 pl-9 text-xs bg-slate-50 rounded-xl border-slate-200 focus-visible:ring-1"
                />
              </div>

              {/* Scrollable multi-student checklist */}
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200/70 bg-slate-50/40">
                {filteredTargetStudents.length > 0 ? (
                  filteredTargetStudents.map(student => {
                    const isSelected = selectedStudentIds.includes(student.id);
                    return (
                      <div
                        key={student.id}
                        onClick={() => toggleStudentSelection(student.id)}
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
                    No students found matching &quot;{studentSearch}&quot;
                  </div>
                )}
              </div>

              {/* Selected student chips preview */}
              {selectedStudentIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedStudentIds.slice(0, 6).map(id => {
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
                            toggleStudentSelection(id);
                          }}
                          className="hover:text-red-500 font-bold ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                  {selectedStudentIds.length > 6 && (
                    <span className="text-[10px] font-bold text-slate-400 px-1.5 py-0.5">
                      +{selectedStudentIds.length - 6} more
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Category & Submit Button row */}
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
                (!applyToAll && selectedStudentIds.length === 0)
              }
              className="h-12 rounded-xl bg-primary text-white font-black text-xs shadow-md shadow-primary/20 hover:opacity-90 transition-all w-full"
            >
              {isAddingTool ? 'Assigning...' : applyToAll ? 'Add Global Tool' : `Batch Assign to ${selectedStudentIds.length} Student${selectedStudentIds.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </form>
      </div>

      {/* Active Protocols Section (List / Grid View) */}
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
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid'
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
          viewMode === 'list' ? (
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
                            handleRemoveGlobalTool(tool.id, tool.label);
                          } else {
                            handleRemoveStudentTool(tool.studentId, tool.id, tool.label);
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
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{tool.label}</h3>
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
                              handleRemoveGlobalTool(tool.id, tool.label);
                            } else {
                              handleRemoveStudentTool(tool.studentId, tool.id, tool.label);
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
  );
}
