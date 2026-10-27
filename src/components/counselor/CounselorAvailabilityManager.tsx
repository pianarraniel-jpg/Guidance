"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  AlertCircle
} from 'lucide-react';

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

const MORNING_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM'];
const AFTERNOON_SLOTS = ['01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
const ALL_SLOTS = [...MORNING_SLOTS, ...AFTERNOON_SLOTS];

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

  const [schedule, setSchedule] = useState<DayConfig[]>(
    WEEKDAYS.map(day => ({
      name: day,
      enabled: day === 'Monday' || day === 'Wednesday' || day === 'Friday',
      slots: day === 'Monday' || day === 'Wednesday' || day === 'Friday'
        ? ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM']
        : [],
    }))
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
        const updated = WEEKDAYS.map(dayName => {
          const match = data.find(d => d.day.toLowerCase() === dayName.toLowerCase());
          if (match && Array.isArray(match.slots) && match.slots.length > 0) {
            return {
              name: dayName,
              enabled: true,
              slots: match.slots,
            };
          }
          return {
            name: dayName,
            enabled: false,
            slots: [],
          };
        });
        setSchedule(updated);
      } else {
        // Fallback default if not yet saved in DB: Mon, Wed, Fri
        setSchedule(
          WEEKDAYS.map(day => ({
            name: day,
            enabled: true,
            slots: [...ALL_SLOTS],
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

  // Toggle Day Enablement
  const handleToggleDay = (dayName: string, enabled: boolean) => {
    setSchedule(prev =>
      prev.map(day => {
        if (day.name !== dayName) return day;
        return {
          ...day,
          enabled,
          slots: enabled && day.slots.length === 0 ? [...ALL_SLOTS] : enabled ? day.slots : [],
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
          : [...day.slots, slot].sort((a, b) => ALL_SLOTS.indexOf(a) - ALL_SLOTS.indexOf(b));
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
          slots: slotsToSet,
        };
      })
    );
    setHasChanges(true);
  };

  // Apply Presets
  const applyPreset = (preset: 'all-week' | 'mwf' | 'mornings-only') => {
    if (preset === 'all-week') {
      setSchedule(WEEKDAYS.map(day => ({ name: day, enabled: true, slots: [...ALL_SLOTS] })));
    } else if (preset === 'mwf') {
      setSchedule(
        WEEKDAYS.map(day => ({
          name: day,
          enabled: day === 'Monday' || day === 'Wednesday' || day === 'Friday',
          slots:
            day === 'Monday' || day === 'Wednesday' || day === 'Friday'
              ? ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM']
              : [],
        }))
      );
    } else if (preset === 'mornings-only') {
      setSchedule(WEEKDAYS.map(day => ({ name: day, enabled: true, slots: [...MORNING_SLOTS] })));
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
        description: 'Your weekly consultation availability has been successfully synchronized.',
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
      {/* Header bar & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-emerald-500/5 to-slate-50 border border-primary/15">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              Weekly Consultation Schedule
              <Badge className="bg-emerald-500 text-white border-none font-bold text-[9px] uppercase px-2 py-0.5">
                Active in Student Booking
              </Badge>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Configure which days and hours students can book consultations with you.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Capacity</p>
            <p className="text-xs font-black text-slate-900">{totalWeeklySlots} slots / {activeDaysCount} days</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="h-10 px-5 rounded-xl font-black text-xs bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 disabled:opacity-50"
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
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all ml-auto flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" /> Revert
          </button>
        )}
      </div>

      {/* Weekday List */}
      <div className="space-y-4">
        {schedule.map((day) => {
          const morningActiveCount = day.slots.filter(s => MORNING_SLOTS.includes(s)).length;
          const afternoonActiveCount = day.slots.filter(s => AFTERNOON_SLOTS.includes(s)).length;

          return (
            <div
              key={day.name}
              className={`rounded-2xl border transition-all p-5 ${
                day.enabled
                  ? 'bg-white border-slate-200 shadow-sm'
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
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetDaySlots(day.name, [...ALL_SLOTS])}
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      All Slots
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDaySlots(day.name, [...MORNING_SLOTS])}
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                    >
                      Mornings
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDaySlots(day.name, [...AFTERNOON_SLOTS])}
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                    >
                      Afternoons
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDaySlots(day.name, [])}
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-slate-50 hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors"
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
                      <span>Morning Consultations ({morningActiveCount}/{MORNING_SLOTS.length})</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {MORNING_SLOTS.map((slot) => {
                        const isSelected = day.slots.includes(slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => handleToggleSlot(day.name, slot)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-primary/10 border-primary/30 text-primary shadow-sm font-black'
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
                      <span>Afternoon Consultations ({afternoonActiveCount}/{AFTERNOON_SLOTS.length})</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {AFTERNOON_SLOTS.map((slot) => {
                        const isSelected = day.slots.includes(slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => handleToggleSlot(day.name, slot)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-primary/10 border-primary/30 text-primary shadow-sm font-black'
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
        <div className="sticky bottom-4 z-20 p-4 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
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
              className="bg-primary hover:bg-primary/90 text-white font-black text-xs px-4 rounded-xl shadow-md"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      {/* Institutional Privacy & Compliance note */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3 text-xs text-slate-500 font-medium">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
        <span>
          Availability changes take effect immediately in the student booking portal and rescheduling assistant.
        </span>
      </div>
    </div>
  );
}
