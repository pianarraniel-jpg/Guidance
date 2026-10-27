import { parseISO, isBefore, startOfDay, isToday } from 'date-fns';
import { supabase } from './supabase';
import { storageService } from './storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from './constants';

/**
 * Checks whether an appointment's scheduled date and time has already passed.
 */
export function isAppointmentPassed(dateStr: string, timeStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const today = startOfDay(new Date());
    const aptDate = parseISO(dateStr);

    // If date is strictly prior to today, it has passed
    if (isBefore(aptDate, today)) {
      return true;
    }

    // If it's today and time slot is provided, check if the session time has passed
    if (isToday(aptDate) && timeStr) {
      const [timePart, modifier] = timeStr.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const sessionDate = new Date(aptDate);
      sessionDate.setHours(hours, minutes || 0, 0, 0);

      return isBefore(sessionDate, new Date());
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Scans a list of appointments. If any appointment with status 'pending' or 'confirmed'
 * has passed its scheduled date/time, it automatically updates its status in Supabase/storage
 * to 'cancelled' (marked as missed/passed) and updates the in-memory array.
 */
export async function autoExpirePassedAppointments(appointments: any[]): Promise<any[]> {
  if (!appointments || appointments.length === 0) return [];

  const passedToUpdate: any[] = [];

  const updatedList = appointments.map(apt => {
    const isActive = apt.status === APPOINTMENT_STATUS.PENDING || apt.status === APPOINTMENT_STATUS.CONFIRMED;
    if (isActive && isAppointmentPassed(apt.date, apt.time)) {
      const updatedReason = apt.reason
        ? `${apt.reason} [Missed: Scheduled date passed without session completion]`
        : '[Missed: Scheduled date passed without session completion]';

      const updatedApt = {
        ...apt,
        status: APPOINTMENT_STATUS.CANCELLED,
        isMissed: true,
        reason: updatedReason,
      };
      passedToUpdate.push(updatedApt);
      return updatedApt;
    }
    return apt;
  });

  // Batch update any expired appointments in database in background
  if (passedToUpdate.length > 0) {
    try {
      await Promise.all(
        passedToUpdate.map(async (apt) => {
          await supabase
            .from(STORAGE_KEYS.APPOINTMENTS)
            .update({
              status: APPOINTMENT_STATUS.CANCELLED,
              reason: apt.reason,
            })
            .eq('id', apt.id);
        })
      );
    } catch (err) {
      console.error('Error auto-expiring passed appointments:', err);
    }
  }

  return updatedList;
}

export interface CalendarEventInfo {
  title: string;
  description?: string;
  location?: string;
  dateStr: string; // 'YYYY-MM-DD'
  timeStr: string; // '09:00 AM'
  durationMinutes?: number;
}

export function parseSlotToDates(dateStr: string, timeStr: string, durationMinutes = 60): { start: Date; end: Date } {
  const [timePart, modifier] = timeStr.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  const [year, month, day] = dateStr.split('-').map(Number);
  const start = new Date(year, month - 1, day, hours, minutes || 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start, end };
}

export function getGoogleCalendarUrl(info: CalendarEventInfo): string {
  try {
    const { start, end } = parseSlotToDates(info.dateStr, info.timeStr, info.durationMinutes || 60);
    const toGCalFormat = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const dates = `${toGCalFormat(start)}/${toGCalFormat(end)}`;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: info.title,
      details: info.description || 'USPF GuidanceSync Counseling Consultation',
      location: info.location || 'Guidance Office - Room 302',
      dates,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  } catch {
    return 'https://calendar.google.com';
  }
}

export function downloadIcsFile(info: CalendarEventInfo, filename = 'guidance-session.ics'): void {
  try {
    const { start, end } = parseSlotToDates(info.dateStr, info.timeStr, info.durationMinutes || 60);
    const toIcsFormat = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//USPF GuidanceSync//Counseling Appointment//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@uspf.edu.ph`,
      `DTSTAMP:${toIcsFormat(new Date())}`,
      `DTSTART:${toIcsFormat(start)}`,
      `DTEND:${toIcsFormat(end)}`,
      `SUMMARY:${info.title.replace(/\n/g, ' ')}`,
      `DESCRIPTION:${(info.description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${(info.location || 'Guidance Office - Room 302').replace(/\n/g, ' ')}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download .ics file:', err);
  }
}
