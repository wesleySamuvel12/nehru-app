import { api } from '@/lib/api-client'
export const transportApi = { routes: () => api('/api/transport/routes'), vehicles: () => api('/api/transport/vehicles'), allocations: () => api('/api/transport/allocations') }
