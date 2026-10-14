import type { RoleDefinition } from '@/role/types'

export const accountantRole: RoleDefinition = {
  role: 'ACCOUNTANT',
  label: 'Accountant',
  landingModule: 'fees',
}
export { default as AccountantApplication } from './app/AccountantApplication'
