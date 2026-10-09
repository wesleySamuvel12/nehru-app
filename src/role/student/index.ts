import type { RoleDefinition } from '@/role/types'

export const studentRole: RoleDefinition = {
  role: 'STUDENT',
  label: 'Student',
  landingModule: 'student-portal',
}
export { default as StudentApplication } from './app/StudentApplication'
