import { api } from '@/lib/api-client'
export const librarianApi = { books: () => api('/api/library/books'), transactions: () => api('/api/library/transactions'), reservations: () => api('/api/library/reservations') }
