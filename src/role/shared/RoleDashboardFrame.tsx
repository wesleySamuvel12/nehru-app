import type { ReactNode } from 'react'

type RoleDashboardFrameProps = {
  title: string
  subtitle: string
  children: ReactNode
}

export function RoleDashboardFrame({ title, subtitle, children }: RoleDashboardFrameProps) {
  return (
    <section className="space-y-5" aria-labelledby="role-dashboard-title">
      <header className="rounded-xl border bg-card p-5 text-card-foreground shadow-[var(--shadow-soft)]">
        <h1 id="role-dashboard-title" className="text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </header>
      {children}
    </section>
  )
}
