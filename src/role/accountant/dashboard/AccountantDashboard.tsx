import FeesModule from '@/role/accountant/modules/fees'
import { RoleDashboardFrame } from '@/role/shared/RoleDashboardFrame'

export default function AccountantDashboard() {
  return (
    <RoleDashboardFrame title="Finance Operations" subtitle="Track fee collection, invoices, payments, expenses and budgets.">
      <FeesModule />
    </RoleDashboardFrame>
  )
}
