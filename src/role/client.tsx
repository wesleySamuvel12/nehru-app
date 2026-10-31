'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import type { Role } from '@/lib/rbac'

const loading = () => null
const lazy = (loader: () => Promise<{ default: ComponentType }>) => dynamic(loader, { loading, ssr: false })

/** Role-owned application entries. Shared backend/domain infrastructure is injected below each app. */
export const ROLE_APPLICATIONS: Record<Role, ComponentType> = {
  SUPER_ADMIN: lazy(() => import('./super-admin/app/AdminApplication')),
  SCHOOL_ADMIN: lazy(() => import('./school-admin/app/SchoolAdminApplication')),
  CEO_SECRETARY: lazy(() => import('./principal/app/PrincipalApplication')),
  CORRESPONDENT: lazy(() => import('./principal/app/PrincipalApplication')),
  PRINCIPAL: lazy(() => import('./principal/app/PrincipalApplication')),
  HOD: lazy(() => import('./hod/app/HODApplication')),
  ACADEMIC_COORDINATOR: lazy(() => import('./academic-coordinator/app/AcademicCoordinatorApplication')),
  HEADMISTRESS: lazy(() => import('./principal/app/PrincipalApplication')),
  TEACHER: lazy(() => import('./teacher/app/TeacherApplication')),
  SUBSTITUTE: lazy(() => import('./teacher/app/TeacherApplication')),
  ADMIN_EXECUTIVE: lazy(() => import('./school-admin/app/SchoolAdminApplication')),
  ADMISSION_ADMIN: lazy(() => import('./counsellor/app/CounsellorApplication')),
  ACCOUNTANT: lazy(() => import('./accountant/app/AccountantApplication')),
  HR: lazy(() => import('./hr/app/HRApplication')),
  LIBRARIAN: lazy(() => import('./librarian/app/LibrarianApplication')),
  TRANSPORT: lazy(() => import('./transport/app/TransportApplication')),
  WARDEN: lazy(() => import('./hostel/app/HostelApplication')),
  PARENT: lazy(() => import('./parent/app/ParentApplication')),
  STUDENT: lazy(() => import('./student/app/StudentApplication')),
}
