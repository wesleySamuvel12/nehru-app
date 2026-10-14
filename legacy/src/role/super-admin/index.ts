import type { RoleDefinition } from '@/role/types'

export const superAdminRole: RoleDefinition = {
  role: 'SUPER_ADMIN',
  label: 'Super Admin',
  landingModule: 'dashboard',
}
