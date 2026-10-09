import TransportModule from '@/role/transport/modules/transport'
import { RoleDashboardFrame } from '@/role/shared/RoleDashboardFrame'

export default function TransportDashboard() {
  return (
    <RoleDashboardFrame title="Transport Control Room" subtitle="Coordinate routes, vehicles, stops, allocations and live fleet status.">
      <TransportModule />
    </RoleDashboardFrame>
  )
}
