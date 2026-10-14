import { api } from '@/lib/api-client'

/** Backend boundary owned by the hod application. It uses the existing database-backed API contract. */
export const hodBackend = {
  AcademicsClasses: () => api('/api/academics/classes'),
  AcademicsSubjects: () => api('/api/academics/subjects'),
  AcademicsTimetables: () => api('/api/academics/timetables'),
  Students: () => api('/api/students'),
  Attendance: () => api('/api/attendance'),
  Exams: () => api('/api/exams'),
}
