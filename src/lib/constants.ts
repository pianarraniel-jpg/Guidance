export const DEPARTMENTS = [
  { value: 'CEA', label: 'College of Engineering and Architecture' },
  { value: 'CCS', label: 'College of Computer Studies' },
  { value: 'CBA', label: 'College of Business and Accountancy' },
  { value: 'COE', label: 'College of Education' },
  { value: 'CAS', label: 'College of Arts and Sciences' },
  { value: 'CON', label: 'College of Nursing' },
  { value: 'CCJE', label: 'College of Criminal Justice Education' },
  { value: 'CTHM', label: 'College of Tourism and Hospitality Management' },
  { value: 'GS', label: 'Graduate School' },
] as const;

export type DepartmentCode = typeof DEPARTMENTS[number]['value'];

export const YEAR_LEVELS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  '5th Year',
  'Graduate',
] as const;

export const USER_ROLES = {
  STUDENT: 'student',
  COUNSELOR: 'counselor',
  ADMIN: 'admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUS[keyof typeof APPOINTMENT_STATUS];

// Values are Supabase table names
export const STORAGE_KEYS = {
  USERS: 'profiles',
  APPOINTMENTS: 'appointments',
  ASSESSMENTS: 'assessments',
  MESSAGES: 'messages',
  SESSION_NOTES: 'session_notes',
  AVAILABILITY: 'availability',
  ASSESSMENT_TASKS: 'assessment_tasks',
  NOTIFICATIONS_READ: 'notifications_read',
  AI_CHAT_SESSIONS: 'ai_chat_sessions',
  AI_CHAT_MESSAGES: 'ai_chat_messages',
  AI_INSIGHTS: 'ai_insights',
} as const;
