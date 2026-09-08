// Role-Based Access Control — modules, navigation and permissions
export const ROLES = [
  'SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER', 'ACCOUNTANT', 'HR',
  'COUNSELLOR', 'LIBRARIAN', 'TRANSPORT', 'WARDEN', 'NURSE', 'SECURITY',
  'PARENT', 'STUDENT',
] as const

export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', SCHOOL_ADMIN: 'School Admin', PRINCIPAL: 'Principal',
  TEACHER: 'Teacher', ACCOUNTANT: 'Accountant', HR: 'HR Manager',
  COUNSELLOR: 'Admission Counsellor', LIBRARIAN: 'Librarian', TRANSPORT: 'Transport Manager',
  WARDEN: 'Hostel Warden', NURSE: 'Nurse / Doctor', SECURITY: 'Security Staff',
  PARENT: 'Parent', STUDENT: 'Student',
}

const A = ['SUPER_ADMIN', 'SCHOOL_ADMIN']
const MGMT = [...A, 'PRINCIPAL']

/** Module -> roles allowed to access (API + nav). SUPER_ADMIN always allowed. */
export const MODULE_ACCESS: Record<string, string[]> = {
  dashboard: [...MGMT, 'TEACHER', 'ACCOUNTANT', 'HR', 'COUNSELLOR', 'LIBRARIAN', 'TRANSPORT', 'WARDEN', 'NURSE', 'SECURITY'],
  admissions: [...MGMT, 'COUNSELLOR'],
  students: [...MGMT, 'TEACHER', 'NURSE', 'TRANSPORT', 'WARDEN', 'LIBRARIAN', 'SECURITY'],
  parents: [...MGMT, 'TEACHER'],
  teachers: [...A, 'PRINCIPAL', 'HR'],
  academics: [...MGMT, 'TEACHER'],
  lms: [...MGMT, 'TEACHER', 'STUDENT', 'PARENT'],
  attendance: [...MGMT, 'TEACHER', 'PARENT', 'STUDENT'],
  examinations: [...MGMT, 'TEACHER', 'PARENT', 'STUDENT'],
  fees: [...A, 'ACCOUNTANT', 'PARENT', 'STUDENT'],
  hr: [...A, 'HR', 'PRINCIPAL'],
  transport: [...A, 'TRANSPORT', 'PARENT', 'STUDENT', 'PRINCIPAL'],
  hostel: [...A, 'WARDEN', 'PARENT', 'STUDENT', 'PRINCIPAL'],
  security: [...A, 'SECURITY', 'PRINCIPAL'],
  health: [...A, 'NURSE', 'PARENT', 'PRINCIPAL', 'TEACHER'],
  library: [...A, 'LIBRARIAN', 'TEACHER', 'STUDENT', 'PARENT'],
  assets: [...MGMT, 'HR'],
  communication: [...MGMT, 'TEACHER', 'PARENT', 'STUDENT'],
  events: [...MGMT, 'TEACHER', 'PARENT', 'STUDENT', 'ACCOUNTANT', 'HR', 'LIBRARIAN', 'TRANSPORT', 'WARDEN', 'NURSE', 'SECURITY'],
  certificates: [...MGMT, 'TEACHER', 'PARENT', 'STUDENT'],
  analytics: [...MGMT, 'ACCOUNTANT', 'HR'],
  integrations: [...A],
  settings: [...A],
  'audit-logs': [...A, 'PRINCIPAL'],
  'parent-portal': ['PARENT'],
  'student-portal': ['STUDENT'],
  'teacher-portal': ['TEACHER'],
}

export function can(role: string, module: string): boolean {
  if (role === 'SUPER_ADMIN') return true
  const allowed = MODULE_ACCESS[module]
  return !!allowed && allowed.includes(role)
}

export type NavItem = {
  key: string
  label: string
  icon: string
  group: string
  roles?: string[]
}

/** Sidebar navigation — filtered at render-time via can(). */
export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', group: 'Overview' },
  { key: 'parent-portal', label: 'Parent Portal', icon: 'Users', group: 'Overview' },
  { key: 'student-portal', label: 'My Space', icon: 'GraduationCap', group: 'Overview' },
  { key: 'admissions', label: 'Admissions & CRM', icon: 'UserPlus', group: 'Operations' },
  { key: 'students', label: 'Students', icon: 'GraduationCap', group: 'Operations' },
  { key: 'parents', label: 'Parents', icon: 'Users', group: 'Operations' },
  { key: 'teachers', label: 'Teachers & Staff', icon: 'Briefcase', group: 'Operations' },
  { key: 'academics', label: 'Academics', icon: 'BookOpen', group: 'Academics' },
  { key: 'lms', label: 'LMS', icon: 'MonitorPlay', group: 'Academics' },
  { key: 'attendance', label: 'Attendance', icon: 'CalendarCheck', group: 'Academics' },
  { key: 'examinations', label: 'Examinations', icon: 'ClipboardList', group: 'Academics' },
  { key: 'fees', label: 'Fees & Finance', icon: 'Wallet', group: 'Finance' },
  { key: 'hr', label: 'HR & Payroll', icon: 'BadgeCheck', group: 'Finance' },
  { key: 'transport', label: 'Transport', icon: 'Bus', group: 'Operations' },
  { key: 'hostel', label: 'Hostel', icon: 'Building2', group: 'Operations' },
  { key: 'security', label: 'Security & Visitors', icon: 'ShieldCheck', group: 'Operations' },
  { key: 'health', label: 'Health & Clinic', icon: 'HeartPulse', group: 'Operations' },
  { key: 'library', label: 'Library', icon: 'Library', group: 'Operations' },
  { key: 'assets', label: 'Assets & Resources', icon: 'Boxes', group: 'Operations' },
  { key: 'communication', label: 'Communication', icon: 'Megaphone', group: 'Engagement' },
  { key: 'events', label: 'Events & Calendar', icon: 'CalendarDays', group: 'Engagement' },
  { key: 'certificates', label: 'Certificates', icon: 'FileBadge', group: 'Engagement' },
  { key: 'analytics', label: 'Reports & Analytics', icon: 'BarChart3', group: 'System' },
  { key: 'integrations', label: 'Integrations', icon: 'Plug', group: 'System' },
  { key: 'settings', label: 'Settings', icon: 'Settings', group: 'System' },
  { key: 'audit-logs', label: 'Audit Logs', icon: 'ScrollText', group: 'System' },
]

/** Mobile bottom-nav keys (ordered priority) */
export const MOBILE_NAV = ['dashboard', 'students', 'attendance', 'fees', 'communication']
