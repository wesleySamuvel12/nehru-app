'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { FormFields, validateForm, type FormField } from '@/components/erp/DataTable'
import { list, createOne, updateOne, ApiError } from '@/lib/api-client'
import { COMM_CHANNELS, CHANNEL_LABELS } from './constants'


const BASE_FIELDS: FormField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. Annual Day rehearsals begin Nov 25' },
  { name: 'body', label: 'Body', type: 'textarea', required: true, colSpan: 2, placeholder: 'Full message sent to the audience…' },
  {
    name: 'type', label: 'Type', type: 'select', defaultValue: 'ANNOUNCEMENT',
    options: [
      { label: 'Announcement', value: 'ANNOUNCEMENT' },
      { label: 'Circular', value: 'CIRCULAR' },
      { label: 'Emergency', value: 'EMERGENCY' },
      { label: 'Event', value: 'EVENT' },
      { label: 'Reminder', value: 'REMINDER' },
    ],
  },
  {
    name: 'audience', label: 'Audience', type: 'select', defaultValue: 'ALL',
    options: [
      { label: 'Everyone (All)', value: 'ALL' },
      { label: 'Students', value: 'STUDENTS' },
      { label: 'Parents', value: 'PARENTS' },
      { label: 'Teachers', value: 'TEACHERS' },
      { label: 'Staff', value: 'STAFF' },
    ],
  },
  { name: 'targetClassId', label: 'Target Class (optional)', type: 'select', defaultValue: 'NONE', options: [] },
  {
    name: 'priority', label: 'Priority', type: 'select', defaultValue: 'NORMAL',
    options: [
      { label: 'Urgent', value: 'URGENT' },
      { label: 'High', value: 'HIGH' },
      { label: 'Normal', value: 'NORMAL' },
      { label: 'Low', value: 'LOW' },
    ],
  },
  { name: 'expiresAt', label: 'Expires On (optional)', type: 'date' },
  {
    name: 'status', label: 'Status', type: 'select', defaultValue: 'PUBLISHED',
    options: [
      { label: 'Published — send now', value: 'PUBLISHED' },
      { label: 'Draft — save for later', value: 'DRAFT' },
      { label: 'Archived', value: 'ARCHIVED' },
    ],
  },
]

export default function AnnouncementDialog({ open, onOpenChange, initial, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: any | null
  onSaved: () => void
}) {
  const editing = !!initial?.id
  const [values, setValues] = React.useState<Record<string, any>>({})
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [channels, setChannels] = React.useState<string[]>(['IN_APP'])
  const [classes, setClasses] = React.useState<{ label: string; value: string }[]>([])
  const [saving, setSaving] = React.useState(false)

  const fields = React.useMemo(
    () => BASE_FIELDS.map(f => (f.name === 'targetClassId' ? { ...f, options: classes } : f)),
    [classes],
  )

  React.useEffect(() => {
    if (!open) return
    setErrors({})
    setValues({
      title: initial?.title || '',
      body: initial?.body || '',
      type: initial?.type || 'ANNOUNCEMENT',
      audience: initial?.audience || 'ALL',
      targetClassId: initial?.targetClassId || 'NONE',
      priority: initial?.priority || 'NORMAL',
      expiresAt: initial?.expiresAt ? String(initial.expiresAt).slice(0, 10) : '',
      status: initial?.status || 'PUBLISHED',
    })
    setChannels(initial?.channels ? String(initial.channels).split(',').filter(Boolean) : ['IN_APP'])
    // Class options (graceful if the academics module isn't deployed yet)
    list('api/academics/classes', { all: 1, sortBy: 'level', sortDir: 'asc' })
      .then(res => setClasses((res.data || []).map((c: any) => ({ label: c.name, value: c.id }))))
      .catch(() => setClasses([]))
  }, [open, initial])

  const toggleChannel = (ch: string, on: boolean) => {
    setChannels(prev => (on ? [...new Set([...prev, ch])] : prev.filter(c => c !== ch)))
  }

  const save = async () => {
    const errs = validateForm(fields, values)
    if (!channels.length) errs.channels = 'Select at least one channel'
    if (Object.keys(errs).length) {
      setErrors(errs)
      toast.error('Please fix the highlighted fields.')
      return
    }
    const payload: Record<string, any> = {
      title: values.title,
      body: values.body,
      type: values.type,
      audience: values.audience,
      targetClassId: values.targetClassId && values.targetClassId !== 'NONE' ? values.targetClassId : null,
      priority: values.priority,
      channels: channels.join(','),
      expiresAt: values.expiresAt || null,
      status: values.status,
    }
    setSaving(true)
    try {
      if (editing) await updateOne('api/communication/announcements', initial.id, payload)
      else await createOne('api/communication/announcements', payload)
      toast.success(editing
        ? 'Announcement updated.'
        : payload.status === 'PUBLISHED'
          ? 'Announcement published — audience notifications are being sent.'
          : 'Draft saved.')
      onOpenChange(false)
      onSaved()
    } catch (e) {
      const err = e as ApiError
      if (err.fields?.length) setErrors(Object.fromEntries(err.fields.map(f => [f, 'Invalid value'])))
      toast.error(err.message || 'Could not save the announcement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!saving) onOpenChange(v) }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Announcement' : 'New Announcement / Circular'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update the details below. Published announcements already have notifications queued.'
              : 'Publishing fans the message out to the target audience across the selected channels.'}
          </DialogDescription>
        </DialogHeader>
        <FormFields fields={fields} values={values} setValues={setValues} errors={errors} mode={editing ? 'edit' : 'create'} />
        <div className="space-y-1.5">
          <Label className="text-sm">
            Delivery Channels <span className="ml-0.5 text-rose-500">*</span>
          </Label>
          <div className="flex flex-wrap gap-x-5 gap-y-2.5 rounded-lg border p-3">
            {COMM_CHANNELS.map(ch => (
              <div key={ch} className="flex items-center gap-2">
                <Checkbox
                  id={`ch-${ch}`}
                  checked={channels.includes(ch)}
                  onCheckedChange={v => toggleChannel(ch, v === true)}
                  aria-label={`Send via ${CHANNEL_LABELS[ch]}`}
                />
                <Label htmlFor={`ch-${ch}`} className="cursor-pointer text-sm font-normal">
                  {CHANNEL_LABELS[ch]}
                </Label>
              </div>
            ))}
          </div>
          {errors.channels
            ? <p className="text-xs font-medium text-rose-500">{errors.channels}</p>
            : <p className="text-xs text-muted-foreground">In-App is always recorded; other channels are dispatched to the simulated gateways.</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? 'Save Changes' : values.status === 'PUBLISHED' ? 'Publish' : 'Save Draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
