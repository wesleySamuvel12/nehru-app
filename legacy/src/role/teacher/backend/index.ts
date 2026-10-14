import { api } from '@/lib/api-client'

/** Backend boundary owned by the teacher application. It uses the existing database-backed API contract. */
export const teacherBackend = {
  AcademicsClasses: () => api('/api/academics/classes'),
  AcademicsSubjects: () => api('/api/academics/subjects'),
  AcademicsTimetables: () => api('/api/academics/timetables'),
  Attendance: () => api('/api/attendance'),
  LmsAssignments: () => api('/api/lms/assignments'),
  Exams: () => api('/api/exams'),
  Students: () => api('/api/students'),
}
