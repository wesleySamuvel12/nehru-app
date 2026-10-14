// Role-Based Access Control — Navigation Configuration, Permissions & Modules

export const ROLES = [
  'SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER', 'ACCOUNTANT', 'HR',
  'COUNSELLOR', 'LIBRARIAN', 'TRANSPORT', 'WARDEN', 'NURSE', 'SECURITY',
  'PARENT', 'STUDENT',
] as const

export type Role = (typeof ROLES)[number]

export const ROLE_ALIASES: Record<string, Role> = {
  HOSTEL: 'WARDEN',
  HEALTH: 'NURSE',
}

/** Normalizes role string to canonical uppercase Role (e.g. HOSTEL -> WARDEN, HEALTH -> NURSE) */
export function normalizeRole(role: string): Role {
  const upper = String(role || '').toUpperCase().trim()
  if (upper in ROLE_ALIASES) {
    return ROLE_ALIASES[upper]
  }
  return upper as Role
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  SCHOOL_ADMIN: 'School Admin',
  PRINCIPAL: 'Principal',
  TEACHER: 'Teacher',
  ACCOUNTANT: 'Accountant',
  HR: 'HR Manager',
  COUNSELLOR: 'Admission Counsellor',
  LIBRARIAN: 'Librarian',
  TRANSPORT: 'Transport Manager',
  WARDEN: 'Hostel Warden',
  HOSTEL: 'Hostel Warden',
  NURSE: 'Nurse / Doctor',
  HEALTH: 'Nurse / Doctor',
  SECURITY: 'Security Staff',
  PARENT: 'Parent',
  STUDENT: 'Student',
}

const ALL_ADMINS = ['SUPER_ADMIN', 'SCHOOL_ADMIN']
const MANAGEMENT = [...ALL_ADMINS, 'PRINCIPAL']

/** Module -> roles allowed to access (API + nav). SUPER_ADMIN always allowed. */
export const MODULE_ACCESS: Record<string, string[]> = {
  dashboard: [...MANAGEMENT, 'ACCOUNTANT', 'HR', 'COUNSELLOR', 'LIBRARIAN', 'TRANSPORT', 'WARDEN', 'NURSE', 'SECURITY'],
  admissions: [...MANAGEMENT, 'COUNSELLOR'],
  students: [...MANAGEMENT, 'TEACHER', 'NURSE', 'TRANSPORT', 'WARDEN', 'LIBRARIAN', 'SECURITY'],
  parents: [...MANAGEMENT, 'TEACHER'],
  teachers: [...ALL_ADMINS, 'PRINCIPAL', 'HR'],
  academics: [...MANAGEMENT, 'TEACHER'],
  lms: [...MANAGEMENT, 'TEACHER', 'STUDENT', 'PARENT'],
  attendance: [...MANAGEMENT, 'TEACHER', 'PARENT', 'STUDENT'],
  examinations: [...MANAGEMENT, 'TEACHER', 'PARENT', 'STUDENT'],
  fees: [...ALL_ADMINS, 'ACCOUNTANT', 'PARENT', 'STUDENT'],
  hr: [...ALL_ADMINS, 'HR', 'PRINCIPAL'],
  transport: [...ALL_ADMINS, 'TRANSPORT', 'PARENT', 'STUDENT', 'PRINCIPAL'],
  hostel: [...ALL_ADMINS, 'WARDEN', 'PARENT', 'STUDENT', 'PRINCIPAL'],
  security: [...ALL_ADMINS, 'SECURITY', 'PRINCIPAL'],
  health: [...ALL_ADMINS, 'NURSE', 'PARENT', 'PRINCIPAL', 'TEACHER'],
  library: [...ALL_ADMINS, 'LIBRARIAN', 'TEACHER', 'STUDENT', 'PARENT'],
  assets: [...MANAGEMENT, 'HR'],
  communication: [...MANAGEMENT, 'TEACHER', 'PARENT', 'STUDENT'],
  events: [...MANAGEMENT, 'TEACHER', 'PARENT', 'STUDENT', 'ACCOUNTANT', 'HR', 'LIBRARIAN', 'TRANSPORT', 'WARDEN', 'NURSE', 'SECURITY'],
  certificates: [...MANAGEMENT, 'TEACHER', 'PARENT', 'STUDENT'],
  analytics: [...MANAGEMENT, 'ACCOUNTANT', 'HR'],
  integrations: [...ALL_ADMINS],
  settings: [...ALL_ADMINS],
  'audit-logs': [...ALL_ADMINS, 'PRINCIPAL'],
  'parent-portal': ['PARENT'],
  'student-portal': ['STUDENT'],
  'teacher-portal': ['TEACHER'],
}

