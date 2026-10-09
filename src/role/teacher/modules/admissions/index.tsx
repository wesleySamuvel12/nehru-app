'use client'

import * as React from 'react'
import { PageHeader } from '@/components/erp/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useErp } from '@/lib/store'
import PipelineTab from './pipeline'
import LeadsTab from './leads'
import ApplicationsTab from './applications'
import CampaignsTab from './campaigns'
import AnalyticsTab from './analytics'

export default function AdmissionsModule() {
  const moduleParams = useErp(s => s.moduleParams)
  const [tab, setTab] = React.useState('pipeline')

  React.useEffect(() => {
    if (moduleParams?.tab && ['pipeline', 'leads', 'applications', 'campaigns', 'analytics'].includes(moduleParams.tab)) {
      setTab(moduleParams.tab)
    }
  }, [moduleParams?.tab])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Admissions & CRM"
        subtitle="Enquiries, counselling pipeline, applications and enrolment analytics"
        breadcrumbs={['Home', 'Admissions']}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline" className="mt-4 space-y-4">
          <PipelineTab />
        </TabsContent>
        <TabsContent value="leads" className="mt-4 space-y-4">
          <LeadsTab />
        </TabsContent>
        <TabsContent value="applications" className="mt-4 space-y-4">
          <ApplicationsTab />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-4 space-y-4">
          <CampaignsTab />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4 space-y-4">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
