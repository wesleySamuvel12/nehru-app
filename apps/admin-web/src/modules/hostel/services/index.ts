import { hostelApi } from '@/role/hostel/api'
export const hostelService = { loadRooms: hostelApi.rooms, loadBeds: hostelApi.beds, loadAllocations: hostelApi.allocations }
