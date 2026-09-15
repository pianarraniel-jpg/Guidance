import { supabase } from './supabase';

export interface ExerciseCompletionRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  department?: string;
  exerciseId?: string;
  exerciseTitle: string;
  category: 'breathing' | 'journaling' | 'grounding' | 'meditation' | 'wellness' | string;
  durationMinutes: number;
  completedAt: string; // ISO string
  date: string; // Formatted date e.g. "Aug 24, 2026"
  timeStr: string; // Formatted time e.g. "2:45 PM"
  status: 'completed';
  assignedBy?: string;
  notes?: string;
}

const LOCAL_STORAGE_KEY = 'guidance_exercise_completions';

export const exerciseService = {
  // Record a completed exercise for a student
  recordCompletion: async (data: Omit<ExerciseCompletionRecord, 'id' | 'completedAt' | 'date' | 'timeStr' | 'status'> & { id?: string; notes?: string }): Promise<ExerciseCompletionRecord> => {
    const now = new Date();
    const newRecord: ExerciseCompletionRecord = {
      id: data.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studentId: data.studentId,
      studentName: data.studentName,
      studentEmail: data.studentEmail,
      department: data.department || 'CCS',
      exerciseId: data.exerciseId,
      exerciseTitle: data.exerciseTitle,
      category: data.category || 'wellness',
      durationMinutes: data.durationMinutes || 10,
      completedAt: now.toISOString(),
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      timeStr: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      status: 'completed',
      assignedBy: data.assignedBy || 'Counselor Protocol',
      notes: data.notes,
    };

    // 1. Save to local storage
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      const existing: ExerciseCompletionRecord[] = existingStr ? JSON.parse(existingStr) : [];
      const updated = [newRecord, ...existing];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage save failed for exercise completion:', err);
    }

    // 2. Save into profile in Supabase
    try {
      const { data: profile, error: fetchErr } = await supabase
        .from('profiles')
        .select('completed_exercises')
        .eq('id', data.studentId)
        .maybeSingle();

      if (!fetchErr && profile) {
        const existingLogs = Array.isArray(profile.completed_exercises) ? profile.completed_exercises : [];
        const updatedLogs = [newRecord, ...existingLogs];
        await supabase
          .from('profiles')
          .update({ completed_exercises: updatedLogs })
          .eq('id', data.studentId);
      }
    } catch (err) {
      console.warn('Supabase profile update failed for exercise completion:', err);
    }

    return newRecord;
  },

  // Get all completions or by studentId
  getAllCompletions: async (studentId?: string): Promise<ExerciseCompletionRecord[]> => {
    let records: ExerciseCompletionRecord[] = [];

    // 1. Fetch from Supabase profiles
    try {
      let query = supabase.from('profiles').select('id, name, email, department, student_id, completed_exercises');
      if (studentId) {
        query = query.eq('id', studentId);
      }
      const { data, error } = await query;
      if (!error && data) {
        data.forEach((p: any) => {
          if (Array.isArray(p.completed_exercises)) {
            p.completed_exercises.forEach((item: any) => {
              records.push({
                ...item,
                studentId: p.id,
                studentName: item.studentName || p.name || 'Student',
                studentEmail: p.email,
                department: p.department || 'CCS',
              });
            });
          }
        });
      }
    } catch (err) {
      console.warn('Supabase fetch failed for exercise completions:', err);
    }

    // 2. Merge with LocalStorage
    try {
      const localStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localStr) {
        const localList: ExerciseCompletionRecord[] = JSON.parse(localStr);
        const recordMap = new Map<string, ExerciseCompletionRecord>();
        records.forEach(r => recordMap.set(r.id, r));
        localList.forEach(r => {
          if (!studentId || r.studentId === studentId) {
            recordMap.set(r.id, r);
          }
        });
        records = Array.from(recordMap.values());
      }
    } catch (err) {
      console.warn('LocalStorage merge failed for exercise completions:', err);
    }

    // Sort newest first
    records.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    // Fallback demo data if empty
    if (records.length === 0 && !studentId) {
      records = [
        {
          id: 'demo-rec-1',
          studentId: 'student-demo-1',
          studentName: 'Hanz Christian Angelo G. Magbal',
          department: 'CCS',
          exerciseTitle: 'Box Breathing (4-4-4-4)',
          category: 'breathing',
          durationMinutes: 5,
          completedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
          date: new Date(Date.now() - 3600000 * 3).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          timeStr: '11:30 AM',
          status: 'completed',
          assignedBy: 'Campus-wide Protocol',
          notes: 'Completed 5 rounds of Box Breathing before midterm examinations.'
        },
        {
          id: 'demo-rec-2',
          studentId: 'student-demo-1',
          studentName: 'Hanz Christian Angelo G. Magbal',
          department: 'CCS',
          exerciseTitle: '5-4-3-2-1 Sensory Grounding',
          category: 'grounding',
          durationMinutes: 8,
          completedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          date: new Date(Date.now() - 86400000 * 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          timeStr: '3:15 PM',
          status: 'completed',
          assignedBy: 'Counselor Assigned',
          notes: 'Reported feeling significantly calmer after sensory check.'
        },
        {
          id: 'demo-rec-3',
          studentId: 'student-demo-2',
          studentName: 'Janine Marie S. Tan',
          department: 'CBA',
          exerciseTitle: 'Gratitude Journaling',
          category: 'journaling',
          durationMinutes: 10,
          completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          date: new Date(Date.now() - 86400000 * 2).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          timeStr: '9:00 AM',
          status: 'completed',
          assignedBy: 'Campus-wide Protocol',
          notes: 'Documented 3 positive daily reflections.'
        },
        {
          id: 'demo-rec-4',
          studentId: 'student-demo-3',
          studentName: 'Carlos Miguel Gomez',
          department: 'CEA',
          exerciseTitle: 'Mindful Body Scan Meditation',
          category: 'meditation',
          durationMinutes: 12,
          completedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          date: new Date(Date.now() - 86400000 * 3).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          timeStr: '5:45 PM',
          status: 'completed',
          assignedBy: 'Counselor Assigned',
          notes: 'Guided full body scan completed.'
        }
      ];
    }

    return records;
  },

  // Delete/remove a record
  deleteCompletion: async (recordId: string, studentId?: string): Promise<boolean> => {
    try {
      const localStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localStr) {
        const localList: ExerciseCompletionRecord[] = JSON.parse(localStr);
        const filtered = localList.filter(r => r.id !== recordId);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      }

      if (studentId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('completed_exercises')
          .eq('id', studentId)
          .maybeSingle();
        if (profile && Array.isArray(profile.completed_exercises)) {
          const updated = profile.completed_exercises.filter((r: any) => r.id !== recordId);
          await supabase.from('profiles').update({ completed_exercises: updated }).eq('id', studentId);
        }
      }
      return true;
    } catch (err) {
      console.error('Delete completion record failed:', err);
      return false;
    }
  }
};
