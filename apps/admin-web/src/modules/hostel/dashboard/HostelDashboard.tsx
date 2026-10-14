import HostelModule from '@/role/hostel/modules/hostel'
import { RoleDashboardFrame } from '@/role/shared/RoleDashboardFrame'

export default function WardenDashboard() {
  return (
    <RoleDashboardFrame title="Hostel Operations" subtitle="Manage rooms, beds, allocations, complaints, visitors and mess operations.">
      <HostelModule />
    </RoleDashboardFrame>
  )
}
