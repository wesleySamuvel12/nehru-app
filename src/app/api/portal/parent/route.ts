import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { json, err } from '@/lib/crud'

/* eslint-disable @typescript-eslint/no-explicit-any */

const DAY = 86400000

function dayKey(d: Date) { return d.toISOString().slice(0, 10) }

/** GET /api/portal/parent — one aggregated payload for the Parent Portal */
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (session.role !== 'PARENT') return err(403, 'This portal is only available to parent accounts.')
  if (!session.parentId) return err(403, 'Your account is not linked to a parent profile. Please contact the school office.')

  try {
    const parent = await db.parent.findUnique({ where: { id: session.parentId } })
    if (!parent) return err(404, 'Parent profile not found.')

    const children = await db.student.findMany({
      where: { parentId: session.parentId },
      include: { klass: true, section: true },
      orderBy: { firstName: 'asc' },
    })

    const since30 = new Date(Date.now() - 30 * DAY)
    const today = new Date(); today.setHours(0, 0, 0, 0)

    /* Shared lookups */
    const [subjects, exams, routes, stops, vehicles, announcements] = await Promise.all([
      db.subject.findMany({ select: { id: true, name: true, maxMarks: true } }),
      db.exam.findMany({ select: { id: true, name: true, resultPublished: true, status: true } }),
      db.route.findMany({ include: { vehicle: true } }),
      db.stop.findMany(),
      db.vehicle.findMany(),
      db.announcement.findMany({
        where: { status: 'PUBLISHED', audience: { in: ['PARENTS', 'ALL'] } },
        orderBy: { publishAt: 'desc' },
        take: 5,
      }),
    ])
    const subjectNameOf = new Map(subjects.map((s: any) => [s.id, s.name]))
    const examNameOf = new Map(exams.map((e: any) => [e.id, e.name]))
    const routeOf = new Map(routes.map((r: any) => [r.id, r]))
    const stopOf = new Map(stops.map((s: any) => [s.id, s]))
    const vehicleOf = new Map(vehicles.map((v: any) => [v.id, v]))

    const childPayloads = await Promise.all(children.map(async (s: any) => {
      const reportCard = await db.reportCard.findFirst({
        where: { studentId: s.id, published: true },
        orderBy: { generatedAt: 'desc' },
      })
      const [
        attRows, marks, invoices, homework, submissions,
        allocation, clinicVisits, health, payments,
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
          take: 3,
        }),
        db.submission.findMany({ where: { studentId: s.id } }),
        db.transportAllocation.findFirst({ where: { studentId: s.id, status: 'ACTIVE' } }),
        db.clinicVisit.findMany({ where: { studentId: s.id }, orderBy: { date: 'desc' }, take: 2 }),
        db.healthRecord.findUnique({ where: { studentId: s.id } }),
        db.payment.findMany({ where: { studentId: s.id }, orderBy: { paidAt: 'desc' }, take: 8 }),
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
          teacherName: h.teacherName, dueDate: h.dueDate, maxMarks: h.maxMarks,
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

      return {
        student: {
          id: s.id, admissionNo: s.admissionNo, rollNo: s.rollNo,
          firstName: s.firstName, lastName: s.lastName,
          photoUrl: s.photoUrl, house: s.house, bloodGroup: s.bloodGroup,
          classId: s.classId, className: s.klass?.name || null,
          sectionId: s.sectionId, sectionName: s.section?.name || null,
        },
        name: `${s.firstName} ${s.lastName}`,
        attendance,
        reportCard: reportCard ? {
          examName: examNameOf.get(reportCard.examId) || 'Examination',
          totalMarks: reportCard.totalMarks, obtained: reportCard.obtained,
          percentage: reportCard.percentage, grade: reportCard.grade, rank: reportCard.rank,
        } : null,
        subjectMarks, marksAvg,
        invoices: invoiceList,
        totalDue, nextDue,
        homework: homeworkView,
        transport,
        clinicVisits,
        health: health ? { allergies: health.allergies, bloodGroup: health.bloodGroup } : null,
        payments: payments.map((p: any) => ({
          receiptNo: p.receiptNo, amount: p.amount, method: p.method,
          status: p.status, paidAt: p.paidAt,
          invoiceNo: invoices.find((i: any) => i.id === p.invoiceId)?.invoiceNo || '—',
        })),
      }
    }))

    return json({
      parent: { id: parent.id, name: parent.name, relation: parent.relation, phone: parent.phone, email: parent.email },
      children: childPayloads,
      announcements,
      generatedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('[portal:parent]', e)
    return err(500, 'Unable to load the parent portal right now. Please try again.')
  }
}
