'use client'

import * as React from 'react'
import { PageHeader } from '@/components/erp/ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import RecordsTab from './RecordsTab'
import VisitsTab from './VisitsTab'
import VaccinationsTab from './VaccinationsTab'
import ScreeningsTab from './ScreeningsTab'

export default function HealthModule() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Health & Clinic"
        subtitle="Student health records, clinic visits, vaccinations and screening reports"
      />
      <Tabs defaultValue="records" className="gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="records">Health Records</TabsTrigger>
          <TabsTrigger value="visits">Clinic Visits</TabsTrigger>
          <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
          <TabsTrigger value="screenings">Screenings &amp; Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="records" className="mt-2">
          <RecordsTab />
        </TabsContent>
        <TabsContent value="visits" className="mt-2">
          <VisitsTab />
        </TabsContent>
        <TabsContent value="vaccinations" className="mt-2">
          <VaccinationsTab />
        </TabsContent>
        <TabsContent value="screenings" className="mt-2">
          <ScreeningsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
