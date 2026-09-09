'use client'

import * as React from 'react'
import { DataTable, type Column, type FormField } from '@/components/erp/DataTable'
import { Switch } from '@/components/ui/switch'
import { EmptyState, SectionCard, StatusBadge } from '@/components/erp/ui'
import { updateOne, ApiError } from '@/lib/api-client'
import { toast } from 'sonner'
import { fmtDate } from '@/lib/format'

/* eslint-disable @typescript-eslint/no-explicit-any */

const CURRENT_BADGE = { TRUE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' }

const yearColumns = (onToggle: (row: any, value: boolean) => void, busyId: string | null): Column[] => [
  { key: 'name', label: 'Academic Year' },
  { key: 'startDate', label: 'Start Date', date: true },
  { key: 'endDate', label: 'End Date', date: true },
  {
    key: 'isCurrent', label: 'Current', sortable: false,
    render: row => (
      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <Switch
          checked={!!row.isCurrent}
          disabled={busyId === row.id}
          onCheckedChange={v => onToggle(row, v)}
          aria-label={`Set ${row.name} as current academic year`}
        />
        {row.isCurrent && <StatusBadge value="TRUE" map={CURRENT_BADGE} />}
      </div>
    ),
  },
  { key: 'terms', label: 'Terms', sortable: false, render: row => row.terms?.length ?? 0 },
]

const yearFields: FormField[] = [
  { name: 'name', label: 'Year Name', type: 'text', required: true, placeholder: 'e.g. 2026-27' },
  { name: 'startDate', label: 'Start Date', type: 'date', required: true },
  { name: 'endDate', label: 'End Date', type: 'date', required: true },
  { name: 'isCurrent', label: 'Set as current year', type: 'switch' },
]

const termColumns = (onToggle: (row: any, value: boolean) => void, busyId: string | null): Column[] => [
  { key: 'name', label: 'Term' },
  { key: 'startDate', label: 'Start Date', date: true },
  { key: 'endDate', label: 'End Date', date: true },
  {
    key: 'isCurrent', label: 'Current', sortable: false,
    render: row => (
      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <Switch
          checked={!!row.isCurrent}
          disabled={busyId === row.id}
          onCheckedChange={v => onToggle(row, v)}
          aria-label={`Set ${row.name} as current term`}
        />
        {row.isCurrent && <StatusBadge value="TRUE" map={CURRENT_BADGE} />}
      </div>
    ),
  },
]

const termFields: FormField[] = [
  { name: 'name', label: 'Term Name', type: 'text', required: true, placeholder: 'e.g. Term 1' },
  { name: 'startDate', label: 'Start Date', type: 'date', required: true },
  { name: 'endDate', label: 'End Date', type: 'date', required: true },
  { name: 'isCurrent', label: 'Set as current term', type: 'switch' },
]

export default function YearsTab() {
  const [selectedYear, setSelectedYear] = React.useState<any | null>(null)
  const [yearKey, setYearKey] = React.useState(0)
  const [termKey, setTermKey] = React.useState(0)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const toggleCurrent = async (endpoint: string, row: any, value: boolean, refresh: () => void) => {
    setBusyId(row.id)
    try {
      await updateOne(endpoint, row.id, { isCurrent: value })
      if (value) toast.success(`${row.name} is now the current ${endpoint.includes('years') ? 'academic year' : 'term'}.`)
      refresh()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Academic years" description="The current year drives defaults across the ERP">
        <DataTable
          endpoint="api/academics/years"
          columns={yearColumns((row, v) => toggleCurrent('api/academics/years', row, v, () => setYearKey(k => k + 1)), busyId)}
          fields={yearFields}
          defaultSort={{ sortBy: 'startDate', sortDir: 'desc' }}
          searchPlaceholder="Search years…"
          createLabel="Add Year"
          refreshKey={yearKey}
          onRowClick={(row) => setSelectedYear(row)}
          emptyTitle="No academic years yet"
          emptyDescription="Add a year like 2025-26 with its start and end dates."
          deleteLabelField="name"
          rowToForm={(row) => ({
            name: row.name || '',
            startDate: row.startDate ? String(row.startDate).slice(0, 10) : '',
            endDate: row.endDate ? String(row.endDate).slice(0, 10) : '',
            isCurrent: !!row.isCurrent,
          })}
        />
      </SectionCard>

      <SectionCard
        title={selectedYear ? `Terms — ${selectedYear.name}` : 'Terms'}
        description={selectedYear ? 'Terms within the selected academic year (click a year above to switch)' : 'Select an academic year above to manage its terms'}
      >
        {selectedYear ? (
          <DataTable
            endpoint="api/academics/terms"
            extraQuery={{ academicYearId: selectedYear.id }}
            columns={termColumns((row, v) => toggleCurrent('api/academics/terms', row, v, () => setTermKey(k => k + 1)), busyId)}
            fields={termFields}
            defaultSort={{ sortBy: 'startDate', sortDir: 'asc' }}
            searchPlaceholder="Search terms…"
            createLabel="Add Term"
            refreshKey={termKey}
            emptyTitle="No terms in this year"
            emptyDescription="Add Term 1 / Term 2 with their date ranges."
            deleteLabelField="name"
            rowToForm={(row) => ({
              name: row.name || '',
              startDate: row.startDate ? String(row.startDate).slice(0, 10) : '',
              endDate: row.endDate ? String(row.endDate).slice(0, 10) : '',
              isCurrent: !!row.isCurrent,
            })}
          />
        ) : (
          <EmptyState
            title="No year selected"
            description="Click an academic year above to view and manage its terms."
          />
        )}
      </SectionCard>

      {selectedYear && (
        <p className="text-xs text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{selectedYear.name}</span> ({fmtDate(selectedYear.startDate)} – {fmtDate(selectedYear.endDate)})
        </p>
      )}
    </div>
  )
}
