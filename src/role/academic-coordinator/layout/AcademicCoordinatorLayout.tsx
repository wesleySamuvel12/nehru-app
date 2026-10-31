'use client'

import type { ReactNode } from 'react'

export function AcademicCoordinatorLayout({ children }: { children: ReactNode }) {
  return (
    <section data-role-application="academic-coordinator" className="space-y-5">
      {children}
    </section>
  )
}

