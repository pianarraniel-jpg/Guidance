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

export const STORAGE_KEYS = {
  AUTH_USER: 'guidancesync_auth_user',
  USERS: 'guidancesync_users',
  APPOINTMENTS: 'guidancesync_appointments',
  ASSESSMENTS: 'guidancesync_assessments',
  MESSAGES: 'guidancesync_messages',
  SESSION_NOTES: 'guidancesync_session_notes',
  AVAILABILITY: 'guidancesync_availability',
} as const;
