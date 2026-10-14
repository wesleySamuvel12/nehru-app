import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

const loading = () => null
const lazy = (loader: () => Promise<{ default: ComponentType }>) =>
  dynamic(loader, { loading, ssr: false })

export const HR_MODULE_REGISTRY: Record<string, ComponentType> = {
  'dashboard': lazy(() => import('./dashboard')),
  'admissions': lazy(() => import('./admissions')),
  'students': lazy(() => import('./students')),
  'parents': lazy(() => import('./parents')),
  'teachers': lazy(() => import('./teachers')),
  'academics': lazy(() => import('./academics')),
  'lms': lazy(() => import('./lms')),
  'attendance': lazy(() => import('./attendance')),
  'examinations': lazy(() => import('./examinations')),
  'fees': lazy(() => import('./fees')),
  'hr': lazy(() => import('./hr')),
  'transport': lazy(() => import('./transport')),
  'hostel': lazy(() => import('./hostel')),
  'security': lazy(() => import('./security')),
  'health': lazy(() => import('./health')),
  'library': lazy(() => import('./library')),
  'assets': lazy(() => import('./assets')),
  'communication': lazy(() => import('./communication')),
  'events': lazy(() => import('./events')),
  'certificates': lazy(() => import('./certificates')),
  'analytics': lazy(() => import('./analytics')),
  'integrations': lazy(() => import('./integrations')),
  'settings': lazy(() => import('./settings')),
  'audit-logs': lazy(() => import('./audit-logs')),
}