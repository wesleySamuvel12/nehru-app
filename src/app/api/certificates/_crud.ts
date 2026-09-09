import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'
import { notify, notifyRoles } from '@/lib/notify'


export const CERT_TITLES: Record<string, string> = {
  TRANSFER: 'Transfer Certificate',
  BONAFIDE: 'Bonafide Certificate',
  STUDY: 'Study Certificate',
  CONDUCT: 'Conduct Certificate',
  CHARACTER: 'Character Certificate',
  TRANSCRIPT: 'Academic Transcript',
  BIRTH: 'Date of Birth Certificate',
  REPORT_CARD: 'Report Card Copy',
}

/** Users to notify about a student's certificate: linked student/parent accounts + explicit requester. */
async function studentRecipients(studentId: string, requestedById?: string | null) {
  const student = await db.student.findUnique({ where: { id: studentId }, select: { id: true, parentId: true } })
  const or: any[] = []
  if (student?.id) or.push({ linkedStudentId: student.id })
  if (student?.parentId) or.push({ linkedParentId: student.parentId })
  if (requestedById) or.push({ id: requestedById })
  if (!or.length) return []
  const users = await db.user.findMany({ where: { status: 'ACTIVE', OR: or }, select: { id: true } })
  return [...new Map(users.map(u => [u.id, u])).values()]
}

/** Shared certificate-request CRUD config: workflow enforcement + auto-issue side effects. */
export const certificateRequestCrud = defineCrud({
  model: 'certificateRequest',
  module: 'certificates',
  searchFields: ['purpose', 'type', 'requestedBy'],
  filterFields: ['status', 'type', 'studentId'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  required: ['studentId', 'type', 'purpose'],
  beforeSave: (data: any, session: any, mode: 'create' | 'update') => {
    if (mode === 'create') {
      data.status = data.status || 'PENDING'
      data.requestedBy = data.requestedBy || session.name
      data.requestedById = data.requestedById || session.sub
    }
    if (data.status === 'VERIFIED' && !data.verifiedById) data.verifiedById = session.sub
    if (data.status === 'APPROVED') {
      data.approvedBy = data.approvedBy || session.name
      data.approvedById = data.approvedById || session.sub
      data.approvedAt = data.approvedAt || new Date()
    }
    if (data.status === 'ISSUED' && !data.issuedAt) data.issuedAt = new Date()
    return data
  },
  afterCreate: async (row: any, session: any) => {
    try {
      const label = CERT_TITLES[row.type] || row.type
      await notifyRoles(['PRINCIPAL', 'SCHOOL_ADMIN', 'SUPER_ADMIN'], 'New certificate request', `${row.requestedBy || session.name} requested a ${label} for a student.`, { link: 'certificates' })
      await notify({
        userId: session.sub,
        title: 'Certificate request submitted',
        message: `Your ${label} request has been received and is pending verification.`,
        type: 'INFO',
        link: 'certificates',
      })
    } catch (e) {
      console.error('[certificateRequest:notify]', e)
    }
  },
  afterUpdate: async (row: any, session: any, before: any) => {
    // Auto-issue: when the workflow reaches ISSUED, generate the official certificate record.
    if (row.status === 'ISSUED' && before.status !== 'ISSUED') {
      try {
        const existing = await db.certificate.findFirst({ where: { requestId: row.id } })
        if (existing) return
        const count = await db.certificate.count()
        const cert = await db.certificate.create({
          data: {
            requestId: row.id,
            studentId: row.studentId,
            type: row.type,
            certificateNo: `NIS/CERT/2025/${String(count + 1).padStart(3, '0')}`,
            title: CERT_TITLES[row.type] || 'Certificate',
            verifyCode: `VRF-${Math.floor(100000 + Math.random() * 900000)}`,
            issuedById: session.sub,
            issuedBy: session.name,
            issuedAt: new Date(),
            contentJson: JSON.stringify({ purpose: row.purpose || '', approvedBy: row.approvedBy || session.name }),
          },
        })
        const recipients = await studentRecipients(row.studentId, row.requestedById)
        if (recipients.length) {
          await db.notification.createMany({
            data: recipients.map(u => ({
              userId: u.id,
              title: 'Certificate issued',
              message: `Your ${cert.title} (${cert.certificateNo}) is ready. Verification code: ${cert.verifyCode}`,
              type: 'SUCCESS',
              link: 'certificates',
              channel: 'IN_APP',
            })),
          })
        }
        await notify({ userId: session.sub, title: 'Certificate issued', message: `${cert.title} ${cert.certificateNo} issued successfully.`, type: 'SUCCESS', link: 'certificates' })
      } catch (e) {
        console.error('[certificateRequest:issue]', e)
      }
    }
    if (row.status === 'REJECTED' && before.status !== 'REJECTED') {
      try {
        const recipients = await studentRecipients(row.studentId, row.requestedById)
        if (recipients.length) {
          await db.notification.createMany({
            data: recipients.map(u => ({
              userId: u.id,
              title: 'Certificate request rejected',
              message: `Your ${CERT_TITLES[row.type] || row.type} request was rejected. ${row.remarks || ''}`.trim(),
              type: 'WARNING',
              link: 'certificates',
            })),
          })
        }
      } catch (e) {
        console.error('[certificateRequest:reject]', e)
      }
    }
  },
})

/** Attach student display names to certificate request / certificate rows. */
export async function withStudentNames<T extends { studentId: string }>(rows: T[]): Promise<(T & { studentName: string; admissionNo: string | null })[]> {
  const ids = [...new Set(rows.map(r => r.studentId).filter(Boolean))]
  if (!ids.length) return rows.map(r => ({ ...r, studentName: 'Unknown student', admissionNo: null }))
  const students = await db.student.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true, admissionNo: true },
  })
  const map = new Map(students.map(s => [s.id, { name: `${s.firstName} ${s.lastName}`, admissionNo: s.admissionNo }]))
  return rows.map(r => {
    const s = map.get(r.studentId)
    return { ...r, studentName: s?.name || 'Unknown student', admissionNo: s?.admissionNo || null }
  })
}
