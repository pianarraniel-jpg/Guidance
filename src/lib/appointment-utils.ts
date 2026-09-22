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