export function can(role: string, moduleKey: string): boolean {
  const canonicalRole = normalizeRole(role)
  if (moduleKey === 'student-portal' && canonicalRole !== 'STUDENT') return false
  if (canonicalRole === 'SUPER_ADMIN') return true
  const allowed = MODULE_ACCESS[moduleKey]
  return !!allowed && allowed.includes(canonicalRole)
}

export type SubItem = {
  key: string
  label: string
}

export type NavItem = {
  key: string
  label: string
  icon: string
  group: string
  roles?: string[]
  subItems?: SubItem[]
}

/** Complete Navigation Configuration for the Dynamic Sidebar System */
export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    group: 'Overview',
    roles: [...MANAGEMENT, 'ACCOUNTANT', 'HR', 'COUNSELLOR', 'LIBRARIAN', 'TRANSPORT', 'WARDEN', 'NURSE', 'SECURITY'],
  },
  {
    key: 'parent-portal',
    label: 'Parent Portal',
    icon: 'Users',
    group: 'Overview',
    roles: ['PARENT'],
    subItems: [
      { key: 'children', label: 'My Children' },
      { key: 'child-attendance', label: 'Attendance' },
      { key: 'child-academics', label: 'Academics & Homework' },
      { key: 'child-exams', label: 'Exam Results' },
      { key: 'child-fees', label: 'Pay Fees' },
      { key: 'child-transport', label: 'Live Bus Tracking' },
    ],
  },
  {
    key: 'student-portal',
    label: 'Student Space',
    icon: 'GraduationCap',
    group: 'Overview',
    roles: ['STUDENT'],
    subItems: [
      { key: 'my-profile', label: 'My Profile & ID' },
      { key: 'timetable', label: 'Class Timetable' },
      { key: 'homework', label: 'Homework & Assignments' },
      { key: 'online-classes', label: 'LMS & Online Classes' },
      { key: 'exam-results', label: 'Exam Results & Grades' },
      { key: 'my-attendance', label: 'Attendance Record' },
    ],
  },
  {
    key: 'admissions',
    label: 'Admissions & CRM',
    icon: 'UserPlus',
    group: 'Operations',
    roles: [...MANAGEMENT, 'COUNSELLOR'],
    subItems: [
      { key: 'enquiries', label: 'Enquiries & Leads' },
      { key: 'pipeline', label: 'Kanban Pipeline' },
      { key: 'applications', label: 'Applications' },
      { key: 'verification', label: 'Document Verification' },
      { key: 'interviews', label: 'Entrance Tests & Interviews' },
      { key: 'approvals', label: 'Offer Letters & Enrollment' },
    ],
  },
  {
    key: 'students',
    label: 'Students',
    icon: 'GraduationCap',
    group: 'Operations',
    roles: [...MANAGEMENT, 'TEACHER', 'NURSE', 'TRANSPORT', 'WARDEN', 'LIBRARIAN', 'SECURITY'],
    subItems: [
      { key: 'directory', label: 'Student Directory' },
      { key: 'enrollment', label: 'Enrollment & Promotion' },
      { key: 'transfers', label: 'Transfers & Withdrawals' },
      { key: 'alumni', label: 'Alumni Registry' },
    ],
  },
  {
    key: 'parents',
    label: 'Parents',
    icon: 'Users',
    group: 'Operations',
    roles: [...MANAGEMENT, 'TEACHER'],
  },
  {
    key: 'teachers',
    label: 'Teachers & Staff',
    icon: 'Briefcase',
    group: 'Operations',
    roles: [...ALL_ADMINS, 'PRINCIPAL', 'HR'],
    subItems: [
      { key: 'staff-directory', label: 'Staff Directory' },
      { key: 'employee-profiles', label: 'Employee Profiles' },
      { key: 'qualifications', label: 'Certifications & Documents' },
    ],
  },
  {
    key: 'academics',
    label: 'Academics',
    icon: 'BookOpen',
    group: 'Academics',
    roles: [...MANAGEMENT, 'TEACHER'],
    subItems: [
      { key: 'my-classes', label: 'My Classes & Subjects' },
      { key: 'timetable', label: 'Master Timetable' },
      { key: 'lesson-planning', label: 'Lesson Planning' },
      { key: 'curriculum', label: 'Curriculum & Syllabi' },
      { key: 'homework', label: 'Homework & Assignments' },
    ],
  },
  {
    key: 'lms',
    label: 'LMS & Learning',
    icon: 'MonitorPlay',
    group: 'Academics',
    roles: [...MANAGEMENT, 'TEACHER', 'STUDENT', 'PARENT'],
  },
  {
    key: 'attendance',
    label: 'Attendance',
    icon: 'CalendarCheck',
    group: 'Academics',
    roles: [...MANAGEMENT, 'TEACHER', 'PARENT', 'STUDENT'],
    subItems: [
      { key: 'mark-attendance', label: 'Mark Class Attendance' },
      { key: 'staff-attendance', label: 'Staff Attendance' },
      { key: 'leave-requests', label: 'Leave Requests & Approvals' },
      { key: 'attendance-reports', label: 'Attendance Reports' },
    ],
  },
  {
    key: 'examinations',
    label: 'Examinations',
    icon: 'ClipboardList',
    group: 'Academics',
    roles: [...MANAGEMENT, 'TEACHER', 'PARENT', 'STUDENT'],
    subItems: [
      { key: 'exam-planning', label: 'Exam Timetable & Schedules' },
      { key: 'question-bank', label: 'Question Bank' },
      { key: 'marks-entry', label: 'Marks Entry' },
      { key: 'report-cards', label: 'Report Cards & Transcripts' },
      { key: 'merit-list', label: 'Merit List & Analytics' },
    ],
  },
  {
    key: 'fees',
    label: 'Fees & Finance',
    icon: 'Wallet',
    group: 'Finance',
    roles: [...ALL_ADMINS, 'ACCOUNTANT', 'PARENT', 'STUDENT'],
    subItems: [
      { key: 'fee-structures', label: 'Fee Structures' },
      { key: 'fee-collection', label: 'Fee Collection & EasyPay' },
      { key: 'receipts', label: 'Receipts & Receipts History' },
      { key: 'outstanding', label: 'Outstanding Fees & Dues' },
      { key: 'discounts', label: 'Discounts & Scholarships' },
      { key: 'reconciliation', label: 'Payment Reconciliation' },
    ],
  },
  {
    key: 'hr',
    label: 'HR & Payroll',
    icon: 'BadgeCheck',
    group: 'Finance',
    roles: [...ALL_ADMINS, 'HR', 'PRINCIPAL'],
    subItems: [
      { key: 'payroll-processing', label: 'Payroll Processing' },
      { key: 'salary-slips', label: 'Payslips & Salary Structure' },
      { key: 'appraisals', label: 'Performance & Appraisals' },
      { key: 'expiry-alerts', label: 'Document Expiry Alerts' },
    ],
  },
  {
    key: 'transport',
    label: 'Transport',
    icon: 'Bus',
    group: 'Operations',
    roles: [...ALL_ADMINS, 'TRANSPORT', 'PARENT', 'STUDENT', 'PRINCIPAL'],
    subItems: [
      { key: 'live-gps', label: 'Live GPS Fleet Tracking' },
      { key: 'buses', label: 'Buses & Routes' },
      { key: 'drivers', label: 'Drivers & Attendants' },
      { key: 'maintenance', label: 'Vehicle Maintenance & Fuel' },
    ],
  },
  {
    key: 'hostel',
    label: 'Hostel',
    icon: 'Building2',
    group: 'Operations',
    roles: [...ALL_ADMINS, 'WARDEN', 'PARENT', 'STUDENT', 'PRINCIPAL'],
    subItems: [
      { key: 'hostel-rooms', label: 'Rooms & Bed Occupancy' },
      { key: 'student-allocation', label: 'Student Allocation' },
      { key: 'checkin-checkout', label: 'Check-In / Check-Out' },
      { key: 'mess', label: 'Mess & Food Menu' },
    ],
  },
  {
    key: 'security',
    label: 'Security & Gate Pass',
    icon: 'ShieldCheck',
    group: 'Operations',
    roles: [...ALL_ADMINS, 'SECURITY', 'PRINCIPAL'],
    subItems: [
      { key: 'visitor-pass', label: 'Visitor Registration' },
      { key: 'pickup-verification', label: 'Student Pickup QR Verification' },
      { key: 'gate-logs', label: 'Gate Entry/Exit Logs' },
    ],
  },
  {
    key: 'health',
    label: 'Health & Clinic',
    icon: 'HeartPulse',
    group: 'Operations',
    roles: [...ALL_ADMINS, 'NURSE', 'PARENT', 'PRINCIPAL', 'TEACHER'],
    subItems: [
      { key: 'health-profiles', label: 'Student Health Profiles' },
      { key: 'clinic-visits', label: 'Clinic Visits & First Aid' },
      { key: 'vaccinations', label: 'Vaccination & Medical Records' },
    ],
  },
  {
    key: 'library',
    label: 'Library',
    icon: 'Library',
    group: 'Operations',
    roles: [...ALL_ADMINS, 'LIBRARIAN', 'TEACHER', 'STUDENT', 'PARENT'],
    subItems: [
      { key: 'catalog', label: 'Book Catalog' },
      { key: 'issue-return', label: 'Issue & Return Desk' },
      { key: 'digital-library', label: 'Digital Library' },
      { key: 'fines', label: 'Overdue Fines & Reservations' },
    ],
  },
  {
    key: 'assets',
    label: 'Assets & Resources',
    icon: 'Boxes',
    group: 'Operations',
    roles: [...MANAGEMENT, 'HR'],
  },
  {
    key: 'communication',
    label: 'Communication',
    icon: 'Megaphone',
    group: 'Engagement',
    roles: [...MANAGEMENT, 'TEACHER', 'PARENT', 'STUDENT'],
  },
  {
    key: 'events',
    label: 'Events & Calendar',
    icon: 'CalendarDays',
    group: 'Engagement',
    roles: [...MANAGEMENT, 'TEACHER', 'PARENT', 'STUDENT', 'ACCOUNTANT', 'HR', 'LIBRARIAN', 'TRANSPORT', 'WARDEN', 'NURSE', 'SECURITY'],
  },
  {
    key: 'certificates',
    label: 'Certificates',
    icon: 'FileBadge',
    group: 'Engagement',
    roles: [...MANAGEMENT, 'TEACHER', 'PARENT', 'STUDENT'],
  },
  {
    key: 'analytics',
    label: 'Reports & Analytics',
    icon: 'BarChart3',
    group: 'System',
    roles: [...MANAGEMENT, 'ACCOUNTANT', 'HR'],
  },
  {
    key: 'integrations',
    label: 'Integrations',
    icon: 'Plug',
    group: 'System',
    roles: [...ALL_ADMINS],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'Settings',
    group: 'System',
    roles: [...ALL_ADMINS],
  },
  {
    key: 'audit-logs',
    label: 'Audit Logs',
    icon: 'ScrollText',
    group: 'System',
    roles: [...ALL_ADMINS, 'PRINCIPAL'],
  },
]

/** Priority keys for mobile bottom navigation bar */
export const MOBILE_NAV = ['dashboard', 'students', 'attendance', 'fees', 'communication']
