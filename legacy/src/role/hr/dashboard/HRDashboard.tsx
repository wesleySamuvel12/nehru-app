import HrModule from '@/role/hr/modules/hr'
import { RoleDashboardFrame } from '@/role/shared/RoleDashboardFrame'

export default function HrDashboard() {
  return (
    <RoleDashboardFrame title="People Operations" subtitle="Manage staff records, payroll, compliance and performance.">
      <HrModule />
    </RoleDashboardFrame>
  )
}
