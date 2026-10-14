import { api } from '@/lib/api-client'
export const securityApi = { visitors: () => api('/api/security/visitors'), alerts: () => api('/api/security/alerts'), pickups: () => api('/api/security/pickups') }
