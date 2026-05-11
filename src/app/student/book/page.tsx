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
  AlertCircle,
  ChevronLeft,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function BookAppointment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Step State
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
    if (currentStep === 2) return !!selectedDate && !!selectedTime;
    if (currentStep === 3) return !!reason.trim();
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
                <p className="text-muted-foreground font-medium">Follow the steps to secure your university wellness appointment.</p>
              </div>
              <div className="hidden md:flex items-center gap-2 bg-emerald-50 px-5 py-2.5 rounded-full text-emerald-700 text-xs font-black uppercase tracking-wider border border-emerald-100 shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
                University Service
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
                        <CardTitle className="text-2xl font-black text-slate-900">Basic Information</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">Who would you like to speak with and where?</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Counselor</Label>
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
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Session Location</Label>
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
                        CONTINUE TO SCHEDULE <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Date & Time */}
              {currentStep === 2 && (
                <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 rounded-3xl">
                  <CardHeader className="bg-slate-50/80 border-b p-8">
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/30">2</div>
                      <div>
                        <CardTitle className="text-2xl font-black text-slate-900">Schedule</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">Pick a date and time that works for you.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      {/* Left: Calendar */}
                      <div className="space-y-6">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block ml-1">Select Date</Label>
                        <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-4 inline-block w-full">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            className="w-full flex justify-center"
                            disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
                            classNames={{
                              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                              month: "space-y-6",
                              caption: "flex justify-center pt-1 relative items-center mb-4",
                              caption_label: "text-base font-black text-slate-900",
                              nav: "space-x-1 flex items-center",
                              nav_button: cn(
                                "h-9 w-9 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-slate-200 rounded-lg transition-all"
                              ),
                              nav_button_previous: "absolute left-1",
                              nav_button_next: "absolute right-1",
                              table: "w-full border-collapse",
                              head_row: "flex w-full mb-2",
                              head_cell: "text-slate-400 rounded-md w-11 font-black text-[10px] uppercase tracking-wider",
                              row: "flex w-full mt-1.5",
                              cell: "h-11 w-11 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                              day: cn(
                                "h-11 w-11 p-0 font-bold text-slate-600 hover:bg-primary/5 hover:text-primary rounded-xl transition-all"
                              ),
                              day_selected: "bg-primary text-white hover:bg-primary/90 hover:text-white shadow-lg shadow-primary/20",
                              day_today: "bg-slate-200 text-slate-900",
                              day_outside: "text-slate-300 opacity-50",
                              day_disabled: "text-slate-200 opacity-30 cursor-not-allowed",
                            }}
                          />
                        </div>
                      </div>

                      {/* Right: Slots */}
                      <div className="space-y-8">
                        <div>
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-6 ml-1">Available Slots</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {timeSlots.map((slot) => (
                              <Button
                                key={slot}
                                variant={selectedTime === slot ? "default" : "outline"}
                                className={cn(
                                  "h-16 rounded-2xl font-black text-sm transition-all duration-200 active:scale-[0.97]",
                                  selectedTime === slot 
                                    ? "bg-primary text-white shadow-xl shadow-primary/20 border-primary" 
                                    : "bg-white border-slate-200 text-slate-700 hover:border-primary hover:bg-primary/5"
                                )}
                                onClick={() => setSelectedTime(slot)}
                              >
                                <Clock className={cn("mr-2 h-4 w-4", selectedTime === slot ? "text-white" : "text-primary")} />
                                {slot}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="bg-emerald-50/50 p-6 rounded-3xl flex items-start gap-4 border border-emerald-100/50">
                          <Info className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            Sessions are scheduled for <span className="font-black text-primary">1 hour</span>. For physical meetings, please proceed to Room 302 at least 5 minutes before your time.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-10 border-t mt-12 flex justify-between gap-4">
                      <Button 
                        variant="outline"
                        size="lg"
                        onClick={handleBack}
                        className="h-16 px-10 rounded-2xl font-black border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        PREVIOUS STEP
                      </Button>
                      <Button 
                        size="lg"
                        disabled={!canGoNext()}
                        onClick={handleNext}
                        className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-base shadow-xl shadow-primary/30 transition-all active:scale-95 group"
                      >
                        CONTINUE TO GOAL <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Reason */}
              {currentStep === 3 && (
                <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 rounded-3xl">
                  <CardHeader className="bg-slate-50/80 border-b p-8">
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/30">3</div>
                      <div>
                        <CardTitle className="text-2xl font-black text-slate-900">Session Goal</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">Tell us a bit about why you&apos;re booking this session.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reason for appointment</Label>
                      <Textarea 
                        placeholder="e.g., I've been feeling overwhelmed with my thesis lately and would like some guidance on managing my stress levels..." 
                        className="min-h-[280px] rounded-[2rem] bg-slate-50/50 border-none focus-visible:ring-2 focus-visible:ring-primary/20 p-8 text-base leading-relaxed font-medium transition-all"
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
                        PREVIOUS STEP
                      </Button>
                      <Button 
                        size="lg"
                        disabled={!canGoNext()}
                        onClick={handleBooking}
                        className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-base shadow-xl shadow-primary/30 transition-all active:scale-95 group"
                      >
                        CONFIRM FINAL BOOKING <CheckCircle2 className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar Sticky Column */}
            <div className="lg:col-span-4 space-y-8 sticky top-24">
              <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-[2.5rem] border border-slate-100/50">
                <div className="bg-primary p-8 text-white relative">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-black mb-1">Booking Summary</h3>
                    <p className="text-emerald-50 text-[10px] font-black uppercase tracking-widest opacity-80">Review your session details</p>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                </div>
                <CardContent className="p-8 space-y-10">
                  <div className="space-y-8">
                    <div className="flex items-start gap-5 group">
                      <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-105 border border-slate-100">
                        <User className="h-7 w-7" />
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Counselor</p>
                        <p className="font-black text-slate-900 truncate leading-tight">
                          {activeCounselor?.name || "Not selected"}
                        </p>
                        {activeCounselor?.specialization && (
                          <p className="text-[10px] text-muted-foreground mt-1 font-bold truncate">{activeCounselor.specialization}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-5 group">
                      <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-blue-600 shrink-0 transition-transform group-hover:scale-105 border border-slate-100">
                        <CalendarDays className="h-7 w-7" />
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Date & Time</p>
                        <p className="font-black text-slate-900 leading-tight">
                          {selectedDate ? format(selectedDate, 'MMMM do, yyyy') : "Not selected"}
                        </p>
                        {selectedTime && (
                          <div className="flex items-center gap-1.5 mt-2">
                             <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                             <span className="text-primary font-black text-sm uppercase tracking-wider">{selectedTime}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-5 group">
                      <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-orange-600 shrink-0 transition-transform group-hover:scale-105 border border-slate-100">
                        <MapPin className="h-7 w-7" />
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Location</p>
                        <p className="font-black text-slate-900 leading-tight">{sessionType}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold">University Wellness Center</p>
                      </div>
                    </div>
                  </div>

                  {currentStep === 3 && (
                    <div className="pt-8 border-t">
                      <Button 
                        onClick={handleBooking}
                        disabled={isSubmitting || !canGoNext()}
                        className="w-full h-18 bg-primary hover:bg-primary/90 text-white font-black text-lg rounded-[1.5rem] shadow-2xl shadow-primary/30 transition-all active:scale-[0.98] py-8"
                      >
                        {isSubmitting ? "Processing..." : "Confirm Booking"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Need Help Card - Refined High-Fidelity Design */}
              <Card className="bg-[#0F172A] p-8 rounded-[2.5rem] text-white relative overflow-hidden group border-none shadow-2xl shadow-slate-900/10">
                <div className="relative z-10">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                    <Info className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-black text-xl mb-3">Need Help?</h4>
                  <p className="text-sm text-slate-400 leading-relaxed mb-8 font-medium">
                    If you can&apos;t find a suitable time slot or have an urgent concern, contact the guidance office directly.
                  </p>
                  <Button variant="link" className="p-0 text-white font-black text-xs uppercase tracking-widest h-auto group-hover:translate-x-1 transition-transform border-b border-white/20 pb-1 rounded-none">
                    Contact Office <ChevronRight className="h-3 w-3 ml-2" />
                  </Button>
                </div>
                {/* Decorative Elements */}
                <div className="absolute -bottom-6 -right-6 h-32 w-32 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                <div className="absolute top-10 right-10 h-20 w-20 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
