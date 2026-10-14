import { transportApi } from '@/role/transport/api'
export const transportService = { loadRoutes: transportApi.routes, loadVehicles: transportApi.vehicles, loadAllocations: transportApi.allocations }
