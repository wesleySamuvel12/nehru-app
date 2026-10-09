import { api } from '@/lib/api-client'

/** Backend boundary owned by the counsellor application. It uses the existing database-backed API contract. */
export const counsellorBackend = {
  AdmissionsLeads: () => api('/api/admissions/leads'),
  AdmissionsApplications: () => api('/api/admissions/applications'),
  AdmissionsCampaigns: () => api('/api/admissions/campaigns'),
  Students: () => api('/api/students'),
  CommunicationAnnouncements: () => api('/api/communication/announcements'),
}
