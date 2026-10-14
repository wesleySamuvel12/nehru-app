'use client'

import * as React from 'react'
import { PageHeader } from '@/components/erp/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import VisitorLog from './visitor-log'
import CheckInOut from './checkin-out'
import StudentPickup from './student-pickup'
import AlertsTab from './alerts-tab'
import { useErp } from '@/lib/store'

export default function SecurityModule() {
  const moduleParams = useErp(s => s.moduleParams)
  const [tab, setTab] = React.useState('visitors')

  React.useEffect(() => {
    if (moduleParams?.tab && ['visitors', 'inout', 'pickup', 'alerts'].includes(moduleParams.tab)) {
      setTab(moduleParams.tab)
    }
  }, [moduleParams?.tab])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Security & Visitors"
        subtitle="Gate register, visitor passes, verified student pickups and security alerts."
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="visitors">Visitor Log</TabsTrigger>
          <TabsTrigger value="inout">Check In/Out</TabsTrigger>
          <TabsTrigger value="pickup">Student Pickup (QR)</TabsTrigger>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
        </TabsList>
        <TabsContent value="visitors" className="mt-4">
          <VisitorLog />
        </TabsContent>
        <TabsContent value="inout" className="mt-4">
          <CheckInOut />
        </TabsContent>
        <TabsContent value="pickup" className="mt-4">
          <StudentPickup />
        </TabsContent>
        <TabsContent value="alerts" className="mt-4">
          <AlertsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
