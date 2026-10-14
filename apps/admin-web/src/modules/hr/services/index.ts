import { hrApi } from '@/role/hr/api'
export const hrService = { loadEmployees: hrApi.employees, loadPerformance: hrApi.performance, loadAttendance: hrApi.attendance }
