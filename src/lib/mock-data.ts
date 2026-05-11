import { USER_ROLES, APPOINTMENT_STATUS } from './constants';

export const MOCK_USERS = [
  {
    id: 's1',
    studentId: '2024-0001',
    name: 'Juan Dela Cruz',
    email: 'student@uspf.edu.ph',
    password: 'password123',
    role: USER_ROLES.STUDENT,
  },
  {
    id: 'c1',
    name: 'Dr. Maria Santos',
    email: 'counselor@uspf.edu.ph',
    password: 'password123',
    role: USER_ROLES.COUNSELOR,
    specialization: 'Academic Stress & Career Guidance',
  },
  {
    id: 'a1',
    name: 'Admin User',
    email: 'admin@uspf.edu.ph',
    password: 'password123',
    role: USER_ROLES.ADMIN,
  },
];

export const MOCK_APPOINTMENTS = [
  {
    id: 'app1',
    studentId: 's1',
    counselorId: 'c1',
    date: '2024-06-15',
    time: '10:00 AM',
    status: APPOINTMENT_STATUS.CONFIRMED,
    type: 'Wellness Check-in',
  },
];

export const MOCK_AVAILABILITY = [
  {
    id: 'av1',
    counselorId: 'c1',
    day: 'Monday',
    slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM'],
  },
];
