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
