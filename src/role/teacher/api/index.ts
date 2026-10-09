import { api } from '@/lib/api-client'
export const teacherApi = { classes: () => api('/api/academics/classes'), attendance: () => api('/api/attendance'), assignments: () => api('/api/lms/assignments') }
