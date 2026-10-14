import { api } from '@/lib/api-client'

export const adminApi = {
  dashboard: () => api('/api/dashboard'),
  users: () => api('/api/settings/users'),
}
