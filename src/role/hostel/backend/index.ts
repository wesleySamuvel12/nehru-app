import { api } from '@/lib/api-client'

/** Backend boundary owned by the hostel application. It uses the existing database-backed API contract. */
export const hostelBackend = {
  HostelRooms: () => api('/api/hostel/rooms'),
  HostelBeds: () => api('/api/hostel/beds'),
  HostelAllocations: () => api('/api/hostel/allocations'),
  HostelComplaints: () => api('/api/hostel/complaints'),
  HostelVisitors: () => api('/api/hostel/visitors'),
}
