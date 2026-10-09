'use client'

import * as React from 'react'
import { PageHeader } from '@/components/erp/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Megaphone, MessageSquare, LayoutTemplate, Send } from 'lucide-react'
import { useErp } from '@/lib/store'
import { COMM_MANAGEMENT } from './constants'
import AnnouncementsTab from './announcements'
import MessagingTab from './messaging'
import TemplatesTab from './templates'
import HistoryTab from './history'


export default function CommunicationModule() {
  const session = useErp(s => s.session)
  const role = session?.role || ''
  const canManage = COMM_MANAGEMENT.includes(role)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Communication"
        subtitle="Announcements, circulars, direct messaging, templates and delivery tracking"
        breadcrumbs={['Engagement', 'Communication']}
      />
      <Tabs defaultValue="announcements">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="announcements" className="gap-1.5">
            <Megaphone className="h-4 w-4" /> <span className="hidden sm:inline">Announcements &amp; Circulars</span><span className="sm:hidden">Announcements</span>
          </TabsTrigger>
          <TabsTrigger value="messaging" className="gap-1.5">
            <MessageSquare className="h-4 w-4" /> Messaging
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="templates" className="gap-1.5">
              <LayoutTemplate className="h-4 w-4" /> <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
          )}
          {canManage && (
            <TabsTrigger value="history" className="gap-1.5">
              <Send className="h-4 w-4" /> <span className="hidden sm:inline">Delivery History</span><span className="sm:hidden">History</span>
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="announcements" className="mt-4">
          <AnnouncementsTab />
        </TabsContent>
        <TabsContent value="messaging" className="mt-4">
          <MessagingTab />
        </TabsContent>
        {canManage && (
          <TabsContent value="templates" className="mt-4">
            <TemplatesTab />
          </TabsContent>
        )}
        {canManage && (
          <TabsContent value="history" className="mt-4">
            <HistoryTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
