'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { api, ApiError, list, createOne, updateOne, deleteOne, ApiMeta } from '@/lib/api-client'
import { inr, fmtDate, fmtDateTime } from '@/lib/format'
import {
  ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Download, Filter,
  Loader2, MoreHorizontal, Pencil, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, X, CalendarIcon,
} from 'lucide-react'
import { EmptyState, ErrorState, TableSkeleton, StatusBadge } from './ui'

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Column {
  key: string
  label: string
  sortable?: boolean
  className?: string
  money?: boolean
  date?: boolean
  dateTime?: boolean
  badge?: boolean
  badgeMap?: Record<string, string>
  defaultHidden?: boolean
  hideOnMobile?: boolean
  render?: (row: any) => React.ReactNode
}

export interface FieldOption { label: string; value: string; classId?: string; [key: string]: any }

export interface FormField {
  name: string
  label: string
  type: 'text' | 'number' | 'email' | 'tel' | 'password' | 'date' | 'time' | 'textarea' | 'select' | 'switch' | 'url'
  options?: FieldOption[]
  optionsLoader?: () => Promise<FieldOption[]>
  required?: boolean
  placeholder?: string
  help?: string
  defaultValue?: any
  colSpan?: 1 | 2
  min?: number
  max?: number
  disabled?: (mode: 'create' | 'edit') => boolean
}

export interface FilterDef {
  key: string
  label: string
  options: FieldOption[]
}

export interface BulkAction {
  label: string
  icon?: React.ReactNode
  danger?: boolean
  onClick: (ids: string[], rows: any[], refresh: () => void) => Promise<void>
}

export interface DataTableProps {
  endpoint: string
  columns: Column[]
  fields?: FormField[]
  title?: string
  searchPlaceholder?: string
  filters?: FilterDef[]
  defaultSort?: { sortBy: string; sortDir?: 'asc' | 'desc' }
  defaultPageSize?: number
  allowCreate?: boolean
  allowEdit?: boolean
  allowDelete?: boolean
  createLabel?: string
  rowActions?: (row: any, ctx: { refresh: () => void }) => React.ReactNode
  bulkActions?: BulkAction[]
  toolbar?: (ctx: { refresh: () => void; meta?: ApiMeta }) => React.ReactNode
  onRowClick?: (row: any) => void
  transformSave?: (values: Record<string, any>, mode: 'create' | 'edit') => Record<string, any>
  rowToForm?: (row: any) => Record<string, any>
  exportEntity?: string
  refreshKey?: number
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  hideToolbar?: boolean
  pageSizeOptions?: number[]
  extraQuery?: Record<string, unknown>
  deleteLabelField?: string
}

function coerce(field: FormField, raw: any): any {
  if (raw === undefined || raw === null || raw === '') {
    return field.type === 'switch' ? false : field.type === 'number' ? (field.required ? undefined : null) : ''
  }
  if (field.type === 'number') {
    const n = Number(raw)
    return isNaN(n) ? undefined : n
  }
  return raw
}

export function validateForm(fields: FormField[], values: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const f of fields) {
    const v = values[f.name]
    if (f.required && (v === undefined || v === null || String(v).trim() === '')) {
      errors[f.name] = `${f.label} is required`
      continue
    }
    if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[f.name] = 'Enter a valid email address'
    if (f.type === 'number' && f.required && v !== undefined && isNaN(Number(v))) errors[f.name] = `${f.label} must be a number`
    if (f.type === 'number' && v !== undefined && v !== null && String(v) !== '') {
      if (f.min !== undefined && Number(v) < f.min) errors[f.name] = `Minimum value is ${f.min}`
      if (f.max !== undefined && Number(v) > f.max) errors[f.name] = `Maximum value is ${f.max}`
    }
    if (f.type === 'tel' && v && !/^[+\d][\d\s-]{6,}$/.test(v)) errors[f.name] = 'Enter a valid phone number'
  }
  return errors
}

