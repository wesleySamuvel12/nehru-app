'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useErp } from '@/lib/store'
import { NAV_ITEMS, can, ROLE_LABELS } from '@/lib/rbac'
import { api, clearToken } from '@/lib/api-client'
import { initials } from '@/lib/format'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BrandLogo } from '@/components/erp/brand'
import {
  LayoutDashboard, GraduationCap, UserPlus, Users, Briefcase, BookOpen, MonitorPlay, CalendarCheck,
  ClipboardList, Wallet, BadgeCheck, Bus, Building2, ShieldCheck, HeartPulse, Library, Boxes,
  Megaphone, CalendarDays, FileBadge, BarChart3, Plug, Settings, ScrollText, Search,
  PanelLeftClose, PanelLeftOpen, LogOut, ChevronDown, ChevronRight, User
} from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, GraduationCap, UserPlus, Users, Briefcase, BookOpen, MonitorPlay, CalendarCheck,
  ClipboardList, Wallet, BadgeCheck, Bus, Building2, ShieldCheck, HeartPulse, Library, Boxes,
  Megaphone, CalendarDays, FileBadge, BarChart3, Plug, Settings, ScrollText,
}

const NAV_GROUPS = ['Overview', 'Operations', 'Academics', 'Finance', 'Engagement', 'System']

export function DynamicSidebar({
  onNavigate,
  collapsed,
  onToggleCollapse,
}: {
  onNavigate?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}) {
  const { session, activeModule, setModule, setSession } = useErp()
  const [filterQuery, setFilterQuery] = React.useState('')

  if (!session) return null

  const role = session.role || 'SUPER_ADMIN'

  // Filter items based on user's authorized role permissions & item.roles
  const authorizedItems = NAV_ITEMS.filter(item => {
    if (item.roles && !item.roles.includes(role) && !(role === 'SUPER_ADMIN' && item.key === 'parent-portal')) {
      return false
    }
    return can(role, item.key)
  })

  // Apply search query filter if user types in sidebar search
  const filteredItems = authorizedItems.filter(item => {
    if (!filterQuery.trim()) return true
    const q = filterQuery.toLowerCase()
    return item.label.toLowerCase().includes(q)
  })

  const handleNavClick = (itemKey: string) => {
    setModule(itemKey)
    onNavigate?.()
  }

  const handleLogout = async () => {
    try { await api('/api/auth/logout', { method: 'POST' }) } catch { }
    clearToken()
    setSession(null)
    window.location.reload()
  }

  return (
    <TooltipProvider delayDuration={collapsed ? 0 : 500}>
      <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground selection:bg-primary/20">
        
        {/* Brand Header */}
        <div className={cn('flex h-15 shrink-0 items-center border-b px-4 transition-all duration-300', collapsed ? 'justify-center px-0' : 'justify-between')}>
          <BrandLogo compact={collapsed} size={collapsed ? 'sm' : 'md'} />
          
          {onToggleCollapse && !collapsed && (
            <button
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="rounded-lg p-1.5 text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}

          {onToggleCollapse && collapsed && (
            <button
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              className="absolute left-1/2 top-[54px] z-20 -translate-x-1/2 rounded-full border bg-background p-1 text-muted-foreground shadow-md transition-all hover:scale-110 hover:text-foreground"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* User Role Profile Header */}
        {!collapsed && (
          <div className="border-b bg-muted/30 px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 text-xs font-bold text-white shadow-sm">
                {initials(session.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground">{session.name}</p>
                <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary">
                  {ROLE_LABELS[role] || role}
                </span>
              </div>
            </div>

            {/* Nav Filter Search Input */}
            <div className="relative mt-2.5">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Filter navigation..."
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                className="h-8 w-full rounded-lg border border-border/60 bg-background/80 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Navigation Item Tree */}
        <nav className={cn('flex-1 space-y-4 overflow-y-auto overflow-x-hidden py-3', collapsed ? 'px-2' : 'px-3')} aria-label="Main navigation">
          {NAV_GROUPS.map(group => {
            const groupItems = filteredItems.filter(i => i.group === group)
            if (!groupItems.length) return null

            return (
              <div key={group}>
                {collapsed ? (
                  <div className="mx-auto mb-2 h-px w-6 bg-border/60" role="presentation" />
                ) : (
                  <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">{group}</p>
                )}

                <div className="space-y-1">
                  {groupItems.map(item => {
                    const Icon = ICONS[item.icon] || LayoutDashboard
                    const isActive = activeModule === item.key

                    const itemButton = (
                      <button
                        key={item.key}
                        onClick={() => handleNavClick(item.key)}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'group relative flex w-full items-center gap-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                          collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2.5',
                          isActive
                            ? 'bg-primary/10 text-primary font-bold dark:bg-primary/15 shadow-sm'
                            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                        )}
                      >
                        {isActive && (
                          <span className="anim-pop absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                        )}
                        
                        <Icon className={cn('h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110', isActive && 'text-primary')} />
                        
                        {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
                      </button>
                    )

                    return collapsed ? (
                      <Tooltip key={item.key}>
                        <TooltipTrigger asChild>{itemButton}</TooltipTrigger>
                        <TooltipContent side="right" sideOffset={10} className="font-semibold text-xs">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      itemButton
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Footer Actions */}
        <div className={cn('border-t bg-muted/20 p-2.5', collapsed && 'flex justify-center')}>
          {!collapsed ? (
            <div className="flex items-center justify-between gap-1">
              <button
                onClick={() => setModule('settings')}
                className="flex flex-1 items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Settings className="h-4 w-4" /> Settings
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>Sign out</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
