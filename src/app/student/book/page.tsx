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
  ChevronLeft
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

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Button 
                variant="ghost" 
                onClick={() => currentStep > 1 ? handleBack() : router.back()} 
                className="mb-4 -ml-2 text-muted-foreground hover:text-primary font-bold"
              >
                {currentStep > 1 ? <ChevronLeft className="mr-2 h-4 w-4" /> : <ArrowLeft className="mr-2 h-4 w-4" />}
                {currentStep > 1 ? "Back to Previous Step" : "Back to Appointments"}
              </Button>
              <h1 className="text-4xl font-bold font-headline text-[#171717] mb-2">Book a Session</h1>
              <p className="text-muted-foreground">Follow the steps to secure your wellness appointment.</p>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full text-emerald-700 text-xs font-bold">
              <CheckCircle2 className="h-4 w-4" />
              Free student service
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Step-by-Step Content */}
            <div className="lg:col-span-8">
              {/* Step 1: Counselor & Type */}
              {currentStep === 1 && (
                <Card className="border-none shadow-sm bg-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                  <CardHeader className="bg-slate-50/50 border-b p-8">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">1</div>
                      <div>
                        <CardTitle className="text-2xl">Basic Information</CardTitle>
                        <CardDescription>Who would you like to speak with and where?</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Counselor</Label>
                        <Select value={selectedCounselor} onValueChange={setSelectedCounselor}>
                          <SelectTrigger className="h-14 rounded-2xl border-slate-200 focus:ring-primary">
                            <SelectValue placeholder="Choose a Counselor" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                            {counselors.map((c) => (
                              <SelectItem key={c.id} value={c.id} className="rounded-xl my-1 focus:bg-primary/5">
                                <div className="flex items-center gap-3">
                                  <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-primary">
                                    <User className="h-3 w-3" />
                                  </div>
                                  <span className="font-medium">{c.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Session Location</Label>
                        <Select value={sessionType} onValueChange={(val: any) => setSessionType(val)}>
                          <SelectTrigger className="h-14 rounded-2xl border-slate-200 focus:ring-primary">
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                            <SelectItem value="Physical" className="rounded-xl my-1">Physical (Room 302)</SelectItem>
                            <SelectItem value="Virtual" className="rounded-xl my-1">Virtual (Zoom/Meet)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="pt-6 border-t flex justify-end">
                      <Button 
                        size="lg"
                        disabled={!canGoNext()}
                        onClick={handleNext}
                        className="h-14 px-10 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 transition-all active:scale-95"
                      >
                        Continue to Schedule <ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Date & Time */}
              {currentStep === 2 && (
                <Card className="border-none shadow-sm bg-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                  <CardHeader className="bg-slate-50/50 border-b p-8">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">2</div>
                      <div>
                        <CardTitle className="text-2xl">Schedule</CardTitle>
                        <CardDescription>Pick a date and time that works for you.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Select Date</Label>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          className="rounded-3xl border border-slate-100 shadow-sm p-4 w-full max-w-sm mx-auto lg:mx-0"
                          disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
                        />
                      </div>
                      <div className="space-y-6">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground block">Available Slots</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {timeSlots.map((slot) => (
                            <Button
                              key={slot}
                              variant={selectedTime === slot ? "default" : "outline"}
                              className={cn(
                                "h-14 rounded-2xl font-bold text-sm transition-all",
                                selectedTime === slot 
                                  ? "bg-primary text-white shadow-lg shadow-primary/20 border-primary" 
                                  : "bg-white border-slate-200 hover:border-primary hover:bg-primary/5"
                              )}
                              onClick={() => setSelectedTime(slot)}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              {slot}
                            </Button>
                          ))}
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl flex items-start gap-3 border border-slate-100">
                          <AlertCircle className="h-5 w-5 text-primary shrink-0" />
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Selected slots are based on 1-hour sessions. Please arrive 5 minutes early at Room 302 for physical sessions.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-10 border-t mt-10 flex justify-between gap-4">
                      <Button 
                        variant="outline"
                        size="lg"
                        onClick={handleBack}
                        className="h-14 px-8 rounded-2xl font-bold border-slate-200"
                      >
                        Previous Step
                      </Button>
                      <Button 
                        size="lg"
                        disabled={!canGoNext()}
                        onClick={handleNext}
                        className="h-14 px-10 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 transition-all active:scale-95"
                      >
                        Continue to Goal <ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Reason */}
              {currentStep === 3 && (
                <Card className="border-none shadow-sm bg-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                  <CardHeader className="bg-slate-50/50 border-b p-8">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">3</div>
                      <div>
                        <CardTitle className="text-2xl">Session Goal</CardTitle>
                        <CardDescription>Tell us a bit about why you&apos;re booking this session.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="space-y-4">
                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Reason for appointment</Label>
                      <Textarea 
                        placeholder="e.g., I've been feeling overwhelmed with my thesis lately and would like some guidance on managing my stress levels..." 
                        className="min-h-[240px] rounded-3xl bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-primary p-6 text-base leading-relaxed"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>

                    <div className="pt-8 border-t flex justify-between gap-4">
                      <Button 
                        variant="outline"
                        size="lg"
                        onClick={handleBack}
                        className="h-14 px-8 rounded-2xl font-bold border-slate-200"
                      >
                        Previous Step
                      </Button>
                      <Button 
                        size="lg"
                        disabled={!canGoNext()}
                        onClick={handleBooking}
                        className="h-14 px-10 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 transition-all active:scale-95"
                      >
                        Confirm Final Booking <CheckCircle2 className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar Summary */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none shadow-xl bg-white sticky top-24 overflow-hidden rounded-[2rem]">
                <div className="bg-primary p-8 text-white relative">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-black mb-1">Booking Summary</h3>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Review your session details</p>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                </div>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-primary shrink-0">
                        <User className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Counselor</p>
                        <p className="font-bold text-slate-900 truncate">
                          {counselors.find(c => c.id === selectedCounselor)?.name || "Not selected"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Date & Time</p>
                        <p className="font-bold text-slate-900 leading-snug">
                          {selectedDate ? format(selectedDate, 'PPP') : "Not selected"}
                          {selectedTime && <span className="block text-primary text-sm mt-1">{selectedTime}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                        <MapPin className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Location</p>
                        <p className="font-bold text-slate-900">{sessionType}</p>
                      </div>
                    </div>
                  </div>

                  {currentStep === 3 && (
                    <div className="pt-8 border-t">
                      <Button 
                        onClick={handleBooking}
                        disabled={isSubmitting || !canGoNext()}
                        className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                      >
                        {isSubmitting ? "Processing..." : "Confirm Booking"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-900 p-8 rounded-[2rem] text-white relative overflow-hidden group border-none">
                <div className="relative z-10">
                  <h4 className="font-bold text-lg mb-2">Need Help?</h4>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    If you can&apos;t find a suitable time slot or have an urgent concern, contact the guidance office directly.
                  </p>
                  <Button variant="link" className="p-0 text-white font-bold text-sm h-auto group-hover:translate-x-1 transition-transform">
                    Contact Office <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