export function FormFields({ fields, values, setValues, errors, mode }: {
  fields: FormField[]
  values: Record<string, any>
  setValues: (fn: (prev: Record<string, any>) => Record<string, any>) => void
  errors: Record<string, string>
  mode: 'create' | 'edit'
}) {
  const [loadedOptions, setLoadedOptions] = React.useState<Record<string, FieldOption[]>>({})
  React.useEffect(() => {
    let alive = true
    fields.forEach((f) => {
      if (f.optionsLoader && !loadedOptions[f.name]) {
        f.optionsLoader().then(opts => { if (alive) setLoadedOptions(prev => ({ ...prev, [f.name]: opts })) })
          .catch(() => { if (alive) setLoadedOptions(prev => ({ ...prev, [f.name]: [] })) })
      }
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields])

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const disabled = f.disabled?.(mode)
        let opts = f.options || loadedOptions[f.name] || []
        // Dynamically scope sections to chosen class if classId is set
        if (f.name === 'sectionId' && values['classId']) {
          const classSpecific = opts.filter((o: any) => !o.classId || o.classId === values['classId'])
          if (classSpecific.length > 0) opts = classSpecific
        }
        const id = `ff-${f.name}`
        const selectValue = values[f.name] ? String(values[f.name]) : undefined
        return (
          <div key={f.name} className={cn('space-y-1.5', f.colSpan === 2 && 'sm:col-span-2')}>
            <Label htmlFor={id} className="text-sm">
              {f.label}{f.required && <span className="ml-0.5 text-rose-500">*</span>}
            </Label>
            {f.type === 'select' ? (
              <Select
                value={selectValue}
                onValueChange={(v) => {
                  setValues(prev => {
                    const next = { ...prev, [f.name]: v }
                    if (f.name === 'classId') {
                      const secOpts = loadedOptions['sectionId'] || []
                      const matching = secOpts.find((o: any) => o.value === prev['sectionId'] && (!o.classId || o.classId === v))
                      if (!matching) next['sectionId'] = ''
                    }
                    return next
                  })
                }}
                disabled={disabled}
              >
                <SelectTrigger id={id} className={cn('w-full', errors[f.name] && 'border-rose-500')}>
                  <SelectValue placeholder={`Select ${f.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {opts.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>}
                  {opts.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : f.type === 'switch' ? (
              <div className="flex items-center gap-2 pt-1">
                <Switch id={id} checked={!!values[f.name]} onCheckedChange={(v) => setValues(prev => ({ ...prev, [f.name]: v }))} disabled={disabled} />
                <span className="text-sm text-muted-foreground">{values[f.name] ? 'Yes' : 'No'}</span>
              </div>
            ) : f.type === 'textarea' ? (
              <textarea
                id={id}
                className={cn('flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', errors[f.name] && 'border-rose-500')}
                placeholder={f.placeholder}
                value={values[f.name] ?? ''}
                disabled={disabled}
                onChange={e => setValues(prev => ({ ...prev, [f.name]: e.target.value }))}
              />
            ) : f.type === 'date' ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button id={id} variant="outline" role="combobox" disabled={disabled}
                    className={cn('w-full justify-start text-left font-normal', !values[f.name] && 'text-muted-foreground', errors[f.name] && 'border-rose-500')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {values[f.name] ? fmtDate(values[f.name]) : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={values[f.name] ? new Date(values[f.name]) : undefined}
                    onSelect={(d) => setValues(prev => ({ ...prev, [f.name]: d ? format(d, 'yyyy-MM-dd') : '' }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <Input
                id={id}
                type={f.type === 'number' ? 'number' : f.type === 'time' ? 'time' : f.type}
                placeholder={f.placeholder}
                value={values[f.name] ?? ''}
                min={f.min}
                max={f.max}
                disabled={disabled}
                className={cn(errors[f.name] && 'border-rose-500')}
                onChange={e => setValues(prev => ({ ...prev, [f.name]: e.target.value }))}
              />
            )}
            {errors[f.name] ? (
              <p className="text-xs font-medium text-rose-500">{errors[f.name]}</p>
            ) : f.help ? (
              <p className="text-xs text-muted-foreground">{f.help}</p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function DataTable(props: DataTableProps) {
  const {
    endpoint, columns, fields = [], filters = [], defaultSort, defaultPageSize = 10,
    allowCreate = true, allowEdit = true, allowDelete = true, createLabel = 'Add New',
    rowActions, bulkActions, toolbar, onRowClick, transformSave, rowToForm, exportEntity,
    refreshKey = 0, emptyTitle = 'No records found', emptyDescription, emptyAction, hideToolbar,
    pageSizeOptions = [10, 25, 50], deleteLabelField = 'name',
  } = props

  const [rows, setRows] = React.useState<any[]>([])
  const [meta, setMeta] = React.useState<ApiMeta | undefined>()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(defaultPageSize)
  const [q, setQ] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [sortBy, setSortBy] = React.useState(defaultSort?.sortBy)
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>(defaultSort?.sortDir || 'desc')
  const [filterValues, setFilterValues] = React.useState<Record<string, string>>({})
  const [hiddenCols, setHiddenCols] = React.useState<string[]>(columns.filter(c => c.defaultHidden).map(c => c.key))
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editMode, setEditMode] = React.useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [formValues, setFormValues] = React.useState<Record<string, any>>({})
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})
  const [saving, setSaving] = React.useState(false)
  const [deleteRow, setDeleteRow] = React.useState<any | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [bulkConfirm, setBulkConfirm] = React.useState<BulkAction | null>(null)

  React.useEffect(() => {
    const t = setTimeout(() => { setSearch(q); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [q])

  const refresh = React.useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const params: Record<string, unknown> = {
      page, pageSize: pageSize, q: search || undefined,
      sortBy, sortDir, ...filterValues, ...(props.extraQuery || {}),
    }
    list(endpoint, params)
      .then(res => {
        if (!alive) return
        if (Array.isArray(res?.data)) {
          setRows(res.data)
          setMeta(res.meta)
        } else if (res && typeof res === 'object' && 'error' in res) {
          // Malformed response (e.g. auth error wrapped as 200) — show error state, never crash
          setError(String((res as any).error || 'Unable to load records.'))
          setRows([])
        } else {
          setRows([])
          setMeta(undefined)
        }
      })
      .catch((e: ApiError) => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, pageSize, search, sortBy, sortDir, JSON.stringify(filterValues), refreshKey, JSON.stringify(props.extraQuery)])

  React.useEffect(() => { refresh() }, [refresh])

  const openCreate = React.useCallback(() => {
    if (!fields.length) return
    const init: Record<string, any> = {}
    fields.forEach(f => { init[f.name] = f.defaultValue ?? (f.type === 'switch' ? false : '') })
    setFormValues(init)
    setFormErrors({})
    setEditMode('create')
    setEditingId(null)
    setDialogOpen(true)
  }, [fields])

  const openEdit = React.useCallback((row: any) => {
    if (!fields.length) return
    const base = rowToForm ? rowToForm(row) : Object.fromEntries(fields.map(f => [f.name, row[f.name] ?? (f.type === 'switch' ? false : '')]))
    setFormValues(base)
    setFormErrors({})
    setEditMode('edit')
    setEditingId(row.id)
    setDialogOpen(true)
  }, [fields, rowToForm])

  const handleSave = async () => {
    const errs = validateForm(fields, formValues)
    if (Object.keys(errs).length) {
      setFormErrors(errs)
      toast.error('Please fix the highlighted fields.')
      return
    }
    let payload = Object.fromEntries(fields.map(f => [f.name, coerce(f, formValues[f.name])]))
    if (transformSave) payload = transformSave(payload, editMode)
    setSaving(true)
    try {
      if (editMode === 'create') await createOne(endpoint, payload)
      else await updateOne(endpoint, editingId!, payload)
      toast.success(editMode === 'create' ? 'Record created successfully.' : 'Record updated successfully.')
      setDialogOpen(false)
      refresh()
    } catch (e) {
      const err = e as ApiError
      if (err.fields?.length) {
        setFormErrors(Object.fromEntries(err.fields.map(f => [f, 'Invalid value'])))
      }
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteRow) return
    setDeleting(true)
    try {
      await deleteOne(endpoint, deleteRow.id)
      toast.success('Record deleted.')
      setDeleteRow(null)
      refresh()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setDeleting(false)
    }
  }

  const handleBulk = async (action: BulkAction) => {
    try {
      await action.onClick(Array.from(selected), rows.filter(r => selected.has(r.id)), refresh)
      setSelected(new Set())
    } catch (e) {
      toast.error((e as ApiError)?.message || 'Bulk action failed.')
    }
  }

  const toggleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(key); setSortDir('asc') }
    setPage(1)
  }

  const exportCsv = async () => {
    try {
      const res = await api<{ data: any[] }>(`/api/export?entity=${exportEntity || endpoint.split('/').pop()}`)
      const data = res.data || []
      if (!data.length) { toast.error('No data to export.'); return }
      const headers = Object.keys(data[0])
      const csv = [headers.join(','), ...data.map(r => headers.map(h => {
        const v = r[h]
        const s = v === null || v === undefined ? '' : String(v)
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }).join(','))].join('\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${exportEntity || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${data.length} rows.`)
    } catch (e) {
      toast.error((e as ApiError)?.message || 'Export failed.')
    }
  }

  const visibleColumns = columns.filter(c => !hiddenCols.includes(c.key))
  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id))
  const activeFilterCount = Object.values(filterValues).filter(v => v && v !== 'ALL').length

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {!hideToolbar && (
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={e => { setQ(e.target.value); }} placeholder={props.searchPlaceholder || 'Search…'}
                className="h-9 pl-8 pr-8" />
              {q && (
                <button onClick={() => { setQ(''); setSearch('') }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {filters.map(f => {
              // Dynamically scope section options when a specific class is selected
              let currentOpts = f.options
              if (f.key === 'sectionId' && filterValues['classId'] && filterValues['classId'] !== 'ALL') {
                const classSpecific = f.options.filter((o: any) => !o.classId || o.classId === filterValues['classId'])
                if (classSpecific.length > 0) {
                  currentOpts = classSpecific
                }
              }

              return (
                <Select key={f.key} value={filterValues[f.key] || 'ALL'}
                  onValueChange={v => {
                    setFilterValues(prev => {
                      const next = { ...prev, [f.key]: v }
                      // If user selects a class, reset sectionId if current section does not belong to the selected class
                      if (f.key === 'classId') {
                        const currentSec = prev['sectionId']
                        if (currentSec && currentSec !== 'ALL') {
                          const secFilter = filters.find(flt => flt.key === 'sectionId')
                          const belongs = secFilter?.options.find((o: any) => o.value === currentSec && (!o.classId || o.classId === v))
                          if (!belongs) {
                            next['sectionId'] = 'ALL'
                          }
                        }
                      }
                      return next
                    })
                    setPage(1)
                  }}>
                  <SelectTrigger className={cn('h-9 min-w-[140px] max-w-[200px]', activeFilterCount > 0 && 'border-primary/50')}>
                    <Filter className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder={f.label} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="ALL">All {f.label}</SelectItem>
                    {currentOpts.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )
            })}
            {(activeFilterCount > 0 || search) && (
              <Button variant="ghost" size="sm" className="h-9"
                onClick={() => { setFilterValues({}); setQ(''); setSearch('') }}>
                <X className="mr-1 h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {toolbar?.({ refresh, meta })}
            {exportEntity !== undefined && (
              <Button variant="outline" size="sm" className="h-9" onClick={exportCsv}>
                <Download className="mr-1.5 h-4 w-4" /> Export
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map(c => (
                  <DropdownMenuCheckboxItem key={c.key} checked={!hiddenCols.includes(c.key)}
                    onCheckedChange={(v) => setHiddenCols(prev => v ? prev.filter(k => k !== c.key) : [...prev, c.key])}
                    onSelect={e => e.preventDefault()}>
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {fields.length > 0 && allowCreate && (
              <Button size="sm" className="h-9" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" /> {createLabel}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Bulk bar */}
      {bulkActions && bulkActions.length > 0 && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          {bulkActions.map(a => (
            <Button key={a.label} variant={a.danger ? 'destructive' : 'outline'} size="sm" className="h-8"
              onClick={() => setBulkConfirm(a)}>
              {a.icon}{a.label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelected(new Set())}>Cancel</Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        {loading ? (
          <TableSkeleton rows={Math.min(pageSize, 8)} />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={search || activeFilterCount ? 'No results found' : emptyTitle}
            description={search || activeFilterCount ? 'Try adjusting your search or filters.' : emptyDescription}
            action={emptyAction || (!search && !activeFilterCount && fields.length > 0 && allowCreate ? (
              <Button size="sm" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> {createLabel}</Button>
            ) : null)}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    {bulkActions && bulkActions.length > 0 && (
                      <TableHead className="w-10">
                        <Checkbox checked={allSelected}
                          onCheckedChange={(v) => setSelected(v ? new Set(rows.map(r => r.id)) : new Set())}
                          aria-label="Select all" />
                      </TableHead>
                    )}
                    {visibleColumns.map(c => (
                      <TableHead key={c.key} className={cn('whitespace-nowrap', c.hideOnMobile && 'hidden md:table-cell', c.className)}>
                        {c.sortable !== false ? (
                          <button className="group inline-flex items-center gap-1 font-medium" onClick={() => toggleSort(c.key)}>
                            {c.label}
                            {sortBy === c.key ? (
                              sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <ChevronsUpDown className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-40" />
                            )}
                          </button>
                        ) : c.label}
                      </TableHead>
                    ))}
                    {(rowActions || (fields.length > 0 && (allowEdit || allowDelete))) && (
                      <TableHead className="w-14 text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(row => (
                    <TableRow
                      key={row.id}
                      className={cn(selected.has(row.id) && 'bg-primary/5', onRowClick && 'cursor-pointer')}
                      onClick={() => onRowClick?.(row)}
                    >
                      {bulkActions && bulkActions.length > 0 && (
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox checked={selected.has(row.id)}
                            onCheckedChange={(v) => setSelected(prev => {
                              const next = new Set(prev)
                              if (v) next.add(row.id); else next.delete(row.id)
                              return next
                            })}
                            aria-label="Select row" />
                        </TableCell>
                      )}
                      {visibleColumns.map(c => (
                        <TableCell key={c.key} className={cn('py-2.5', c.hideOnMobile && 'hidden md:table-cell', c.className)}>
                          {c.render ? c.render(row)
                            : c.badge ? <StatusBadge value={row[c.key]} map={c.badgeMap} />
                              : c.money ? <span className="font-medium tabular-nums">{inr(row[c.key])}</span>
                                : c.dateTime ? <span className="whitespace-nowrap text-muted-foreground">{fmtDateTime(row[c.key])}</span>
                                  : c.date ? <span className="whitespace-nowrap text-muted-foreground">{fmtDate(row[c.key])}</span>
                                    : <span className="line-clamp-2">{row[c.key] === null || row[c.key] === undefined || row[c.key] === '' ? '—' : String(row[c.key])}</span>}
                        </TableCell>
                      ))}
                      {(rowActions || (fields.length > 0 && (allowEdit || allowDelete))) && (
                        <TableCell className="py-2 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5">
                            {rowActions?.(row, { refresh })}
                            {(allowEdit || allowDelete) && fields.length > 0 && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  {allowEdit && fields.length > 0 && (
                                    <DropdownMenuItem onClick={() => openEdit(row)}>
                                      <Pencil className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                  )}
                                  {rowActions && <DropdownMenuSeparator />}
                                  {allowDelete && (
                                    <>
                                      <DropdownMenuItem className="text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400"
                                        onClick={() => setDeleteRow(row)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            <div className="flex flex-col items-center justify-between gap-2 border-t px-4 py-3 sm:flex-row">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{meta ? `${(meta.page - 1) * meta.pageSize + 1}–${Math.min(meta.page * meta.pageSize, meta.total)} of ${meta.total}` : '—'}</span>
                <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1) }}>
                  <SelectTrigger className="h-8 w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-sm text-muted-foreground">
                  Page {meta?.page ?? 1}{meta && meta.totalPages > 1 ? ` of ${meta.totalPages}` : ''}
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={!meta || page >= meta.totalPages} onClick={() => setPage(p => p + 1)} aria-label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !saving) setDialogOpen(false) }}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMode === 'create' ? createLabel : 'Edit Record'}</DialogTitle>
            <DialogDescription>
              {editMode === 'create' ? 'Fill in the details below. Required fields are marked with *.' : 'Update the details below and save your changes.'}
            </DialogDescription>
          </DialogHeader>
          <FormFields fields={fields} values={formValues} setValues={setFormValues} errors={formErrors} mode={editMode} />
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editMode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteRow} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow ? `You are about to permanently delete “${deleteRow[deleteLabelField] || deleteRow.title || deleteRow.name || deleteRow.id}”. This action cannot be undone.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); handleDelete() }}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk confirm */}
      <AlertDialog open={!!bulkConfirm} onOpenChange={(open) => !open && setBulkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm {bulkConfirm?.label.toLowerCase()}</AlertDialogTitle>
            <AlertDialogDescription>This will apply to {selected.size} selected record(s). Continue?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className={cn(bulkConfirm?.danger && 'bg-rose-600 hover:bg-rose-700')}
              onClick={(e) => { e.preventDefault(); if (bulkConfirm) handleBulk(bulkConfirm); setBulkConfirm(null) }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
