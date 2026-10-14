import { api } from '@/lib/api-client'

/** Backend boundary owned by the student application. It uses the existing database-backed API contract. */
export const studentBackend = {
  PortalStudent: () => api('/api/portal/student'),
  LmsAssignments: () => api('/api/lms/assignments'),
  LmsMaterials: () => api('/api/lms/materials'),
  Attendance: () => api('/api/attendance'),
  Exams: () => api('/api/exams'),
  FeesInvoices: () => api('/api/fees/invoices'),
}
