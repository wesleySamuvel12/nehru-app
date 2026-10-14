export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
  PRINCIPAL: 'PRINCIPAL',
  HOD: 'HOD',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
  ACCOUNTANT: 'ACCOUNTANT',
  HR: 'HR',
  LIBRARIAN: 'LIBRARIAN',
  TRANSPORT: 'TRANSPORT',
  HOSTEL: 'HOSTEL',
  HEALTH: 'HEALTH',
  SECURITY: 'SECURITY',
} as const;

export const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
  HALF_DAY: 'HALF_DAY',
} as const;

export const FEE_STATUS = {
  PAID: 'PAID',
  PARTIAL: 'PARTIAL',
  UNPAID: 'UNPAID',
  OVERDUE: 'OVERDUE',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  STUDENTS: '/students',
  TEACHERS: '/teachers',
  PARENTS: '/parents',
  ATTENDANCE: '/attendance',
  EXAMS: '/exams',
  FEES: '/fees',
  TIMETABLE: '/timetable',
  LIBRARY: '/library',
  TRANSPORT: '/transport',
  HOSTEL: '/hostel',
  HEALTH: '/health',
  SECURITY: '/security',
  NOTIFICATIONS: '/notifications',
  REPORTS: '/reports',
} as const;
