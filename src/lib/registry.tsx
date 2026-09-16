'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

/* eslint-disable @typescript-eslint/no-explicit-any */

const loading = () => (
  <div className="space-y-4">
    <Skeleton className="h-9 w-56" />
    <Skeleton className="h-40 w-full rounded-xl" />
    <Skeleton className="h-64 w-full rounded-xl" />
  </div>
)

const lazy = (loader: () => Promise<any>) => dynamic(loader, { loading, ssr: false })

/** Module registry — sidebar keys map to client module views. Single-page app. */
export const MODULE_REGISTRY: Record<string, React.ComponentType<any>> = {
  dashboard: lazy(() => import('@/components/modules/dashboard')),
  admissions: lazy(() => import('@/components/modules/admissions')),
  students: lazy(() => import('@/components/modules/students')),
  parents: lazy(() => import('@/components/modules/parents')),
  teachers: lazy(() => import('@/components/modules/teachers')),
  academics: lazy(() => import('@/components/modules/academics')),
  lms: lazy(() => import('@/components/modules/lms')),
  attendance: lazy(() => import('@/components/modules/attendance')),
  examinations: lazy(() => import('@/components/modules/examinations')),
  fees: lazy(() => import('@/components/modules/fees')),
  hr: lazy(() => import('@/components/modules/hr')),
  transport: lazy(() => import('@/components/modules/transport')),
  hostel: lazy(() => import('@/components/modules/hostel')),
  security: lazy(() => import('@/components/modules/security')),
  health: lazy(() => import('@/components/modules/health')),
  library: lazy(() => import('@/components/modules/library')),
  assets: lazy(() => import('@/components/modules/assets')),
  communication: lazy(() => import('@/components/modules/communication')),
  events: lazy(() => import('@/components/modules/events')),
  certificates: lazy(() => import('@/components/modules/certificates')),
  analytics: lazy(() => import('@/components/modules/analytics')),
  integrations: lazy(() => import('@/components/modules/integrations')),
  settings: lazy(() => import('@/components/modules/settings')),
  'audit-logs': lazy(() => import('@/components/modules/audit-logs')),
  'parent-portal': lazy(() => import('@/components/modules/parent-portal')),
  'student-portal': lazy(() => import('@/components/modules/student-portal')),
}
