import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'
import { notifyRoles } from '@/lib/notify'


const OPTIONAL_NULL = ['classId', 'sectionId', 'parentId', 'dob', 'admissionDate']
const STATUS_VALUES = ['ACTIVE', 'ALUMNI', 'WITHDRAWN', 'TRANSFERRED', 'GRADUATED']

async function nextAdmissionNo(): Promise<string> {
  const count = await db.student.count()
  for (let n = count + 1; n < count + 500; n++) {
    const candidate = `GWS${String(n).padStart(5, '0')}`
    const exists = await db.student.findUnique({ where: { admissionNo: candidate }, select: { id: true } })
    if (!exists) return candidate
  }
  return `GWS${Date.now().toString().slice(-8)}`
}

const crud = defineCrud({
  model: 'student',
  module: 'students',
  searchFields: ['firstName', 'lastName', 'admissionNo'],
  filterFields: ['classId', 'sectionId', 'status', 'gender', 'parentId'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  required: ['firstName', 'lastName'],
  include: { parent: true, klass: true, section: true },
  beforeSave: async (data: any, _session, mode) => {
    const b = { ...data }
    // Trim core text fields
    for (const k of ['firstName', 'lastName', 'admissionNo', 'rollNo', 'phone', 'email', 'bloodGroup', 'house', 'club', 'category', 'religion']) {
      if (typeof b[k] === 'string') b[k] = b[k].trim()
    }
    // Auto-generate admission number when blank on create
    if (mode === 'create' && (!b.admissionNo || String(b.admissionNo).trim() === '')) {
      b.admissionNo = await nextAdmissionNo()
    }
    // Auto-generate barcode when missing
    if (mode === 'create' && (!b.barcode || String(b.barcode).trim() === '')) {
      let candidate = `STU${String(Date.now()).slice(-8)}`
      while (await db.student.findUnique({ where: { barcode: candidate }, select: { id: true } })) {
        candidate = `STU${String(Math.floor(Math.random() * 90000000) + 10000000)}`
      }
      b.barcode = candidate
    }
    // Defaults
    if (mode === 'create' && !b.gender) b.gender = 'MALE'
    if (mode === 'create' && !b.status) b.status = 'ACTIVE'
    if (b.status && !STATUS_VALUES.includes(b.status)) delete b.status
    // Empty strings → null for optional relations / dates
    for (const k of OPTIONAL_NULL) {
      if (b[k] === '' || b[k] === undefined) b[k] = null
    }
    // Never blank out a unique admissionNo via edit
    if (mode === 'update' && (!b.admissionNo || String(b.admissionNo).trim() === '')) delete b.admissionNo
    return b
  },
  afterCreate: async (row: any) => {
    await notifyRoles(
      ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL'],
      'New student enrolled',
      `${row.firstName} ${row.lastName} (${row.admissionNo}) was added to the student registry.`,
      { type: 'SUCCESS', link: 'students' }
    )
  },
})

export const GET = crud.list
export const POST = crud.create
