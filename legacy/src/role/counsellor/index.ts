import type { RoleDefinition } from '@/role/types'

export const counsellorRole: RoleDefinition = {
  role: 'COUNSELLOR',
  label: 'Admission Counsellor',
  landingModule: 'admissions',
}
export { default as CounsellorApplication } from './app/CounsellorApplication'
