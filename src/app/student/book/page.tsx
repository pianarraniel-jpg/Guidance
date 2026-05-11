"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  CheckCircle2,
  Info,
  Target,
  AlertCircle,
  MapPin
} from 'lucide-react';
import { format, isBefore, isWeekend, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

const STEPS = {
  COUNSELOR: 1,
  DATE: 2,
  TIME: 3,
  REASON: 4
} as const;

type Step = typeof STEPS[keyof typeof STEPS];

export default function BookAppointment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>(STEPS.COUNSELOR);
  const [selectedCounselor, setSelectedCounselor] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [counselors, setCounselors] = useState<any[]>([]);

  useEffect(() => {
    const allUsers = storageService.getByField<any>(STORAGE_KEYS.USERS, 'role', 'counselor');
    setCounselors(allUsers || []);
  }, []);

  const timeSlots = useMemo(() => [
    "09:00 AM", 
    "10:00 AM", 
    "11:00 AM", 
    "01:00 PM", 
    "02:00 PM", 
    "03:00 PM", 
    "04:00 PM"
  ], []);

  const bookedSlots = useMemo(() => {
    if (!selectedDate || !selectedCounselor) return [];
    const appointments = storageService.getByField<any>(STORAGE_KEYS.APPOINTMENTS, 'counselorId', selectedCounselor);
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    return appointments
      .filter(apt => apt.date === dateString && apt.status !== APPOINTMENT_STATUS.CANCELLED)
      .map(apt => apt.time);
  }, [selectedDate, selectedCounselor]);

  const availableTimeSlots = useMemo(() => {
    return timeSlots.filter(slot => !bookedSlots.includes(slot));
  }, [timeSlots, bookedSlots]);

  const isTimeAvailable = useCallback((time: string) => {
    return availableTimeSlots.includes(time);
  }, [availableTimeSlots]);

  const isDateDisabled = useCallback((date: Date) => {
    const today = startOfDay(new Date());
    return isBefore(startOfDay(date), today) || isWeekend(date);
  }, []);

  const canProceedFromStep = useCallback((step: Step): boolean => {
    switch (step) {
      case STEPS.COUNSELOR: return !!selectedCounselor;
      case STEPS.DATE: return !!selectedDate;
      case STEPS.TIME: return !!selectedTime && isTimeAvailable(selectedTime);
      case STEPS.REASON: return !!reason.trim();
      default: return false;
    }
  }, [selectedCounselor, selectedDate, selectedTime, reason, isTimeAvailable]);

  const goToNextStep = () => {
    if (canProceedFromStep(currentStep)) {
      if (currentStep === STEPS.DATE) setSelectedTime('');
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const goToPreviousStep = () => setCurrentStep((prev) => (prev - 1) as Step);

  const handleBackToOverview = () => {
    if (currentStep > STEPS.COUNSELOR) goToPreviousStep();
    else router.push('/student/appointments');
  };

  const handleBooking = async () => {
    if (!selectedCounselor || !selectedDate || !selectedTime || !reason.trim()) return;
    if (!isTimeAvailable(selectedTime)) {
      toast({ variant: "destructive", title: "Time Slot Unavailable", description: "This time slot is no longer available." });
      return;
    }

    setIsSubmitting(true);
    try {
      const counselor = counselors.find(c => c.id === selectedCounselor);
      const newAppointment = {
        studentId: user?.id,
        studentName: user?.name,
        counselorId: selectedCounselor,
        counselorName: counselor?.name,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        type: 'Physical Session',
        status: APPOINTMENT_STATUS.PENDING,
        location: 'Guidance Office - Room 302',
        reason: reason.trim(),
        createdAt: new Date().toISOString()
      };

      storageService.create(STORAGE_KEYS.APPOINTMENTS, newAppointment);
      toast({ title: "✅ Success", description: "Your appointment request has been submitted." });
      setTimeout(() => router.push('/student/appointments'), 1500);
    } catch (e) {
      toast({ variant: "destructive", title: "Booking Failed", description: "An error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCounselor = counselors.find(c => c.id === selectedCounselor);

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="min-h-screen bg-slate-50/50">
          <div className="p-8 max-w-7xl mx-auto w-full">
            <header className="mb-10">
              <Button variant="ghost" onClick={handleBackToOverview} className="mb-4 -ml-2 text-slate-500 hover:text-primary font-bold">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Book a Session</h1>
              <p className="text-slate-500 font-medium">Step {currentStep} of 4</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8">
                {currentStep === STEPS.COUNSELOR && (
                  <Card className="border-none shadow-xl rounded-3xl p-8 bg-white">
                    <CardHeader className="p-0 mb-8">
                      <CardTitle className="text-2xl font-black">Choose Counselor</CardTitle>
                    </CardHeader>
                    <div className="grid gap-6">
                      <div className="space-y-3">
                        <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Select Professional</Label>
                        <Select value={selectedCounselor} onValueChange={setSelectedCounselor}>
                          <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50">
                            <SelectValue placeholder="Select a counselor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {counselors.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="text-xs font-black uppercase tracking-widest text-primary">Location</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700">Guidance Office - Room 302</p>
                        <p className="text-[10px] text-slate-400 font-medium italic">Standard physical consultation environment.</p>
                      </div>
                      <Button size="lg" disabled={!canProceedFromStep(STEPS.COUNSELOR)} onClick={goToNextStep} className="h-14 rounded-2xl mt-4 font-black">Next: Select Date</Button>
                    </div>
                  </Card>
                )}

                {currentStep === STEPS.DATE && (
                  <Card className="border-none shadow-xl rounded-3xl p-8 bg-white">
                    <CardHeader className="p-0 mb-8">
                      <CardTitle className="text-2xl font-black">Select Date</CardTitle>
                    </CardHeader>
                    <div className="flex flex-col items-center">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => { setSelectedDate(d); setSelectedTime(''); }}
                        disabled={isDateDisabled}
                        className="rounded-3xl border shadow-sm p-8"
                      />
                      <div className="flex gap-4 w-full mt-8">
                        <Button variant="outline" size="lg" onClick={goToPreviousStep} className="flex-1 h-14 rounded-2xl font-bold">Back</Button>
                        <Button size="lg" disabled={!canProceedFromStep(STEPS.DATE)} onClick={goToNextStep} className="flex-2 h-14 rounded-2xl font-black">Continue to Time</Button>
                      </div>
                    </div>
                  </Card>
                )}

                {currentStep === STEPS.TIME && (
                  <Card className="border-none shadow-xl rounded-3xl p-8 bg-white">
                    <CardHeader className="p-0 mb-8">
                      <CardTitle className="text-2xl font-black">Choose Time</CardTitle>
                    </CardHeader>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {timeSlots.map(slot => (
                        <Button
                          key={slot}
                          variant={selectedTime === slot ? "default" : "outline"}
                          disabled={!isTimeAvailable(slot)}
                          onClick={() => setSelectedTime(slot)}
                          className={cn("h-16 rounded-2xl font-bold", selectedTime === slot && "shadow-lg shadow-primary/20")}
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-4 w-full mt-10">
                      <Button variant="outline" size="lg" onClick={goToPreviousStep} className="flex-1 h-14 rounded-2xl font-bold">Back</Button>
                      <Button size="lg" disabled={!canProceedFromStep(STEPS.TIME)} onClick={goToNextStep} className="flex-2 h-14 rounded-2xl font-black">Final Details</Button>
                    </div>
                  </Card>
                )}

                {currentStep === STEPS.REASON && (
                  <Card className="border-none shadow-xl rounded-3xl p-8 bg-white">
                    <CardHeader className="p-0 mb-8">
                      <CardTitle className="text-2xl font-black">Session Goal</CardTitle>
                    </CardHeader>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Reason for Consultation</Label>
                        <Textarea 
                          placeholder="What's on your mind?..." 
                          className="min-h-[200px] rounded-3xl border-slate-100 bg-slate-50 p-6"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-4">
                        <Button variant="outline" size="lg" onClick={goToPreviousStep} className="flex-1 h-14 rounded-2xl font-bold">Back</Button>
                        <Button 
                          size="lg" 
                          disabled={!canProceedFromStep(STEPS.REASON) || isSubmitting} 
                          onClick={handleBooking} 
                          className="flex-2 h-14 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700"
                        >
                          {isSubmitting ? "Confirming..." : "Confirm Booking"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              <div className="lg:col-span-4">
                <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden sticky top-8">
                  <div className="p-8 bg-primary text-white">
                    <h3 className="text-xl font-black mb-1">Booking Summary</h3>
                    <p className="text-[10px] uppercase font-bold text-white/60 tracking-widest">Review Selections</p>
                  </div>
                  <CardContent className="p-8 space-y-8">
                    <div className="flex gap-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary"><User className="h-5 w-5" /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-300 uppercase">Counselor</p>
                        <p className="font-bold text-slate-900">{activeCounselor?.name || 'Not Selected'}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary"><CalendarDays className="h-5 w-5" /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-300 uppercase">Date</p>
                        <p className="font-bold text-slate-900">{selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'Not Selected'}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary"><Clock className="h-5 w-5" /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-300 uppercase">Time Slot</p>
                        <p className="font-bold text-slate-900">{selectedTime || 'Not Selected'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
