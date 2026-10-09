import type { RoleDefinition } from '@/role/types'

export const securityRole: RoleDefinition = {
  role: 'SECURITY',
  label: 'Security Staff',
  landingModule: 'security',
}
export { default as SecurityApplication } from './app/SecurityApplication'
