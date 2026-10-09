import { accountantApi } from '@/role/accountant/api'
export const accountantService = { loadInvoices: accountantApi.invoices, loadPayments: accountantApi.payments, loadExpenses: accountantApi.expenses }
