import type { RoleDefinition } from '@/role/types'

export const parentRole: RoleDefinition = {
  role: 'PARENT',
  label: 'Parent',
  landingModule: 'parent-portal',
}
export { default as ParentApplication } from './app/ParentApplication'
