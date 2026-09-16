import { db } from '@/lib/db'
import { defineCrud, CrudConfig } from '@/lib/crud'


/** Shared Employee CRUD config — reused by /api/employees and /api/employees/teachers */
export function makeEmployeeConfig(extra?: Partial<CrudConfig>): CrudConfig {
  return {
    model: 'employee',
    module: 'teachers',
    searchFields: ['firstName', 'lastName', 'employeeNo', 'phone'],
    filterFields: ['departmentId', 'status'],
    defaultSort: { field: 'employeeNo', dir: 'asc' },
    required: ['firstName', 'lastName', 'designation'],
    include: { department: true },
    beforeSave: async (data: any, _session, mode) => {
      const b = { ...data }
      for (const k of ['firstName', 'lastName', 'employeeNo', 'designation', 'phone', 'email', 'qualification', 'specialization', 'bankAccount']) {
        if (typeof b[k] === 'string') b[k] = b[k].trim()
      }
      // Auto-generate employee number when blank on create
      if (mode === 'create' && (!b.employeeNo || String(b.employeeNo).trim() === '')) {
        const count = await db.employee.count()
        let n = count + 1
        let candidate = `EMP${String(n).padStart(4, '0')}`
        while (await db.employee.findUnique({ where: { employeeNo: candidate }, select: { id: true } })) {
          n++
          candidate = `EMP${String(n).padStart(4, '0')}`
        }
        b.employeeNo = candidate
      }
      if (mode === 'update' && (!b.employeeNo || String(b.employeeNo).trim() === '')) delete b.employeeNo
      // Defaults
      if (mode === 'create' && !b.gender) b.gender = 'MALE'
      if (mode === 'create' && !b.employmentType) b.employmentType = 'FULL_TIME'
      if (mode === 'create' && !b.status) b.status = 'ACTIVE'
      if (mode === 'create' && b.isTeacher === undefined) b.isTeacher = false
      if (b.employmentType && !['FULL_TIME', 'PART_TIME', 'CONTRACT'].includes(b.employmentType)) delete b.employmentType
      if (b.status && !['ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED'].includes(b.status)) delete b.status
      // Booleans / numbers
      b.isTeacher = b.isTeacher === true || b.isTeacher === 'true'
      b.salary = b.salary === null || b.salary === undefined || b.salary === '' ? 0 : Number(b.salary) || 0
      // Empty strings → null for optional relations / dates / text
      for (const k of ['departmentId', 'dob', 'joiningDate', 'contractEnd', 'visaExpiry', 'licenseExpiry', 'certExpiry', 'email', 'phone', 'qualification', 'specialization', 'address', 'bankAccount']) {
        if (b[k] === '' || b[k] === undefined) b[k] = null
      }
      return b
    },
    ...extra,
  }
}
