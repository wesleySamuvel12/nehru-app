import HealthModule from '@/role/health/modules/health'
import { RoleDashboardFrame } from '@/role/shared/RoleDashboardFrame'

export default function NurseDashboard() {
  return (
    <RoleDashboardFrame title="Student Health Desk" subtitle="Manage clinic visits, screenings, vaccinations and health records.">
      <HealthModule />
    </RoleDashboardFrame>
  )
}
