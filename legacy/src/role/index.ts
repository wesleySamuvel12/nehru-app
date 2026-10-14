import type { Role } from '@/lib/rbac'
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
  PRINCIPAL: principalRole,
  TEACHER: teacherRole,
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
  return ROLE_DEFINITIONS[role as Role]
}

export function getRoleLandingModule(role: string): string {
  return getRoleDefinition(role)?.landingModule || 'events'
}

export type { RoleDefinition } from './types'
