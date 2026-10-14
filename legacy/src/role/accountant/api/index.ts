import { api } from '@/lib/api-client'
export const accountantApi = { invoices: () => api('/api/fees/invoices'), payments: () => api('/api/fees/payments'), expenses: () => api('/api/fees/expenses') }
