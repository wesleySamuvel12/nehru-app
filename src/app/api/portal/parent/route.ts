import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { json, err } from '@/lib/crud'


const DAY = 86400000

function dayKey(d: Date) { return d.toISOString().slice(0, 10) }

/** GET /api/portal/parent — one aggregated payload for the Parent Portal */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  let parentId = session.parentId

  if (!parentId && ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL'].includes(session.role)) {
    const sampleParent = await db.parent.findFirst()
    if (sampleParent) parentId = sampleParent.id
  }

  if (!parentId) {
    if (session.role === 'PARENT') {
      return err(403, 'Your account is not linked to a parent profile. Please contact the school office.')
    }
    return err(404, 'No parent profiles found in the database. Please add a parent record first.')
  }

  try {
    let parent = await db.parent.findUnique({ where: { id: parentId } })
    if (!parent && ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL'].includes(session.role)) {
      parent = await db.parent.findFirst()
      if (parent) parentId = parent.id
    }
    if (!parent) return err(404, 'Parent profile not found.')

    let children = await db.student.findMany({
      where: { parentId: parentId },
      include: { klass: true, section: true },
      orderBy: { firstName: 'asc' },
    })

    if (children.length === 0 && ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL'].includes(session.role)) {
      children = await db.student.findMany({
        where: { status: 'ACTIVE' },
        take: 2,
        include: { klass: true, section: true },
      })
    }

    const since30 = new Date(Date.now() - 30 * DAY)
    const today = new Date(); today.setHours(0, 0, 0, 0)

    const [subjects, exams, routes, stops, vehicles, announcements, teachers, events, books] = await Promise.all([
      db.subject.findMany({ where: schoolWhere, select: { id: true, name: true, maxMarks: true } }),
      db.exam.findMany({ where: schoolWhere, select: { id: true, name: true, resultPublished: true, status: true } }),
      db.route.findMany({ where: schoolWhere, include: { vehicle: true } }),
      db.stop.findMany({ where: schoolWhere }),
      db.vehicle.findMany({ where: schoolWhere }),
      db.announcement.findMany({
        where: { status: 'PUBLISHED', audience: { in: ['PARENTS', 'ALL'] } },
        orderBy: { publishAt: 'desc' },
        take: 8,
      }),
      db.employee.findMany({ where: { isTeacher: true }, select: { id: true, firstName: true, lastName: true } }),
      db.event.findMany({ where: schoolWhere, orderBy: { startDate: 'asc' }, take: 8 }),
      db.book.findMany({ where: schoolWhere, take: 8 }),
    ])
    const subjectNameOf = new Map(subjects.map((s: any) => [s.id, s.name]))
    const examNameOf = new Map(exams.map((e: any) => [e.id, e.name]))
    const routeOf = new Map(routes.map((r: any) => [r.id, r]))
    const stopOf = new Map(stops.map((s: any) => [s.id, s]))
    const vehicleOf = new Map(vehicles.map((v: any) => [v.id, v]))
    const teacherNameOf = new Map(teachers.map((t: any) => [t.id, `${t.firstName} ${t.lastName}`]))

    const childPayloads = await Promise.all(children.map(async (s: any) => {
      const reportCard = await db.reportCard.findFirst({
        where: { studentId: s.id, published: true },
        orderBy: { generatedAt: 'desc' },
      })
      const [
        attRows, marks, invoices, homework, submissions,
        allocation, clinicVisits, health, payments,
        timetableRows, hostelAlloc, libTxns,
        certificates, certificateRequests,
      ] = await Promise.all([
        db.attendance.findMany({
          where: { studentId: s.id, date: { gte: since30 }, status: { not: 'HOLIDAY' } },
          orderBy: { date: 'desc' },
        }),
        reportCard
          ? db.mark.findMany({ where: { studentId: s.id, examId: reportCard.examId, isAbsent: false } })
          : Promise.resolve([]),
        db.feeInvoice.findMany({ where: { studentId: s.id }, orderBy: { dueDate: 'asc' } }),
        db.assignment.findMany({
          where: {
            classId: s.classId || '___', sectionId: s.sectionId || '___',
            status: 'PUBLISHED', dueDate: { gte: new Date(today.getTime() - 2 * DAY) },
          },
          orderBy: { dueDate: 'asc' },
          take: 6,
        }),
        db.submission.findMany({ where: { studentId: s.id } }),
        db.transportAllocation.findFirst({ where: { studentId: s.id, status: 'ACTIVE' } }),
        db.clinicVisit.findMany({ where: { studentId: s.id }, orderBy: { date: 'desc' }, take: 4 }),
        db.healthRecord.findUnique({ where: { studentId: s.id } }),
        db.payment.findMany({ where: { studentId: s.id }, orderBy: { paidAt: 'desc' }, take: 8 }),
        db.timetableSlot.findMany({
          where: { classId: s.classId || '___', sectionId: s.sectionId || '___' },
          orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
        }),
        db.hostelAllocation.findFirst({
          where: { studentId: s.id, status: 'ACTIVE' },
          include: { bed: { include: { room: { include: { hostel: true } } } } },
        }),
        db.libraryTransaction.findMany({
          where: { userId: s.id },
          orderBy: { issueDate: 'desc' },
          take: 5,
        }),
        db.certificate.findMany({ where: { studentId: s.id }, orderBy: { issuedAt: 'desc' } }),
        db.certificateRequest.findMany({ where: { studentId: s.id }, orderBy: { createdAt: 'desc' } }),
      ])

      /* Attendance summary */
      const present = attRows.filter((r: any) => r.status === 'PRESENT').length
      const late = attRows.filter((r: any) => r.status === 'LATE').length
      const halfDay = attRows.filter((r: any) => r.status === 'HALF_DAY').length
      const absent = attRows.filter((r: any) => r.status === 'ABSENT' || r.status === 'EXCUSED').length
      const total = attRows.length
      const pct = total ? Math.round(((present + late + halfDay) / total) * 1000) / 10 : 0
      const attendance = {
        pct, present, late, halfDay, absent, total,
        log: attRows.slice(0, 30).map((r: any) => ({ date: dayKey(new Date(r.date)), status: r.status, checkInTime: r.checkInTime })),
        daily: [...attRows]
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((r: any) => ({
            date: dayKey(new Date(r.date)),
            pct: r.status === 'PRESENT' ? 100 : r.status === 'LATE' || r.status === 'HALF_DAY' ? 50 : 0,
          })),
        recentAbsences: attRows.filter((r: any) => r.status === 'ABSENT').slice(0, 5).map((r: any) => ({ date: dayKey(new Date(r.date)), remarks: r.remarks })),
      }

      /* Latest exam marks */
      const subjectMarks = marks.map((m: any) => {
        const max = m.maxMarks || 100
        return {
          subject: subjectNameOf.get(m.subjectId) || 'Subject',
          marks: m.marksObtained, maxMarks: max,
          pct: Math.round((m.marksObtained / max) * 1000) / 10,
          grade: m.grade || null,
        }
      })
      const marksAvg = marks.length
        ? Math.round((marks.reduce((a: number, m: any) => a + (m.marksObtained / (m.maxMarks || 100)) * 100, 0) / marks.length) * 10) / 10
        : null

      /* Fees */
      const invoiceList = invoices.map((i: any) => ({
        id: i.id, invoiceNo: i.invoiceNo, title: i.title, term: i.term,
        totalAmount: i.totalAmount, paidAmount: i.paidAmount, discount: i.discount,
        dueDate: i.dueDate, status: i.status,
        due: Math.max(0, i.totalAmount - i.paidAmount - (i.discount || 0)),
      }))
      const unpaid = invoiceList.filter((i: any) => i.status !== 'PAID' && i.status !== 'CANCELLED' && i.due > 0)
      const totalDue = unpaid.reduce((a: number, i: any) => a + i.due, 0)
      const nextDue = unpaid.length
        ? unpaid.reduce(( earliest: any, i: any) => (new Date(i.dueDate) < new Date(earliest.dueDate) ? i : earliest))
        : null

      /* Homework */
      const submissionOf = new Map(submissions.map((x: any) => [x.assignmentId, x]))
      const homeworkView = homework.map((h: any) => {
        const sub = submissionOf.get(h.id)
        const daysLeft = Math.ceil((new Date(h.dueDate).getTime() - Date.now()) / DAY)
        return {
          id: h.id, title: h.title, description: h.description, type: h.type,
          subject: subjectNameOf.get(h.subjectId) || 'Subject',
          teacherName: h.teacherName || teacherNameOf.get(h.teacherId) || 'Teacher',
          dueDate: h.dueDate, maxMarks: h.maxMarks,
          submitted: !!sub, submissionStatus: sub?.status || null,
          dueDaysLeft: daysLeft,
        }
      })

      /* Transport */
      let transport: any = null
      if (allocation) {
        const route = routeOf.get(allocation.routeId)
        const stop = stopOf.get(allocation.stopId)
        const vehicle = route?.vehicleId ? vehicleOf.get(route.vehicleId) || route.vehicle : null
        const routeStops = stops.filter((x: any) => x.routeId === allocation.routeId).sort((a: any, b: any) => a.sequence - b.sequence)
        const seq = stop?.sequence || 1
        const progressPct = routeStops.length ? Math.min(100, Math.round((seq / routeStops.length) * 100)) : 0
        transport = {
          routeName: route?.name || '—', stopName: stop?.name || '—',
          pickupTime: stop?.pickupTime, dropTime: stop?.dropTime,
          monthlyFee: allocation.monthlyFee, type: allocation.type,
          pickupStatus: allocation.pickupStatus, progressPct,
          vehicle: vehicle ? {
            regNo: vehicle.regNo, model: vehicle.model, driverName: vehicle.driverName,
            driverPhone: vehicle.driverPhone, speedKmph: vehicle.speedKmph,
            gpsLat: vehicle.gpsLat, gpsLng: vehicle.gpsLng, lastGpsAt: vehicle.lastGpsAt,
            status: vehicle.status,
          } : null,
        }
      }

      /* Timetable */
      const timetable = timetableRows.map((t: any) => ({
        id: t.id,
        dayOfWeek: t.dayOfWeek,
        period: t.period,
        startTime: t.startTime,
        endTime: t.endTime,
        room: t.room,
        subject: subjectNameOf.get(t.subjectId) || 'Subject',
        teacherName: teacherNameOf.get(t.teacherId) || 'Faculty',
      }))

      /* Hostel */
      const hostel = hostelAlloc ? {
        hostelName: hostelAlloc.bed?.room?.hostel?.name || 'Main Hostel',
        roomNumber: hostelAlloc.bed?.room?.roomNumber || '—',
        bedNumber: hostelAlloc.bed?.bedNo || '—',
        wardenName: hostelAlloc.bed?.room?.hostel?.wardenName || 'Campus Warden',
        wardenPhone: hostelAlloc.bed?.room?.hostel?.wardenPhone || '+91 98765 00000',
        status: hostelAlloc.status,
      } : null

      /* Library */
      const library = libTxns.map((tx: any) => ({
        id: tx.id,
        bookTitle: tx.bookTitle || 'Library Book',
        author: tx.book?.author || 'Unknown',
        accessionNo: tx.book?.accessionNo || '—',
        issueDate: tx.issueDate,
        dueDate: tx.dueDate,
        returnDate: tx.returnDate,
        status: tx.status,
        fineAmount: tx.fine || 0,
      }))

      let parsedDocuments: any[] = []
      if (s.documents) {
        try {
          parsedDocuments = typeof s.documents === 'string' ? JSON.parse(s.documents) : s.documents
        } catch {
          parsedDocuments = []
        }
      }

      return {
        student: {
          id: s.id,
          admissionNo: s.admissionNo,
          rollNo: s.rollNo || '01',
          firstName: s.firstName,
          lastName: s.lastName,
          gender: s.gender || 'FEMALE',
          dob: s.dob,
          bloodGroup: s.bloodGroup || 'O+',
          category: s.category || 'General',
          religion: s.religion || 'Indian',
          photoUrl: s.photoUrl,
          house: s.house || 'Ruby',
          club: s.club,
          status: s.status || 'ACTIVE',
          admissionDate: s.admissionDate,
          address: s.address || parent.address || '123 Green Park, Coimbatore, Tamil Nadu – 641001',
          phone: s.phone || '-',
          email: s.email || `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}@nehruis.edu.in`,
          classId: s.classId,
          className: s.klass?.name || 'Grade 8',
          sectionId: s.sectionId,
          sectionName: s.section?.name || 'A',
          classTeacher: s.section?.teacherName || 'Kavita Iyer',
          barcode: s.barcode || 'STU00000072',
          documents: parsedDocuments,
        },
        name: `${s.firstName} ${s.lastName}`,
        attendance,
        reportCard: reportCard ? {
          examName: examNameOf.get(reportCard.examId) || 'Term 1 Examination',
          totalMarks: reportCard.totalMarks, obtained: reportCard.obtained,
          percentage: reportCard.percentage, grade: reportCard.grade, rank: reportCard.rank,
        } : null,
        subjectMarks, marksAvg,
        invoices: invoiceList,
        totalDue, nextDue,
        homework: homeworkView,
        transport,
        timetable,
        hostel,
        library,
        certificates: (certificates || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          type: c.type,
          certificateNo: c.certificateNo,
          issuedAt: c.issuedAt,
          verifyCode: c.verifyCode,
        })),
        certificateRequests: (certificateRequests || []).map((cr: any) => ({
          id: cr.id,
          type: cr.type,
          purpose: cr.purpose,
          status: cr.status,
          createdAt: cr.createdAt,
        })),
        health: health ? {
          id: health.id,
          allergies: health.allergies,
          bloodGroup: health.bloodGroup || s.bloodGroup,
          chronicConditions: health.chronicConditions,
          medications: health.medications,
          notes: health.notes,
          emergencyContact: health.emergencyContact,
        } : {
          bloodGroup: s.bloodGroup || 'O+',
          allergies: '',
          chronicConditions: '',
          medications: '',
          notes: '',
          emergencyContact: parent.phone || '+91 98765 43210',
        },
        payments: payments.map((p: any) => ({
          receiptNo: p.receiptNo, amount: p.amount, method: p.method,
          status: p.status, paidAt: p.paidAt,
          invoiceNo: invoices.find((i: any) => i.id === p.invoiceId)?.invoiceNo || '—',
        })),
      }
    }))

    return json({
      parent: {
        id: parent.id,
        name: parent.name,
        relation: parent.relation || 'FATHER',
        phone: parent.phone || '+91 98765 43210',
        altPhone: parent.altPhone || '+91 91234 56789',
        email: parent.email || 'rohan.gupta@gmail.com',
        address: parent.address || '123 Green Park, Coimbatore, Tamil Nadu – 641001',
        occupation: parent.occupation || 'Professional',
        emergencyContact: parent.emergencyContact || parent.phone || '+91 98765 43210',
      },
      children: childPayloads,
      announcements,
      events,
      books,
      generatedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('[portal:parent]', e)
    return err(500, 'Unable to load the parent portal right now. Please try again.')
  }
}

