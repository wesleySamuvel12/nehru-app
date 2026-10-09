'use client'

import * as React from 'react'
import { DataTable } from '@/components/erp/DataTable'
import { SectionCard } from '@/components/erp/ui'
import { Info, UtensilsCrossed } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const MENU: { day: string; breakfast: string; lunch: string; dinner: string }[] = [
  { day: 'Monday', breakfast: 'Poha, Banana, Milk', lunch: 'Rajma, Rice, Chapati, Salad', dinner: 'Paneer Bhurji, Chapati, Dal' },
  { day: 'Tuesday', breakfast: 'Idli, Sambar, Chutney', lunch: 'Chole, Rice, Chapati, Curd', dinner: 'Veg Pulao, Raita, Papad' },
  { day: 'Wednesday', breakfast: 'Upma, Fruit, Tea', lunch: 'Dal Tadka, Aloo Gobi, Rice', dinner: 'Egg Curry / Soya Curry, Chapati' },
  { day: 'Thursday', breakfast: 'Aloo Paratha, Curd', lunch: 'Sambar, Rice, Cabbage Poriyal', dinner: 'Veg Biryani, Onion Raita' },
  { day: 'Friday', breakfast: 'Dosa, Sambar, Chutney', lunch: 'Kadhi Pakora, Rice, Chapati', dinner: 'Noodles, Manchurian, Soup' },
  { day: 'Saturday', breakfast: 'Bread Butter, Omelette / Fruits', lunch: 'Mixed Veg Curry, Dal, Rice', dinner: 'Chole Bhature, Salad, Jalebi' },
  { day: 'Sunday', breakfast: 'Puri Bhaji, Jalebi', lunch: 'Biryani, Raita, Gulab Jamun', dinner: 'Khichdi, Kadhi, Pickle' },
]

const PURPOSE_MAP: Record<string, string> = {
  MEETING: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  DELIVERY: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  PARENT_PICKUP: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  VENDOR: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
  MAINTENANCE: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  OTHER: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
}

export default function VisitorsMessTab() {
  return (
    <div className="grid gap-4 xl:grid-cols-5">
      {/* Mess menu (sample) */}
      <SectionCard
        className="xl:col-span-2"
        title="Weekly Mess Menu"
        description={<span className="inline-flex items-center gap-1"><Info className="h-3 w-3" /> Sample menu for demo — replace with live mess data</span>}
        actions={<UtensilsCrossed className="h-4 w-4 text-muted-foreground" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Day</th>
                <th className="py-2 pr-3 font-medium">Breakfast</th>
                <th className="py-2 pr-3 font-medium">Lunch</th>
                <th className="py-2 font-medium">Dinner</th>
              </tr>
            </thead>
            <tbody>
              {MENU.map(m => (
                <tr key={m.day} className="border-b last:border-0 align-top">
                  <td className="py-2.5 pr-3 font-medium">{m.day}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{m.breakfast}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{m.lunch}</td>
                  <td className="py-2.5 text-muted-foreground">{m.dinner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Recent visitors (read-only, shared security feed) */}
      <SectionCard
        className="xl:col-span-3"
        title="Recent Hostel Visitors"
        description="Live feed from the security gate — read-only view"
      >
        <DataTable
          endpoint="api/security/visitors"
          allowCreate={false}
          allowEdit={false}
          allowDelete={false}
          hideToolbar
          defaultPageSize={8}
          pageSizeOptions={[8, 15]}
          defaultSort={{ sortBy: 'checkInAt', sortDir: 'desc' }}
          columns={[
            { key: 'name', label: 'Visitor', render: r => (
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.phone}</p>
              </div>
            ) },
            { key: 'purpose', label: 'Purpose', badge: true, badgeMap: PURPOSE_MAP },
            { key: 'personToMeet', label: 'To Meet', hideOnMobile: true },
            { key: 'checkInAt', label: 'Check-in', dateTime: true },
            { key: 'status', label: 'Status', badge: true },
          ]}
          emptyTitle="No visitors recorded"
          emptyDescription="Visitor entries from the security gate will appear here."
        />
      </SectionCard>
    </div>
  )
}
