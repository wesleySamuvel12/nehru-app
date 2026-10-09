'use client'

import AdminDashboard from '@/role/super-admin/dashboard/AdminDashboard'
import { AdminLayout } from '@/role/super-admin/layout/AdminLayout'

export default function AdminApplication() {
  return <AdminLayout><AdminDashboard /></AdminLayout>
}
