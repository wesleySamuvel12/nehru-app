'use client'

import * as React from 'react'
import { PageHeader } from '@/components/erp/ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import CatalogueTab from './CatalogueTab'
import IssueReturnTab from './IssueReturnTab'
import TransactionsTab from './TransactionsTab'
import ReservationsTab from './ReservationsTab'
import ReportsTab from './ReportsTab'
import { useErp } from '@/lib/store'

export default function LibraryModule() {
  const moduleParams = useErp(s => s.moduleParams)
  const [tab, setTab] = React.useState('catalogue')

  React.useEffect(() => {
    if (moduleParams?.tab && ['catalogue', 'circulation', 'transactions', 'reservations', 'reports'].includes(moduleParams.tab)) {
      setTab(moduleParams.tab)
    }
  }, [moduleParams?.tab])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Library"
        subtitle="Catalogue, circulation desk, reservations and reading insights"
      />
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
          <TabsTrigger value="circulation">Issue &amp; Return</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="catalogue" className="mt-2">
          <CatalogueTab />
        </TabsContent>
        <TabsContent value="circulation" className="mt-2">
          <IssueReturnTab />
        </TabsContent>
        <TabsContent value="transactions" className="mt-2">
          <TransactionsTab />
        </TabsContent>
        <TabsContent value="reservations" className="mt-2">
          <ReservationsTab />
        </TabsContent>
        <TabsContent value="reports" className="mt-2">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
