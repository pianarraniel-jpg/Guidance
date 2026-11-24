"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarClock,
  Check,
  RotateCcw,
  Sparkles,
  Sunrise,
  Sunset,
  Loader2,
  CalendarCheck,
  ShieldCheck,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

export const SLOTS_60_MIN = {
  morning: ['09:00 AM', '10:00 AM', '11:00 AM'],
  afternoon: ['01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'],
};

export const SLOTS_30_MIN = {
  morning: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'],
  afternoon: ['01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'],
};

export const SLOTS_15_MIN = {
  morning: [
    '09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM',
    '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM',
    '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM'
  ],
  afternoon: [
    '01:00 PM', '01:15 PM', '01:30 PM', '01:45 PM',
    '02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM',
    '03:00 PM', '03:15 PM', '03:30 PM', '03:45 PM',
    '04:00 PM', '04:15 PM', '04:30 PM', '04:45 PM'
  ],
};

export const SLOTS_45_MIN = {
  morning: ['09:00 AM', '09:45 AM', '10:30 AM', '11:15 AM'],
  afternoon: ['01:00 PM', '01:45 PM', '02:30 PM', '03:15 PM', '04:00 PM'],
};

export function parseTimeToMinutes(t: string): number {
  try {
    const [time, modifier] = t.trim().split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + (minutes || 0);
  } catch {
    return 0;
  }
}

export function isMorningSlot(slot: string): boolean {
  return parseTimeToMinutes(slot) < 12 * 60;
}

export function sortTimeSlots(slots: string[]): string[] {
  return [...slots].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
}

interface DayConfig {
  name: string;
  enabled: boolean;
  slots: string[];
}

interface CounselorAvailabilityManagerProps {
  onSaveSuccess?: () => void;
  className?: string;
}

