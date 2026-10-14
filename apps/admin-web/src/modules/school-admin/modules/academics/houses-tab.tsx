'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { SectionCard, CardGridSkeleton, EmptyState, ErrorState } from '@/components/erp/ui'
import { ApiError, createOne, deleteOne, list, updateOne } from '@/lib/api-client'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

/* eslint-disable @typescript-eslint/no-explicit-any */

const HOUSE_COLORS: Record<string, { dot: string; soft: string }> = {
  rose: { dot: 'bg-rose-500', soft: 'from-rose-500/10' },
  emerald: { dot: 'bg-emerald-500', soft: 'from-emerald-500/10' },
  sky: { dot: 'bg-sky-500', soft: 'from-sky-500/10' },
  amber: { dot: 'bg-amber-500', soft: 'from-amber-500/10' },
  violet: { dot: 'bg-violet-500', soft: 'from-violet-500/10' },
  zinc: { dot: 'bg-zinc-500', soft: 'from-zinc-500/10' },
}
const COLOR_OPTIONS = Object.keys(HOUSE_COLORS)

export default function HousesTab() {
  const [houses, setHouses] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<any | null>(null)
  const [values, setValues] = React.useState<{ name: string; color: string }>({ name: '', color: 'emerald' })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState<any | null>(null)
  const [deletingBusy, setDeletingBusy] = React.useState(false)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    list('api/academics/houses', { all: 1 })
      .then(res => { if (alive) setHouses(res.data || []) })
      .catch((e: ApiError) => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [reloadKey])

  const openCreate = () => {
    setEditing(null)
    setValues({ name: '', color: 'emerald' })
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (house: any) => {
    setEditing(house)
    setValues({ name: house.name || '', color: HOUSE_COLORS[house.color] ? house.color : 'zinc' })
    setErrors({})
    setDialogOpen(true)
  }

  const save = async () => {
    const errs: Record<string, string> = {}
    if (!values.name.trim()) errs.name = 'House name is required'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    try {
      if (editing) await updateOne('api/academics/houses', editing.id, { name: values.name.trim(), color: values.color })
      else await createOne('api/academics/houses', { name: values.name.trim(), color: values.color })
      toast.success(editing ? 'House updated.' : 'House created.')
      setDialogOpen(false)
      setReloadKey(k => k + 1)
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deleteOne('api/academics/houses', deleting.id)
      toast.success('House deleted.')
      setDeleting(null)
      setReloadKey(k => k + 1)
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setDeletingBusy(false)
    }
  }

  return (
    <SectionCard
      title="Student houses"
      description="House system for sports, cultural events and point rankings"
      actions={
        <Button size="sm" className="h-9" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> Add House
        </Button>
      }
    >
      {loading ? (
        <CardGridSkeleton count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReloadKey(k => k + 1)} />
      ) : houses.length === 0 ? (
        <EmptyState
          title="No houses yet"
          description="Create the four school houses — e.g. Ruby, Emerald, Sapphire, Topaz."
          action={<Button size="sm" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Add House</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {houses.map(house => {
            const tone = HOUSE_COLORS[house.color] || HOUSE_COLORS.zinc
            return (
              <Card key={house.id} className="relative overflow-hidden">
                <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent', tone.soft)} />
                <CardContent className="relative p-5">
                  <div className="flex items-start justify-between">
                    <span className={cn('h-3.5 w-3.5 rounded-full', tone.dot)} aria-hidden />
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(house)} aria-label={`Edit ${house.name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-500/10 hover:text-rose-600" onClick={() => setDeleting(house)} aria-label={`Delete ${house.name}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-lg font-semibold tracking-tight">{house.name}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {house.members ?? 0} member{(house.members ?? 0) === 1 ? '' : 's'}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o && !saving) setDialogOpen(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit house' : 'Add house'}</DialogTitle>
            <DialogDescription>Houses group students for inter-house competitions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="house-name">Name <span className="text-rose-500">*</span></Label>
              <Input
                id="house-name"
                value={values.name}
                onChange={e => setValues(v => ({ ...v, name: e.target.value }))}
                placeholder="e.g. Ruby House"
                className={cn(errors.name && 'border-rose-500')}
              />
              {errors.name && <p className="text-xs font-medium text-rose-500">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <Select value={values.color} onValueChange={v => setValues(v0 => ({ ...v0, color: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map(c => (
                    <SelectItem key={c} value={c}>
                      <span className="inline-flex items-center gap-2">
                        <span className={cn('h-3 w-3 rounded-full', HOUSE_COLORS[c].dot)} /> {c}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Create house'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this house?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `“${deleting.name}” with ${deleting.members ?? 0} member(s) will be permanently removed. This action cannot be undone.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
              disabled={deletingBusy}
              onClick={(e) => { e.preventDefault(); confirmDelete() }}
            >
              {deletingBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  )
}
