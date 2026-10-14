import StudentPortalModule from '@/role/student/pages/StudentPortal'
import { RoleDashboardFrame } from '@/role/shared/RoleDashboardFrame'

export default function StudentDashboard() {
  return (
    <RoleDashboardFrame title="My Learning Space" subtitle="Access your timetable, homework, online classes, grades and attendance.">
      <StudentPortalModule />
    </RoleDashboardFrame>
  )
}
