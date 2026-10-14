import { api } from '@/lib/api-client'
export const hodApi = { classes: () => api('/api/academics/classes'), subjects: () => api('/api/academics/subjects'), timetable: () => api('/api/academics/timetables') }
