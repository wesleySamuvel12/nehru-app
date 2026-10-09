import { adminApi } from '@/role/super-admin/api'

export const adminService = {
  loadDashboard: adminApi.dashboard,
  loadUsers: adminApi.users,
}
