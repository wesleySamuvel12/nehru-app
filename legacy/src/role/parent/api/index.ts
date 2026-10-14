import { api } from '@/lib/api-client'
export const parentApi = { portal: () => api('/api/portal/parent'), attendance: () => api('/api/attendance'), invoices: () => api('/api/fees/invoices') }
