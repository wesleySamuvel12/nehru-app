import { api } from '@/lib/api-client'
export const healthApi = { records: () => api('/api/health/records'), visits: () => api('/api/health/visits'), vaccinations: () => api('/api/health/vaccinations') }
