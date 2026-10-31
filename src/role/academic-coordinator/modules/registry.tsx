import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

const loading = () => null
const lazy = (loader: () => Promise<{ default: ComponentType }>) =>
  dynamic(loader, { loading, ssr: false })

export const ACADEMIC_COORDINATOR_MODULE_REGISTRY: Record<string, ComponentType> = {
  'dashboard': lazy(() => import('@/role/academic-coordinator/dashboard/AcademicCoordinatorDashboard')),
  'academics': lazy(() => import('@/role/principal/modules/academics')),
  'students': lazy(() => import('@/role/principal/modules/students')),
  'attendance': lazy(() => import('@/role/principal/modules/attendance')),
  'examinations': lazy(() => import('@/role/principal/modules/examinations')),
  'lms': lazy(() => import('@/role/principal/modules/lms')),
  'communication': lazy(() => import('@/role/principal/modules/communication')),
  'events': lazy(() => import('@/role/principal/modules/events')),
  'certificates': lazy(() => import('@/role/principal/modules/certificates')),
  'analytics': lazy(() => import('@/role/principal/modules/analytics')),
}

