import { api } from '@/lib/api-client'
export const hostelApi = { rooms: () => api('/api/hostel/rooms'), beds: () => api('/api/hostel/beds'), allocations: () => api('/api/hostel/allocations') }
