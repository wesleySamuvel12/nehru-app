import DashboardModule from '@/role/principal/modules/dashboard'
import { RoleDashboardFrame } from '@/role/shared/RoleDashboardFrame'

export default function PrincipalDashboard() {
  return (
    <RoleDashboardFrame title="Principal's Office" subtitle="Monitor academic quality, approvals, attendance and school operations.">
      <DashboardModule />
    </RoleDashboardFrame>
  )
}
