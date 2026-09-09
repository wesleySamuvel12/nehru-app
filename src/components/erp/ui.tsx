'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'

/* ── Page header ── */
export function PageHeader({ title, subtitle, actions, breadcrumbs }: {
  title: string; subtitle?: string; actions?: React.ReactNode; breadcrumbs?: string[]
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground/50">/</span>}
                <span className={i === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''}>{b}</span>
              </span>
            ))}
          </div>
        )}
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ── Stat card ── */
export function StatCard({ label, value, icon, trend, tone = 'default', hint, onClick }: {
  label: string; value: React.ReactNode; icon?: React.ReactNode
  trend?: { value: string; up?: boolean }
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  hint?: string
  onClick?: () => void
}) {
  const tones: Record<string, string> = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  }
  return (
    <Card
      className={cn('transition-shadow', onClick && 'cursor-pointer hover:shadow-md')}
      onClick={onClick}
    >
      <CardContent className="flex items-start justify-between gap-2 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground leading-tight">{label}</p>
          <p className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
          {trend && (
            <p className={cn('mt-1 text-xs font-medium', trend.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
              {trend.up ? '▲' : '▼'} {trend.value}
            </p>
          )}
          {hint && <p className="mt-1 text-xs text-muted-foreground leading-snug">{hint}</p>}
        </div>
        {icon && <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tones[tone])}>{icon}</div>}
      </CardContent>
    </Card>
  )
}

/* ── Status badge ── */
const BADGE_TONES: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  PRESENT: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  PAID: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  SUCCESS: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  RESOLVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  CONNECTED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  ENROLLED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  VERIFIED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  RETURNED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  PUBLISHED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  ISSUED: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  INSIDE: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  IN_PROGRESS: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  INVESTIGATING: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  IN_USE: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  REGISTERED: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  SCHEDULED: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  SUBMITTED: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  GENERATED: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  PARTIAL: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  DRAFT: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  SCREENING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  PLANNED: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  READY: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  TESTING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  LATE: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  HALF_DAY: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  MAINTENANCE: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  OVERDUE: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  ABSENT: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  FAILED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  CANCELLED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  OPEN: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  LOST: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  SUSPENDED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  DISCONNECTED: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
  EXITED: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
  FREE: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
  WITHDRAWN: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
  ARCHIVED: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
}

export function StatusBadge({ value, map, className }: { value?: string | null; map?: Record<string, string>; className?: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  const label = value.replace(/_/g, ' ')
  const tone = map?.[value] || BADGE_TONES[value] || 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20'
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4', tone, className)}>
      {label.charAt(0) + label.slice(1).toLowerCase()}
    </span>
  )
}

/* ── Empty state ── */
export function EmptyState({ title, description, icon, action }: {
  title: string; description?: string; icon?: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon || <Inbox className="h-7 w-7" />}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/* ── Error state ── */
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div>
        <p className="font-medium">Something went wrong</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message || 'Unable to load data right now. Please try again.'}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      )}
    </div>
  )
}

/* ── Loading skeleton blocks ── */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" style={{ opacity: 1 - i * 0.08 }} />
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
    </div>
  )
}

/* ── Section card ── */
export function SectionCard({ title, description, actions, children, className, contentClassName }: {
  title?: string; description?: string; actions?: React.ReactNode; children: React.ReactNode
  className?: string; contentClassName?: string
}) {
  return (
    <div className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
          <div>
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('p-4 sm:p-5', contentClassName)}>{children}</div>
    </div>
  )
}
