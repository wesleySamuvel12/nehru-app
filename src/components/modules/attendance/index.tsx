'use client'

import * as React from 'react'
import { PageHeader } from '@/components/erp/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MarkAttendance from './MarkAttendance'
import StudentRecords from './StudentRecords'
import StaffAttendance from './StaffAttendance'
import LeaveRequests from './LeaveRequests'
import Analytics from './Analytics'

import { useErp } from '@/lib/store'

const SCROLL_CSS = `
.erp-scroll::-webkit-scrollbar{width:6px;height:6px}
.erp-scroll::-webkit-scrollbar-thumb{background:hsl(var(--muted-foreground)/.25);border-radius:9999px}
.erp-scroll::-webkit-scrollbar-track{background:transparent}
`

export default function AttendanceModule() {
  const moduleParams = useErp(s => s.moduleParams)
  const [tab, setTab] = React.useState('mark')

  React.useEffect(() => {
    if (moduleParams?.tab && ['mark', 'records', 'staff', 'leave', 'analytics'].includes(moduleParams.tab)) {
      setTab(moduleParams.tab)
    }
  }, [moduleParams?.tab])

  return (
    <>
      <style>{SCROLL_CSS}</style>
      <div className="space-y-4">
        <PageHeader
          title="Attendance"
          subtitle="Mark daily attendance, review records, manage staff check-ins, leave approvals and analytics."
          breadcrumbs={['Academics', 'Attendance']}
        />
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
            <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
            <TabsTrigger value="records">Student Records</TabsTrigger>
            <TabsTrigger value="staff">Staff Attendance</TabsTrigger>
            <TabsTrigger value="leave">Leave Requests</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="mark" className="mt-3"><MarkAttendance /></TabsContent>
          <TabsContent value="records" className="mt-3"><StudentRecords /></TabsContent>
          <TabsContent value="staff" className="mt-3"><StaffAttendance /></TabsContent>
          <TabsContent value="leave" className="mt-3"><LeaveRequests /></TabsContent>
          <TabsContent value="analytics" className="mt-3"><Analytics /></TabsContent>
        </Tabs>
      </div>
    </>
  )
}
