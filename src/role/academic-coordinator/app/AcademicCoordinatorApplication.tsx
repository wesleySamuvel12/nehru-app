'use client'

import AcademicCoordinatorDashboard from '@/role/academic-coordinator/dashboard/AcademicCoordinatorDashboard'
import { AcademicCoordinatorLayout } from '@/role/academic-coordinator/layout/AcademicCoordinatorLayout'

export default function AcademicCoordinatorApplication() {
  return (
    <AcademicCoordinatorLayout>
      <AcademicCoordinatorDashboard />
    </AcademicCoordinatorLayout>
  )
}

