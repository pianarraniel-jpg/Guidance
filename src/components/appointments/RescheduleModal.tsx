"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, isBefore, isWeekend, startOfDay } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  CalendarClock,
  Clock,
  Calendar as CalendarIcon,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  User,
  FileText,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

export const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
];

const getSlotDateTime = (dateStr: string, slotStr: string): Date => {
  const [timePart, modifier] = slotStr.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  const slotDate = new Date(`${dateStr}T00:00:00`);
  slotDate.setHours(hours, minutes, 0, 0);
  return slotDate;
};

const isSlotInPast = (dateStr: string, slotStr: string): boolean => {
  if (!dateStr || !slotStr) return false;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  if (dateStr !== todayStr) {
    return isBefore(parseISO(dateStr), startOfDay(new Date()));
  }
  const slotDate = getSlotDateTime(dateStr, slotStr);
  return isBefore(slotDate, new Date());
};

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  userRole: 'student' | 'counselor';
  onSuccess: (updatedAppointment: any) => void;
}

export default function RescheduleModal({
  isOpen,
  onClose,
  appointment,
  userRole,
  onSuccess,
}: RescheduleModalProps) {
  const { toast } = useToast();

  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [location, setLocation] = useState('Room 302');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const [counselorBookedSlots, setCounselorBookedSlots] = useState<string[]>([]);
  const [studentBookedSlots, setStudentBookedSlots] = useState<string[]>([]);
  const [studentDailyCount, setStudentDailyCount] = useState(0);

  // Initialize state when appointment changes or modal opens
  useEffect(() => {
    if (isOpen && appointment) {
      setNewDate(appointment.date || '');
      setNewTime(appointment.time || '');
      setLocation(appointment.location || 'Room 302');
      setReason('');
    }
  }, [isOpen, appointment]);

  // Load booked slots and daily limit validations whenever date changes
  const checkAvailabilityAndConflicts = useCallback(async (dateStr: string) => {
    if (!dateStr || !appointment) {
      setCounselorBookedSlots([]);
      setStudentBookedSlots([]);
      setStudentDailyCount(0);
      return;
    }

    setIsLoadingSlots(true);
    try {
      const counselorId = appointment.counselorId || appointment.counselor_id;
      const studentId = appointment.studentId || appointment.student_id;

      // 1. Check Counselor Booked Slots on this date (excluding current appointment)
      let counselorTaken: string[] = [];
      if (counselorId) {
        const { data: cData } = await supabase
          .from('appointments')
          .select('id, time, status')
          .eq('counselor_id', counselorId)
          .eq('date', dateStr)
          .neq('id', appointment.id)
          .neq('status', APPOINTMENT_STATUS.CANCELLED);

        counselorTaken = (cData ?? []).map((a: any) => a.time);
      }

      // 2. Check Student Booked Slots & Count on this date (excluding current appointment)
      let studentTaken: string[] = [];
      let dailyCount = 0;
      if (studentId) {
        const { data: sData } = await supabase
          .from('appointments')
          .select('id, time, status')
          .eq('student_id', studentId)
          .eq('date', dateStr)
          .neq('id', appointment.id)
          .neq('status', APPOINTMENT_STATUS.CANCELLED);

        studentTaken = (sData ?? []).map((a: any) => a.time);
        dailyCount = (sData ?? []).length;
      }

      setCounselorBookedSlots(counselorTaken);
      setStudentBookedSlots(studentTaken);
      setStudentDailyCount(dailyCount);
    } catch (err) {
      console.error('Error checking availability:', err);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [appointment]);

  useEffect(() => {
    if (newDate) {
      checkAvailabilityAndConflicts(newDate);
    }
  }, [newDate, checkAvailabilityAndConflicts]);

  // Date validation rules
  const isWeekendSelected = useMemo(() => {
    if (!newDate) return false;
    try {
      const d = parseISO(newDate);
      return isWeekend(d);
    } catch {
      return false;
    }
  }, [newDate]);

  const isPastDateSelected = useMemo(() => {
    if (!newDate) return false;
    try {
      return isBefore(parseISO(newDate), startOfDay(new Date()));
    } catch {
      return false;
    }
  }, [newDate]);

  const isDailyLimitReached = studentDailyCount >= 3;

  // Slot availability helper
  const getSlotStatus = (slot: string) => {
    if (!newDate) return { available: false, label: 'Select date' };
    if (isWeekendSelected) return { available: false, label: 'Weekend closed' };
    if (isPastDateSelected) return { available: false, label: 'Past date' };
    if (isSlotInPast(newDate, slot)) return { available: false, label: 'Time passed' };
    if (counselorBookedSlots.includes(slot)) return { available: false, label: 'Counselor booked' };
    if (studentBookedSlots.includes(slot)) return { available: false, label: 'Student conflicting' };
    if (isDailyLimitReached) return { available: false, label: 'Daily limit reached' };

    const isCurrent = appointment?.date === newDate && appointment?.time === slot;
    return { available: true, label: isCurrent ? 'Current slot' : 'Available' };
  };

  const isFormValid = useMemo(() => {
    if (!newDate || !newTime) return false;
    if (isWeekendSelected || isPastDateSelected) return false;
    if (isDailyLimitReached) return false;
    const status = getSlotStatus(newTime);
    return status.available;
  }, [newDate, newTime, isWeekendSelected, isPastDateSelected, isDailyLimitReached, counselorBookedSlots, studentBookedSlots]);

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !appointment) return;

    // Double check slot validity before committing
    const status = getSlotStatus(newTime);
    if (!status.available) {
      toast({
        variant: 'destructive',
        title: 'Selected Slot Unavailable',
        description: `This time slot is unavailable: ${status.label}. Please choose another.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const isUnchanged = appointment.date === newDate && appointment.time === newTime;
      if (isUnchanged) {
        toast({
          title: "No Changes Made",
          description: "The appointment schedule remains unchanged.",
        });
        onClose();
        return;
      }

      // Build updated reason
      let updatedReason = appointment.reason || '';
      const notePrefix = userRole === 'student' ? '[Student Rescheduled]' : '[Counselor Rescheduled]';
      if (reason.trim()) {
        updatedReason = updatedReason 
          ? `${updatedReason}\n${notePrefix} (${format(new Date(), 'MMM dd')}: ${newDate} at ${newTime}): ${reason.trim()}`
          : `${notePrefix} (${format(new Date(), 'MMM dd')}: ${newDate} at ${newTime}): ${reason.trim()}`;
      }

      // Status: Counselor directly confirms reschedule; Student puts in Pending for confirmation (or updates schedule)
      const nextStatus = userRole === 'counselor' 
        ? APPOINTMENT_STATUS.CONFIRMED 
        : APPOINTMENT_STATUS.PENDING;

      const updates: any = {
        date: newDate,
        time: newTime,
        status: nextStatus,
        reason: updatedReason,
      };

      if (userRole === 'counselor' && location) {
        updates.location = location;
      }

      const result = await storageService.update(STORAGE_KEYS.APPOINTMENTS, appointment.id, updates);
      
      const updatedApp = {
        ...appointment,
        ...updates,
        ...(result || {})
      };

      toast({
        title: "Session Rescheduled Successfully!",
        description: `Session has been moved to ${newDate} at ${newTime} (${nextStatus.toUpperCase()}).`,
      });

      onSuccess(updatedApp);
      onClose();
    } catch (err: any) {
      console.error('Reschedule error:', err);
      toast({
        variant: 'destructive',
        title: 'Reschedule Failed',
        description: err.message || 'Could not reschedule appointment. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const minDateStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 sm:p-8 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-sm border border-primary/20">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
                Reschedule Session
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
                {userRole === 'counselor' 
                  ? `Rescheduling counseling session for ${appointment?.studentName || 'Student'}`
                  : `Select a new available date and time with ${appointment?.counselorName || 'Counselor'}`}
              </DialogDescription>
            </div>
          </div>

          {/* Current Appointment Quick Summary */}
          <div className="mt-4 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-bold text-slate-700">
                {userRole === 'counselor' ? appointment?.studentName : appointment?.counselorName}
              </span>
              <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-0 border-slate-200 text-slate-500">
                {appointment?.type || 'Wellness Check-in'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-slate-500 font-semibold">
              <span>Current:</span>
              <span className="font-bold text-slate-800">{appointment?.date}</span>
              <span>•</span>
              <span className="font-bold text-slate-800">{appointment?.time}</span>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleRescheduleSubmit} className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* 1. Date Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-primary" /> Select New Date *
              </Label>
              <span className="text-[10px] font-bold text-slate-400">Monday – Friday Only</span>
            </div>
            <Input
              type="date"
              min={minDateStr}
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                setNewTime(''); // Reset time selection when date changes
              }}
              required
              className="h-11 rounded-xl text-xs font-bold bg-slate-50/60 border-slate-200 focus:bg-white"
            />

            {/* Validation Alerts for Date */}
            {isWeekendSelected && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs font-bold text-amber-800 animate-in fade-in-50">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Guidance counseling is closed on weekends. Please pick a weekday (Mon-Fri).</span>
              </div>
            )}

            {isPastDateSelected && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs font-bold text-red-800 animate-in fade-in-50">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>Cannot select a date in the past. Please select today or an upcoming weekday.</span>
              </div>
            )}

            {isDailyLimitReached && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs font-bold text-red-800 animate-in fade-in-50">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>Daily Limit Reached (Max 3 sessions/day). The student already has {studentDailyCount} other sessions on this date.</span>
              </div>
            )}
          </div>

          {/* 2. Time Slot Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" /> Select Available Time Slot *
              </Label>
              {isLoadingSlots && (
                <span className="text-[10px] font-bold text-primary animate-pulse">Checking schedule...</span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {TIME_SLOTS.map((slot) => {
                const status = getSlotStatus(slot);
                const isSelected = newTime === slot;
                const isCurrent = appointment?.date === newDate && appointment?.time === slot;

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={!status.available || isLoadingSlots}
                    onClick={() => setNewTime(slot)}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between min-h-[58px] ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-md ring-2 ring-primary/20 scale-[1.02]'
                        : status.available
                        ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 hover:border-primary/40'
                        : 'bg-slate-100/70 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {slot}
                    </span>
                    <span className={`text-[9px] font-bold ${
                      isSelected 
                        ? 'text-white/80' 
                        : isCurrent
                        ? 'text-primary font-black'
                        : status.available 
                        ? 'text-emerald-600' 
                        : 'text-slate-400'
                    }`}>
                      {isSelected ? 'Selected' : status.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Location (Counselor can update location) */}
          {userRole === 'counselor' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Session Location
              </Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Guidance Office - Room 302 / Online Google Meet"
                className="h-10 rounded-xl text-xs font-bold bg-slate-50/60 border-slate-200"
              />
            </div>
          )}

          {/* 4. Reason for Reschedule */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" /> Reason for Rescheduling (Optional)
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide context on why this session is being rescheduled (e.g. class schedule conflict, emergency, academic exam)..."
              className="min-h-[85px] rounded-xl text-xs font-medium bg-slate-50/60 border-slate-200 p-3 leading-relaxed focus:bg-white"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="flex-1 h-12 rounded-xl font-black bg-primary text-white hover:bg-primary/95 shadow-lg shadow-primary/20"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
