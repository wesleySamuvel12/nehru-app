'use client'

import * as React from 'react'
import { PageHeader } from '@/components/erp/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useErp } from '@/lib/store'
import MaterialsTab from './materials-tab'
import AssignmentsTab from './assignments-tab'
import SubmissionsTab from './submissions-tab'
import LessonPlansTab from './lesson-plans-tab'
import OnlineClassesTab from './online-classes-tab'

export default function LmsModule() {
  const moduleParams = useErp(s => s.moduleParams)
  const initial = moduleParams?.tab && ['materials', 'assignments', 'submissions', 'lesson-plans', 'online-classes'].includes(moduleParams.tab)
    ? moduleParams.tab
    : 'materials'

  return (
    <div className="space-y-4">
      <PageHeader
        title="Learning Management System"
        subtitle="Materials, assignments & homework, grading, lesson plans and online classes"
        breadcrumbs={['Home', 'LMS']}
      />
      <Tabs defaultValue={initial}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="materials">Learning Materials</TabsTrigger>
          <TabsTrigger value="assignments">Assignments &amp; Homework</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="lesson-plans">Lesson Plans</TabsTrigger>
          <TabsTrigger value="online-classes">Online Classes</TabsTrigger>
        </TabsList>
        <TabsContent value="materials" className="mt-4 space-y-4">
          <MaterialsTab />
        </TabsContent>
        <TabsContent value="assignments" className="mt-4 space-y-4">
          <AssignmentsTab />
        </TabsContent>
        <TabsContent value="submissions" className="mt-4 space-y-4">
          <SubmissionsTab />
        </TabsContent>
        <TabsContent value="lesson-plans" className="mt-4 space-y-4">
          <LessonPlansTab />
        </TabsContent>
        <TabsContent value="online-classes" className="mt-4 space-y-4">
          <OnlineClassesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
