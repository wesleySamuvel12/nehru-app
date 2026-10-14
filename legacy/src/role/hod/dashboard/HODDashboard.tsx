'use client'

import AcademicsModule from '@/role/hod/modules/academics'
import { RoleDashboardFrame } from '@/role/shared/RoleDashboardFrame'

export default function HODDashboard() {
  return (
    <RoleDashboardFrame title="Department Academic Hub" subtitle="Coordinate department classes, subjects, timetables and academic planning.">
      <AcademicsModule />
    </RoleDashboardFrame>
  )
}
