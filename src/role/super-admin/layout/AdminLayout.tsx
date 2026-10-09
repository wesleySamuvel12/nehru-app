'use client'

import type { ReactNode } from 'react'

export function AdminLayout({ children }: { children: ReactNode }) {
  return <section data-role-application="admin" className="space-y-5">{children}</section>
}
