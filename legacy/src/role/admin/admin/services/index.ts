import { adminApi } from '@/role/admin/admin/api'

export const adminService = {
  loadDashboard: adminApi.dashboard,
  loadUsers: adminApi.users,
}
