import SecurityModule from '@/role/security/modules/security'
import { RoleDashboardFrame } from '@/role/shared/RoleDashboardFrame'

export default function SecurityDashboard() {
  return (
    <RoleDashboardFrame title="Campus Security" subtitle="Manage visitors, check-in and check-out, alerts and student pickups.">
      <SecurityModule />
    </RoleDashboardFrame>
  )
}
