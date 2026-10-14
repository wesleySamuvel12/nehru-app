'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Loader2, MoreVertical, Pencil, Plus, RefreshCw, Search, Trash2, X, BookOpen, Cloud } from 'lucide-react'
import { toast } from 'sonner'
import { list, createOne, updateOne, deleteOne, ApiError } from '@/lib/api-client'
import { inr } from '@/lib/format'
import { StatusBadge, EmptyState, ErrorState, CardGridSkeleton } from '@/components/erp/ui'
import { FormFields, validateForm, type FormField } from '@/components/erp/DataTable'
import { BOOK_CATEGORIES } from './shared'

/* eslint-disable @typescript-eslint/no-explicit-any */

const FORM_FIELDS: FormField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. A Brief History of Time' },
  { name: 'author', label: 'Author', type: 'text', required: true },
  { name: 'category', label: 'Category', type: 'select', required: true, options: BOOK_CATEGORIES.map((c) => ({ label: c, value: c })) },
  { name: 'isbn', label: 'ISBN', type: 'text', placeholder: '978-…' },
  { name: 'publisher', label: 'Publisher', type: 'text' },
  { name: 'editionYear', label: 'Edition Year', type: 'number', min: 1900, max: 2100 },
  { name: 'totalCopies', label: 'Total Copies', type: 'number', min: 0, required: true, defaultValue: 1 },
  { name: 'shelf', label: 'Shelf', type: 'text', placeholder: 'e.g. B-4' },
  { name: 'price', label: 'Price (₹)', type: 'number', min: 0 },
  { name: 'language', label: 'Language', type: 'text', defaultValue: 'English' },
  { name: 'barcode', label: 'Barcode', type: 'text', help: 'Auto-generated (BK…) if left blank.' },
  { name: 'isDigital', label: 'Digital Copy', type: 'switch' },
]

const PAGE_SIZE = 12

