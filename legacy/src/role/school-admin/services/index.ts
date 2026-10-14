import { adminApi } from '@/role/school-admin/api'

export const adminService = {
  loadDashboard: adminApi.dashboard,
  loadUsers: adminApi.users,
}
