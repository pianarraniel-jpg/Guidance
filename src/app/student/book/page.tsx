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
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

export default function BookAppointment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

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
                onClick={() => router.back()} 
                className="mb-4 -ml-2 text-muted-foreground hover:text-primary font-bold"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Appointments
              </Button>
              <h1 className="text-4xl font-bold font-headline text-[#171717] mb-2">Book a Session</h1>
              <p className="text-muted-foreground">Select your preferred counselor and schedule your wellness visit.</p>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full text-emerald-700 text-xs font-bold">
              <CheckCircle2 className="h-4 w-4" />
              Free student service
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Booking Form */}
            <div className="lg:col-span-8 space-y-6">
              {/* Step 1: Counselor & Type */}
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">1</div>
                    <div>
                      <CardTitle className="text-lg">Basic Information</CardTitle>
                      <CardDescription>Who would you like to speak with?</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Counselor</Label>
                    <Select value={selectedCounselor} onValueChange={setSelectedCounselor}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Choose a Counselor" />
                      </SelectTrigger>
                      <SelectContent>
                        {counselors.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {c.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Session Location</Label>
                    <Select value={sessionType} onValueChange={(val: any) => setSessionType(val)}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Physical">Physical (Room 302)</SelectItem>
                        <SelectItem value="Virtual">Virtual (Zoom/Meet)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Date & Time */}
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">2</div>
                    <div>
                      <CardTitle className="text-lg">Schedule</CardTitle>
                      <CardDescription>Pick a date and time that works for you.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2 flex flex-col items-center md:items-start">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Select Date</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-xl border shadow-sm"
                      disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
                    />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Available Slots</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((slot) => (
                        <Button
                          key={slot}
                          variant={selectedTime === slot ? "default" : "outline"}
                          className={`h-12 rounded-xl font-bold text-sm ${
                            selectedTime === slot 
                              ? "bg-primary text-white shadow-md border-primary" 
                              : "bg-white border-slate-200 hover:border-primary hover:bg-primary/5"
                          }`}
                          onClick={() => setSelectedTime(slot)}
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          {slot}
                        </Button>
                      ))}
                    </div>
                    {selectedDate && (
                      <p className="text-[11px] text-muted-foreground bg-slate-50 p-3 rounded-lg flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                        Selected slots are based on 1-hour sessions. Please arrive 5 minutes early.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Step 3: Reason */}
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">3</div>
                    <div>
                      <CardTitle className="text-lg">Session Goal</CardTitle>
                      <CardDescription>Tell us a bit about why you're booking this session.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Reason for appointment</Label>
                    <Textarea 
                      placeholder="e.g., I've been feeling overwhelmed with my thesis lately..." 
                      className="min-h-[120px] rounded-2xl bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Summary */}
            <div className="lg:col-span-4">
              <Card className="border-none shadow-lg bg-white sticky top-24 overflow-hidden">
                <div className="bg-primary p-6 text-white">
                  <h3 className="text-xl font-black mb-1">Booking Summary</h3>
                  <p className="text-white/70 text-xs">Review your session details</p>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-primary">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Counselor</p>
                        <p className="font-bold text-slate-900">
                          {counselors.find(c => c.id === selectedCounselor)?.name || "Not selected"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date & Time</p>
                        <p className="font-bold text-slate-900">
                          {selectedDate ? format(selectedDate, 'PPP') : "Not selected"}
                          {selectedTime && ` at ${selectedTime}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Location</p>
                        <p className="font-bold text-slate-900">{sessionType}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t">
                    <Button 
                      onClick={handleBooking}
                      disabled={isSubmitting || !selectedCounselor || !selectedDate || !selectedTime || !reason}
                      className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                    >
                      {isSubmitting ? "Processing..." : "Confirm Booking"}
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground mt-4 leading-relaxed px-4">
                      By confirming, you agree to show up on time. Cancel at least 24 hours in advance if needed.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6 p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden group">
                <h4 className="font-bold mb-2">Need Help?</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  If you can't find a suitable time slot or have an urgent concern, contact the guidance office directly.
                </p>
                <Button variant="link" className="p-0 text-white font-bold text-xs h-auto group-hover:translate-x-1 transition-transform">
                  Contact Office <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
                <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
