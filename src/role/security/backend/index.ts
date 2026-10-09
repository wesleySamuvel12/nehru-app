import { api } from '@/lib/api-client'

/** Backend boundary owned by the security application. It uses the existing database-backed API contract. */
export const securityBackend = {
  SecurityVisitors: () => api('/api/security/visitors'),
  SecurityAlerts: () => api('/api/security/alerts'),
  SecurityPickups: () => api('/api/security/pickups'),
  Students: () => api('/api/students'),
}
