'use client'

import * as React from 'react'
import { PageHeader } from '@/components/erp/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import OccupancyBoard from './occupancy-board'
import RoomsBedsTab from './rooms-beds'
import AllocationsTab from './allocations-tab'
import ComplaintsTab from './complaints-tab'
import VisitorsMessTab from './visitors-mess'
import { useErp } from '@/lib/store'

export default function HostelModule() {
  const moduleParams = useErp(s => s.moduleParams)
  const [tab, setTab] = React.useState('occupancy')

  React.useEffect(() => {
    if (moduleParams?.tab && ['occupancy', 'rooms', 'allocations', 'complaints', 'mess'].includes(moduleParams.tab)) {
      setTab(moduleParams.tab)
    }
  }, [moduleParams?.tab])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hostel"
        subtitle="Occupancy board, rooms & beds, check-in/out, complaints and the mess."
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="occupancy">Occupancy Board</TabsTrigger>
          <TabsTrigger value="rooms">Rooms &amp; Beds</TabsTrigger>
          <TabsTrigger value="allocations">Allocations (Check-in/out)</TabsTrigger>
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="mess">Visitors &amp; Mess</TabsTrigger>
        </TabsList>
        <TabsContent value="occupancy" className="mt-4">
          <OccupancyBoard />
        </TabsContent>
        <TabsContent value="rooms" className="mt-4">
          <RoomsBedsTab />
        </TabsContent>
        <TabsContent value="allocations" className="mt-4">
          <AllocationsTab />
        </TabsContent>
        <TabsContent value="complaints" className="mt-4">
          <ComplaintsTab />
        </TabsContent>
        <TabsContent value="mess" className="mt-4">
          <VisitorsMessTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
