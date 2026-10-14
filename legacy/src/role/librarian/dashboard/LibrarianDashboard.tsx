import LibraryModule from '@/role/librarian/modules/library'
import { RoleDashboardFrame } from '@/role/shared/RoleDashboardFrame'

export default function LibrarianDashboard() {
  return (
    <RoleDashboardFrame title="Library Desk" subtitle="Manage the catalogue, circulation, reservations and library reports.">
      <LibraryModule />
    </RoleDashboardFrame>
  )
}
