import { principalApi } from '@/role/principal/api'
export const principalService = { loadDashboard: principalApi.dashboard, loadAnalytics: principalApi.analytics }
