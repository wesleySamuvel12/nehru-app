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
  PanelLeftClose, PanelLeftOpen, LogOut, ChevronDown, ChevronRight, User, Trophy, Calendar, CheckCircle2,
} from 'lucide-react'


const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, GraduationCap, UserPlus, Users, Briefcase, BookOpen, MonitorPlay, CalendarCheck,
  ClipboardList, Wallet, BadgeCheck, Bus, Building2, ShieldCheck, HeartPulse, Library, Boxes,
  Megaphone, CalendarDays, FileBadge, BarChart3, Plug, Settings, ScrollText, Trophy, Calendar, CheckCircle2,
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
  const { session, activeModule, moduleParams, setModule, setSession } = useErp()
  const [filterQuery, setFilterQuery] = React.useState('')

  if (!session) return null

  const role = session.role || 'SUPER_ADMIN'

  const handleLogout = async () => {
    try { await api('/api/auth/logout', { method: 'POST' }) } catch { }
    clearToken()
    setSession(null)
    window.location.reload()
  }

  // ──────────────────────── SPECIAL STUDENT SIDEBAR ────────────────────────
  if (role === 'STUDENT') {
    const studentName = session.name || 'Aditya Malhotra'
    const studentInitials = studentName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'AM'
    const activeStudentTab = moduleParams?.tab || (activeModule === 'student-portal' ? 'dashboard' : activeModule)

    const handleStudentClick = (tabKey: string) => {
      setModule('student-portal', { tab: tabKey })
      onNavigate?.()
    }

    const studentNavSections = [
      {
        title: 'LEARNING',
        items: [
          { key: 'timetable', label: 'Timetable', icon: CalendarDays },
          { key: 'homework', label: 'Homework', icon: ClipboardList },
          { key: 'grades', label: 'Grades', icon: Trophy },
          { key: 'attendance', label: 'Attendance', icon: CheckCircle2 },
        ],
      },
      {
        title: 'SCHOOL LIFE',
        items: [
          { key: 'notices', label: 'Notices', icon: Megaphone },
          { key: 'events', label: 'Events', icon: Calendar },
          { key: 'library', label: 'Library', icon: BookOpen },
        ],
      },
    ]

    return (
      <TooltipProvider delayDuration={collapsed ? 0 : 500}>
        <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground selection:bg-primary/20">
          
          {/* Student Profile Top Header (matching video & screenshot) */}
          <div className={cn('border-b px-3.5 py-3 transition-all duration-300', collapsed ? 'flex flex-col items-center justify-center p-2' : '')}>
            {!collapsed ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-xs font-bold text-white shadow-xs">
                    {studentInitials}
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-card bg-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground leading-tight">{studentName}</p>
                    <p className="truncate text-[10px] text-muted-foreground">Grade 8 · Section A</p>
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>Student</span>
                    </div>
                  </div>
                </div>

                {onToggleCollapse && (
                  <button
                    onClick={onToggleCollapse}
                    aria-label="Collapse sidebar"
                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="relative flex flex-col items-center">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-xs font-bold text-white shadow-xs">
                  {studentInitials}
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-card bg-emerald-500" />
                </div>
                {onToggleCollapse && (
                  <button
                    onClick={onToggleCollapse}
                    aria-label="Expand sidebar"
                    className="mt-2 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <PanelLeftOpen className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Student Navigation Tree */}
          <nav className={cn('flex-1 space-y-4 overflow-y-auto overflow-x-hidden py-3', collapsed ? 'px-2' : 'px-3')} aria-label="Student Navigation">
            {/* Direct Dashboard Item */}
            <div>
              {(() => {
                const isDashActive = activeStudentTab === 'dashboard'
                const dashButton = (
                  <button
                    onClick={() => handleStudentClick('dashboard')}
                    className={cn(
                      'group relative flex w-full items-center gap-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                      collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2.5',
                      isDashActive
                        ? 'bg-primary/10 text-primary font-bold dark:bg-primary/15 shadow-2xs'
                        : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    )}
                  >
                    {isDashActive && (
                      <span className="anim-pop absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <LayoutDashboard className={cn('h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110', isDashActive && 'text-primary')} />
                    {!collapsed && <span className="flex-1 truncate text-left">Dashboard</span>}
                  </button>
                )

                return collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{dashButton}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10} className="font-semibold text-xs">
                      Dashboard
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  dashButton
                )
              })()}
            </div>

            {/* Sections: LEARNING and SCHOOL LIFE */}
            {studentNavSections.map(sec => (
              <div key={sec.title}>
                {collapsed ? (
                  <div className="mx-auto mb-2 h-px w-6 bg-border/60" role="presentation" />
                ) : (
                  <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">{sec.title}</p>
                )}

                <div className="space-y-1">
                  {sec.items.map(item => {
                    const Icon = item.icon
                    const isActive = activeStudentTab === item.key

                    const itemButton = (
                      <button
                        key={item.key}
                        onClick={() => handleStudentClick(item.key)}
                        className={cn(
                          'group relative flex w-full items-center gap-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                          collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2.5',
                          isActive
                            ? 'bg-primary/10 text-primary font-bold dark:bg-primary/15 shadow-2xs'
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
            ))}
          </nav>

          {/* Student Footer: Settings & Sign Out */}
          <div className={cn('border-t bg-muted/20 p-2.5', collapsed && 'flex flex-col items-center gap-2 justify-center')}>
            {!collapsed ? (
              <div className="flex items-center justify-between gap-1">
                <button
                  onClick={() => handleStudentClick('profile')}
                  className={cn(
                    'flex flex-1 items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors',
                    activeStudentTab === 'profile'
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
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
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleStudentClick('profile')}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                        activeStudentTab === 'profile' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>Settings</TooltipContent>
                </Tooltip>

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
              </>
            )}
          </div>
        </div>
      </TooltipProvider>
    )
  }

  // ──────────────────────── SPECIAL PARENT SIDEBAR ────────────────────────
  if (role === 'PARENT') {
    const parentName = session.name || 'Rohan Gupta'
    const parentInitials = parentName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'RG'
    const activeParentTab = moduleParams?.tab || (activeModule === 'parent-portal' ? 'dashboard' : activeModule)

    const handleParentClick = (tabKey: string) => {
      setModule('parent-portal', { tab: tabKey })
      onNavigate?.()
    }

    const parentNavSections = [
      {
        title: 'OVERVIEW',
        items: [
          { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ],
      },
      {
        title: 'MY CHILDREN',
        items: [
          { key: 'child-profile', label: 'Child Profile', icon: User },
        ],
      },
      {
        title: 'LEARNING',
        items: [
          { key: 'timetable', label: 'Timetable', icon: CalendarDays },
          { key: 'homework', label: 'Homework', icon: ClipboardList },
          { key: 'grades', label: 'Grades', icon: Trophy },
          { key: 'attendance', label: 'Attendance', icon: CheckCircle2 },
        ],
      },
      {
        title: 'SCHOOL LIFE',
        items: [
          { key: 'notices', label: 'Notices', icon: Megaphone },
          { key: 'events', label: 'Events', icon: Calendar },
          { key: 'library', label: 'Library', icon: BookOpen },
        ],
      },
      {
        title: 'SERVICES',
        items: [
          { key: 'transport', label: 'Transport', icon: Bus },
          { key: 'hostel', label: 'Hostel', icon: Building2 },
        ],
      },
      {
        title: 'FINANCE',
        items: [
          { key: 'fees', label: 'Fees & Payments', icon: Wallet },
        ],
      },
      {
        title: 'ACCOUNT',
        items: [
          { key: 'settings', label: 'Settings', icon: Settings },
        ],
      },
    ]

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
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
            {onToggleCollapse && collapsed && (
              <button
                onClick={onToggleCollapse}
                aria-label="Expand sidebar"
                className="mt-2 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <PanelLeftOpen className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Parent Profile Card */}
          <div className={cn('border-b px-3.5 py-3 transition-all duration-300', collapsed ? 'flex flex-col items-center justify-center p-2' : '')}>
            {!collapsed ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-xs font-bold text-white shadow-xs">
                  {parentInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground leading-tight">{parentName}</p>
                  <span className="mt-0.5 inline-flex items-center rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                    PARENT
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative flex flex-col items-center">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-xs font-bold text-white shadow-xs">
                  {parentInitials}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tree */}
          <nav className={cn('flex-1 space-y-3 overflow-y-auto overflow-x-hidden py-3', collapsed ? 'px-2' : 'px-3')} aria-label="Parent Navigation">
            {parentNavSections.map(sec => (
              <div key={sec.title}>
                {collapsed ? (
                  <div className="mx-auto mb-2 h-px w-6 bg-border/60" role="presentation" />
                ) : (
                  <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">{sec.title}</p>
                )}

                <div className="space-y-0.5">
                  {sec.items.map(item => {
                    const Icon = item.icon
                    const isActive = activeParentTab === item.key

                    const itemButton = (
                      <button
                        key={item.key}
                        onClick={() => handleParentClick(item.key)}
                        className={cn(
                          'group relative flex w-full items-center gap-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                          collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2',
                          isActive
                            ? 'bg-sky-500/10 text-sky-600 font-bold dark:bg-sky-500/15 dark:text-sky-400 shadow-2xs'
                            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                        )}
                      >
                        {isActive && (
                          <span className="anim-pop absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sky-600" />
                        )}
                        <Icon className={cn('h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110', isActive && 'text-sky-600 dark:text-sky-400')} />
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
            ))}

            {/* Sign Out link right under Account */}
            <div className="pt-0.5">
              {(() => {
                const signOutButton = (
                  <button
                    onClick={handleLogout}
                    className={cn(
                      'group relative flex w-full items-center gap-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors',
                      collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2'
                    )}
                  >
                    <LogOut className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 text-rose-500" />
                    {!collapsed && <span className="flex-1 truncate text-left">Sign out</span>}
                  </button>
                )

                return collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{signOutButton}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10} className="font-semibold text-xs text-rose-500">
                      Sign out
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  signOutButton
                )
              })()}
            </div>
          </nav>
        </div>
      </TooltipProvider>
    )
  }

  // ──────────────────────── STANDARD ERP ROLES SIDEBAR ────────────────────────
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
