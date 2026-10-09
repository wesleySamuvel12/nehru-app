import { api } from '@/lib/api-client'
export const counsellorApi = { leads: () => api('/api/admissions/leads'), applications: () => api('/api/admissions/applications'), campaigns: () => api('/api/admissions/campaigns') }
