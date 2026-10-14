import AcademicsModule from '@/role/teacher/modules/academics'
import { RoleDashboardFrame } from '@/role/shared/RoleDashboardFrame'

export default function TeacherDashboard() {
  return (
    <RoleDashboardFrame title="Teacher Workspace" subtitle="Manage classes, subjects, timetables and academic planning.">
      <AcademicsModule />
    </RoleDashboardFrame>
  )
}
