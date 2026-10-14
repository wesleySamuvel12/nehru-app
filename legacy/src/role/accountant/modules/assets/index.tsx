'use client'

import * as React from 'react'
import { PageHeader } from '@/components/erp/ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import RegisterTab from './RegisterTab'
import TransfersTab from './TransfersTab'
import MaintenanceTab from './MaintenanceTab'
import ReportsTab from './ReportsTab'

export default function AssetsModule() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Assets & Resources"
        subtitle="Asset register, allocations and transfers, maintenance and value reports"
      />
      <Tabs defaultValue="register" className="gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="register">Asset Register</TabsTrigger>
          <TabsTrigger value="transfers">Allocations &amp; Transfers</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="register" className="mt-2">
          <RegisterTab />
        </TabsContent>
        <TabsContent value="transfers" className="mt-2">
          <TransfersTab />
        </TabsContent>
        <TabsContent value="maintenance" className="mt-2">
          <MaintenanceTab />
        </TabsContent>
        <TabsContent value="reports" className="mt-2">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
