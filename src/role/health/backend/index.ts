import { api } from '@/lib/api-client'

/** Backend boundary owned by the health application. It uses the existing database-backed API contract. */
export const healthBackend = {
  HealthRecords: () => api('/api/health/records'),
  HealthVisits: () => api('/api/health/visits'),
  HealthVaccinations: () => api('/api/health/vaccinations'),
  Students: () => api('/api/students'),
}
