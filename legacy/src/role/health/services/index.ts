import { healthApi } from '@/role/health/api'
export const healthService = { loadRecords: healthApi.records, loadVisits: healthApi.visits, loadVaccinations: healthApi.vaccinations }