export default function CounselorAvailabilityManager({
  onSaveSuccess,
  className = "",
}: CounselorAvailabilityManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [intervalMinutes, setIntervalMinutes] = useState<number>(30);
  const [schedule, setSchedule] = useState<DayConfig[]>(
    WEEKDAYS.map(day => ({
      name: day,
      enabled: day === 'Monday' || day === 'Wednesday' || day === 'Friday',
      slots: day === 'Monday' || day === 'Wednesday' || day === 'Friday'
        ? ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '01:00 PM', '02:00 PM', '02:30 PM', '03:00 PM']
        : [],
    }))
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Custom minute slot generator states
  const [isCustomSlotOpen, setIsCustomSlotOpen] = useState(false);
  const [customHour, setCustomHour] = useState('09');
  const [customMinute, setCustomMinute] = useState('30');
  const [customPeriod, setCustomPeriod] = useState<'AM' | 'PM'>('AM');
  const [customTargetDay, setCustomTargetDay] = useState<string>('all');

  // Helper to get standard slot templates for current interval
  const standardTemplate = useMemo(() => {
    switch (intervalMinutes) {
      case 15: return SLOTS_15_MIN;
      case 45: return SLOTS_45_MIN;
      case 60: return SLOTS_60_MIN;
      default: return SLOTS_30_MIN;
    }
  }, [intervalMinutes]);

  const allStandardSlots = useMemo(() => {
    return [...standardTemplate.morning, ...standardTemplate.afternoon];
  }, [standardTemplate]);

  // Load existing availability from Supabase
  const loadAvailability = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('day, slots')
        .eq('counselor_id', user.id);

      if (error) {
        console.error('Error fetching availability:', error);
        return;
      }

      if (data && data.length > 0) {
        let hasMinuteSlots = false;
        const updated = WEEKDAYS.map(dayName => {
          const match = data.find(d => d.day.toLowerCase() === dayName.toLowerCase());
          if (match && Array.isArray(match.slots) && match.slots.length > 0) {
            match.slots.forEach((s: string) => {
              if (s.includes(':15') || s.includes(':30') || s.includes(':45')) {
                hasMinuteSlots = true;
              }
            });
            return {
              name: dayName,
              enabled: true,
              slots: sortTimeSlots(match.slots),
            };
          }
          return {
            name: dayName,
            enabled: false,
            slots: [],
          };
        });

        if (hasMinuteSlots) {
          setIntervalMinutes(30);
        }
        setSchedule(updated);
      } else {
        // Default seed schedule: 30-min slots
        setSchedule(
          WEEKDAYS.map(day => ({
            name: day,
            enabled: day === 'Monday' || day === 'Wednesday' || day === 'Friday',
            slots: day === 'Monday' || day === 'Wednesday' || day === 'Friday'
              ? ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM']
              : [],
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load counselor availability:', err);
    } finally {
      setIsLoading(false);
      setHasChanges(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  // Handle interval switch (30 mins vs 60 mins vs 15 mins vs 45 mins)
  const handleIntervalChange = (newInterval: number) => {
    setIntervalMinutes(newInterval);
    toast({
      title: `Interval set to ${newInterval} minutes`,
      description: `Slots are now displayed in ${newInterval}-minute increments. Your active selections are preserved.`,
    });
  };

  // Toggle Day Enablement
  const handleToggleDay = (dayName: string, enabled: boolean) => {
    setSchedule(prev =>
      prev.map(day => {
        if (day.name !== dayName) return day;
        return {
          ...day,
          enabled,
          slots: enabled && day.slots.length === 0 ? [...allStandardSlots] : enabled ? day.slots : [],
        };
      })
    );
    setHasChanges(true);
  };

  // Toggle specific slot for a day
  const handleToggleSlot = (dayName: string, slot: string) => {
    setSchedule(prev =>
      prev.map(day => {
        if (day.name !== dayName) return day;
        const exists = day.slots.includes(slot);
        const newSlots = exists
          ? day.slots.filter(s => s !== slot)
          : sortTimeSlots([...day.slots, slot]);
        return {
          ...day,
          slots: newSlots,
          enabled: newSlots.length > 0 ? true : day.enabled,
        };
      })
    );
    setHasChanges(true);
  };

  // Quick day actions
  const handleSetDaySlots = (dayName: string, slotsToSet: string[]) => {
    setSchedule(prev =>
      prev.map(day => {
        if (day.name !== dayName) return day;
        return {
          ...day,
          enabled: slotsToSet.length > 0,
          slots: sortTimeSlots(slotsToSet),
        };
      })
    );
    setHasChanges(true);
  };

  // Add a custom time slot with exact minutes
  const handleAddCustomSlot = () => {
    const formattedSlot = `${customHour.padStart(2, '0')}:${customMinute.padStart(2, '0')} ${customPeriod}`;
    
    setSchedule(prev =>
      prev.map(day => {
        if (customTargetDay !== 'all' && day.name !== customTargetDay) return day;
        if (!day.enabled && customTargetDay === 'all') return day;
        if (day.slots.includes(formattedSlot)) return day;
        return {
          ...day,
          enabled: true,
          slots: sortTimeSlots([...day.slots, formattedSlot]),
        };
      })
    );

    setHasChanges(true);
    toast({
      title: "Custom Minute Slot Added",
      description: `Added "${formattedSlot}" to ${customTargetDay === 'all' ? 'all active days' : customTargetDay}.`,
    });
  };

  // Apply Presets
  const applyPreset = (preset: 'all-week' | 'mwf' | 'mornings-only') => {
    if (preset === 'all-week') {
      setSchedule(WEEKDAYS.map(day => ({ name: day, enabled: true, slots: [...allStandardSlots] })));
    } else if (preset === 'mwf') {
      const mwfSlots = intervalMinutes === 60
        ? ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM']
        : ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM'];
      setSchedule(
        WEEKDAYS.map(day => ({
          name: day,
          enabled: day === 'Monday' || day === 'Wednesday' || day === 'Friday',
          slots: day === 'Monday' || day === 'Wednesday' || day === 'Friday' ? mwfSlots : [],
        }))
      );
    } else if (preset === 'mornings-only') {
      setSchedule(WEEKDAYS.map(day => ({ name: day, enabled: true, slots: [...standardTemplate.morning] })));
    }
    setHasChanges(true);
  };

  // Save changes to Supabase
  const handleSave = async () => {
    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in as a counselor to update availability.',
      });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Delete existing availability for this counselor
      const { error: delErr } = await supabase
        .from('availability')
        .delete()
        .eq('counselor_id', user.id);

      if (delErr) throw delErr;

      // 2. Prepare rows for enabled days with non-empty slots
      const rowsToInsert = schedule
        .filter(d => d.enabled && d.slots.length > 0)
        .map(d => ({
          counselor_id: user.id,
          day: d.name,
          slots: d.slots,
        }));

      if (rowsToInsert.length > 0) {
        const { error: insErr } = await supabase.from('availability').insert(rowsToInsert);
        if (insErr) throw insErr;
      }

      setHasChanges(false);
      toast({
        title: 'Schedule Updated',
        description: 'Your weekly consultation availability has been successfully synchronized with student booking.',
      });

      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err: any) {
      console.error('Failed to save availability:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to Save',
        description: err.message || 'An error occurred while updating availability.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const totalWeeklySlots = schedule.reduce((sum, d) => sum + (d.enabled ? d.slots.length : 0), 0);
  const activeDaysCount = schedule.filter(d => d.enabled && d.slots.length > 0).length;

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[300px] text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-xs font-bold uppercase tracking-wider">Loading consultation availability...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Bar & Summary (Soft UI / No Gradients) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 shadow-2xs">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="h-11 w-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xs shrink-0">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">
                Weekly Consultation Schedule
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 whitespace-nowrap shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active in Student Booking
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              Configure which days, consultation minute intervals, and specific time slots students can book with you.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
          <div className="text-left md:text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Capacity</p>
            <p className="text-xs font-black text-slate-900">{totalWeeklySlots} slots <span className="font-medium text-slate-400">/ {activeDaysCount} days</span></p>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="h-10 px-5 rounded-xl font-black text-xs bg-primary hover:bg-primary/90 text-white shadow-xs disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <CalendarCheck className="h-3.5 w-3.5 mr-2" /> Save Schedule
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Minutes Option & Interval Selection Card */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800">
              <Clock className="h-4 w-4 text-primary" />
              <span>Consultation Duration & Minutes Option</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Choose slot intervals or add custom time slots with exact minutes.
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { value: 30, label: '30 mins' },
              { value: 60, label: '60 mins (Hourly)' },
              { value: 15, label: '15 mins' },
              { value: 45, label: '45 mins' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleIntervalChange(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                  intervalMinutes === opt.value
                    ? "bg-primary text-white border-primary shadow-xs font-black"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {opt.label}
              </button>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCustomSlotOpen(!isCustomSlotOpen)}
              className="h-8 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 ml-auto md:ml-2"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              {isCustomSlotOpen ? 'Hide Custom' : '+ Custom Minutes'}
            </Button>
          </div>
        </div>

        {/* Collapsible Custom Minute Slot Generator Form */}
        {isCustomSlotOpen && (
          <div className="pt-3 border-t border-slate-100 mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-end bg-slate-50/70 p-3.5 rounded-xl animate-in fade-in duration-150">
            <div>
              <Label className="text-[10px] font-black uppercase text-slate-400">Hour</Label>
              <Select value={customHour} onValueChange={setCustomHour}>
                <SelectTrigger className="h-9 bg-white border-slate-200 rounded-lg text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {['08', '09', '10', '11', '12', '01', '02', '03', '04', '05'].map(h => (
                    <SelectItem key={h} value={h} className="text-xs font-semibold">{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] font-black uppercase text-slate-400">Minutes</Label>
              <Select value={customMinute} onValueChange={setCustomMinute}>
                <SelectTrigger className="h-9 bg-white border-slate-200 rounded-lg text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {['00', '10', '15', '20', '30', '40', '45', '50'].map(m => (
                    <SelectItem key={m} value={m} className="text-xs font-semibold">:{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] font-black uppercase text-slate-400">AM / PM</Label>
              <Select value={customPeriod} onValueChange={(v: 'AM' | 'PM') => setCustomPeriod(v)}>
                <SelectTrigger className="h-9 bg-white border-slate-200 rounded-lg text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM" className="text-xs font-semibold">AM</SelectItem>
                  <SelectItem value="PM" className="text-xs font-semibold">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] font-black uppercase text-slate-400">Target Day</Label>
              <Select value={customTargetDay} onValueChange={setCustomTargetDay}>
                <SelectTrigger className="h-9 bg-white border-slate-200 rounded-lg text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-semibold">All Active Days</SelectItem>
                  {WEEKDAYS.map(day => (
                    <SelectItem key={day} value={day} className="text-xs font-semibold">{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              onClick={handleAddCustomSlot}
              className="h-9 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-black col-span-2 sm:col-span-1 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Slot
            </Button>
          </div>
        )}
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500" /> Presets:
        </span>
        <button
          type="button"
          onClick={() => applyPreset('all-week')}
          className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-primary/10 hover:text-primary text-slate-700 transition-all border border-slate-200/60"
        >
          Full Week (Mon – Fri)
        </button>
        <button
          type="button"
          onClick={() => applyPreset('mwf')}
          className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-primary/10 hover:text-primary text-slate-700 transition-all border border-slate-200/60"
        >
          Traditional MWF (Mon, Wed, Fri)
        </button>
        <button
          type="button"
          onClick={() => applyPreset('mornings-only')}
          className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-primary/10 hover:text-primary text-slate-700 transition-all border border-slate-200/60"
        >
          Mornings Only
        </button>
        {hasChanges && (
          <button
            type="button"
            onClick={loadAvailability}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all ml-auto flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" /> Revert
          </button>
        )}
      </div>

      {/* Weekday List */}
      <div className="space-y-4">
        {schedule.map((day) => {
          // Compute morning & afternoon slots for this day:
          // Standard template slots + any custom slot the user added/has in day.slots
          const standardMorning = standardTemplate.morning;
          const standardAfternoon = standardTemplate.afternoon;

          const morningSlotsForDay = Array.from(
            new Set([...standardMorning, ...day.slots.filter(isMorningSlot)])
          ).sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));

          const afternoonSlotsForDay = Array.from(
            new Set([...standardAfternoon, ...day.slots.filter(s => !isMorningSlot(s))])
          ).sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));

          const morningActiveCount = day.slots.filter(s => isMorningSlot(s)).length;
          const afternoonActiveCount = day.slots.filter(s => !isMorningSlot(s)).length;

          return (
            <div
              key={day.name}
              className={`rounded-2xl border transition-all p-5 ${
                day.enabled
                  ? 'bg-white border-slate-200 shadow-2xs'
                  : 'bg-slate-50/70 border-slate-200/60 opacity-60'
              }`}
            >
              {/* Day Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={day.enabled}
                    onCheckedChange={(checked) => handleToggleDay(day.name, checked)}
                    aria-label={`Enable consultations on ${day.name}`}
                  />
                  <div>
                    <span className="text-sm font-black text-slate-900">{day.name}</span>
                    <span className="text-xs text-slate-400 font-bold ml-2">
                      {day.enabled
                        ? `${day.slots.length} ${day.slots.length === 1 ? 'slot' : 'slots'} active`
                        : 'Off Duty / No Consultations'}
                    </span>
                  </div>
                </div>

                {day.enabled && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSetDaySlots(day.name, [...allStandardSlots])}
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      All Slots
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDaySlots(day.name, [...standardTemplate.morning])}
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                    >
                      Mornings
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDaySlots(day.name, [...standardTemplate.afternoon])}
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                    >
                      Afternoons
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDaySlots(day.name, [])}
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Slot Toggles */}
              {day.enabled ? (
                <div className="pt-4 space-y-4">
                  {/* Morning Section */}
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                      <Sunrise className="h-3.5 w-3.5 text-amber-500" />
                      <span>Morning Consultations ({morningActiveCount}/{morningSlotsForDay.length})</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {morningSlotsForDay.map((slot) => {
                        const isSelected = day.slots.includes(slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => handleToggleSlot(day.name, slot)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-primary/10 border-primary/30 text-primary shadow-2xs font-black'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                            }`}
                          >
                            <span>{slot}</span>
                            {isSelected ? (
                              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            ) : (
                              <span className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Afternoon Section */}
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                      <Sunset className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Afternoon Consultations ({afternoonActiveCount}/{afternoonSlotsForDay.length})</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {afternoonSlotsForDay.map((slot) => {
                        const isSelected = day.slots.includes(slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => handleToggleSlot(day.name, slot)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-primary/10 border-primary/30 text-primary shadow-2xs font-black'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                            }`}
                          >
                            <span>{slot}</span>
                            {isSelected ? (
                              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            ) : (
                              <span className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-3 pb-1 text-xs text-slate-400 italic">
                  Counselor is off duty on this day. Students will see this weekday as unavailable on the calendar.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Save notice */}
      {hasChanges && (
        <div className="sticky bottom-4 z-20 p-4 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <span>You have unsaved schedule changes.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadAvailability}
              className="text-xs text-slate-300 hover:text-white"
            >
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 text-white font-black text-xs px-4 rounded-xl shadow-xs"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      {/* Institutional Privacy & Compliance note */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3 text-xs text-slate-500 font-medium">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
        <span>
          Availability changes take effect immediately in the student booking portal and rescheduling assistant.
        </span>
      </div>
    </div>
  );
}
