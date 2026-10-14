'use client'

import * as React from 'react'
import { DataTable, type Column, type FormField, type FilterDef } from '@/components/erp/DataTable'
import { loadClassOptions, loadSubjectOptions, safeList, QUESTION_TYPES, DIFFICULTIES } from './helpers'


export default function QuestionBank() {
  const [subjectMap, setSubjectMap] = React.useState<Map<string, any>>(new Map())
  const [classMap, setClassMap] = React.useState<Map<string, string>>(new Map())

  React.useEffect(() => {
    let alive = true
    Promise.all([safeList('api/academics/subjects', { all: 1 }), safeList('api/academics/classes', { all: 1 })]).then(([subs, classes]) => {
      if (!alive) return
      setSubjectMap(new Map(subs.map((s: any) => [s.id, s])))
      setClassMap(new Map(classes.map((c: any) => [c.id, c.name])))
    })
    return () => { alive = false }
  }, [])

  const columns: Column[] = [
    {
      key: 'text', label: 'Question', sortable: false,
      render: (row) => <span className="line-clamp-2 block max-w-md text-sm">{row.text}</span>,
    },
    { key: 'type', label: 'Type', badge: true },
    { key: 'classId', label: 'Class', sortable: false, render: (row) => classMap.get(row.classId) || '—' },
    { key: 'subjectId', label: 'Subject', sortable: false, render: (row) => subjectMap.get(row.subjectId)?.name || '—' },
    { key: 'marks', label: 'Marks' },
    { key: 'difficulty', label: 'Difficulty', badge: true },
    {
      key: 'correctAnswer', label: 'Answer', sortable: false, defaultHidden: true,
      render: (row) => <span className="line-clamp-1 block max-w-40 text-xs text-muted-foreground">{row.correctAnswer || '—'}</span>,
    },
  ]

  const fields: FormField[] = [
    { name: 'subjectId', label: 'Subject', type: 'select', required: true, optionsLoader: () => loadSubjectOptions() },
    { name: 'classId', label: 'Class', type: 'select', required: true, optionsLoader: loadClassOptions },
    {
      name: 'type', label: 'Question Type', type: 'select', required: true,
      options: QUESTION_TYPES.map(t => ({ label: t.replace('_', ' '), value: t })), defaultValue: 'MCQ',
    },
    { name: 'marks', label: 'Marks', type: 'number', min: 0.5, defaultValue: 1 },
    { name: 'text', label: 'Question Text', type: 'textarea', required: true, colSpan: 2, placeholder: 'Type the question…' },
    {
      name: 'optionsJson', label: 'Options', type: 'textarea', colSpan: 2,
      placeholder: 'Option A, Option B, Option C, Option D',
      help: 'Comma separated — saved as a JSON list. Used for MCQ / True-False questions.',
    },
    { name: 'correctAnswer', label: 'Correct Answer', type: 'text', colSpan: 2, placeholder: 'Exact answer or option text' },
    { name: 'difficulty', label: 'Difficulty', type: 'select', options: DIFFICULTIES.map(d => ({ label: title(d), value: d })), defaultValue: 'MEDIUM' },
    { name: 'explanation', label: 'Explanation (optional)', type: 'textarea', colSpan: 2 },
  ]

  const filters: FilterDef[] = [
    { key: 'type', label: 'types', options: QUESTION_TYPES.map(t => ({ label: t.replace('_', ' '), value: t })) },
    { key: 'difficulty', label: 'difficulty', options: DIFFICULTIES.map(d => ({ label: title(d), value: d })) },
  ]

  return (
    <DataTable
      endpoint="api/exams/questions"
      columns={columns}
      fields={fields}
      filters={filters}
      defaultSort={{ sortBy: 'id', sortDir: 'desc' }}
      searchPlaceholder="Search questions…"
      createLabel="Add Question"
      rowToForm={(row) => ({
        subjectId: row.subjectId || '',
        classId: row.classId || '',
        type: row.type || 'MCQ',
        marks: row.marks ?? 1,
        text: row.text || '',
        optionsJson: parseOptions(row.optionsJson),
        correctAnswer: row.correctAnswer || '',
        difficulty: row.difficulty || 'MEDIUM',
        explanation: row.explanation || '',
      })}
      transformSave={(values) => {
        const options = String(values.optionsJson || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
        return {
          subjectId: values.subjectId,
          classId: values.classId,
          type: values.type,
          text: values.text,
          optionsJson: options.length ? JSON.stringify(options) : null,
          correctAnswer: values.correctAnswer || null,
          marks: Number(values.marks) || 1,
          difficulty: values.difficulty || 'MEDIUM',
          explanation: values.explanation || null,
        }
      }}
      emptyTitle="Question bank is empty"
      emptyDescription="Add questions here to reuse them across papers and online exams."
    />
  )
}

function title(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase()
}

function parseOptions(optionsJson?: string | null): string {
  if (!optionsJson) return ''
  try {
    const arr = JSON.parse(optionsJson)
    return Array.isArray(arr) ? arr.join(', ') : String(optionsJson)
  } catch {
    return String(optionsJson)
  }
}
