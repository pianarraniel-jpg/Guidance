"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/lib/storage-service';
import { supabase } from '@/lib/supabase';
import { STORAGE_KEYS, APPOINTMENT_STATUS, isCounselorMatchingDepartment } from '@/lib/constants';
import { getGoogleCalendarUrl, downloadIcsFile } from '@/lib/appointment-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarDays,
  Clock,
  User,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Radio,
  Sparkles,
  Heart,
  BookOpen,
  Briefcase,
  Brain,
  AlertTriangle,
  Video,
  Building2,
  ShieldCheck,
  CalendarCheck,
  Download,
  ExternalLink,
  Phone,
  Tag,
  Sunrise,
  Sun,
  GraduationCap
} from 'lucide-react';
import { format, isBefore, isWeekend, startOfDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import AcademicClassificationModal from '@/components/student/AcademicClassificationModal';
import { isAcademicClassificationComplete } from '@/lib/profile-utils';

const SESSION_TYPES = [
  { value: 'Wellness Check-in', label: 'Wellness Check-in', icon: Heart, color: 'text-emerald-500 bg-emerald-50' },
  { value: 'Academic Stress', label: 'Academic Stress', icon: BookOpen, color: 'text-blue-500 bg-blue-50' },
  { value: 'Personal Concerns', label: 'Personal Concerns', icon: Brain, color: 'text-purple-500 bg-purple-50' },
  { value: 'Career Guidance', label: 'Career Guidance', icon: Briefcase, color: 'text-orange-500 bg-orange-50' },
  { value: 'Mental Health Support', label: 'Mental Health Support', icon: Sparkles, color: 'text-pink-500 bg-pink-50' },
];

const MORNING_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM'];
const AFTERNOON_SLOTS = ['01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
const TIME_SLOTS = [...MORNING_SLOTS, ...AFTERNOON_SLOTS];

const QUICK_CONCERN_TAGS = [
  'Academic Pressure',
  'Exam Anxiety',
  'Low Motivation',
  'Family Issues',
  'Relationship Concern',
  'Career / Shifting Path',
  'Sleep & Fatigue',
  'Social Adjustment',
  'General Wellness'
];

const CRISIS_KEYWORDS = [
  'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die',
  'hurt myself', 'harm myself', 'cut myself', 'self harm', 'self-harm',
  'no point living', "can't go on", 'end it all', 'better off dead'
];

const getSlotDateTime = (date: Date, slotStr: string): Date => {
  const [timePart, modifier] = slotStr.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  const slotDate = new Date(date);
  slotDate.setHours(hours, minutes, 0, 0);
  return slotDate;
};

const isSlotInPast = (date: Date, slotStr: string): boolean => {
  const slotDate = getSlotDateTime(date, slotStr);
  return isBefore(slotDate, new Date());
};

const STEPS = { DETAILS: 1, DATE: 2, TIME: 3, REASON: 4, CONFIRM: 5 } as const;
type Step = typeof STEPS[keyof typeof STEPS];

export default function BookAppointment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>(STEPS.DETAILS);
  const [selectedCounselor, setSelectedCounselor] = useState('');
  const [selectedSessionType, setSelectedSessionType] = useState('');
  const [modality, setModality] = useState<'in-person' | 'online'>('in-person');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<any>(null);

  const [counselors, setCounselors] = useState<any[]>([]);
  const [counselorAvailability, setCounselorAvailability] = useState<{ day: string; slots: string[] }[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isSlotLoading, setIsSlotLoading] = useState(false);
  const [studentAppointments, setStudentAppointments] = useState<any[]>([]);
  const [conflictingAppointments, setConflictingAppointments] = useState<any[]>([]);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictModalTitle, setConflictModalTitle] = useState('Daily Limit Reached (Max 3 Sessions)');
  const [conflictModalDescription, setConflictModalDescription] = useState('You already have 3 appointments scheduled on this day.');

  const isAcademicComplete = isAcademicClassificationComplete(user);
  const [isClassificationModalOpen, setIsClassificationModalOpen] = useState(false);

  const loadCounselors = useCallback(async () => {
    const all = await storageService.getAll<any>(STORAGE_KEYS.USERS);
    let counselorList = all.filter(u => u.role === 'counselor');

    let studentDept = user?.department;
    if (!studentDept && user?.id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('department')
        .eq('id', user.id)
        .maybeSingle();
      if (prof?.department) studentDept = prof.department;
    }

    if (studentDept) {
      const matched = counselorList.filter(c => isCounselorMatchingDepartment(c.department, studentDept));
      if (matched.length > 0) {
        counselorList = matched;
        setSelectedCounselor(matched[0].id);
      }
    }

    setCounselors(counselorList);
  }, [user]);

  useEffect(() => { loadCounselors(); }, [loadCounselors]);

  const loadStudentAppointments = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('student_id', user.id)
      .neq('status', APPOINTMENT_STATUS.CANCELLED);
    setStudentAppointments(data || []);
  }, [user?.id]);

  useEffect(() => { loadStudentAppointments(); }, [loadStudentAppointments]);

  // Realtime: refresh student appointments when modified
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`student-appointments-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `student_id=eq.${user.id}`,
      }, () => loadStudentAppointments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadStudentAppointments]);

  const loadCounselorAvailability = useCallback(async () => {
    if (!selectedCounselor) {
      setCounselorAvailability([]);
      return;
    }
    try {
      const { data } = await supabase
        .from('availability')
        .select('day, slots')
        .eq('counselor_id', selectedCounselor);
      setCounselorAvailability(data || []);
    } catch (err) {
      console.error('Failed to load counselor availability:', err);
    }
  }, [selectedCounselor]);

  useEffect(() => {
    loadCounselorAvailability();
  }, [loadCounselorAvailability]);

  // Realtime: refresh availability when counselor updates schedule
  useEffect(() => {
    if (!selectedCounselor) return;
    const channel = supabase
      .channel(`avail-${selectedCounselor}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'availability',
        filter: `counselor_id=eq.${selectedCounselor}`,
      }, () => loadCounselorAvailability())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedCounselor, loadCounselorAvailability]);

  const loadBookedSlots = useCallback(async () => {
    if (!selectedDate || !selectedCounselor) { setBookedSlots([]); return; }
    setIsSlotLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('time')
      .eq('counselor_id', selectedCounselor)
      .eq('date', format(selectedDate, 'yyyy-MM-dd'))
      .neq('status', APPOINTMENT_STATUS.CANCELLED);
    setBookedSlots((data ?? []).map(a => a.time));
    setIsSlotLoading(false);
  }, [selectedDate, selectedCounselor]);

  useEffect(() => { loadBookedSlots(); }, [loadBookedSlots]);

  // Realtime: refresh booked slots when another appointment is created/changed for this counselor+date
  useEffect(() => {
    if (!selectedDate || !selectedCounselor) return;
    const channel = supabase
      .channel(`slots-${selectedCounselor}-${format(selectedDate, 'yyyy-MM-dd')}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `counselor_id=eq.${selectedCounselor}`,
      }, () => loadBookedSlots())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDate, selectedCounselor, loadBookedSlots]);

  const isDateDisabled = useCallback((date: Date) => {
    if (isBefore(startOfDay(date), startOfDay(new Date())) || isWeekend(date)) return true;

    // Check counselor configured availability
    if (counselorAvailability.length > 0) {
      const dayName = format(date, 'EEEE');
      const match = counselorAvailability.find(a => a.day.toLowerCase() === dayName.toLowerCase());
      if (!match || !Array.isArray(match.slots) || match.slots.length === 0) {
        return true;
      }
    }

    if (isToday(date)) {
      const dayName = format(date, 'EEEE');
      const match = counselorAvailability.find(a => a.day.toLowerCase() === dayName.toLowerCase());
      const daySlots = (match && match.slots?.length > 0) ? match.slots : TIME_SLOTS;
      const lastSlot = daySlots[daySlots.length - 1];
      if (lastSlot) {
        const lastSlotTime = getSlotDateTime(date, lastSlot);
        if (isBefore(lastSlotTime, new Date())) {
          return true;
        }
      }
    }
    return false;
  }, [counselorAvailability]);

  const handleDateSelect = (d: Date | undefined) => {
    if (!d) {
      setSelectedDate(undefined);
      setSelectedTime('');
      return;
    }

    const dateStr = format(d, 'yyyy-MM-dd');
    const sameDayAppointments = studentAppointments.filter(a => a.date === dateStr);

    if (sameDayAppointments.length >= 3) {
      setConflictingAppointments(sameDayAppointments);
      setConflictModalTitle('Daily Limit Reached (Max 3 Sessions)');
      setConflictModalDescription('You already have 3 appointments scheduled on this day.');
      setIsConflictModalOpen(true);
      setSelectedDate(undefined);
      setSelectedTime('');
      return;
    }

    setSelectedDate(d);
    setSelectedTime('');
  };

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  const studentBookedTimesOnSelectedDate = useMemo(() => {
    if (!selectedDateStr) return [];
    return studentAppointments
      .filter(a => a.date === selectedDateStr)
      .map(a => a.time);
  }, [studentAppointments, selectedDateStr]);

  const activeDaySlots = useMemo(() => {
    if (!selectedDate) return TIME_SLOTS;
    if (counselorAvailability.length > 0) {
      const dayName = format(selectedDate, 'EEEE');
      const match = counselorAvailability.find(a => a.day.toLowerCase() === dayName.toLowerCase());
      if (match && Array.isArray(match.slots) && match.slots.length > 0) {
        return match.slots;
      }
    }
    return TIME_SLOTS;
  }, [selectedDate, counselorAvailability]);

  const availableSlots = useMemo(() => {
    return activeDaySlots.filter(s => {
      if (bookedSlots.includes(s)) return false;
      if (studentBookedTimesOnSelectedDate.includes(s)) return false;
      if (selectedDate && isSlotInPast(selectedDate, s)) return false;
      return true;
    });
  }, [activeDaySlots, bookedSlots, studentBookedTimesOnSelectedDate, selectedDate]);

  const morningAvailableCount = useMemo(() => {
    return MORNING_SLOTS.filter(s => availableSlots.includes(s)).length;
  }, [availableSlots]);

  const afternoonAvailableCount = useMemo(() => {
    return AFTERNOON_SLOTS.filter(s => availableSlots.includes(s)).length;
  }, [availableSlots]);

  const isCrisisDetected = useMemo(() => {
    const text = reason.toLowerCase();
    return CRISIS_KEYWORDS.some(k => text.includes(k));
  }, [reason]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const canProceed = useCallback((step: Step): boolean => {
    switch (step) {
      case STEPS.DETAILS: return !!selectedCounselor && !!selectedSessionType;
      case STEPS.DATE: return !!selectedDate;
      case STEPS.TIME: return !!selectedTime && availableSlots.includes(selectedTime);
      case STEPS.REASON: return reason.trim().length >= 10 && consentAgreed;
      default: return false;
    }
  }, [selectedCounselor, selectedSessionType, selectedDate, selectedTime, reason, availableSlots, consentAgreed]);

  const next = () => {
    if (currentStep === STEPS.DATE && selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const sameDayAppointments = studentAppointments.filter(a => a.date === dateStr);
      if (sameDayAppointments.length >= 3) {
        setConflictingAppointments(sameDayAppointments);
        setConflictModalTitle('Daily Limit Reached (Max 3 Sessions)');
        setConflictModalDescription('You already have 3 appointments scheduled on this day.');
        setIsConflictModalOpen(true);
        setSelectedDate(undefined);
        return;
      }
    }
    if (canProceed(currentStep)) {
      if (currentStep === STEPS.DATE) setSelectedTime('');
      setCurrentStep(prev => (prev + 1) as Step);
    }
  };

  const back = () => {
    if (currentStep > STEPS.DETAILS) setCurrentStep(prev => (prev - 1) as Step);
    else router.push('/student/appointments');
  };

  const handleBooking = async () => {
    if (!isAcademicClassificationComplete(user)) {
      toast({
        variant: 'destructive',
        title: 'Academic Classification Required',
        description: 'Please complete your college, degree program, and year level before booking.',
      });
      setIsClassificationModalOpen(true);
      return;
    }

    if (!canProceed(STEPS.REASON) || !selectedDate) return;
    if (!availableSlots.includes(selectedTime) || isSlotInPast(selectedDate, selectedTime)) {
      toast({ variant: 'destructive', title: 'Slot Unavailable', description: 'This slot has expired or is unavailable. Please choose another.' });
      setCurrentStep(STEPS.TIME);
      setSelectedTime('');
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // 1. Check max 3 appointments per day in database
    const { data: studentDayApps } = await supabase
      .from('appointments')
      .select('*')
      .eq('student_id', user?.id)
      .eq('date', dateStr)
      .neq('status', APPOINTMENT_STATUS.CANCELLED);

    if ((studentDayApps || []).length >= 3) {
      setConflictingAppointments(studentDayApps || []);
      setConflictModalTitle('Daily Limit Reached (Max 3 Sessions)');
      setConflictModalDescription('You already have 3 appointments scheduled on this day.');
      setIsConflictModalOpen(true);
      setCurrentStep(STEPS.DATE);
      setSelectedDate(undefined);
      return;
    }

    // 2. Check if student already has a session at this exact time
    if ((studentDayApps || []).some(a => a.time === selectedTime)) {
      toast({
        variant: 'destructive',
        title: 'Time Slot Conflict',
        description: `You already have another session scheduled at ${selectedTime} on this date.`,
      });
      setCurrentStep(STEPS.TIME);
      setSelectedTime('');
      return;
    }

    // 3. Check if counselor slot is still free
    const { data: counselorSlot } = await supabase
      .from('appointments')
      .select('id')
      .eq('counselor_id', selectedCounselor)
      .eq('date', dateStr)
      .eq('time', selectedTime)
      .neq('status', APPOINTMENT_STATUS.CANCELLED)
      .maybeSingle();

    if (counselorSlot) {
      toast({
        variant: 'destructive',
        title: 'Slot Already Booked',
        description: 'This counselor slot was just taken by another student. Please choose another time.',
      });
      await loadBookedSlots();
      setCurrentStep(STEPS.TIME);
      setSelectedTime('');
      return;
    }

    setIsSubmitting(true);
    try {
      const counselor = counselors.find(c => c.id === selectedCounselor);
      const locationText = modality === 'online' 
        ? 'Online (Google Meet — Link will be provided upon confirmation)' 
        : 'Guidance Office — Room 302';

      const tagsHeader = selectedTags.length > 0 ? `[Focus: ${selectedTags.join(', ')}]\n\n` : '';
      const fullReason = `${tagsHeader}${reason.trim()}`;

      const created = await storageService.create(STORAGE_KEYS.APPOINTMENTS, {
        studentId: user?.id,
        studentName: user?.name,
        counselorId: selectedCounselor,
        counselorName: counselor?.name,
        date: dateStr,
        time: selectedTime,
        type: selectedSessionType,
        status: APPOINTMENT_STATUS.PENDING,
        location: locationText,
        reason: fullReason,
        createdAt: new Date().toISOString(),
      });

      setConfirmedAppointment(created);
      setCurrentStep(STEPS.CONFIRM);
    } catch {
      toast({ variant: 'destructive', title: 'Booking Failed', description: 'An error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCounselor = counselors.find(c => c.id === selectedCounselor);
  const activeType = SESSION_TYPES.find(t => t.value === selectedSessionType);
  const stepLabels = ['Session Details', 'Select Date', 'Choose Time', 'Intake & Consent', 'Confirmation'];

  const handleAddToGoogleCalendar = () => {
    if (!selectedDate || !selectedTime) return;
    const url = getGoogleCalendarUrl({
      title: `USPF Guidance: ${selectedSessionType} with ${activeCounselor?.name || 'Counselor'}`,
      description: `Guidance Consultation Session.\nCounselor: ${activeCounselor?.name}\nMode: ${modality === 'online' ? 'Online Google Meet' : 'In-Person (Room 302)'}\nReference: ${confirmedAppointment?.id ? `#USPF-GS-${confirmedAppointment.id.substring(0, 8).toUpperCase()}` : ''}`,
      location: modality === 'online' ? 'Google Meet (Virtual)' : 'USPF Guidance Office - Room 302',
      dateStr: format(selectedDate, 'yyyy-MM-dd'),
      timeStr: selectedTime,
      durationMinutes: 60,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadIcs = () => {
    if (!selectedDate || !selectedTime) return;
    downloadIcsFile({
      title: `USPF Guidance: ${selectedSessionType} (${activeCounselor?.name || 'Counselor'})`,
      description: `Guidance Consultation Session at University of Southern Philippines Foundation.\nCounselor: ${activeCounselor?.name}\nMode: ${modality === 'online' ? 'Online Google Meet' : 'In-Person (Room 302)'}`,
      location: modality === 'online' ? 'Google Meet (Virtual)' : 'USPF Guidance Office - Room 302',
      dateStr: format(selectedDate, 'yyyy-MM-dd'),
      timeStr: selectedTime,
      durationMinutes: 60,
    }, `USPF-Guidance-${format(selectedDate, 'yyyyMMdd')}.ics`);
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="min-h-screen bg-slate-50/50 p-4 sm:p-8">
          <div className="w-full max-w-7xl mx-auto">
            <header className="mb-8">
              {currentStep < STEPS.CONFIRM && (
                <Button variant="ghost" onClick={back} className="mb-4 -ml-2 text-slate-500 hover:text-primary font-bold">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Book Consultation</h1>
                  <p className="text-sm text-slate-500 mt-1 font-medium">Schedule a confidential appointment with your designated college guidance counselor.</p>
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-200/80 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-600 shadow-sm w-fit">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>RA 9258 / RA 10173 Protected</span>
                </div>
              </div>

              {isAcademicComplete && currentStep < STEPS.CONFIRM && (
                <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2">
                  {stepLabels.slice(0, 4).map((label, i) => (
                    <React.Fragment key={label}>
                      <div className={cn(
                        'flex items-center gap-2 text-[11px] font-black uppercase tracking-wider transition-colors shrink-0',
                        i + 1 === currentStep ? 'text-primary' : i + 1 < currentStep ? 'text-emerald-600' : 'text-slate-300'
                      )}>
                        <div className={cn(
                          'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm',
                          i + 1 === currentStep ? 'bg-primary text-white' : i + 1 < currentStep ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                        )}>
                          {i + 1 < currentStep ? '✓' : i + 1}
                        </div>
                        <span>{label}</span>
                      </div>
                      {i < 3 && <div className="flex-1 h-0.5 bg-slate-200 min-w-[24px] max-w-[48px]" />}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </header>

            {!isAcademicComplete ? (
              <div className="max-w-2xl mx-auto py-8">
                <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden text-center p-8 sm:p-12">
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mb-6 shadow-inner">
                    <GraduationCap className="h-8 w-8" />
                  </div>

                  <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[11px] uppercase tracking-wider mb-3 px-3 py-1">
                    Academic Classification Required
                  </Badge>

                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
                    Academic Profile Incomplete
                  </h2>

                  <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed mb-8">
                    USPF guidance counselors are specialized by college department. Setting your academic classification ensures your consultation request is assigned to your designated college guidance counselor.
                  </p>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 mb-8 text-left max-w-md mx-auto space-y-3">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">College / Department</span>
                      {user?.department ? (
                        <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {user.department}
                        </span>
                      ) : (
                        <span className="font-bold text-red-600 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Not Set
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">Degree Program / Course</span>
                      {user?.program ? (
                        <span className="font-bold text-emerald-700 flex items-center gap-1.5 truncate max-w-[200px]" title={user.program}>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {user.program}
                        </span>
                      ) : (
                        <span className="font-bold text-red-600 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Not Set
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Year Level</span>
                      {user?.yearLevel ? (
                        <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {user.yearLevel}
                        </span>
                      ) : (
                        <span className="font-bold text-red-600 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Not Set
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button
                      onClick={() => setIsClassificationModalOpen(true)}
                      className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                    >
                      Set Academic Classification
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold border-slate-200 text-slate-700"
                    >
                      <Link href="/student/dashboard">Return to Dashboard</Link>
                    </Button>
                  </div>
                </Card>
              </div>
            ) : currentStep === STEPS.CONFIRM ? (
              /* Step 5: Official Digital Pass & Instant Calendar Sync */
              <div className="max-w-xl mx-auto py-6">
                <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden text-left">
                  {/* Digital Pass Header */}
                  <div className="bg-gradient-to-r from-primary to-emerald-700 p-8 text-white relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center font-black text-sm">
                          GS
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-white/90">USPF GuidanceSync</span>
                      </div>
                      <Badge className="bg-white/20 hover:bg-white/30 text-white border-none font-bold text-[10px] uppercase tracking-wider">
                        Consultation Pass
                      </Badge>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-1">Appointment Submitted</h2>
                    <p className="text-xs text-white/80 font-medium">
                      Reference Code: <strong className="font-mono text-white text-sm">#USPF-GS-{(confirmedAppointment?.id || '2026').substring(0, 8).toUpperCase()}</strong>
                    </p>
                  </div>

                  {/* Pass Body */}
                  <CardContent className="p-8 space-y-6">
                    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/60 flex items-start gap-3">
                      <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-amber-800">Status: Pending Counselor Approval</p>
                        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed font-medium">
                          Your appointment request has been transmitted. Your counselor will review and confirm this slot. You will see live updates on your dashboard.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Assigned Counselor</p>
                        <p className="text-sm font-bold text-slate-900">{activeCounselor?.name || 'USPF Counselor'}</p>
                        <p className="text-[10px] text-slate-500">{activeCounselor?.department ? `${activeCounselor.department} Department` : 'Guidance Office'}</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Session Type</p>
                        <p className="text-sm font-bold text-slate-900">{selectedSessionType}</p>
                        <p className="text-[10px] text-primary font-bold">Standard 60-min Consultation</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Scheduled Date & Time</p>
                        <p className="text-sm font-bold text-slate-900">{selectedDate && format(selectedDate, 'EEEE, MMM d, yyyy')}</p>
                        <p className="text-xs font-bold text-primary">{selectedTime}</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Consultation Modality</p>
                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                          {modality === 'online' ? <Video className="h-4 w-4 text-blue-600" /> : <Building2 className="h-4 w-4 text-emerald-600" />}
                          <span>{modality === 'online' ? 'Online Tele-Counseling' : 'In-Person (Room 302)'}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {modality === 'online' ? 'Google Meet link provided on confirmation' : 'Guidance Office, Main Campus'}
                        </p>
                      </div>
                    </div>

                    {/* Instant Calendar Integration */}
                    <div className="pt-2 border-t border-slate-100 space-y-3">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">Save to Your Schedule</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleAddToGoogleCalendar}
                          className="h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-2"
                        >
                          <CalendarCheck className="h-4 w-4 text-primary" />
                          <span>Add to Google Calendar</span>
                          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                        </Button>

                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleDownloadIcs}
                          className="h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-2"
                        >
                          <Download className="h-4 w-4 text-emerald-600" />
                          <span>Download .ics File</span>
                        </Button>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <Button asChild className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white font-black rounded-xl shadow-lg shadow-primary/20">
                        <Link href="/student/appointments">View My Appointments</Link>
                      </Button>
                      <Button variant="ghost" asChild className="flex-1 h-12 rounded-xl font-bold text-slate-600 hover:bg-slate-100">
                        <Link href="/student/dashboard">Return to Dashboard</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-6">

                  {/* Step 1: Counselor, Modality + Session Type */}
                  {currentStep === STEPS.DETAILS && (
                    <Card className="border-none shadow-xl rounded-3xl p-4 sm:p-8 bg-white">
                      <CardHeader className="p-0 mb-8">
                        <CardTitle className="text-2xl font-black">1. Session Details</CardTitle>
                        <p className="text-sm text-slate-400 font-medium mt-1">Select your designated counselor, consultation format, and focus area.</p>
                      </CardHeader>
                      <div className="space-y-6">
                        {/* Counselor Picker */}
                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Guidance Counselor</Label>
                          <Select value={selectedCounselor} onValueChange={setSelectedCounselor}>
                            <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold">
                              <SelectValue placeholder="Select a counselor..." />
                            </SelectTrigger>
                            <SelectContent>
                              {counselors.map(c => (
                                <SelectItem key={c.id} value={c.id} className="font-bold">
                                  {c.name} {c.department ? `(${c.department})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Consultation Modality Selection */}
                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Consultation Mode</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setModality('in-person')}
                              className={cn(
                                'p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3',
                                modality === 'in-person'
                                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                                  : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                              )}
                            >
                              <div className={cn(
                                'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                                modality === 'in-person' ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'
                              )}>
                                <Building2 className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-slate-900">In-Person Consultation</span>
                                  {modality === 'in-person' && <span className="text-[10px] font-black uppercase text-primary">Active</span>}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">Guidance Office — Room 302, Main Campus</p>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setModality('online')}
                              className={cn(
                                'p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3',
                                modality === 'online'
                                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                                  : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                              )}
                            >
                              <div className={cn(
                                'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                                modality === 'online' ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'
                              )}>
                                <Video className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-slate-900">Virtual Tele-Counseling</span>
                                  {modality === 'online' && <span className="text-[10px] font-black uppercase text-primary">Active</span>}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">Secure Google Meet video link provided upon confirmation</p>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Session Type */}
                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Primary Session Category</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {SESSION_TYPES.map(({ value, label, icon: Icon, color }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setSelectedSessionType(value)}
                                className={cn(
                                  'relative flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-2xl border-2 transition-all min-h-[105px] w-full',
                                  selectedSessionType === value
                                    ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
                                    : 'border-slate-100 bg-slate-50 hover:border-primary/20 hover:bg-slate-100/50'
                                )}
                              >
                                <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center mb-2 shrink-0', color)}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <span className={cn(
                                  'text-[10px] sm:text-[11px] leading-snug font-bold uppercase tracking-tight text-center break-words w-full px-1',
                                  selectedSessionType === value ? 'text-primary font-black' : 'text-slate-700'
                                )}>
                                  {label}
                                </span>
                                {selectedSessionType === value && (
                                  <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center text-white text-[8px] font-bold shadow-sm">
                                    ✓
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        <Button size="lg" disabled={!canProceed(STEPS.DETAILS)} onClick={next} className="w-full h-14 rounded-2xl font-black text-base shadow-lg shadow-primary/20">
                          Continue to Select Date →
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* Step 2: Date */}
                  {currentStep === STEPS.DATE && (
                    <Card className="border-none shadow-xl rounded-3xl p-4 sm:p-8 bg-white">
                      <CardHeader className="p-0 mb-8">
                        <CardTitle className="text-2xl font-black">2. Select Consultation Date</CardTitle>
                        <p className="text-sm text-slate-400 font-medium mt-1">Select an active university working weekday. Weekends and passed dates are disabled.</p>
                        {counselorAvailability.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mt-3 p-3 rounded-2xl bg-primary/5 border border-primary/10">
                            <CalendarCheck className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-xs font-bold text-slate-700">
                              Counselor's Active Consultation Days:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {counselorAvailability.map(a => (
                                <Badge key={a.day} variant="outline" className="bg-white border-primary/20 text-primary font-bold text-[10px]">
                                  {a.day}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardHeader>
                      <div className="flex flex-col items-center">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          disabled={isDateDisabled}
                          className="rounded-3xl border shadow-sm p-6 bg-white"
                        />
                        <div className="flex gap-4 w-full mt-8">
                          <Button variant="outline" size="lg" onClick={back} className="flex-1 h-14 rounded-2xl font-bold">Back</Button>
                          <Button size="lg" disabled={!canProceed(STEPS.DATE)} onClick={next} className="flex-1 h-14 rounded-2xl font-black">Continue to Time Slots →</Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Step 3: Time with Morning & Afternoon Grouping */}
                  {currentStep === STEPS.TIME && (
                    <Card className="border-none shadow-xl rounded-3xl p-4 sm:p-8 bg-white">
                      <CardHeader className="p-0 mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <CardTitle className="text-2xl font-black">3. Choose Available Time Slot</CardTitle>
                            <p className="text-sm text-slate-400 font-medium mt-1">
                              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 w-fit">
                            <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Real-time Slot Verification</span>
                          </div>
                        </div>
                      </CardHeader>

                      {isSlotLoading ? (
                        <div className="h-40 flex items-center justify-center text-slate-400 font-bold text-sm">
                          Checking live counselor availability...
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Morning Section */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                                <Sunrise className="h-4 w-4 text-amber-500" />
                                <span>Morning Window (9:00 AM – 12:00 PM)</span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">{morningAvailableCount} available</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {MORNING_SLOTS.map(slot => {
                                const isOffered = activeDaySlots.includes(slot);
                                const takenByCounselor = bookedSlots.includes(slot);
                                const takenByStudent = studentBookedTimesOnSelectedDate.includes(slot);
                                const isPast = selectedDate ? isSlotInPast(selectedDate, slot) : false;
                                const isUnavailable = !isOffered || takenByCounselor || takenByStudent || isPast;
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    disabled={isUnavailable}
                                    onClick={() => !isUnavailable && setSelectedTime(slot)}
                                    className={cn(
                                      'h-16 rounded-2xl font-bold text-sm border-2 transition-all flex flex-col items-center justify-center gap-0.5',
                                      isUnavailable
                                        ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                        : selectedTime === slot
                                          ? 'border-primary bg-primary text-white shadow-lg shadow-primary/25'
                                          : 'border-slate-100 bg-white text-slate-700 hover:border-primary/40 hover:shadow-sm'
                                    )}
                                  >
                                    <span className={isUnavailable ? 'text-slate-400' : ''}>{slot}</span>
                                    {!isOffered ? (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-300">Off-duty</span>
                                    ) : isPast ? (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Past Time</span>
                                    ) : takenByStudent ? (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-amber-500">Your Session</span>
                                    ) : takenByCounselor ? (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Booked</span>
                                    ) : selectedTime === slot ? (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-white">Selected</span>
                                    ) : (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600">Available</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Afternoon Section */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                                <Sun className="h-4 w-4 text-orange-500" />
                                <span>Afternoon Window (1:00 PM – 5:00 PM)</span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">{afternoonAvailableCount} available</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {AFTERNOON_SLOTS.map(slot => {
                                const isOffered = activeDaySlots.includes(slot);
                                const takenByCounselor = bookedSlots.includes(slot);
                                const takenByStudent = studentBookedTimesOnSelectedDate.includes(slot);
                                const isPast = selectedDate ? isSlotInPast(selectedDate, slot) : false;
                                const isUnavailable = !isOffered || takenByCounselor || takenByStudent || isPast;
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    disabled={isUnavailable}
                                    onClick={() => !isUnavailable && setSelectedTime(slot)}
                                    className={cn(
                                      'h-16 rounded-2xl font-bold text-sm border-2 transition-all flex flex-col items-center justify-center gap-0.5',
                                      isUnavailable
                                        ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                        : selectedTime === slot
                                          ? 'border-primary bg-primary text-white shadow-lg shadow-primary/25'
                                          : 'border-slate-100 bg-white text-slate-700 hover:border-primary/40 hover:shadow-sm'
                                    )}
                                  >
                                    <span className={isUnavailable ? 'text-slate-400' : ''}>{slot}</span>
                                    {!isOffered ? (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-300">Off-duty</span>
                                    ) : isPast ? (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Past Time</span>
                                    ) : takenByStudent ? (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-amber-500">Your Session</span>
                                    ) : takenByCounselor ? (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Booked</span>
                                    ) : selectedTime === slot ? (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-white">Selected</span>
                                    ) : (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600">Available</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4 w-full mt-8">
                        <Button variant="outline" size="lg" onClick={back} className="flex-1 h-14 rounded-2xl font-bold">Back</Button>
                        <Button size="lg" disabled={!canProceed(STEPS.TIME)} onClick={next} className="flex-1 h-14 rounded-2xl font-black">Continue to Intake & Consent →</Button>
                      </div>
                    </Card>
                  )}

                  {/* Step 4: Intake, Concern Tags & Informed Consent */}
                  {currentStep === STEPS.REASON && (
                    <Card className="border-none shadow-xl rounded-3xl p-4 sm:p-8 bg-white">
                      <CardHeader className="p-0 mb-6">
                        <CardTitle className="text-2xl font-black">4. Intake Goals & Consent</CardTitle>
                        <p className="text-sm text-slate-400 font-medium mt-1">Provide background information to help your counselor prepare an effective session.</p>
                      </CardHeader>
                      <div className="space-y-6">
                        {/* Quick Tags */}
                        <div className="space-y-2.5">
                          <Label className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5 text-primary" />
                            <span>Select Focus Tags (Optional)</span>
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {QUICK_CONCERN_TAGS.map(tag => {
                              const isSelected = selectedTags.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => toggleTag(tag)}
                                  className={cn(
                                    'px-3 py-1.5 rounded-full text-xs font-bold transition-all border',
                                    isSelected
                                      ? 'bg-primary text-white border-primary shadow-sm'
                                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                  )}
                                >
                                  {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Reason Textarea */}
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">
                            What would you like to discuss? <span className="text-red-500">*</span>
                          </Label>
                          <Textarea
                            placeholder="Briefly describe what you're currently experiencing, challenges you're facing, or specific guidance you seek..."
                            className="min-h-[140px] rounded-2xl border-slate-200 bg-slate-50/50 p-4 font-medium resize-none text-slate-800 text-sm focus-visible:ring-1"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                            <span>Minimum 10 characters required</span>
                            <span className={reason.length >= 10 ? 'text-emerald-600' : 'text-slate-400'}>{reason.length} chars</span>
                          </div>
                        </div>

                        {/* Crisis Triage Safety Card */}
                        {isCrisisDetected && (
                          <div className="p-5 rounded-2xl bg-red-50 border-2 border-red-200 text-red-900 space-y-3 animate-in fade-in">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-sm font-bold">You are not alone. Immediate support is available right now.</p>
                                <p className="text-xs text-red-700 leading-relaxed font-medium">
                                  If you are experiencing severe distress or thoughts of self-harm, please reach out directly for immediate support:
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs font-bold">
                              <div className="p-3 rounded-xl bg-white border border-red-200 flex items-center gap-2.5">
                                <Phone className="h-4 w-4 text-red-600 shrink-0" />
                                <div>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">National Crisis Hotline</p>
                                  <p className="text-red-700 font-mono font-bold">1553 (Toll-Free) or 0917-899-8727</p>
                                </div>
                              </div>
                              <div className="p-3 rounded-xl bg-white border border-red-200 flex items-center gap-2.5">
                                <MapPin className="h-4 w-4 text-red-600 shrink-0" />
                                <div>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">USPF Clinic & Guidance</p>
                                  <p className="text-red-700 font-bold">Room 302 / Tel: (032) 414-8773</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Mandatory Informed Consent & Confidentiality Checkbox */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                          <div className="flex items-start gap-3">
                            <Checkbox 
                              id="consent-check" 
                              checked={consentAgreed} 
                              onCheckedChange={(checked) => setConsentAgreed(Boolean(checked))}
                              className="mt-1 data-[state=checked]:bg-primary"
                            />
                            <label htmlFor="consent-check" className="text-xs text-slate-700 leading-relaxed font-medium cursor-pointer select-none">
                              <strong className="text-slate-900 block font-bold mb-0.5">Informed Consent & Confidentiality Agreement</strong>
                              I understand that all counseling consultations are confidential in accordance with the <strong>Guidance and Counseling Act of 2004 (RA 9258)</strong> and the <strong>Data Privacy Act of 2012 (RA 10173)</strong>. Exceptions to confidentiality are legally mandated only in circumstances involving imminent risk of harm to myself or others.
                            </label>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <Button variant="outline" size="lg" onClick={back} className="flex-1 h-14 rounded-2xl font-bold">Back</Button>
                          <Button
                            size="lg"
                            disabled={!canProceed(STEPS.REASON) || isSubmitting}
                            onClick={handleBooking}
                            className="flex-1 h-14 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 text-base"
                          >
                            {isSubmitting ? 'Submitting Request...' : 'Confirm & Submit Booking'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Booking Summary Sidebar */}
                <div className="lg:col-span-4">
                  <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden sticky top-8">
                    <div className="p-8 bg-primary text-white">
                      <h3 className="text-xl font-black mb-1">Booking Summary</h3>
                      <p className="text-[10px] uppercase font-bold text-white/60 tracking-widest">Active Selections</p>
                    </div>
                    <CardContent className="p-8 space-y-5">
                      <div className="flex gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary shrink-0"><User className="h-5 w-5" /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Counselor</p>
                          <p className="font-bold text-slate-900 text-sm">{activeCounselor?.name || '—'}</p>
                        </div>
                      </div>

                      {selectedSessionType && (
                        <div className="flex gap-4">
                          <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', activeType?.color ?? 'bg-slate-50 text-primary')}>
                            {activeType && <activeType.icon className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">Session Type</p>
                            <p className="font-bold text-slate-900 text-sm">{selectedSessionType}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary shrink-0">
                          {modality === 'online' ? <Video className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Modality</p>
                          <p className="font-bold text-slate-900 text-sm">
                            {modality === 'online' ? 'Online (Google Meet)' : 'In-Person (Room 302)'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary shrink-0"><CalendarDays className="h-5 w-5" /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Date</p>
                          <p className="font-bold text-slate-900 text-sm">{selectedDate ? format(selectedDate, 'MMM dd, yyyy') : '—'}</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary shrink-0"><Clock className="h-5 w-5" /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Time Slot</p>
                          <p className="font-bold text-slate-900 text-sm">{selectedTime || '—'}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <Badge className="w-full justify-center bg-amber-50 text-amber-700 border-amber-200 font-black text-[10px] uppercase tracking-wider py-2">
                          Pending Counselor Approval
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Appointment Conflict Warning Modal */}
        <Dialog open={isConflictModalOpen} onOpenChange={setIsConflictModalOpen}>
          <DialogContent className="max-w-md p-6 sm:p-8 rounded-[2rem] border-none shadow-2xl bg-white animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader className="flex flex-col items-center text-center pb-2">
              <div className="h-16 w-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 ring-8 ring-amber-50/60 shadow-inner">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
                {conflictModalTitle}
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-500 mt-1">
                {conflictModalDescription}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {conflictingAppointments.map((app, idx) => (
                  <div key={app.id || idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Session {idx + 1}
                      </span>
                      <Badge className={cn(
                        "text-[10px] font-black py-0.5 px-2.5 rounded-full border shadow-none",
                        app.status === 'confirmed'
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      )} variant="outline">
                        {app.status === 'confirmed' ? 'Confirmed' : 'Pending Review'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{app.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{app.counselor_name || app.counselorName || 'Counselor'}</span>
                      </div>
                      {app.type && (
                        <div className="col-span-2 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{app.type}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-500 leading-relaxed text-center px-2 font-medium">
                Students may book up to 3 appointments per day across available time slots. Please choose another date or manage your existing bookings.
              </p>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 sm:space-x-0">
              <Button
                variant="outline"
                onClick={() => setIsConflictModalOpen(false)}
                className="w-full sm:flex-1 h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                Choose Another Date
              </Button>
              <Button
                asChild
                className="w-full sm:flex-1 h-12 rounded-xl font-black bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
              >
                <Link href="/student/appointments">
                  View Appointments
                </Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AcademicClassificationModal
          open={isClassificationModalOpen}
          onOpenChange={setIsClassificationModalOpen}
          onSuccess={() => {
            loadCounselors();
          }}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
