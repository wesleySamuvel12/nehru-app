'use client'

import * as React from 'react'
import { StatCard, SectionCard, ErrorState, CardGridSkeleton } from '@/components/erp/ui'
import { BarsChart, DonutChart } from '@/components/erp/charts'
import { BookCopy, BookOpen, BookLock, CalendarClock, IndianRupee } from 'lucide-react'
import { list, ApiError } from '@/lib/api-client'
import { inr } from '@/lib/format'
import { BOOK_CATEGORIES } from './shared'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ReportsTab() {
  const [books, setBooks] = React.useState<any[]>([])
  const [txns, setTxns] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tick, setTick] = React.useState(0)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    Promise.all([
      list<any>('api/library/books', { all: 1 }),
      list<any>('api/library/transactions', { all: 1 }),
    ])
      .then(([b, t]) => { if (alive) { setBooks(b.data); setTxns(t.data) } })
      .catch((e: ApiError) => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [tick])

  const stats = React.useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const issued = txns.filter((t) => t.status === 'ISSUED').length
    const overdue = txns.filter((t) => !t.returnDate && t.dueDate && new Date(t.dueDate) < today).length
    const fines = txns.reduce((sum, t) => sum + (t.fine || 0), 0)
    const copies = books.reduce((sum, b) => sum + (b.totalCopies || 0), 0)
    return { titles: books.length, copies, issued, overdue, fines }
  }, [books, txns])

  const popularBooks = React.useMemo(() => {
    const counts = new Map<string, number>()
    txns.forEach((t) => {
      const key = t.bookTitle || 'Unknown'
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [txns])

  const categoryMix = React.useMemo(() => {
    const counts = new Map<string, number>()
    books.forEach((b) => {
      const key = b.category || 'Other'
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return BOOK_CATEGORIES
      .filter((c) => counts.has(c))
      .map((c) => ({ name: c, value: counts.get(c)! }))
      .concat(
        Array.from(counts.entries())
          .filter(([c]) => !BOOK_CATEGORIES.includes(c))
          .map(([name, value]) => ({ name, value })),
      )
  }, [books])

  if (loading) {
    return (
      <div className="space-y-4">
        <CardGridSkeleton count={5} />
        <div className="h-72 rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }
  if (error) return <ErrorState message={error} onRetry={() => setTick((t) => t + 1)} />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Titles" value={stats.titles} icon={<BookOpen className="h-5 w-5" />} hint="Distinct books in catalogue" />
        <StatCard label="Copies" value={stats.copies} icon={<BookCopy className="h-5 w-5" />} tone="info" hint="Total physical copies" />
        <StatCard label="Issued" value={stats.issued} icon={<BookLock className="h-5 w-5" />} tone="warning" hint="Currently on loan" />
        <StatCard label="Overdue" value={stats.overdue} icon={<CalendarClock className="h-5 w-5" />} tone="danger" hint="Past due, not returned" />
        <StatCard label="Fines Collected" value={inr(stats.fines)} icon={<IndianRupee className="h-5 w-5" />} tone="success" hint="All-time late-return fines" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Most Popular Books"
          description="Top 8 titles by number of issues (all time)"
        >
          {popularBooks.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No circulation data yet — issue books to see trends.</p>
          ) : (
            <BarsChart
              data={popularBooks}
              xKey="title"
              series={[{ key: 'count', label: 'Issues', color: '#8b5cf6' }]}
              layout="vertical"
              height={Math.max(220, popularBooks.length * 38)}
              yFormatter={(v) => String(Math.round(v))}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Catalogue by Category"
          description="Number of titles in each category"
        >
          {categoryMix.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Add books to the catalogue to see the mix.</p>
          ) : (
            <DonutChart data={categoryMix} nameKey="name" valueKey="value" centerLabel={`${stats.titles} titles`} />
          )}
        </SectionCard>
      </div>
    </div>
  )
}
