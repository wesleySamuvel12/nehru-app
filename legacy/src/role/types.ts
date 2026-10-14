import type { Role } from '@/lib/rbac'

export type RoleDefinition = {
  role: Role
  label: string
  landingModule: string
}
