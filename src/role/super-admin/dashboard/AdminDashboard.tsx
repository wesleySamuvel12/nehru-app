import DashboardModule from '@/role/super-admin/modules/dashboard'
import { RoleDashboardFrame } from '@/role/shared/RoleDashboardFrame'

export default function SuperAdminDashboard() {
  return (
    <RoleDashboardFrame title="System Control Center" subtitle="Global administration, security, integrations and school-wide analytics.">
      <DashboardModule />
    </RoleDashboardFrame>
  )
}
