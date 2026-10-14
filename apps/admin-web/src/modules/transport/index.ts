import type { RoleDefinition } from '@/role/types'

export const transportRole: RoleDefinition = {
  role: 'TRANSPORT',
  label: 'Transport Manager',
  landingModule: 'transport',
}
export { default as TransportApplication } from './app/TransportApplication'
