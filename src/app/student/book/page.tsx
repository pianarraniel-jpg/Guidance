
"use client";

import React, { useState, useMemo } from 'react';
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
  MapPin, 
  ChevronRight, 
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  Info,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function BookAppointment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Step State (1-4)
  const [currentStep, setCurrentStep] = useState(1);

  // Booking State
  const [selectedCounselor, setSelectedCounselor] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [sessionType, setSessionType] = useState<'Physical' | 'Virtual'>('Physical');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get counselors from storage
  const counselors = useMemo(() => {
    return storageService.getByField<any>(STORAGE_KEYS.USERS, 'role', 'counselor');
  }, []);

  const timeSlots = [
    "09:00 AM", "10:00 AM", "11:00 AM", 
    "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"
  ];

  const canGoNext = () => {
    if (currentStep === 1) return !!selectedCounselor && !!sessionType;
    if (currentStep === 2) return !!selectedDate;
    if (currentStep === 3) return !!selectedTime;
    if (currentStep === 4) return !!reason.trim();
    return false;
  };

  const handleNext = () => {
    if (canGoNext()) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleBooking = async () => {
    if (!selectedCounselor || !selectedDate || !selectedTime || !reason) {
      toast({
        variant: "destructive",
        title: "Incomplete Booking",
        description: "Please fill in all the details before confirming.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const counselor = counselors.find(c => c.id === selectedCounselor);
      
      const newAppointment = {
        studentId: user?.id,
        counselorId: selectedCounselor,
        counselorName: counselor?.name || "Counselor",
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        type: "Scheduled Session",
        status: APPOINTMENT_STATUS.CONFIRMED,
        location: sessionType === 'Physical' ? 'Room 302 / Physical' : 'Virtual / Zoom',
        priority: 'Normal',
        notes: reason
      };

      storageService.create(STORAGE_KEYS.APPOINTMENTS, newAppointment);

      toast({
        title: "Appointment Booked!",
        description: `Your session with ${counselor?.name} is confirmed for ${format(selectedDate, 'PPP')}.`,
      });

      router.push('/student/appointments');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: "There was an error scheduling your appointment. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCounselor = counselors.find(c => c.id === selectedCounselor);

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="mb-10">
            <Button 
              variant="ghost" 
              onClick={() => currentStep > 1 ? handleBack() : router.back()} 
              className="mb-4 -ml-2 text-muted-foreground hover:text-primary font-bold transition-all"
            >
              {currentStep > 1 ? <ChevronLeft className="mr-2 h-4 w-4" /> : <ArrowLeft className="mr-2 h-4 w-4" />}
              {currentStep > 1 ? "Back to Previous Step" : "Back to Appointments"}
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black font-headline text-slate-900 tracking-tight mb-2">Book a Session</h1>
                <p className="text-muted-foreground font-medium">Step {currentStep} of 4</p>
              </div>
              <div className="hidden md:flex items-center gap-2 bg-emerald-50 px-5 py-2.5 rounded-full text-emerald-700 text-xs font-black uppercase tracking-wider border border-emerald-100 shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
                University Wellness Service
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Step-by-Step Content */}
            <div className="lg:col-span-8">
              
              {/* Step 1: Counselor & Type */}
              {currentStep === 1 && (
                <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 rounded-3xl">
                  <CardHeader className="bg-slate-50/80 border-b p-8">
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/30">1</div>
                      <div>
                        <CardTitle className="text-2xl font-black text-slate-900">Choose Counselor</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">Who would you like to speak with?</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Counselor</Label>
                        <Select value={selectedCounselor} onValueChange={setSelectedCounselor}>
                          <SelectTrigger className="h-16 rounded-2xl border-slate-200 focus:ring-2 focus:ring-primary/20 bg-slate-50/30 font-bold transition-all">
                            <SelectValue placeholder="Choose a Counselor" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2">
                            {counselors.map((c) => (
                              <SelectItem key={c.id} value={c.id} className="rounded-xl my-1 focus:bg-primary/5 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-primary">
                                    <User className="h-4 w-4" />
                                  </div>
                                  <span className="font-bold text-slate-700">{c.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Room/Location</Label>
                        <Select value={sessionType} onValueChange={(val: any) => setSessionType(val)}>
                          <SelectTrigger className="h-16 rounded-2xl border-slate-200 focus:ring-2 focus:ring-primary/20 bg-slate-50/30 font-bold transition-all">
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2">
                            <SelectItem value="Physical" className="rounded-xl my-1 py-3">Physical (Room 302)</SelectItem>
                            <SelectItem value="Virtual" className="rounded-xl my-1 py-3">Virtual (Zoom/Meet)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="pt-8 border-t flex justify-end">
                      <Button 
                        size="lg"
                        disabled={!canGoNext()}
                        onClick={handleNext}
                        className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-base shadow-xl shadow-primary/30 transition-all active:scale-95 group"
                      >
                        NEXT: CHOOSE DATE <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Date Picker */}
              {currentStep === 2 && (
                <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 rounded-3xl">
                  <CardHeader className="bg-slate-50/80 border-b p-8">
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/30">2</div>
                      <div>
                        <CardTitle className="text-2xl font-black text-slate-900">Select Date</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">Pick a day that works for you.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="flex flex-col items-center">
                      <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm w-full max-w-md">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          className="w-full"
                          disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
                          classNames={{
                            months: "flex flex-col space-y-8",
                            month: "space-y-8",
                            caption: "flex justify-center pt-1 relative items-center mb-8",
                            caption_label: "text-lg font-black text-slate-900",
                            nav: "flex items-center gap-1",
                            nav_button: cn(
                              "h-10 w-10 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-slate-100 rounded-xl transition-all"
                            ),
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse",
                            head_row: "flex justify-between w-full mb-4",
                            head_cell: "text-slate-400 w-12 font-black text-[11px] uppercase tracking-widest text-center",
                            row: "flex w-full mt-2 justify-between",
                            cell: "h-12 w-12 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                            day: cn(
                              "h-12 w-12 p-0 font-bold text-slate-600 hover:bg-primary/5 hover:text-primary rounded-2xl transition-all flex items-center justify-center"
                            ),
                            day_selected: "bg-primary text-white hover:bg-primary/90 hover:text-white shadow-lg shadow-primary/20",
                            day_today: "bg-slate-100 text-slate-900",
                            day_outside: "text-slate-200 opacity-30",
                            day_disabled: "text-slate-200 opacity-20 cursor-not-allowed",
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="pt-10 border-t mt-12 flex justify-between gap-4">
                      <Button 
                        variant="outline"
                        size="lg"
                        onClick={handleBack}
                        className="h-16 px-10 rounded-2xl font-black border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        PREVIOUS
                      </Button>
                      <Button 
                        size="lg"
                        disabled={!canGoNext()}
                        onClick={handleNext}
                        className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-base shadow-xl shadow-primary/30 transition-all active:scale-95 group"
                      >
                        NEXT: CHOOSE TIME <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Time Picker */}
              {currentStep === 3 && (
                <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 rounded-3xl">
                  <CardHeader className="bg-slate-50/80 border-b p-8">
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/30">3</div>
                      <div>
                        <CardTitle className="text-2xl font-black text-slate-900">Select Time</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">Available slots for {selectedDate ? format(selectedDate, 'MMMM do') : 'selected date'}.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {timeSlots.map((slot) => (
                        <Button
                          key={slot}
                          variant={selectedTime === slot ? "default" : "outline"}
                          className={cn(
                            "h-20 rounded-2xl font-black text-base transition-all duration-200 active:scale-[0.97]",
                            selectedTime === slot 
                              ? "bg-primary text-white shadow-xl shadow-primary/20 border-primary" 
                              : "bg-white border-slate-200 text-slate-700 hover:border-primary hover:bg-primary/5"
                          )}
                          onClick={() => setSelectedTime(slot)}
                        >
                          <Clock className={cn("mr-2 h-5 w-5", selectedTime === slot ? "text-white" : "text-primary")} />
                          {slot}
                        </Button>
                      ))}
                    </div>

                    <div className="mt-12 bg-emerald-50/50 p-6 rounded-3xl flex items-start gap-4 border border-emerald-100/50">
                      <Info className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        Counseling sessions are standard <span className="font-black text-primary">1-hour</span> blocks. Please arrive 5 minutes early for physical sessions.
                      </p>
                    </div>
                    
                    <div className="pt-10 border-t mt-12 flex justify-between gap-4">
                      <Button 
                        variant="outline"
                        size="lg"
                        onClick={handleBack}
                        className="h-16 px-10 rounded-2xl font-black border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        PREVIOUS
                      </Button>
                      <Button 
                        size="lg"
                        disabled={!canGoNext()}
                        onClick={handleNext}
                        className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-base shadow-xl shadow-primary/30 transition-all active:scale-95 group"
                      >
                        NEXT: SESSION GOAL <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Reason */}
              {currentStep === 4 && (
                <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 rounded-3xl">
                  <CardHeader className="bg-slate-50/80 border-b p-8">
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/30">4</div>
                      <div>
                        <CardTitle className="text-2xl font-black text-slate-900">Session Goal</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">Help the counselor prepare for your session.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">What would you like to discuss?</Label>
                      <Textarea 
                        placeholder="e.g., I'm feeling overwhelmed with my current academic workload and need some guidance on stress management techniques..." 
                        className="min-h-[250px] rounded-[2rem] bg-slate-50/50 border-none focus-visible:ring-2 focus-visible:ring-primary/20 p-8 text-base leading-relaxed font-medium transition-all"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>

                    <div className="pt-8 border-t flex justify-between gap-4">
                      <Button 
                        variant="outline"
                        size="lg"
                        onClick={handleBack}
                        className="h-16 px-10 rounded-2xl font-black border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        PREVIOUS
                      </Button>
                      <Button 
                        size="lg"
                        disabled={!canGoNext() || isSubmitting}
                        onClick={handleBooking}
                        className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-base shadow-xl shadow-primary/30 transition-all active:scale-95 group"
                      >
                        {isSubmitting ? "BOOKING..." : "CONFIRM FINAL BOOKING"} <CheckCircle2 className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar Sticky Column */}
            <div className="lg:col-span-4 space-y-6 sticky top-24 h-fit">
              <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-[2.5rem] border border-slate-100/50">
                <div className="bg-primary p-8 text-white relative">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-black mb-1">Session Summary</h3>
                    <p className="text-emerald-50 text-[10px] font-black uppercase tracking-widest opacity-80">Review progress</p>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                </div>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                        activeCounselor ? "bg-emerald-50 border-emerald-100 text-primary" : "bg-slate-50 border-slate-100 text-slate-300"
                      )}>
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Counselor</p>
                        <p className={cn("font-bold truncate", activeCounselor ? "text-slate-900" : "text-slate-300 italic")}>
                          {activeCounselor?.name || "Not chosen"}
                        </p>
                        {sessionType && <p className="text-[10px] text-primary font-bold mt-0.5">{sessionType} Session</p>}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                        selectedDate ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-slate-50 border-slate-100 text-slate-300"
                      )}>
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Date</p>
                        <p className={cn("font-bold truncate", selectedDate ? "text-slate-900" : "text-slate-300 italic")}>
                          {selectedDate ? format(selectedDate, 'MMMM do, yyyy') : "Not chosen"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                        selectedTime ? "bg-orange-50 border-orange-100 text-orange-600" : "bg-slate-50 border-slate-100 text-slate-300"
                      )}>
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Time Slot</p>
                        <p className={cn("font-bold truncate", selectedTime ? "text-slate-900" : "text-slate-300 italic")}>
                          {selectedTime || "Not chosen"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                        reason ? "bg-purple-50 border-purple-100 text-purple-600" : "bg-slate-50 border-slate-100 text-slate-300"
                      )}>
                        <Target className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Session Goal</p>
                        <p className={cn("text-xs leading-relaxed line-clamp-2", reason ? "text-slate-700 font-medium" : "text-slate-300 italic")}>
                          {reason || "Not specified"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0F172A] p-8 rounded-[2.5rem] text-white relative overflow-hidden group border-none shadow-2xl">
                <div className="relative z-10">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                    <Info className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-black text-xl mb-3">Need Help?</h4>
                  <p className="text-sm text-slate-400 leading-relaxed mb-8 font-medium">
                    Can&apos;t find a suitable time slot? Contact the Guidance Office directly for urgent assistance.
                  </p>
                  <Button variant="link" className="p-0 text-white font-black text-xs uppercase tracking-widest h-auto group-hover:translate-x-1 transition-transform border-b border-white/20 pb-1 rounded-none">
                    Contact Office <ChevronRight className="h-3 w-3 ml-2" />
                  </Button>
                </div>
                <div className="absolute -bottom-6 -right-6 h-32 w-32 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
