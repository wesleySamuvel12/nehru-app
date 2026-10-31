import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

const loading = () => null
const lazy = (loader: () => Promise<{ default: ComponentType }>) =>
  dynamic(loader, { loading, ssr: false })

export const TEACHER_MODULE_REGISTRY: Record<string, ComponentType> = {
  'dashboard': lazy(() => import('./dashboard')),
  'students': lazy(() => import('./students')),
  'academics': lazy(() => import('./academics')),
  'lms': lazy(() => import('./lms')),
  'attendance': lazy(() => import('./attendance')),
  'examinations': lazy(() => import('./examinations')),
  'health': lazy(() => import('./health')),
  'library': lazy(() => import('./library')),
  'communication': lazy(() => import('./communication')),
  'events': lazy(() => import('./events')),
  'certificates': lazy(() => import('./certificates')),
}
