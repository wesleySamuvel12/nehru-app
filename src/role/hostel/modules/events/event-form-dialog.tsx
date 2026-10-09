'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { FormFields, validateForm, type FormField } from '@/components/erp/DataTable'
import { createOne, updateOne, ApiError } from '@/lib/api-client'
import type { SchoolEvent } from './index'


const BASE_FIELDS: FormField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. Inter-House Football Final' },
  { name: 'description', label: 'Description', type: 'textarea', colSpan: 2, placeholder: 'Details shown on the event card…' },
  {
    name: 'type', label: 'Type', type: 'select', required: true, defaultValue: 'EVENT',
    options: [
      { label: 'Event', value: 'EVENT' },
      { label: 'Holiday', value: 'HOLIDAY' },
      { label: 'Exam', value: 'EXAM' },
      { label: 'Meeting', value: 'MEETING' },
      { label: 'Sports', value: 'SPORTS' },
      { label: 'Trip', value: 'TRIP' },
      { label: 'Annual Day', value: 'ANNUAL_DAY' },
    ],
  },
  { name: 'startDate', label: 'Start Date', type: 'date', required: true },
  { name: 'endDate', label: 'End Date (optional)', type: 'date' },
  { name: 'location', label: 'Location', type: 'text', placeholder: 'e.g. Main Auditorium' },
  {
    name: 'audience', label: 'Audience', type: 'select', required: true, defaultValue: 'ALL',
    options: [
      { label: 'Everyone (All)', value: 'ALL' },
      { label: 'Students', value: 'STUDENTS' },
      { label: 'Parents', value: 'PARENTS' },
      { label: 'Teachers', value: 'TEACHERS' },
      { label: 'Staff', value: 'STAFF' },
    ],
  },
  { name: 'organizerName', label: 'Organizer', type: 'text', placeholder: 'e.g. Sports Committee' },
  { name: 'registrationRequired', label: 'Registration Required', type: 'switch' },
]

export default function EventFormDialog({ open, onOpenChange, initial, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: SchoolEvent | null
  onSaved: () => void
}) {
  const editing = !!initial?.id
  const [values, setValues] = React.useState<Record<string, any>>({})
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [saving, setSaving] = React.useState(false)

  const needsRegistration = !!values.registrationRequired
  const fields = React.useMemo(() => {
    if (!needsRegistration) return BASE_FIELDS
    return [...BASE_FIELDS, {
      name: 'capacity', label: 'Capacity', type: 'number', min: 1,
      help: 'Maximum number of registrations accepted.',
    } as FormField]
  }, [needsRegistration])

  React.useEffect(() => {
    if (!open) return
    setErrors({})
    setValues({
      title: initial?.title || '',
      description: initial?.description || '',
      type: initial?.type || 'EVENT',
      startDate: initial?.startDate ? String(initial.startDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
      endDate: initial?.endDate ? String(initial.endDate).slice(0, 10) : '',
      location: initial?.location || '',
      audience: initial?.audience || 'ALL',
      organizerName: initial?.organizerName || '',
      registrationRequired: !!initial?.registrationRequired,
      capacity: initial?.capacity ?? '',
    })
  }, [open, initial])

  const save = async () => {
    const errs = validateForm(fields, values)
    if (Object.keys(errs).length) {
      setErrors(errs)
      toast.error('Please fix the highlighted fields.')
      return
    }
    const payload: Record<string, any> = {
      title: values.title,
      description: values.description || null,
      type: values.type,
      startDate: values.startDate,
      endDate: values.endDate || null,
      location: values.location || null,
      audience: values.audience,
      organizerName: values.organizerName || null,
      registrationRequired: !!values.registrationRequired,
      capacity: values.registrationRequired && values.capacity ? Number(values.capacity) : null,
    }
    setSaving(true)
    try {
      if (editing) await updateOne('api/events', initial.id, payload)
      else await createOne('api/events', payload)
      toast.success(editing ? 'Event updated.' : 'Event created and added to the calendar.')
      onOpenChange(false)
      onSaved()
    } catch (e) {
      const err = e as ApiError
      if (err.fields?.length) setErrors(Object.fromEntries(err.fields.map(f => [f, 'Invalid value'])))
      toast.error(err.message || 'Could not save the event.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!saving) onOpenChange(v) }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Event' : 'New Event'}</DialogTitle>
          <DialogDescription>Saved events appear on the school calendar for the selected audience.</DialogDescription>
        </DialogHeader>
        <FormFields fields={fields} values={values} setValues={setValues} errors={errors} mode={editing ? 'edit' : 'create'} />
        {needsRegistration && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="ev-capacity" className="text-sm">Capacity</Label>
              <p className="text-xs text-muted-foreground">Maximum number of registrations accepted.</p>
            </div>
            <Input
              id="ev-capacity"
              type="number"
              min={1}
              value={values.capacity ?? ''}
              onChange={e => setValues((prev: any) => ({ ...prev, capacity: e.target.value }))}
              className="w-28"
              placeholder="e.g. 200"
            />
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? 'Save Changes' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