export default function CatalogueTab() {
  const [books, setBooks] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [q, setQ] = React.useState('')
  const [category, setCategory] = React.useState('ALL')
  const [onlyAvailable, setOnlyAvailable] = React.useState(false)
  const [page, setPage] = React.useState(1)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editMode, setEditMode] = React.useState<'create' | 'edit'>('create')
  const [editing, setEditing] = React.useState<any | null>(null)
  const [values, setValues] = React.useState<Record<string, any>>({})
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState<any | null>(null)
  const [deleteBusy, setDeleteBusy] = React.useState(false)

  const load = React.useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    list<any>('api/library/books', { all: 1, sortBy: 'title', sortDir: 'asc' })
      .then((res) => { if (alive) setBooks(res.data) })
      .catch((e: ApiError) => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  React.useEffect(() => load(), [load])

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase()
    return books.filter((b) => {
      if (category !== 'ALL' && b.category !== category) return false
      if (onlyAvailable && !(b.availableCopies > 0)) return false
      if (!needle) return true
      return [b.title, b.author, b.isbn, b.barcode].some((v: string) => (v || '').toLowerCase().includes(needle))
    })
  }, [books, q, category, onlyAvailable])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const outOfStock = books.filter((b) => b.totalCopies > 0 && b.availableCopies === 0).length

  const openCreate = () => {
    const init: Record<string, any> = {}
    FORM_FIELDS.forEach((f) => { init[f.name] = f.defaultValue ?? (f.type === 'switch' ? false : '') })
    setValues(init)
    setErrors({})
    setEditMode('create')
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (b: any) => {
    const base: Record<string, any> = {}
    FORM_FIELDS.forEach((f) => { base[f.name] = b[f.name] ?? (f.type === 'switch' ? false : (f.defaultValue ?? '')) })
    setValues(base)
    setErrors({})
    setEditMode('edit')
    setEditing(b)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const errs = validateForm(FORM_FIELDS, values)
    if (Object.keys(errs).length) { setErrors(errs); toast.error('Please fix the highlighted fields.'); return }
    const payload: Record<string, any> = {
      title: values.title, author: values.author, category: values.category,
      isbn: values.isbn || null, publisher: values.publisher || null,
      editionYear: values.editionYear === '' ? null : Number(values.editionYear),
      totalCopies: Number(values.totalCopies) || 0,
      shelf: values.shelf || null, price: Number(values.price) || 0,
      language: values.language || 'English', barcode: values.barcode || null,
      isDigital: !!values.isDigital,
    }
    if (editMode === 'edit' && editing) {
      // Keep availability in sync when total copies change
      const delta = payload.totalCopies - (editing.totalCopies || 0)
      payload.availableCopies = Math.max(0, Math.min(payload.totalCopies, (editing.availableCopies || 0) + delta))
    } else {
      payload.availableCopies = payload.totalCopies
    }
    setSaving(true)
    try {
      if (editMode === 'create') await createOne('api/library/books', payload)
      else await updateOne('api/library/books', editing.id, payload)
      toast.success(editMode === 'create' ? 'Book added to the catalogue.' : 'Book details updated.')
      setDialogOpen(false)
      load()
    } catch (e) { toast.error((e as ApiError).message) } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteOne('api/library/books', deleting.id)
      toast.success(`Removed “${deleting.title}” from the catalogue.`)
      setDeleting(null)
      load()
    } catch (e) { toast.error((e as ApiError).message) } finally { setDeleteBusy(false) }
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search title, author, ISBN…" className="h-9 pl-8 pr-8" />
            {q && (
              <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1) }}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {BOOK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={onlyAvailable ? 'default' : 'outline'} size="sm" className="h-9"
            onClick={() => { setOnlyAvailable((v) => !v); setPage(1) }}>
            Available only
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={load} aria-label="Refresh catalogue">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" className="h-9" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Add Book</Button>
        </div>
      </div>

      {outOfStock > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {outOfStock} title{outOfStock > 1 ? 's' : ''} currently out of stock — consider reordering or checking pending returns.
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <CardGridSkeleton count={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : pageRows.length === 0 ? (
        <EmptyState
          title={q || category !== 'ALL' || onlyAvailable ? 'No books match your filters' : 'No books in the catalogue yet'}
          description={q || category !== 'ALL' || onlyAvailable ? 'Try a different search term or clear the filters.' : 'Add your first title to start circulating books.'}
          action={!q && category === 'ALL' && !onlyAvailable ? (
            <Button size="sm" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Add Book</Button>
          ) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {pageRows.map((b) => {
            const out = b.totalCopies > 0 && b.availableCopies === 0
            return (
              <Card key={b.id} className="flex flex-col transition-shadow hover:shadow-md">
                <CardContent className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="h-4.5 w-4.5" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${b.title}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(b)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => setDeleting(b)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-1 font-medium" title={b.title}>{b.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{b.author}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="text-[11px]">{b.category}</Badge>
                    {b.isDigital && (
                      <Badge variant="outline" className="gap-1 text-[11px]"><Cloud className="h-3 w-3" /> Digital</Badge>
                    )}
                    <StatusBadge value={b.status} />
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-2.5 text-xs">
                    <span className={out ? 'font-semibold text-amber-600 dark:text-amber-400' : 'font-medium text-emerald-600 dark:text-emerald-400'}>
                      {b.availableCopies ?? 0}/{b.totalCopies ?? 0} available{out ? ' · out of stock' : ''}
                    </span>
                    <span className="text-right font-medium tabular-nums text-foreground">{inr(b.price)}</span>
                    <span className="text-muted-foreground">Shelf {b.shelf || '—'}</span>
                    <span className="truncate text-right text-muted-foreground" title={b.isbn ? `ISBN ${b.isbn}` : undefined}>
                      {b.isbn ? `ISBN ${b.isbn}` : b.barcode || '—'}
                    </span>
                    {b.editionYear ? <span className="text-muted-foreground">Ed. {b.editionYear}</span> : <span />}
                    <span className="text-right text-muted-foreground">Lang. {b.language || '—'}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length} book{filtered.length > 1 ? 's' : ''} · page {safePage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" className="h-9" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !saving) setDialogOpen(false) }}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMode === 'create' ? 'Add Book' : 'Edit Book'}</DialogTitle>
            <DialogDescription>
              {editMode === 'create' ? 'Add a new title to the library catalogue.' : 'Update the catalogue record for this title.'}
            </DialogDescription>
          </DialogHeader>
          <FormFields fields={FORM_FIELDS} values={values} setValues={setValues} errors={errors} mode={editMode} />
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editMode === 'create' ? 'Add Book' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this book?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `“${deleting.title}” and its circulation history reference will be removed. This action cannot be undone.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
              disabled={deleteBusy}
              onClick={(e) => { e.preventDefault(); handleDelete() }}
            >
              {deleteBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
