import type { RoleDefinition } from '@/role/types'

export const librarianRole: RoleDefinition = {
  role: 'LIBRARIAN',
  label: 'Librarian',
  landingModule: 'library',
}
export { default as LibrarianApplication } from './app/LibrarianApplication'
