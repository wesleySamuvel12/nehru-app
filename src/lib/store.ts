'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Session {
  sub: string
  name: string
  email: string
  role: string
  studentId?: string | null
  parentId?: string | null
  employeeId?: string | null
}

export interface ErpState {
  session: Session | null
  activeModule: string
  moduleParams: Record<string, string>
  academicYearId: string
  academicYearName: string
  schoolId: string
  schoolName: string
  sidebarOpen: boolean
  setSession: (s: Session | null) => void
  setModule: (key: string, params?: Record<string, string>) => void
  setAcademicYear: (id: string, name: string) => void
  setSchool: (id: string, name: string) => void
  setSidebarOpen: (open: boolean) => void
}

export const useErp = create<ErpState>()(
  persist(
    (set) => ({
      session: null,
      activeModule: 'dashboard',
      moduleParams: {},
      academicYearId: '',
      academicYearName: '',
      schoolId: 'main',
      schoolName: 'Greenwood International School',
      sidebarOpen: false,
      setSession: (s) => set({ session: s }),
      setModule: (key, params = {}) => set({ activeModule: key, moduleParams: params, sidebarOpen: false }),
      setAcademicYear: (id, name) => set({ academicYearId: id, academicYearName: name }),
      setSchool: (id, name) => set({ schoolId: id, schoolName: name }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: 'erp-ui-state', partialize: (s) => ({ academicYearId: s.academicYearId, academicYearName: s.academicYearName, schoolId: s.schoolId, schoolName: s.schoolName }) }
  )
)
