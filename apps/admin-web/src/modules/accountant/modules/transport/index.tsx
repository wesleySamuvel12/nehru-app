'use client'

import * as React from 'react'
import { PageHeader } from '@/components/erp/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LiveTracking from './live-tracking'
import VehiclesTab from './vehicles-tab'
import RoutesStopsTab from './routes-stops'
import AllocationsTab from './allocations-tab'
import ExpiryDocsTab from './expiry-docs'
import { useErp } from '@/lib/store'

export default function TransportModule() {
  const moduleParams = useErp(s => s.moduleParams)
  const [tab, setTab] = React.useState('tracking')

  React.useEffect(() => {
    if (moduleParams?.tab && ['tracking', 'vehicles', 'routes', 'allocations', 'alerts'].includes(moduleParams.tab)) {
      setTab(moduleParams.tab)
    }
  }, [moduleParams?.tab])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transport"
        subtitle="Fleet & drivers, routes and stops, student allocations, live GPS tracking and document renewals."
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="tracking">Live Tracking</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="routes">Routes &amp; Stops</TabsTrigger>
          <TabsTrigger value="allocations">Student Allocations</TabsTrigger>
          <TabsTrigger value="alerts">Alerts &amp; Docs</TabsTrigger>
        </TabsList>
        <TabsContent value="tracking" className="mt-4">
          <LiveTracking />
        </TabsContent>
        <TabsContent value="vehicles" className="mt-4">
          <VehiclesTab />
        </TabsContent>
        <TabsContent value="routes" className="mt-4">
          <RoutesStopsTab />
        </TabsContent>
        <TabsContent value="allocations" className="mt-4">
          <AllocationsTab />
        </TabsContent>
        <TabsContent value="alerts" className="mt-4">
          <ExpiryDocsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
