'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/erp/DataTable'
import { fmtDate } from '@/lib/format'
import { ASSET_CATEGORIES, ASSET_STATUSES, ASSET_CONDITIONS, CATEGORY_BADGE_MAP, CONDITION_BADGE_MAP, warrantyState } from './shared'

/* eslint-disable @typescript-eslint/no-explicit-any */

const titleize = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export default function RegisterTab() {
  return (
    <DataTable
      endpoint="api/assets/items"
      searchPlaceholder="Search name, tag, barcode…"
      exportEntity="assets"
      createLabel="Add Asset"
      defaultSort={{ sortBy: 'id', sortDir: 'desc' }}
      emptyTitle="No assets registered"
      emptyDescription="Register school assets — smart boards, lab equipment, furniture and devices — to track them."
      filters={[
        { key: 'category', label: 'Categories', options: ASSET_CATEGORIES.map((c) => ({ label: titleize(c), value: c })) },
        { key: 'status', label: 'Statuses', options: ASSET_STATUSES.map((s) => ({ label: titleize(s), value: s })) },
        { key: 'condition', label: 'Conditions', options: ASSET_CONDITIONS.map((c) => ({ label: titleize(c), value: c })) },
      ]}
      fields={[
        { name: 'assetTag', label: 'Asset Tag', type: 'text', required: true, placeholder: 'e.g. AST-1050', help: 'Unique — use the school numbering scheme.' },
        { name: 'name', label: 'Asset Name', type: 'text', required: true, placeholder: 'e.g. Smart Board 65" — Room 204' },
        { name: 'category', label: 'Category', type: 'select', required: true, options: ASSET_CATEGORIES.map((c) => ({ label: titleize(c), value: c })) },
        { name: 'status', label: 'Status', type: 'select', defaultValue: 'AVAILABLE', options: ASSET_STATUSES.map((s) => ({ label: titleize(s), value: s })) },
        { name: 'purchaseDate', label: 'Purchase Date', type: 'date' },
        { name: 'purchaseCost', label: 'Purchase Cost (₹)', type: 'number', min: 0 },
        { name: 'currentValue', label: 'Current Value (₹)', type: 'number', min: 0 },
        { name: 'location', label: 'Location', type: 'text', placeholder: 'e.g. Computer Lab 1' },
        { name: 'condition', label: 'Condition', type: 'select', defaultValue: 'GOOD', options: ASSET_CONDITIONS.map((c) => ({ label: titleize(c), value: c })) },
        { name: 'warrantyExpiry', label: 'Warranty Expiry', type: 'date' },
        { name: 'barcode', label: 'Barcode', type: 'text', help: 'Auto-generated (ASSET…) if left blank.' },
        { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
      ]}
      columns={[
        { key: 'assetTag', label: 'Tag', render: (row) => <span className="font-mono text-xs font-medium">{row.assetTag}</span> },
        { key: 'name', label: 'Asset', render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.name}</p>
            {row.location && <p className="truncate text-xs text-muted-foreground">{row.location}</p>}
          </div>
        ) },
        { key: 'category', label: 'Category', badge: true, badgeMap: CATEGORY_BADGE_MAP },
        { key: 'location', label: 'Location', hideOnMobile: true, render: (row) => row.location || <span className="text-muted-foreground">—</span> },
        { key: 'status', label: 'Status', badge: true },
        { key: 'condition', label: 'Condition', badge: true, badgeMap: CONDITION_BADGE_MAP },
        { key: 'purchaseCost', label: 'Purchased', money: true, hideOnMobile: true },
        { key: 'currentValue', label: 'Current', money: true },
        {
          key: 'warrantyExpiry', label: 'Warranty', date: true,
          render: (row) => {
            if (!row.warrantyExpiry) return <span className="text-muted-foreground">—</span>
            const state = warrantyState(row.warrantyExpiry)
            return (
              <Badge
                variant="outline"
                className={
                  state === 'expired'
                    ? 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                    : state === 'expiring'
                      ? 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                }
              >
                {fmtDate(row.warrantyExpiry)}
                {state === 'expired' ? ' · expired' : state === 'expiring' ? ' · soon' : ''}
              </Badge>
            )
          },
        },
      ]}
    />
  )
}
