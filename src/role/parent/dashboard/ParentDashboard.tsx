import ParentPortalModule from '@/role/parent/pages/ParentPortal'
import { RoleDashboardFrame } from '@/role/shared/RoleDashboardFrame'

export default function ParentDashboard() {
  return (
    <RoleDashboardFrame title="Parent Portal" subtitle="Follow your children's attendance, academics, fees and transport.">
      <ParentPortalModule />
    </RoleDashboardFrame>
  )
}
