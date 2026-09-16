'use client'

/**
 * HR & Payroll module — Payroll Runs | Payslips | Performance Reviews |
 * Staff Attendance & Leave | Compliance.
 */
import * as React from 'react'
import { PageHeader } from '@/components/erp/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PayrollRunsTable from './payroll-runs'
import PayslipsView from './payslips'
import PerformanceTable from './performance'
import StaffAttendanceView from './staff'
import { useErp } from '@/lib/store'

export default function HrModule() {
  const moduleParams = useErp(s => s.moduleParams)
  const [tab, setTab] = React.useState('payroll')
  const [payrollVersion, setPayrollVersion] = React.useState(0)

  React.useEffect(() => {
    if (moduleParams?.tab && ['payroll', 'payslips', 'performance', 'staff', 'compliance'].includes(moduleParams.tab)) {
      setTab(moduleParams.tab)
    }
  }, [moduleParams?.tab])

  return (
    <div className="space-y-5">
      <PageHeader
        title="HR & Payroll"
        subtitle="Payroll processing, appraisals, staff attendance and compliance for Nehru International School."
        breadcrumbs={['Finance', 'HR & Payroll']}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="-mx-1 overflow-x-auto pb-1">
          <TabsList className="inline-flex h-auto min-w-max max-w-full gap-1 px-1">
            <TabsTrigger value="payroll" className="min-h-10">Payroll Runs</TabsTrigger>
            <TabsTrigger value="payslips" className="min-h-10">Payslips</TabsTrigger>
            <TabsTrigger value="performance" className="min-h-10">Performance Reviews</TabsTrigger>
            <TabsTrigger value="staff" className="min-h-10">Staff Attendance & Leave</TabsTrigger>
            <TabsTrigger value="compliance" className="min-h-10">Compliance</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="payroll" className="mt-4">
          <PayrollRunsTable onChanged={() => setPayrollVersion(v => v + 1)} />
        </TabsContent>

        <TabsContent value="payslips" className="mt-4">
          <PayslipsView version={payrollVersion} />
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <PerformanceTable />
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          <StaffAttendanceView onGoTo={setTab} />
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <ComplianceView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
