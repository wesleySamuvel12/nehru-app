import { librarianApi } from '@/role/librarian/api'
export const librarianService = { loadBooks: librarianApi.books, loadTransactions: librarianApi.transactions, loadReservations: librarianApi.reservations }
