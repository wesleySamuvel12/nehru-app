import { api } from '@/lib/api-client'

/** Backend boundary owned by the principal application. It uses the existing database-backed API contract. */
export const principalBackend = {
  Dashboard: () => api('/api/dashboard'),
  Analytics: () => api('/api/analytics'),
  Students: () => api('/api/students'),
  Teachers: () => api('/api/teachers'),
  AcademicsClasses: () => api('/api/academics/classes'),
  Attendance: () => api('/api/attendance'),
  Exams: () => api('/api/exams'),
  AuditLogs: () => api('/api/audit-logs'),
}
