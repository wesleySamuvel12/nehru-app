'use client'

import * as React from 'react'
import { PageHeader } from '@/components/erp/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ExamsTab from './ExamsTab'
import ScheduleTab from './ScheduleTab'
import QuestionBank from './QuestionBank'
import MarksEntry from './MarksEntry'
import ResultsTab from './ResultsTab'
import GradingTab from './GradingTab'

import { useErp } from '@/lib/store'

const SCROLL_CSS = `
.erp-scroll::-webkit-scrollbar{width:6px;height:6px}
.erp-scroll::-webkit-scrollbar-thumb{background:hsl(var(--muted-foreground)/.25);border-radius:9999px}
.erp-scroll::-webkit-scrollbar-track{background:transparent}
`

export default function ExaminationsModule() {
  const moduleParams = useErp(s => s.moduleParams)
  const [tab, setTab] = React.useState('exams')

  React.useEffect(() => {
    if (moduleParams?.tab && ['exams', 'schedule', 'questions', 'marks', 'results', 'grading'].includes(moduleParams.tab)) {
      setTab(moduleParams.tab)
    }
  }, [moduleParams?.tab])

  return (
    <>
      <style>{SCROLL_CSS}</style>
      <div className="space-y-4">
        <PageHeader
          title="Examinations"
          subtitle="Plan exams, schedule papers, maintain the question bank, enter marks and publish report cards."
          breadcrumbs={['Academics', 'Examinations']}
        />
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
            <TabsTrigger value="exams">Exams</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="questions">Question Bank</TabsTrigger>
            <TabsTrigger value="marks">Marks Entry</TabsTrigger>
            <TabsTrigger value="results">Results & Report Cards</TabsTrigger>
            <TabsTrigger value="grading">Grading System</TabsTrigger>
          </TabsList>
          <TabsContent value="exams" className="mt-3"><ExamsTab /></TabsContent>
          <TabsContent value="schedule" className="mt-3"><ScheduleTab /></TabsContent>
          <TabsContent value="questions" className="mt-3"><QuestionBank /></TabsContent>
          <TabsContent value="marks" className="mt-3"><MarksEntry /></TabsContent>
          <TabsContent value="results" className="mt-3"><ResultsTab /></TabsContent>
          <TabsContent value="grading" className="mt-3"><GradingTab /></TabsContent>
        </Tabs>
      </div>
    </>
  )
}