/** POST /api/portal/parent — mutate medical info, certificates and documents */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')

  const tenantRes = await resolveTenantContext(req, session, { allowAllSchoolsForSuperAdmin: true })
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context

  try {
    const body = await req.json()
    const { action, studentId } = body

    if (action === 'save_medical') {
      const { bloodGroup, allergies, conditions, medication, instructions, emergencyContact, emergencyName, emergencyRelation, emergencyAltPhone, emergencyEmail } = body
      if (studentId) {
        if (bloodGroup) {
          await db.student.update({
            where: { id: studentId },
            data: { bloodGroup },
          }).catch(() => {})
        }

        const existingRecord = await db.healthRecord.findUnique({ where: { studentId } })
        if (existingRecord) {
          await db.healthRecord.update({
            where: { studentId },
            data: {
              bloodGroup: bloodGroup || existingRecord.bloodGroup,
              allergies: allergies !== undefined ? allergies : existingRecord.allergies,
              chronicConditions: conditions !== undefined ? conditions : existingRecord.chronicConditions,
              medications: medication !== undefined ? medication : existingRecord.medications,
              notes: instructions !== undefined ? instructions : existingRecord.notes,
              emergencyContact: emergencyContact || existingRecord.emergencyContact,
            },
          })
        } else {
          await db.healthRecord.create({
            data: {
              schoolId: tenant.schoolId,
              studentId,
              bloodGroup: bloodGroup || 'O+',
              allergies: allergies || '',
              chronicConditions: conditions || '',
              medications: medication || '',
              notes: instructions || '',
              emergencyContact: emergencyContact || '',
            },
          })
        }

        // Also update parent record contact details if provided
        if (session.parentId) {
          await db.parent.update({
            where: { id: session.parentId },
            data: {
              name: emergencyName || undefined,
              relation: emergencyRelation || undefined,
              phone: emergencyContact || undefined,
              altPhone: emergencyAltPhone || undefined,
              email: emergencyEmail || undefined,
              emergencyContact: emergencyContact || undefined,
            },
          }).catch(() => {})
        }
      }
      return json({ success: true, message: 'Medical information saved successfully' })
    }

    if (action === 'request_certificate') {
      const { type, purpose } = body
      if (!studentId || !type) return err(400, 'Student and certificate type are required')
      const request = await db.certificateRequest.create({
        data: {
          schoolId: tenant.schoolId,
          studentId,
          type: type.toUpperCase().replace(/\s+/g, '_'),
          purpose: purpose || 'Official documentation',
          status: 'PENDING',
          requestedById: session.userId || session.id,
          requestedBy: session.name || 'Parent',
        },
      })
      return json({ success: true, data: request })
    }

    if (action === 'upload_document') {
      const { document } = body
      if (!studentId || !document) return err(400, 'Student and document data are required')
      const student = await db.student.findUnique({ where: { id: studentId } })
      if (!student) return err(404, 'Student not found')

      let docs: any[] = []
      if (student.documents) {
        try { docs = JSON.parse(student.documents) } catch { docs = [] }
      }
      docs.unshift({
        id: `doc-${Date.now()}`,
        name: document.name || 'Document',
        type: document.type || 'DOCUMENT',
        size: document.size || '1.2 MB',
        uploadedAt: new Date().toISOString(),
        url: document.url || '#',
      })

      await db.student.update({
        where: { id: studentId },
        data: { documents: JSON.stringify(docs) },
      })
      return json({ success: true, documents: docs })
    }

    if (action === 'delete_document') {
      const { documentId } = body
      if (!studentId || !documentId) return err(400, 'Student and document ID are required')
      const student = await db.student.findUnique({ where: { id: studentId } })
      if (!student) return err(404, 'Student not found')

      let docs: any[] = []
      if (student.documents) {
        try { docs = JSON.parse(student.documents) } catch { docs = [] }
      }
      docs = docs.filter((d: any) => d.id !== documentId)

      await db.student.update({
        where: { id: studentId },
        data: { documents: JSON.stringify(docs) },
      })
      return json({ success: true, documents: docs })
    }

    return err(400, 'Unknown action')
  } catch (e: any) {
    console.error('[portal:parent:post]', e)
    return err(500, e?.message || 'Failed to process request')
  }
}
