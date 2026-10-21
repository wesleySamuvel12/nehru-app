'use client'

import * as React from 'react'
import { CalendarClock } from 'lucide-react'
import { DataTable, type Column, type FormField, type FilterDef } from '@/components/erp/DataTable'
import { EmptyState } from '@/components/erp/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useErp } from '@/lib/store'
import { loadExamOptions, loadClassOptions, loadSubjectOptions, safeList, type Option } from './helpers'

export default function ScheduleTab() {
  const { session, moduleParams } = useErp()
  const isTeacher = session?.role === 'TEACHER'

  const [exams, setExams] = React.useState<Option[]>([])
  const [examId, setExamId] = React.useState('')
  const [subjectMap, setSubjectMap] = React.useState<Map<string, any>>(new Map())
  const [classMap, setClassMap] = React.useState<Map<string, string>>(new Map())

  React.useEffect(() => {
    let alive = true
    loadExamOptions().then(opts => {
      if (!alive) return
      setExams(opts)
      if (opts.length > 0) {
        if (moduleParams?.examId && opts.some(e => e.value === moduleParams.examId)) {
          setExamId(moduleParams.examId)
        } else if (!examId) {
          setExamId(opts[0].value)
        }
      }
    })
    Promise.all([
      safeList('api/academics/subjects', { all: 1 }),
      safeList('api/academics/classes', { all: 1 }),
    ]).then(([subs, classes]) => {
      if (!alive) return
      setSubjectMap(new Map(subs.map((s: any) => [s.id, s])))
      setClassMap(new Map(classes.map((c: any) => [c.id, c.name])))
    })
    return () => { alive = false }
  }, [moduleParams?.examId, examId])

  const columns: Column[] = [
    {
      key: 'subjectId', label: 'Subject', sortable: false,
      render: (row) => <span className="font-medium text-foreground">{subjectMap.get(row.subjectId)?.name || '—'}</span>,
    },
    { key: 'classId', label: 'Class', sortable: false, render: (row) => classMap.get(row.classId) || '—' },
    { key: 'date', label: 'Date', date: true, sortable: true },
    { key: 'startTime', label: 'Start', hideOnMobile: true },
    { key: 'endTime', label: 'End', hideOnMobile: true },
    { key: 'maxMarks', label: 'Max Marks' },
    { key: 'passMarks', label: 'Pass Marks', hideOnMobile: true },
    {
      key: 'room', label: 'Room', sortable: false,
      render: (row) => row.room || '—',
    },
  ]

  const fields: FormField[] = [
    {
      name: 'subjectId', label: 'Subject', type: 'select', required: true,
      optionsLoader: () => loadSubjectOptions(),
    },
    { name: 'classId', label: 'Class', type: 'select', required: true, optionsLoader: loadClassOptions },
    { name: 'date', label: 'Exam Date', type: 'date', required: true },
    { name: 'startTime', label: 'Start Time', type: 'time', required: true, defaultValue: '09:00' },
    { name: 'endTime', label: 'End Time', type: 'time', required: true, defaultValue: '11:00' },
    { name: 'maxMarks', label: 'Max Marks', type: 'number', required: true, min: 1, defaultValue: 100 },
    { name: 'passMarks', label: 'Pass Marks', type: 'number', required: true, min: 0, defaultValue: 35 },
    { name: 'room', label: 'Room / Hall', type: 'text', placeholder: 'e.g. Exam Hall 2' },
  ]

  const filters: FilterDef[] = [
    {
      key: 'classId', label: 'classes',
      options: [...classMap.entries()].map(([value, label]) => ({ label, value })),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-sm space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Exam</span>
          <Select value={examId || undefined} onValueChange={setExamId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select an exam to view its schedule" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {exams.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No exams yet.</div>}
              {exams.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {examId && (
          <p className="text-xs text-muted-foreground">
            Papers are listed chronologically by exam date and subject.
          </p>
        )}
      </div>

      {!examId ? (
        <EmptyState
          title="Select an exam"
          description="Choose an exam above to view the scheduled subject papers."
          icon={<CalendarClock className="h-7 w-7" />}
        />
      ) : (
        <DataTable
          endpoint="api/exams/schedules"
          columns={columns}
          fields={fields}
          filters={filters}
          defaultSort={{ sortBy: 'date', sortDir: 'asc' }}
          searchPlaceholder="Search room…"
          createLabel={isTeacher ? undefined : 'Add Paper'}
          allowCreate={!isTeacher}
          allowEdit={!isTeacher}
          allowDelete={!isTeacher}
          extraQuery={{ examId }}
          transformSave={(values) => ({
            ...values,
            examId,
            room: values.room || null,
            maxMarks: Number(values.maxMarks) || 100,
            passMarks: Number(values.passMarks) || 35,
          })}
          emptyTitle="No papers scheduled"
          emptyDescription={`No papers scheduled for ${exams.find(e => e.value === examId)?.label || 'this exam'} yet.`}
        />
      )}
    </div>
  )
}
