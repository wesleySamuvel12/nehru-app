import { type Role, normalizeRole } from '@/lib/rbac'
import type { RoleDefinition } from './types'
import { superAdminRole } from './super-admin'
import { schoolAdminRole } from './school-admin'
import { principalRole } from './principal'
import { teacherRole } from './teacher'
import { accountantRole } from './accountant'
import { hrRole } from './hr'
import { counsellorRole } from './counsellor'
import { librarianRole } from './librarian'
import { transportRole } from './transport'
import { wardenRole } from './hostel/warden'
import { nurseRole } from './health/nurse'
import { securityRole } from './security'
import { parentRole } from './parent'
import { studentRole } from './student'

export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  SUPER_ADMIN: superAdminRole,
  SCHOOL_ADMIN: schoolAdminRole,
  CEO_SECRETARY: { role: 'CEO_SECRETARY', label: 'CEO & Secretary', landingModule: 'dashboard' },
  CORRESPONDENT: { role: 'CORRESPONDENT', label: 'Correspondent', landingModule: 'dashboard' },
  PRINCIPAL: principalRole,
  HOD: { role: 'HOD', label: 'Head of Department', landingModule: 'dashboard' },
  ACADEMIC_COORDINATOR: { role: 'ACADEMIC_COORDINATOR', label: 'Academic Coordinator', landingModule: 'academics' },
  HEADMISTRESS: { role: 'HEADMISTRESS', label: 'Headmistress', landingModule: 'dashboard' },
  TEACHER: teacherRole,
  SUBSTITUTE: { role: 'SUBSTITUTE', label: 'Substitute Teacher', landingModule: 'academics' },
  ADMIN_EXECUTIVE: { role: 'ADMIN_EXECUTIVE', label: 'Admin Executive', landingModule: 'dashboard' },
  ACCOUNTANT: accountantRole,
  HR: hrRole,
  COUNSELLOR: counsellorRole,
  LIBRARIAN: librarianRole,
  TRANSPORT: transportRole,
  WARDEN: wardenRole,
  NURSE: nurseRole,
  SECURITY: securityRole,
  PARENT: parentRole,
  STUDENT: studentRole,
}

export function getRoleDefinition(role: string): RoleDefinition | undefined {
  const canonical = normalizeRole(role)
  return ROLE_DEFINITIONS[canonical]
}

export function getRoleLandingModule(role: string): string {
  return getRoleDefinition(role)?.landingModule || 'events'
}

export type { RoleDefinition } from './types'
