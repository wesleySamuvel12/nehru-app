'use client'

import dynamic from 'next/dynamic'

const ErpApp = dynamic(() => import('@/components/erp/ErpApp').then(m => m.ErpApp), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-emerald-600 text-white">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" /><path d="M22 10v6" /><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" /></svg>
      </div>
      <p className="text-sm font-medium text-muted-foreground">Loading Greenwood ERP…</p>
    </div>
  ),
})

export default function Page() {
  return <ErpApp />
}
