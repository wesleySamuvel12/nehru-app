/** Expense CRUD — shared config (approve/reject stamps approver + notifies). */
import { defineCrud } from '@/lib/crud'
import { notifyRoles } from '@/lib/notify'

/* eslint-disable @typescript-eslint/no-explicit-any */

export const EXPENSE_CATEGORIES = ['SALARIES', 'UTILITIES', 'MAINTENANCE', 'SUPPLIES', 'TRANSPORT', 'EVENTS', 'OTHER']

export const expensesCrud = defineCrud({
  model: 'expense',
  module: 'fees',
  searchFields: ['title', 'vendor'],
  filterFields: ['status', 'category'],
  defaultSort: { field: 'date', dir: 'desc' },
  required: ['title', 'category', 'amount', 'date'],
  beforeSave: async (data: any, session, mode) => {
    data.title = String(data.title || '').trim()
    data.amount = Math.max(0, Number(data.amount) || 0)
    if (typeof data.description === 'string' && !data.description.trim()) data.description = null
    if (typeof data.vendor === 'string' && !data.vendor.trim()) data.vendor = null
    // Approve / Reject row actions PATCH only {status} — stamp the approver here.
    if (mode === 'update' && ['APPROVED', 'REJECTED', 'PAID'].includes(data.status)) {
      data.approvedBy = data.approvedBy || session.name
      data.approvedAt = new Date()
    }
    return data
  },
  afterUpdate: async (row: any, _session, before: any) => {
    if (before.status !== row.status && ['APPROVED', 'REJECTED', 'PAID'].includes(row.status)) {
      await notifyRoles(
        ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT'],
        `Expense ${row.status.toLowerCase()}`,
        `“${row.title}” (${row.category}) was ${row.status.toLowerCase()}${row.approvedBy ? ` by ${row.approvedBy}` : ''}.`,
        { type: row.status === 'REJECTED' ? 'WARNING' : 'SUCCESS' },
      )
    }
  },
})
