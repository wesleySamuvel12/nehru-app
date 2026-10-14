import { securityApi } from '@/role/security/api'
export const securityService = { loadVisitors: securityApi.visitors, loadAlerts: securityApi.alerts, loadPickups: securityApi.pickups }
