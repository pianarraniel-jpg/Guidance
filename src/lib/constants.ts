export interface CollegeDefinition {
  code: string;
  name: string;
  aliases?: string[];
  programs: string[];
}

export const COLLEGES_AND_PROGRAMS: CollegeDefinition[] = [
  {
    code: 'CBA',
    name: 'College of Business and Accountancy',
    aliases: ['CBA'],
    programs: [
      'Bachelor of Science in Accountancy',
      'Bachelor of Science in Business Administration major in Financial Management',
      'Bachelor of Science in Business Administration major in Marketing Management',
      'Bachelor of Science in Business Administration major in Operations Management',
      'Bachelor of Science in Business Administration major in Human Resource Development Management',
      'Bachelor of Science in Management Accounting',
      'Bachelor of Science in Tourism Management',
      'Bachelor of Science in Hospitality Management',
      'Bachelor of Science in Entrepreneurship',
      'Diploma in Hospitality Technology',
      'Diploma in Tourism Technology',
    ],
  },
  {
    code: 'CCS',
    name: 'College of Computer Studies',
    aliases: ['CCS'],
    programs: [
      'Bachelor of Science in Information Technology',
      'Bachelor of Science in Computer Science',
      'Diploma in Information Technology',
    ],
  },
  {
    code: 'CCJE',
    name: 'College of Criminal Justice Education',
    aliases: ['CJEA', 'CCJE'],
    programs: [
      'Bachelor of Science in Criminology',
    ],
  },
  {
    code: 'CHS',
    name: 'College of Health Sciences',
    aliases: ['CHS', 'CON'],
    programs: [
      'Bachelor of Science in Nursing',
      'Bachelor of Science in Pharmacy',
    ],
  },
  {
    code: 'CEA',
    name: 'College of Engineering and Architecture',
    aliases: ['CEA'],
    programs: [
      'Bachelor of Science in Architecture',
      'Bachelor of Science in Civil Engineering',
      'Bachelor of Science in Electrical Engineering',
      'Bachelor of Science in Geodetic Engineering',
      'Bachelor of Science in Mechanical Engineering',
      'Diploma in Civil Engineering Technology',
      'Diploma in Electrical Engineering Technology',
      'Diploma in Mechanical Engineering Technology',
      'Diploma in Manufacturing Technology',
    ],
  },
  {
    code: 'CSW',
    name: 'College of Social Work',
    aliases: ['CSW'],
    programs: [
      'Bachelor of Science in Social Work',
    ],
  },
  {
    code: 'CTEAS',
    name: 'College of Teacher Education, Arts, and Sciences',
    aliases: ['CTEAS', 'COE', 'CAS'],
    programs: [
      'Bachelor of Science in Psychology',
      'Bachelor of Arts in Music',
      'Bachelor of Arts in Political Science',
      'Bachelor of Education in Elementary Education',
      'Bachelor of Arts in English Language',
      'Bachelor of Arts in Literature',
      'Bachelor of Secondary Education in English',
      'Bachelor of Secondary Education in Science',
    ],
  },
];

export const DEPARTMENTS = [
  { value: 'CBA', label: 'College of Business and Accountancy' },
  { value: 'CCS', label: 'College of Computer Studies' },
  { value: 'CJEA', label: 'College of Criminal Justice Education (CJEA)' },
  { value: 'CCJE', label: 'College of Criminal Justice Education (CCJE)' },
  { value: 'CEA', label: 'College of Engineering and Architecture' },
  { value: 'CHS', label: 'College of Health Sciences (CHS)' },
  { value: 'CON', label: 'College of Nursing' },
  { value: 'CTEAS', label: 'College of Teacher Education, Arts and Sciences (CTEAS)' },
  { value: 'CSW', label: 'College of Social Work (CSW)' },
  { value: 'COE', label: 'College of Education' },
  { value: 'CAS', label: 'College of Arts and Sciences' },
  { value: 'CTHM', label: 'College of Tourism and Hospitality Management' },
  { value: 'GS', label: 'Graduate School' },
] as const;

export type DepartmentCode = typeof DEPARTMENTS[number]['value'];

export function getProgramsForCollege(collegeCode?: string): string[] {
  if (!collegeCode || collegeCode === 'all') {
    const allPrograms = new Set<string>();
    COLLEGES_AND_PROGRAMS.forEach(c => c.programs.forEach(p => allPrograms.add(p)));
    return Array.from(allPrograms);
  }
  const college = COLLEGES_AND_PROGRAMS.find(
    c => c.code === collegeCode || c.aliases?.includes(collegeCode)
  );
  return college ? college.programs : [];
}

export function getCollegeByCode(collegeCode?: string): CollegeDefinition | undefined {
  if (!collegeCode) return undefined;
  return COLLEGES_AND_PROGRAMS.find(
    c => c.code === collegeCode || c.aliases?.includes(collegeCode)
  );
}

export function getCollegesForCounselor(departmentStr?: string): CollegeDefinition[] {
  if (!departmentStr || departmentStr.trim().toLowerCase() === 'all') {
    return COLLEGES_AND_PROGRAMS;
  }
  const codes = departmentStr
    .split(',')
    .map(d => d.trim().toUpperCase())
    .filter(Boolean);
  if (codes.length === 0) return COLLEGES_AND_PROGRAMS;

  const matched = COLLEGES_AND_PROGRAMS.filter(c =>
    codes.some(code => code === c.code || c.aliases?.map(a => a.toUpperCase()).includes(code))
  );
  return matched.length > 0 ? matched : COLLEGES_AND_PROGRAMS;
}

export function getProgramsForCounselor(departmentStr?: string, selectedCollegeCode?: string): string[] {
  if (selectedCollegeCode && selectedCollegeCode !== 'all' && selectedCollegeCode !== 'unassigned') {
    return getProgramsForCollege(selectedCollegeCode);
  }
  const handledColleges = getCollegesForCounselor(departmentStr);
  const programs = new Set<string>();
  handledColleges.forEach(c => c.programs.forEach(p => programs.add(p)));
  return Array.from(programs);
}

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
