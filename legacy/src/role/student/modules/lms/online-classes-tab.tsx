'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/erp/ui'
import { list } from '@/lib/api-client'
import { MonitorPlay, FileText, Link2, Presentation, Video, ExternalLink, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'

/* eslint-disable @typescript-eslint/no-explicit-any */

const TYPE_ICON: Record<string, React.ReactNode> = {
  VIDEO: <MonitorPlay className="h-5 w-5" />,
  DOCUMENT: <FileText className="h-5 w-5" />,
  LINK: <Link2 className="h-5 w-5" />,
  PRESENTATION: <Presentation className="h-5 w-5" />,
}

const TYPE_TONE: Record<string, string> = {
  VIDEO: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  DOCUMENT: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  LINK: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  PRESENTATION: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

export default function OnlineClassesTab() {
  const [materials, setMaterials] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    list('api/lms/materials', { all: 1 })
      .then(res => { if (alive) setMaterials((res.data || []).filter((m: any) => m.isOnline)) })
      .catch((e: any) => { if (alive) setError(e?.message || 'Unable to load online classes.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [reloadKey])

  if (loading) return <CardGridSkeleton count={6} />
  if (error) return <ErrorState message={error} onRetry={() => setReloadKey(k => k + 1)} />
  if (!materials.length) {
    return (
      <EmptyState
        title="No online classes scheduled"
        description="Mark a learning material as an “Online class” with a schedule and join link, and it will appear here."
        icon={<Video className="h-7 w-7" />}
      />
    )
  }

  const upcoming = [...materials].sort((a, b) => {
    const at = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity
    const bt = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity
    return at - bt
  })

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {upcoming.map(m => {
        const scheduled = m.scheduledAt ? new Date(m.scheduledAt) : null
        const isFuture = scheduled ? scheduled.getTime() > Date.now() : false
        return (
          <Card key={m.id} className="flex flex-col transition-shadow hover:shadow-md">
            <CardContent className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', TYPE_TONE[m.type] || TYPE_TONE.DOCUMENT)}>
                  {TYPE_ICON[m.type] || TYPE_ICON.DOCUMENT}
                </span>
                {scheduled && (
                  <Badge variant={isFuture ? 'default' : 'secondary'} className="gap-1">
                    <CalendarClock className="h-3 w-3" />
                    {isFuture ? 'Upcoming' : 'Held'}
                  </Badge>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold leading-snug">{m.title}</p>
                {m.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>}
              </div>
              <div className="space-y-0.5 text-xs text-muted-foreground">
                {(m.class?.name || m.subject?.name) && (
                  <p>{[m.class?.name, m.subject?.name].filter(Boolean).join(' · ')}</p>
                )}
                {m.teacherName && <p>Teacher: {m.teacherName}</p>}
                {scheduled && <p>{scheduled.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
              </div>
              <Button asChild className="mt-1 w-full">
                <a href={m.url} target="_blank" rel="noreferrer" aria-label={`Join ${m.title}`}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Join Class
                </a>
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
