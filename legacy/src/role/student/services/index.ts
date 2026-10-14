import { studentApi } from '@/role/student/api'
export const studentService = { loadPortal: studentApi.portal, loadAssignments: studentApi.assignments, loadExams: studentApi.exams }
