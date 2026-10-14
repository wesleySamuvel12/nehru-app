import { api } from '@/lib/api-client'

/** Backend boundary owned by the hr application. It uses the existing database-backed API contract. */
export const hrBackend = {
  Employees: () => api('/api/employees'),
  HrPerformance: () => api('/api/hr/performance'),
  AttendanceEmployee: () => api('/api/attendance/employee'),
  FeesPayrollRuns: () => api('/api/fees/payroll/runs'),
  FeesPayrollPayslips: () => api('/api/fees/payroll/payslips'),
}
