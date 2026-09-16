'use client'

/**
 * Fees & Finance module — Dashboard | Invoices | Payments | Fee Structures |
 * Expenses | Budgets | Discounts & Scholarships.
 */
import * as React from 'react'
import { PageHeader } from '@/components/erp/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FinanceDashboard from './dashboard'
import InvoicesTable from './invoices'
import PaymentsTable from './payments'
import StructuresTable from './structures'
import ExpensesTable from './expenses'
import BudgetsTable from './budgets'
import DiscountsTable from './discounts'
import { useErp } from '@/lib/store'

export default function FeesModule() {
  const moduleParams = useErp(s => s.moduleParams)
  const [tab, setTab] = React.useState('dashboard')

  React.useEffect(() => {
    if (moduleParams?.tab && ['dashboard', 'invoices', 'payments', 'structures', 'expenses', 'budgets', 'discounts'].includes(moduleParams.tab)) {
      setTab(moduleParams.tab)
    }
  }, [moduleParams?.tab])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fees & Finance"
        subtitle="Billing, collections, school spend and budgets for Nehru International School."
        breadcrumbs={['Finance', 'Fees & Finance']}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="-mx-1 overflow-x-auto pb-1">
          <TabsList className="inline-flex h-auto min-w-max max-w-full gap-1 px-1">
            <TabsTrigger value="dashboard" className="min-h-10">Dashboard</TabsTrigger>
            <TabsTrigger value="invoices" className="min-h-10">Invoices</TabsTrigger>
            <TabsTrigger value="payments" className="min-h-10">Payments</TabsTrigger>
            <TabsTrigger value="structures" className="min-h-10">Fee Structures</TabsTrigger>
            <TabsTrigger value="expenses" className="min-h-10">Expenses</TabsTrigger>
            <TabsTrigger value="budgets" className="min-h-10">Budgets</TabsTrigger>
            <TabsTrigger value="discounts" className="min-h-10">Discounts & Scholarships</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-4">
          <FinanceDashboard onGoTo={setTab} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <InvoicesTable />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <PaymentsTable />
        </TabsContent>

        <TabsContent value="structures" className="mt-4">
          <StructuresTable />
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <ExpensesTable />
        </TabsContent>

        <TabsContent value="budgets" className="mt-4">
          <BudgetsTable />
        </TabsContent>

        <TabsContent value="discounts" className="mt-4">
          <DiscountsTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
