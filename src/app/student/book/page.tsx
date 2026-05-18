"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/lib/storage-service';
import { supabase } from '@/lib/supabase';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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
  Brain
} from 'lucide-react';
import { format, isBefore, isWeekend, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const SESSION_TYPES = [
  { value: 'Wellness Check-in', label: 'Wellness Check-in', icon: Heart, color: 'text-emerald-500 bg-emerald-50' },
  { value: 'Academic Stress', label: 'Academic Stress', icon: BookOpen, color: 'text-blue-500 bg-blue-50' },
  { value: 'Personal Concerns', label: 'Personal Concerns', icon: Brain, color: 'text-purple-500 bg-purple-50' },
  { value: 'Career Guidance', label: 'Career Guidance', icon: Briefcase, color: 'text-orange-500 bg-orange-50' },
  { value: 'Mental Health Support', label: 'Mental Health Support', icon: Sparkles, color: 'text-pink-500 bg-pink-50' },
];

const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
];

const STEPS = { DETAILS: 1, DATE: 2, TIME: 3, REASON: 4, CONFIRM: 5 } as const;
type Step = typeof STEPS[keyof typeof STEPS];

export default function BookAppointment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>(STEPS.DETAILS);
  const [selectedCounselor, setSelectedCounselor] = useState('');
  const [selectedSessionType, setSelectedSessionType] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [counselors, setCounselors] = useState<any[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isSlotLoading, setIsSlotLoading] = useState(false);

  const loadCounselors = useCallback(async () => {
    const all = await storageService.getAll<any>(STORAGE_KEYS.USERS);
    setCounselors(all.filter(u => u.role === 'counselor'));
  }, []);

  useEffect(() => { loadCounselors(); }, [loadCounselors]);

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
    return isBefore(startOfDay(date), startOfDay(new Date())) || isWeekend(date);
  }, []);

  const availableSlots = useMemo(() => TIME_SLOTS.filter(s => !bookedSlots.includes(s)), [bookedSlots]);

  const canProceed = useCallback((step: Step): boolean => {
    switch (step) {
      case STEPS.DETAILS: return !!selectedCounselor && !!selectedSessionType;
      case STEPS.DATE: return !!selectedDate;
      case STEPS.TIME: return !!selectedTime && availableSlots.includes(selectedTime);
      case STEPS.REASON: return reason.trim().length >= 10;
      default: return false;
    }
  }, [selectedCounselor, selectedSessionType, selectedDate, selectedTime, reason, availableSlots]);

  const next = () => {
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
    if (!canProceed(STEPS.REASON)) return;
    if (!availableSlots.includes(selectedTime)) {
      toast({ variant: 'destructive', title: 'Slot Unavailable', description: 'This slot was just taken. Please choose another.' });
      setCurrentStep(STEPS.TIME);
      return;
    }
    setIsSubmitting(true);
    try {
      const counselor = counselors.find(c => c.id === selectedCounselor);
      await storageService.create(STORAGE_KEYS.APPOINTMENTS, {
        studentId: user?.id,
        studentName: user?.name,
        counselorId: selectedCounselor,
        counselorName: counselor?.name,
        date: format(selectedDate!, 'yyyy-MM-dd'),
        time: selectedTime,
        type: selectedSessionType,
        status: APPOINTMENT_STATUS.PENDING,
        location: 'Guidance Office - Room 302',
        reason: reason.trim(),
        createdAt: new Date().toISOString(),
      });
      setCurrentStep(STEPS.CONFIRM);
    } catch {
      toast({ variant: 'destructive', title: 'Booking Failed', description: 'An error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCounselor = counselors.find(c => c.id === selectedCounselor);
  const activeType = SESSION_TYPES.find(t => t.value === selectedSessionType);

  const stepLabels = ['Session Details', 'Select Date', 'Choose Time', 'Your Reason', 'Confirmation'];

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="min-h-screen bg-slate-50/50 p-8">
          <div className="max-w-7xl mx-auto w-full">
            <header className="mb-10">
              {currentStep < STEPS.CONFIRM && (
                <Button variant="ghost" onClick={back} className="mb-4 -ml-2 text-slate-500 hover:text-primary font-bold">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              )}
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Book a Session</h1>
              {currentStep < STEPS.CONFIRM && (
                <div className="flex items-center gap-2 mt-4">
                  {stepLabels.slice(0, 4).map((label, i) => (
                    <React.Fragment key={label}>
                      <div className={cn(
                        'flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors',
                        i + 1 === currentStep ? 'text-primary' : i + 1 < currentStep ? 'text-emerald-500' : 'text-slate-300'
                      )}>
                        <div className={cn(
                          'h-5 w-5 rounded-full flex items-center justify-center text-[9px]',
                          i + 1 === currentStep ? 'bg-primary text-white' : i + 1 < currentStep ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                        )}>
                          {i + 1 < currentStep ? '✓' : i + 1}
                        </div>
                        <span className="hidden sm:inline">{label}</span>
                      </div>
                      {i < 3 && <div className="flex-1 h-px bg-slate-100 max-w-[40px]" />}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </header>

            {currentStep === STEPS.CONFIRM ? (
              <div className="max-w-md mx-auto text-center py-12">
                <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-100">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-3">Booking Submitted!</h2>
                <p className="text-slate-500 font-medium mb-2">
                  Your request for a <strong>{selectedSessionType}</strong> with <strong>{activeCounselor?.name}</strong> on <strong>{selectedDate && format(selectedDate, 'MMMM d, yyyy')}</strong> at <strong>{selectedTime}</strong> has been sent.
                </p>
                <p className="text-xs text-slate-400 font-medium mb-10">
                  The counselor will review and confirm your request. You'll be notified once it's accepted.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild className="bg-primary text-white font-black rounded-2xl h-12 px-8">
                    <a href="/student/appointments">View My Appointments</a>
                  </Button>
                  <Button variant="outline" asChild className="font-bold rounded-2xl h-12 px-8 border-slate-200">
                    <a href="/student/dashboard">Back to Dashboard</a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-6">

                  {/* Step 1: Counselor + Session Type */}
                  {currentStep === STEPS.DETAILS && (
                    <Card className="border-none shadow-xl rounded-3xl p-8 bg-white">
                      <CardHeader className="p-0 mb-8">
                        <CardTitle className="text-2xl font-black">Session Details</CardTitle>
                        <p className="text-sm text-slate-400 font-medium mt-1">Choose your counselor and session type.</p>
                      </CardHeader>
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Counselor</Label>
                          <Select value={selectedCounselor} onValueChange={setSelectedCounselor}>
                            <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold">
                              <SelectValue placeholder="Select a counselor..." />
                            </SelectTrigger>
                            <SelectContent>
                              {counselors.map(c => (
                                <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Session Type</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {SESSION_TYPES.map(({ value, label, icon: Icon, color }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setSelectedSessionType(value)}
                                className={cn(
                                  'flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all',
                                  selectedSessionType === value
                                    ? 'border-primary bg-primary/5 shadow-md'
                                    : 'border-slate-100 bg-slate-50 hover:border-primary/30'
                                )}
                              >
                                <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', color)}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <span className={cn('text-xs font-bold', selectedSessionType === value ? 'text-primary' : 'text-slate-700')}>{label}</span>
                                {selectedSessionType === value && (
                                  <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-black text-primary uppercase tracking-wider mb-0.5">Location</p>
                            <p className="text-sm font-bold text-slate-700">Guidance Office — Room 302</p>
                            <p className="text-[10px] text-slate-400 font-medium">In-person consultation</p>
                          </div>
                        </div>

                        <Button size="lg" disabled={!canProceed(STEPS.DETAILS)} onClick={next} className="w-full h-14 rounded-2xl font-black">
                          Continue to Date →
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* Step 2: Date */}
                  {currentStep === STEPS.DATE && (
                    <Card className="border-none shadow-xl rounded-3xl p-8 bg-white">
                      <CardHeader className="p-0 mb-8">
                        <CardTitle className="text-2xl font-black">Select Date</CardTitle>
                        <p className="text-sm text-slate-400 font-medium mt-1">Choose an available weekday.</p>
                      </CardHeader>
                      <div className="flex flex-col items-center">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(d) => { setSelectedDate(d); setSelectedTime(''); }}
                          disabled={isDateDisabled}
                          className="rounded-3xl border shadow-sm p-6"
                        />
                        <div className="flex gap-4 w-full mt-8">
                          <Button variant="outline" size="lg" onClick={back} className="flex-1 h-14 rounded-2xl font-bold">Back</Button>
                          <Button size="lg" disabled={!canProceed(STEPS.DATE)} onClick={next} className="flex-1 h-14 rounded-2xl font-black">Select Time →</Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Step 3: Time */}
                  {currentStep === STEPS.TIME && (
                    <Card className="border-none shadow-xl rounded-3xl p-8 bg-white">
                      <CardHeader className="p-0 mb-8">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-2xl font-black">Choose Time</CardTitle>
                            <p className="text-sm text-slate-400 font-medium mt-1">
                              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
                            <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Live Availability</span>
                          </div>
                        </div>
                      </CardHeader>
                      {isSlotLoading ? (
                        <div className="h-32 flex items-center justify-center text-slate-300 font-bold text-sm">
                          Loading available slots...
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {TIME_SLOTS.map(slot => {
                            const taken = bookedSlots.includes(slot);
                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={taken}
                                onClick={() => !taken && setSelectedTime(slot)}
                                className={cn(
                                  'h-16 rounded-2xl font-bold text-sm border-2 transition-all flex flex-col items-center justify-center gap-0.5',
                                  taken
                                    ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                    : selectedTime === slot
                                      ? 'border-primary bg-primary text-white shadow-lg shadow-primary/25'
                                      : 'border-slate-100 bg-white text-slate-700 hover:border-primary/40 hover:shadow-sm'
                                )}
                              >
                                <span>{slot}</span>
                                {taken && <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">Booked</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mt-4">
                        {availableSlots.length} of {TIME_SLOTS.length} slots available
                      </p>
                      <div className="flex gap-4 w-full mt-6">
                        <Button variant="outline" size="lg" onClick={back} className="flex-1 h-14 rounded-2xl font-bold">Back</Button>
                        <Button size="lg" disabled={!canProceed(STEPS.TIME)} onClick={next} className="flex-1 h-14 rounded-2xl font-black">Add Reason →</Button>
                      </div>
                    </Card>
                  )}

                  {/* Step 4: Reason */}
                  {currentStep === STEPS.REASON && (
                    <Card className="border-none shadow-xl rounded-3xl p-8 bg-white">
                      <CardHeader className="p-0 mb-8">
                        <CardTitle className="text-2xl font-black">Session Goal</CardTitle>
                        <p className="text-sm text-slate-400 font-medium mt-1">Help your counselor prepare for your session.</p>
                      </CardHeader>
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">What's on your mind?</Label>
                          <Textarea
                            placeholder="Describe what you'd like to discuss or get help with..."
                            className="min-h-[180px] rounded-3xl border-slate-100 bg-slate-50 p-6 font-medium resize-none"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                          <p className="text-[10px] text-slate-300 font-bold text-right">{reason.length} chars (min. 10)</p>
                        </div>
                        <div className="flex gap-4">
                          <Button variant="outline" size="lg" onClick={back} className="flex-1 h-14 rounded-2xl font-bold">Back</Button>
                          <Button
                            size="lg"
                            disabled={!canProceed(STEPS.REASON) || isSubmitting}
                            onClick={handleBooking}
                            className="flex-1 h-14 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700"
                          >
                            {isSubmitting ? 'Submitting...' : 'Confirm Booking'}
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
                      <p className="text-[10px] uppercase font-bold text-white/60 tracking-widest">Your Selections</p>
                    </div>
                    <CardContent className="p-8 space-y-6">
                      <div className="flex gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary shrink-0"><User className="h-5 w-5" /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-300 uppercase">Counselor</p>
                          <p className="font-bold text-slate-900">{activeCounselor?.name || '—'}</p>
                        </div>
                      </div>
                      {selectedSessionType && (
                        <div className="flex gap-4">
                          <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', activeType?.color ?? 'bg-slate-50 text-primary')}>
                            {activeType && <activeType.icon className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-300 uppercase">Session Type</p>
                            <p className="font-bold text-slate-900">{selectedSessionType}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary shrink-0"><CalendarDays className="h-5 w-5" /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-300 uppercase">Date</p>
                          <p className="font-bold text-slate-900">{selectedDate ? format(selectedDate, 'MMM dd, yyyy') : '—'}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary shrink-0"><Clock className="h-5 w-5" /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-300 uppercase">Time</p>
                          <p className="font-bold text-slate-900">{selectedTime || '—'}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary shrink-0"><MapPin className="h-5 w-5" /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-300 uppercase">Location</p>
                          <p className="font-bold text-slate-900">Room 302</p>
                        </div>
                      </div>
                      <Badge className="w-full justify-center bg-amber-50 text-amber-700 border-amber-100 font-black text-[10px] uppercase tracking-wider py-2">
                        Pending Counselor Approval
                      </Badge>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
