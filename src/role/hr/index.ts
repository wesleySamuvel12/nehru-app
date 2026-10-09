import type { RoleDefinition } from '@/role/types'

export const hrRole: RoleDefinition = {
  role: 'HR',
  label: 'HR Manager',
  landingModule: 'hr',
}
export { default as HRApplication } from './app/HRApplication'
