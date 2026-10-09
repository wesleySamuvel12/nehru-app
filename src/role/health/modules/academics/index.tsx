'use client'

import * as React from 'react'
import { PageHeader } from '@/components/erp/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useErp } from '@/lib/store'
import ClassesTab from './classes-tab'
import SubjectsTab from './subjects-tab'
import TimetableTab from './timetable-tab'
import EnrollmentsTab from './enrollments-tab'
import YearsTab from './years-tab'
import HousesTab from './houses-tab'

export default function AcademicsModule() {
  const moduleParams = useErp(s => s.moduleParams)
  const [tab, setTab] = React.useState('classes')

  React.useEffect(() => {
    if (moduleParams?.tab && ['classes', 'subjects', 'timetable', 'enrollments', 'years', 'houses'].includes(moduleParams.tab)) {
      setTab(moduleParams.tab)
    }
  }, [moduleParams?.tab])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Academics"
        subtitle="Classes, sections, subjects, timetables, enrollments and academic calendar"
        breadcrumbs={['Home', 'Academics']}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="classes">Classes &amp; Sections</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="years">Academic Years</TabsTrigger>
          <TabsTrigger value="houses">Houses</TabsTrigger>
        </TabsList>
        <TabsContent value="classes" className="mt-4 space-y-4">
          <ClassesTab />
        </TabsContent>
        <TabsContent value="subjects" className="mt-4 space-y-4">
          <SubjectsTab />
        </TabsContent>
        <TabsContent value="timetable" className="mt-4 space-y-4">
          <TimetableTab />
        </TabsContent>
        <TabsContent value="enrollments" className="mt-4 space-y-4">
          <EnrollmentsTab />
        </TabsContent>
        <TabsContent value="years" className="mt-4 space-y-4">
          <YearsTab />
        </TabsContent>
        <TabsContent value="houses" className="mt-4 space-y-4">
          <HousesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
