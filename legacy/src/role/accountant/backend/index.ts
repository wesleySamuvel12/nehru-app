import { api } from '@/lib/api-client'

/** Backend boundary owned by the accountant application. It uses the existing database-backed API contract. */
export const accountantBackend = {
  Dashboard: () => api('/api/dashboard'),
  FeesInvoices: () => api('/api/fees/invoices'),
  FeesPayments: () => api('/api/fees/payments'),
  FeesExpenses: () => api('/api/fees/expenses'),
  FeesBudgets: () => api('/api/fees/budgets'),
}
