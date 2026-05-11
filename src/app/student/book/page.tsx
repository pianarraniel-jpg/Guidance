"use client";

import React, { useState, useMemo, useCallback } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { format, isBefore, isWeekend, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

// Booking step constants
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

  // Step Management
  const [currentStep, setCurrentStep] = useState<Step>(STEPS.COUNSELOR);

  // Booking Form State
  const [selectedCounselor, setSelectedCounselor] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [sessionType, setSessionType] = useState<'Physical' | 'Virtual'>('Physical');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get counselors from storage
  const counselors = useMemo(() => {
    const allUsers = storageService.getByField<any>(STORAGE_KEYS.USERS, 'role', 'counselor');
    return allUsers || [];
  }, []);

  // Time slots for appointments
  const timeSlots = useMemo(() => [
    "09:00 AM", 
    "10:00 AM", 
    "11:00 AM", 
    "01:00 PM", 
    "02:00 PM", 
    "03:00 PM", 
    "04:00 PM"
  ], []);

  // Get conflicting appointments for selected date
  const bookedSlots = useMemo(() => {
    if (!selectedDate || !selectedCounselor) return [];
    
    const appointments = storageService.getByField<any>(
      STORAGE_KEYS.APPOINTMENTS, 
      'counselorId', 
      selectedCounselor
    );
    
    if (!appointments) return [];
    
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    return appointments
      .filter(apt => apt.date === dateString && apt.status !== APPOINTMENT_STATUS.CANCELLED)
      .map(apt => apt.time);
  }, [selectedDate, selectedCounselor]);

  // Get available time slots (excluding booked ones)
  const availableTimeSlots = useMemo(() => {
    return timeSlots.filter(slot => !bookedSlots.includes(slot));
  }, [timeSlots, bookedSlots]);

  // Check if selected time is available
  const isTimeAvailable = useCallback((time: string) => {
    return availableTimeSlots.includes(time);
  }, [availableTimeSlots]);

  // Date validation
  const isDateDisabled = useCallback((date: Date) => {
    const today = startOfDay(new Date());
    return isBefore(startOfDay(date), today) || isWeekend(date);
  }, []);

  // Step validation
  const canProceedFromStep = useCallback((step: Step): boolean => {
    switch (step) {
      case STEPS.COUNSELOR:
        return !!selectedCounselor && !!sessionType;
      case STEPS.DATE:
        return !!selectedDate;
      case STEPS.TIME:
        return !!selectedTime && isTimeAvailable(selectedTime);
      case STEPS.REASON:
        return !!reason.trim();
      default:
        return false;
    }
  }, [selectedCounselor, sessionType, selectedDate, selectedTime, reason, isTimeAvailable]);

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    if (canProceedFromStep(currentStep)) {
      if (currentStep === STEPS.DATE) {
        setSelectedTime('');
      }
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  }, [currentStep, canProceedFromStep]);

  const goToPreviousStep = useCallback(() => {
    setCurrentStep((prev) => (prev - 1) as Step);
  }, []);

  const handleBackToOverview = useCallback(() => {
    if (currentStep > STEPS.COUNSELOR) {
      goToPreviousStep();
    } else {
      router.push('/student/appointments');
    }
  }, [currentStep, goToPreviousStep, router]);

  const handleBooking = useCallback(async () => {
    if (!selectedCounselor || !selectedDate || !selectedTime || !reason.trim()) {
      toast({
        variant: "destructive",
        title: "Incomplete Booking",
        description: "Please complete all required fields before confirming.",
      });
      return;
    }

    if (!isTimeAvailable(selectedTime)) {
      toast({
        variant: "destructive",
        title: "Time Slot Unavailable",
        description: "This time slot has just been booked. Please select another time.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const counselor = counselors.find(c => c.id === selectedCounselor);
      
      const newAppointment = {
        id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        studentId: user?.id,
        studentName: user?.name || 'Student',
        counselorId: selectedCounselor,
        counselorName: counselor?.name || "Guidance Counselor",
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        type: sessionType === 'Physical' ? 'Physical Session' : 'Virtual Session',
        status: APPOINTMENT_STATUS.CONFIRMED,
        location: sessionType === 'Physical' ? 'Guidance Office - Room 302' : 'Online - Zoom/Google Meet',
        sessionType,
        reason: reason.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      storageService.create(STORAGE_KEYS.APPOINTMENTS, newAppointment);

      toast({
        title: "✅ Appointment Confirmed!",
        description: `Your ${sessionType.toLowerCase()} session with ${counselor?.name} is scheduled for ${format(selectedDate, 'EEEE, MMMM d, yyyy')} at ${selectedTime}.`,
        duration: 5000,
      });

      setTimeout(() => {
        router.push('/student/appointments');
      }, 1500);
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: "An unexpected error occurred. Please try again or contact the guidance office.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCounselor, selectedDate, selectedTime, reason, sessionType, isTimeAvailable, counselors, user, toast, router]);

  const activeCounselor = useMemo(() => 
    counselors.find(c => c.id === selectedCounselor),
    [counselors, selectedCounselor]
  );

  const handleDateSelect = useCallback((date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime('');
    setSelectedMonth(date || new Date());
  }, []);

  const StepIndicator = ({ step, label, isActive, isCompleted }: { 
    step: number; 
    label: string; 
    isActive: boolean; 
    isCompleted: boolean;
  }) => (
    <div className="flex items-center gap-2">
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
        isActive && "bg-primary text-white shadow-lg shadow-primary/30 scale-110",
        isCompleted && "bg-emerald-500 text-white",
        !isActive && !isCompleted && "bg-slate-100 text-slate-400"
      )}>
        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : step}
      </div>
      <span className={cn(
        "text-xs font-semibold hidden sm:block",
        isActive ? "text-primary" : "text-slate-400"
      )}>
        {label}
      </span>
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <div className="mb-8 sm:mb-10">
              <Button 
                variant="ghost" 
                onClick={handleBackToOverview} 
                className="mb-4 -ml-2 text-slate-500 hover:text-primary font-semibold transition-all group"
              >
                {currentStep > STEPS.COUNSELOR ? (
                  <ChevronLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                ) : (
                  <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                )}
                {currentStep > STEPS.COUNSELOR ? "Previous Step" : "My Appointments"}
              </Button>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
                    Book a Session
                  </h1>
                  <p className="text-slate-500 font-medium">
                    Schedule your counseling appointment in 4 easy steps
                  </p>
                </div>
                
                <div className="hidden lg:flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    University Wellness Service
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 mt-6">
                {[
                  { step: 1, label: 'Counselor' },
                  { step: 2, label: 'Date' },
                  { step: 3, label: 'Time' },
                  { step: 4, label: 'Confirm' }
                ].map((step, index) => (
                  <React.Fragment key={step.step}>
                    <StepIndicator 
                      step={step.step}
                      label={step.label}
                      isActive={currentStep === step.step}
                      isCompleted={currentStep > step.step}
                    />
                    {index < 3 && (
                      <div className={cn(
                        "flex-1 h-0.5 rounded-full transition-colors duration-300",
                        currentStep > step.step ? "bg-emerald-400" : "bg-slate-200"
                      )} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
              <div className="lg:col-span-8 space-y-6">
                {currentStep === STEPS.COUNSELOR && (
                  <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-2xl sm:rounded-3xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                    <CardHeader className="bg-gradient-to-br from-slate-50 to-white border-b p-6 sm:p-8">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg shadow-primary/30">
                          1
                        </div>
                        <div>
                          <CardTitle className="text-xl sm:text-2xl font-black text-slate-900">
                            Choose Your Counselor
                          </CardTitle>
                          <CardDescription className="text-slate-500 font-medium text-sm sm:text-base">
                            Select who you'd like to speak with and the session format
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-6 sm:p-8 space-y-8">
                      {counselors.length === 0 ? (
                        <div className="text-center py-12">
                          <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                          <p className="text-slate-600 font-medium">
                            No counselors are currently available. Please check back later or contact the guidance office.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                                Select Counselor
                              </Label>
                              <Select value={selectedCounselor} onValueChange={setSelectedCounselor}>
                                <SelectTrigger className="h-14 sm:h-16 rounded-xl sm:rounded-2xl border-slate-200 focus:ring-2 focus:ring-primary/20 bg-white font-semibold transition-all hover:border-primary/50">
                                  <SelectValue placeholder="Choose a counselor..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                                  {counselors.map((counselor) => (
                                    <SelectItem 
                                      key={counselor.id} 
                                      value={counselor.id}
                                      className="rounded-lg my-0.5 focus:bg-primary/5 py-3 cursor-pointer"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                          <User className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                          <span className="font-bold text-slate-700">{counselor.name}</span>
                                          {counselor.specialization && (
                                            <p className="text-xs text-slate-400 font-medium">{counselor.specialization}</p>
                                          )}
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-3">
                              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                                Session Format
                              </Label>
                              <Select value={sessionType} onValueChange={(value: 'Physical' | 'Virtual') => setSessionType(value)}>
                                <SelectTrigger className="h-14 sm:h-16 rounded-xl sm:rounded-2xl border-slate-200 focus:ring-2 focus:ring-primary/20 bg-white font-semibold transition-all hover:border-primary/50">
                                  <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                                  <SelectItem value="Physical" className="rounded-lg my-0.5 py-3 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      <span>In-Person (Guidance Office)</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="Virtual" className="rounded-lg my-0.5 py-3 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                      <span>💻</span>
                                      <span>Virtual (Zoom/Google Meet)</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="pt-6 border-t flex justify-end">
                            <Button 
                              size="lg"
                              disabled={!canProceedFromStep(STEPS.COUNSELOR)}
                              onClick={goToNextStep}
                              className="h-14 sm:h-16 px-8 sm:px-12 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm sm:text-base shadow-xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                              Next: Select Date 
                              <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {currentStep === STEPS.DATE && (
                  <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-2xl sm:rounded-3xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                    <CardHeader className="bg-gradient-to-br from-slate-50 to-white border-b p-6 sm:p-8">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg shadow-primary/30">
                          2
                        </div>
                        <div>
                          <CardTitle className="text-xl sm:text-2xl font-black text-slate-900">
                            Select a Date
                          </CardTitle>
                          <CardDescription className="text-slate-500 font-medium text-sm sm:text-base">
                            Choose a weekday that works for you (Monday - Friday)
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-6 sm:p-8">
                      <div className="flex flex-col items-center">
                        <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-200 p-6 sm:p-12 shadow-lg shadow-slate-100 w-full max-w-2xl">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            month={selectedMonth}
                            onMonthChange={setSelectedMonth}
                            className="rounded-md w-full"
                            disabled={isDateDisabled}
                            fromDate={new Date()}
                            showOutsideDays={false}
                            fixedWeeks
                            classNames={{
                              months: "w-full",
                              month: "w-full space-y-8",
                              caption: "flex justify-center pt-2 relative items-center mb-4",
                              caption_label: "text-lg font-bold text-slate-900",
                              table: "w-full border-collapse",
                              head_row: "flex w-full justify-between mb-4",
                              head_cell: "text-slate-400 font-bold text-sm uppercase tracking-wider w-12 text-center",
                              row: "flex w-full justify-between mt-2",
                              cell: "h-14 w-14 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary/10 rounded-xl",
                              day: "h-14 w-14 p-0 font-bold aria-selected:opacity-100 hover:bg-primary/10 rounded-xl transition-all text-slate-700",
                              day_selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white rounded-xl font-black shadow-lg shadow-primary/20 scale-105",
                              day_today: "bg-amber-50 text-amber-900 font-black rounded-xl border border-amber-200",
                              day_disabled: "text-slate-200 line-through opacity-40 cursor-not-allowed",
                              day_outside: "text-slate-200 opacity-20",
                            }}
                          />
                        </div>
                        
                        {selectedDate && (
                          <p className="mt-6 text-sm text-slate-500 font-medium flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            Confirmed Selection: <span className="text-primary font-black">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
                          </p>
                        )}
                      </div>
                      
                      <div className="pt-8 border-t mt-8 flex flex-col sm:flex-row justify-between gap-3">
                        <Button 
                          variant="outline"
                          size="lg"
                          onClick={goToPreviousStep}
                          className="h-14 sm:h-16 px-8 rounded-xl sm:rounded-2xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-all order-2 sm:order-1"
                        >
                          <ChevronLeft className="mr-2 h-4 w-4" />
                          Previous
                        </Button>
                        <Button 
                          size="lg"
                          disabled={!canProceedFromStep(STEPS.DATE)}
                          onClick={goToNextStep}
                          className="h-14 sm:h-16 px-8 sm:px-12 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm sm:text-base shadow-xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group order-1 sm:order-2"
                        >
                          Next: Choose Time 
                          <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {currentStep === STEPS.TIME && (
                  <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-2xl sm:rounded-3xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                    <CardHeader className="bg-gradient-to-br from-slate-50 to-white border-b p-6 sm:p-8">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg shadow-primary/30">
                          3
                        </div>
                        <div>
                          <CardTitle className="text-xl sm:text-2xl font-black text-slate-900">
                            Choose a Time
                          </CardTitle>
                          <CardDescription className="text-slate-500 font-medium text-sm sm:text-base">
                            {selectedDate && `Available slots for ${format(selectedDate, 'EEEE, MMMM d')}`}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-6 sm:p-8">
                      {availableTimeSlots.length === 0 ? (
                        <div className="text-center py-12">
                          <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                          <h3 className="text-lg font-bold text-slate-800 mb-2">No Available Slots</h3>
                          <p className="text-slate-500 mb-4">
                            All time slots for this date are fully booked. Please select another date.
                          </p>
                          <Button 
                            variant="outline"
                            onClick={goToPreviousStep}
                            className="font-semibold"
                          >
                            Choose Different Date
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {timeSlots.map((slot) => {
                              const available = isTimeAvailable(slot);
                              const isSelected = selectedTime === slot;
                              
                              return (
                                <Button
                                  key={slot}
                                  variant={isSelected ? "default" : "outline"}
                                  disabled={!available}
                                  className={cn(
                                    "h-16 sm:h-20 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all duration-200 active:scale-[0.97]",
                                    isSelected && "bg-primary text-white shadow-xl shadow-primary/20 border-primary scale-105",
                                    !isSelected && available && "bg-white border-slate-200 text-slate-700 hover:border-primary hover:bg-primary/5",
                                    !available && "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed line-through"
                                  )}
                                  onClick={() => setSelectedTime(slot)}
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <Clock className={cn(
                                      "h-4 w-4 sm:h-5 sm:w-5",
                                      isSelected ? "text-white" : available ? "text-primary" : "text-slate-300"
                                    )} />
                                    <span>{slot}</span>
                                  </div>
                                </Button>
                              );
                            })}
                          </div>

                          <div className="mt-8 bg-gradient-to-r from-emerald-50 to-blue-50 p-5 sm:p-6 rounded-2xl flex items-start gap-4 border border-emerald-100">
                            <Info className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                <span className="font-black text-primary">Session Duration:</span> Standard 1-hour counseling blocks
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                Please arrive 5 minutes early for in-person sessions. Virtual sessions open 2 minutes before start time.
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                      
                      <div className="pt-8 border-t mt-8 flex flex-col sm:flex-row justify-between gap-3">
                        <Button 
                          variant="outline"
                          size="lg"
                          onClick={goToPreviousStep}
                          className="h-14 sm:h-16 px-8 rounded-xl sm:rounded-2xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-all order-2 sm:order-1"
                        >
                          <ChevronLeft className="mr-2 h-4 w-4" />
                          Previous
                        </Button>
                        <Button 
                          size="lg"
                          disabled={!canProceedFromStep(STEPS.TIME)}
                          onClick={goToNextStep}
                          className="h-14 sm:h-16 px-8 sm:px-12 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm sm:text-base shadow-xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group order-1 sm:order-2"
                        >
                          Next: Session Details
                          <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {currentStep === STEPS.REASON && (
                  <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-2xl sm:rounded-3xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                    <CardHeader className="bg-gradient-to-br from-slate-50 to-white border-b p-6 sm:p-8">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg shadow-primary/30">
                          4
                        </div>
                        <div>
                          <CardTitle className="text-xl sm:text-2xl font-black text-slate-900">
                            Session Goals
                          </CardTitle>
                          <CardDescription className="text-slate-500 font-medium text-sm sm:text-base">
                            Help your counselor prepare for a productive session
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-6 sm:p-8 space-y-8">
                      <div className="space-y-3">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                          What would you like to discuss?
                        </Label>
                        <Textarea 
                          placeholder="Share what's on your mind. For example: 'I've been feeling overwhelmed with my academic workload and would like to discuss stress management techniques...'"
                          className="min-h-[200px] sm:min-h-[250px] rounded-2xl bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-primary/20 p-5 sm:p-6 text-sm sm:text-base leading-relaxed font-medium transition-all resize-none placeholder:text-slate-400"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          maxLength={500}
                        />
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-slate-400">
                            Your privacy is protected. This information is confidential.
                          </p>
                          <p className="text-xs text-slate-400">
                            {reason.length}/500
                          </p>
                        </div>
                      </div>

                      <div className="pt-6 border-t flex flex-col sm:flex-row justify-between gap-3">
                        <Button 
                          variant="outline"
                          size="lg"
                          onClick={goToPreviousStep}
                          className="h-14 sm:h-16 px-8 rounded-xl sm:rounded-2xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-all order-2 sm:order-1"
                        >
                          <ChevronLeft className="mr-2 h-4 w-4" />
                          Previous
                        </Button>
                        <Button 
                          size="lg"
                          disabled={!canProceedFromStep(STEPS.REASON) || isSubmitting}
                          onClick={handleBooking}
                          className="h-14 sm:h-16 px-8 sm:px-12 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group order-1 sm:order-2"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              Booking...
                            </>
                          ) : (
                            <>
                              Confirm Booking
                              <CheckCircle2 className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="lg:col-span-4 space-y-6 sticky top-24">
                <Card className="border-0 shadow-2xl bg-white overflow-hidden rounded-2xl sm:rounded-[2.5rem]">
                  <div className="bg-gradient-to-br from-primary to-primary/90 p-6 sm:p-8 text-white relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-xl sm:text-2xl font-black mb-1">Booking Summary</h3>
                      <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">
                        Review your selections
                      </p>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
                  </div>
                  
                  <CardContent className="p-6 sm:p-8 space-y-6">
                    <SummaryItem
                      icon={<User className="h-5 w-5" />}
                      label="Counselor"
                      value={activeCounselor?.name}
                      subValue={sessionType && `${sessionType} Session`}
                      isSet={!!activeCounselor}
                      iconBg="bg-emerald-50 border-emerald-100 text-emerald-600"
                    />

                    <SummaryItem
                      icon={<CalendarDays className="h-5 w-5" />}
                      label="Date"
                      value={selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : undefined}
                      isSet={!!selectedDate}
                      iconBg="bg-blue-50 border-blue-100 text-blue-600"
                    />

                    <SummaryItem
                      icon={<Clock className="h-5 w-5" />}
                      label="Time"
                      value={selectedTime}
                      isSet={!!selectedTime}
                      iconBg="bg-orange-50 border-orange-100 text-orange-600"
                    />

                    <SummaryItem
                      icon={<Target className="h-5 w-5" />}
                      label="Session Goal"
                      value={reason || undefined}
                      isSet={!!reason}
                      iconBg="bg-purple-50 border-purple-100 text-purple-600"
                      truncate
                    />
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] text-white relative overflow-hidden border-0 shadow-2xl">
                  <div className="relative z-10">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                      <Info className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="font-black text-lg sm:text-xl mb-3">Need Assistance?</h4>
                    <p className="text-sm text-slate-400 leading-relaxed mb-6">
                      Can't find a suitable time? Contact the Guidance Office directly for urgent support or alternative arrangements.
                    </p>
                    <div className="space-y-2 text-sm text-slate-300">
                      <p className="font-semibold">📍 Room 302, Main Building</p>
                      <p className="font-semibold">📞 (032) 123-4567</p>
                      <p className="font-semibold">✉️ guidance@uspf.edu.ph</p>
                    </div>
                  </div>
                  <div className="absolute -bottom-6 -right-6 h-32 w-32 bg-white/5 rounded-full blur-3xl" />
                </Card>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function SummaryItem({ 
  icon, 
  label, 
  value, 
  subValue, 
  isSet, 
  iconBg,
  truncate = false 
}: { 
  icon: React.ReactNode;
  label: string;
  value?: string;
  subValue?: string;
  isSet: boolean;
  iconBg: string;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <div className={cn(
        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300",
        isSet ? iconBg : "bg-slate-50 border-slate-100 text-slate-300"
      )}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
          {label}
        </p>
        <p className={cn(
          "font-bold text-sm sm:text-base",
          isSet ? "text-slate-900" : "text-slate-300 italic text-xs sm:text-sm"
        )}>
          {value || "Not selected"}
        </p>
        {subValue && (
          <p className="text-[10px] sm:text-xs text-primary font-semibold mt-0.5">
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}