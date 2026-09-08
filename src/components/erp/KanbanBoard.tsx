'use client'

import * as React from 'react'
import { api, ApiError } from '@/lib/api-client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { EmptyState, ErrorState } from './ui'

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface KanbanColumn {
  key: string
  label: string
  tone?: string
}

export function KanbanBoard({ endpoint, idField, columns, titleField, subtitleField, renderCard, onChanged, allowMove = true }: {
  endpoint: string
  idField?: string
  columns: KanbanColumn[]
  titleField: string
  subtitleField?: string
  renderCard?: (item: any, refresh: () => void) => React.ReactNode
  onChanged?: () => void
  allowMove?: boolean
}) {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [moving, setMoving] = React.useState<string | null>(null)
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [dragOver, setDragOver] = React.useState<string | null>(null)

  const refresh = React.useCallback(() => {
    let alive = true
    setLoading(true)
    api<{ data: any[] }>(`${endpoint}?all=1`)
      .then(res => { if (alive) setItems(res.data) })
      .catch((e: ApiError) => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint])

  React.useEffect(() => { refresh() }, [refresh])

  const move = async (item: any, stage: string) => {
    if (!allowMove || item[idField || 'stage'] === stage) return
    setMoving(item.id)
    const before = items
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, [idField || 'stage']: stage } : i)))
    try {
      await api(`${endpoint}/${item.id}`, { method: 'PATCH', body: JSON.stringify({ [idField || 'stage']: stage }) })
      toast.success(`Moved to ${columns.find(c => c.key === stage)?.label || stage}`)
      onChanged?.()
    } catch (e) {
      setItems(before)
      toast.error((e as ApiError).message)
    } finally {
      setMoving(null)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {columns.map(c => (
          <div key={c.key} className="min-h-[200px] animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
    )
  }
  if (error) return <ErrorState message={error} onRetry={refresh} />
  if (items.length === 0) return <EmptyState title="Nothing in the pipeline yet" description="New records will appear here." />

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3">
        {columns.map(col => {
          const colItems = items.filter(i => (i[idField || 'stage']) === col.key)
          return (
            <div
              key={col.key}
              className={cn('w-60 shrink-0 rounded-lg border bg-muted/30 transition-colors', dragOver === col.key && 'border-primary/50 bg-primary/5')}
              onDragOver={e => { if (!allowMove) return; e.preventDefault(); setDragOver(col.key) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => {
                if (!allowMove) return
                e.preventDefault()
                setDragOver(null)
                const item = items.find(i => i.id === dragId)
                if (item) move(item, col.key)
              }}
            >
              <div className="flex items-center justify-between border-b px-3 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.label}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{colItems.length}</span>
              </div>
              <div className="flex max-h-[62vh] flex-col gap-2 overflow-y-auto p-2">
                {colItems.map(item => (
                  <div
                    key={item.id}
                    draggable={allowMove && moving !== item.id}
                    onDragStart={() => setDragId(item.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      'rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md',
                      allowMove && 'cursor-grab active:cursor-grabbing',
                      dragId === item.id && 'opacity-50',
                      moving === item.id && 'animate-pulse'
                    )}
                  >
                    {renderCard ? renderCard(item, refresh) : (
                      <div>
                        <p className="text-sm font-medium leading-snug">{item[titleField]}</p>
                        {subtitleField && <p className="mt-1 truncate text-xs text-muted-foreground">{item[subtitleField]}</p>}
                        {item.phone && <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.phone}</p>}
                      </div>
                    )}
                    {moving === item.id && <Loader2 className="absolute right-2 top-2 h-3.5 w-3.5 animate-spin text-primary" />}
                  </div>
                ))}
                {colItems.length === 0 && (
                  <div className="flex h-20 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
