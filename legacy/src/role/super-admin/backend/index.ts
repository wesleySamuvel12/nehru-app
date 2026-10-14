import { api } from '@/lib/api-client'

/** Backend boundary owned by the admin application. It uses the existing database-backed API contract. */
export const adminBackend = {
  Dashboard: () => api('/api/dashboard'),
  SettingsUsers: () => api('/api/settings/users'),
  Students: () => api('/api/students'),
  Teachers: () => api('/api/teachers'),
  AdmissionsApplications: () => api('/api/admissions/applications'),
  AcademicsClasses: () => api('/api/academics/classes'),
  FeesInvoices: () => api('/api/fees/invoices'),
  AuditLogs: () => api('/api/audit-logs'),
}
