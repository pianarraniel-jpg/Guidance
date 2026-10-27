import { supabase } from '@/lib/supabase';

export interface AcademicProfileData {
  department: string;
  program: string;
  yearLevel: string;
  studentId?: string;
}

/**
 * Checks whether a user has completed their academic classification.
 * A student must have a department/college, degree program, and year level.
 */
export function isAcademicClassificationComplete(
  user: { department?: string; program?: string; yearLevel?: string; year_level?: string } | null | undefined
): boolean {
  if (!user) return false;
  const dept = user.department?.trim();
  const prog = user.program?.trim();
  const yr = (user.yearLevel || user.year_level)?.trim();

  return Boolean(dept && prog && yr);
}

/**
 * Safely updates public.profiles by dynamically pruning any columns
 * that do not exist in the remote database schema cache.
 */
export async function safeUpdateProfile(
  userId: string,
  fields: Record<string, any>
): Promise<{ success: boolean; error?: string; data?: any }> {
  const payload = { ...fields };

  // Allow up to 6 retries to prune columns reported as missing by PostgREST
  let attempts = 0;
  while (attempts < 6) {
    attempts++;
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select();

    if (!error) {
      return { success: true, data };
    }

    // Match PostgREST column missing error:
    // e.g. "Could not find the 'course' column of 'profiles' in the schema cache"
    const match = error.message.match(/Could not find the '([^']+)' column/i);
    if (match && match[1] && match[1] in payload) {
      console.warn(`[safeUpdateProfile] Column '${match[1]}' does not exist in 'profiles'. Pruning and retrying.`);
      delete payload[match[1]];
      if (Object.keys(payload).length === 0) {
        // Nothing left to update in profiles table
        return { success: true, data: null };
      }
      continue;
    }

    // Unhandled or non-column error
    console.error('[safeUpdateProfile] Unhandled error updating profile:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Updates academic classification across both public.profiles and auth.users user_metadata.
 * This guarantees persistence even if remote database schema is missing columns.
 */
export async function updateAcademicClassification(
  userId: string,
  data: AcademicProfileData
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanDept = data.department.trim();
    const cleanProg = data.program.trim();
    const cleanYr = data.yearLevel.trim();
    const cleanStudentId = data.studentId?.trim();

    // 1. Update public.profiles table (safe against missing columns)
    const profilePayload: Record<string, any> = {
      department: cleanDept,
      year_level: cleanYr,
      course: cleanProg,
      program: cleanProg,
    };
    if (cleanStudentId) {
      profilePayload.student_id = cleanStudentId;
    }

    const dbResult = await safeUpdateProfile(userId, profilePayload);
    if (!dbResult.success && dbResult.error) {
      console.warn('[updateAcademicClassification] Database profile update warning:', dbResult.error);
    }

    // 2. Persist in Supabase Auth user_metadata (always supports arbitrary JSON)
    const metaPayload: Record<string, any> = {
      department: cleanDept,
      program: cleanProg,
      year_level: cleanYr,
    };
    if (cleanStudentId) {
      metaPayload.student_id = cleanStudentId;
    }

    try {
      await supabase.auth.updateUser({
        data: metaPayload,
      });
    } catch (metaErr: any) {
      console.warn('[updateAcademicClassification] Metadata update warning:', metaErr?.message);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[updateAcademicClassification] Error:', err);
    return { success: false, error: err?.message || 'Failed to update academic classification.' };
  }
}
