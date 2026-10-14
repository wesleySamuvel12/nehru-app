'use client'

import * as React from 'react'
import { PageHeader } from '@/components/erp/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileBadge, Award, QrCode } from 'lucide-react'
import RequestsTab from './requests'
import IssuedTab from './issued'
import VerifyTab from './verify'

export default function CertificatesModule() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Certificates"
        subtitle="Student certificate requests, issuance workflow and QR verification"
        breadcrumbs={['Engagement', 'Certificates']}
      />
      <Tabs defaultValue="requests">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="requests" className="gap-1.5"><FileBadge className="h-4 w-4" /> Requests</TabsTrigger>
          <TabsTrigger value="issued" className="gap-1.5"><Award className="h-4 w-4" /> Issued Certificates</TabsTrigger>
          <TabsTrigger value="verify" className="gap-1.5"><QrCode className="h-4 w-4" /> QR Verification</TabsTrigger>
        </TabsList>
        <TabsContent value="requests" className="mt-4">
          <RequestsTab />
        </TabsContent>
        <TabsContent value="issued" className="mt-4">
          <IssuedTab />
        </TabsContent>
        <TabsContent value="verify" className="mt-4">
          <VerifyTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
