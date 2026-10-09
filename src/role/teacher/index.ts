import type { RoleDefinition } from '@/role/types'

export const teacherRole: RoleDefinition = {
  role: 'TEACHER',
  label: 'Teacher',
  landingModule: 'academics',
}
export { default as TeacherApplication } from './app/TeacherApplication'
