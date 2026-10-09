import AdmissionsModule from '@/role/counsellor/modules/admissions'
import { RoleDashboardFrame } from '@/role/shared/RoleDashboardFrame'

export default function CounsellorDashboard() {
  return (
    <RoleDashboardFrame title="Admissions Workspace" subtitle="Follow up enquiries, applications, interviews and enrollment decisions.">
      <AdmissionsModule />
    </RoleDashboardFrame>
  )
}
