import DashboardModule from '@/role/school-admin/modules/dashboard'
import { RoleDashboardFrame } from '@/role/shared/RoleDashboardFrame'

export default function SchoolAdminDashboard() {
  return (
    <RoleDashboardFrame title="School Administration" subtitle="Manage campus operations, users, academics, finance and school settings.">
      <DashboardModule />
    </RoleDashboardFrame>
  )
}
