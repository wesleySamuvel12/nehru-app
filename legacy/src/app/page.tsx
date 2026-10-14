'use client'

import dynamic from 'next/dynamic'

const ErpApp = dynamic(() => import('@/components/erp/ErpApp').then(m => m.ErpApp), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-14 w-14 animate-pulse items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-white shadow-[var(--shadow-soft)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nis-mark.png" alt="" className="h-[78%] w-[86%] object-contain" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">Loading Nehru International ERP…</p>
    </div>
  ),
})

export default function Page() {
  return <ErpApp />
}
