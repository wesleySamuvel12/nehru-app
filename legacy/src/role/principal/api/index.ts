import { api } from '@/lib/api-client'
export const principalApi = { dashboard: () => api('/api/dashboard'), analytics: () => api('/api/analytics') }
