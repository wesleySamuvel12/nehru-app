import { api } from '@/lib/api-client'
export const hrApi = { employees: () => api('/api/employees'), performance: () => api('/api/hr/performance'), attendance: () => api('/api/attendance/employee') }
