import { teacherApi } from '@/role/teacher/api'
export const teacherService = { loadClasses: teacherApi.classes, loadAttendance: teacherApi.attendance, loadAssignments: teacherApi.assignments }
