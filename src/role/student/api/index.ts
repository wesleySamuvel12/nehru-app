import { api } from '@/lib/api-client'
export const studentApi = { portal: () => api('/api/portal/student'), assignments: () => api('/api/lms/assignments'), exams: () => api('/api/exams') }
