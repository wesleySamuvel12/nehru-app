import { api } from '@/lib/api-client'

/** Backend boundary owned by the transport application. It uses the existing database-backed API contract. */
export const transportBackend = {
  TransportRoutes: () => api('/api/transport/routes'),
  TransportStops: () => api('/api/transport/stops'),
  TransportVehicles: () => api('/api/transport/vehicles'),
  TransportAllocations: () => api('/api/transport/allocations'),
  Students: () => api('/api/students'),
}
