import type { RoleDefinition } from '@/role/types'

export const principalRole: RoleDefinition = {
  role: 'PRINCIPAL',
  label: 'Principal',
  landingModule: 'dashboard',
}
export { default as PrincipalApplication } from './app/PrincipalApplication'
