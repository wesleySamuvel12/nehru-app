import { api } from '@/lib/api-client'

/** Backend boundary owned by the librarian application. It uses the existing database-backed API contract. */
export const librarianBackend = {
  LibraryBooks: () => api('/api/library/books'),
  LibraryTransactions: () => api('/api/library/transactions'),
  LibraryReservations: () => api('/api/library/reservations'),
  Students: () => api('/api/students'),
}
