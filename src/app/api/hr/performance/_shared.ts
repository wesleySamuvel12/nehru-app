/** Performance Review CRUD — shared config (resolves employeeName, notifies employee). */
import { defineCrud } from '@/lib/crud'
import { db } from '@/lib/db'
import { notify } from '@/lib/notify'

/* eslint-disable @typescript-eslint/no-explicit-any */

export const performanceCrud = defineCrud({
  model: 'performanceReview',
  module: 'hr',
  searchFields: ['employeeName', 'period', 'reviewerName'],
  filterFields: ['status', 'employeeId'],
  defaultSort: { field: 'createdAt', dir: 'desc' },
  required: ['employeeId', 'period'],
  beforeSave: async (data: any) => {
    // employeeName always resolved from the employee record
    if (data.employeeId) {
      const emp = await db.employee.findUnique({
        where: { id: String(data.employeeId) },
        select: { firstName: true, lastName: true },
      })
      if (emp) data.employeeName = `${emp.firstName} ${emp.lastName}`
    }
    if (data.score !== undefined && data.score !== null && data.score !== '') {
      data.score = Math.min(5, Math.max(0, Number(data.score)))
    }
    for (const k of ['goals', 'strengths', 'improvements', 'training', 'reviewerName']) {
      if (typeof data[k] === 'string' && !data[k].trim()) data[k] = null
    }
    return data
  },
  afterCreate: async (row: any) => {
    if (row.status === 'SUBMITTED') await notifyEmployee(row)
  },
  afterUpdate: async (row: any, _session, before: any) => {
    if (before.status !== row.status && ['SUBMITTED', 'ACKNOWLEDGED'].includes(row.status)) {
      await notifyEmployee(row)
    }
  },
})

async function notifyEmployee(row: any) {
  try {
    const user = await db.user.findFirst({ where: { linkedEmployeeId: row.employeeId }, select: { id: true } })
    if (!user) return
    await notify({
      userId: user.id,
      title: row.status === 'ACKNOWLEDGED' ? 'Review acknowledged' : 'Performance review available',
      message: `Your review for ${row.period || 'the current period'} is ${row.status === 'ACKNOWLEDGED' ? 'acknowledged' : 'submitted'}${row.score != null ? ` — score ${row.score}/5` : ''}.`,
      type: 'INFO',
      link: 'hr',
    })
  } catch (e) {
    console.error('[performance:notify]', e)
  }
}
