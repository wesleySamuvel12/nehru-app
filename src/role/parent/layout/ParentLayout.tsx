'use client'
import type { ReactNode } from 'react'
export function ParentLayout({ children }: { children: ReactNode }) { return <section data-role-application="parent" className="space-y-5">{children}</section> }
