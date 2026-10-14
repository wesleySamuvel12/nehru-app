import { api } from '@/lib/api-client'

/** Backend boundary owned by the parent application. It uses the existing database-backed API contract. */
export const parentBackend = {
  PortalParent: () => api('/api/portal/parent'),
  Attendance: () => api('/api/attendance'),
  Exams: () => api('/api/exams'),
  FeesInvoices: () => api('/api/fees/invoices'),
  TransportRoutes: () => api('/api/transport/routes'),
  CommunicationAnnouncements: () => api('/api/communication/announcements'),
}
