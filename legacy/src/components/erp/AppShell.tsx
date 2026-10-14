'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useErp } from '@/lib/store'
import { DynamicSidebar } from '@/components/erp/DynamicSidebar'
import { NAV_ITEMS, MOBILE_NAV, can, ROLE_LABELS } from '@/lib/rbac'
import { api, ApiError, clearToken } from '@/lib/api-client'
import { timeAgo, initials } from '@/lib/format'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BrandLogo, BrandMark } from '@/components/erp/brand'
import {
  LayoutDashboard, GraduationCap, UserPlus, Users, Briefcase, BookOpen, MonitorPlay, CalendarCheck,
  ClipboardList, Wallet, BadgeCheck, Bus, Building2, ShieldCheck, HeartPulse, Library, Boxes,
  Megaphone, CalendarDays, FileBadge, BarChart3, Plug, Settings, ScrollText, Search, Bell, Sun,
  Moon, LogOut, Menu, ChevronsUpDown, X, PanelLeftClose, PanelLeftOpen, User,
  Activity, CornerDownLeft, ArrowUp, ArrowDown, AlertTriangle, ArrowLeft, Sparkles,
} from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, GraduationCap, UserPlus, Users, Briefcase, BookOpen, MonitorPlay, CalendarCheck,
  ClipboardList, Wallet, BadgeCheck, Bus, Building2, ShieldCheck, HeartPulse, Library, Boxes,
  Megaphone, CalendarDays, FileBadge, BarChart3, Plug, Settings, ScrollText,
}

const NAV_GROUPS = ['Overview', 'Operations', 'Academics', 'Finance', 'Engagement', 'System']

/* ─────────────────────────  SIDEBAR  ───────────────────────── */

export function SidebarContent({ onNavigate, collapsed, onToggleCollapse }: {
  onNavigate?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}) {
  const { session, activeModule, setModule } = useErp()
  if (!session) return null
  const items = NAV_ITEMS.filter(item => can(session.role, item.key))

  return (
    <TooltipProvider delayDuration={collapsed ? 0 : 700}>
      <div className="flex h-full flex-col">
        {/* Brand */}
        <div className={cn('flex h-14 shrink-0 items-center border-b px-4', collapsed ? 'justify-center px-0' : 'justify-between')}>
          <BrandLogo compact={collapsed} size={collapsed ? 'sm' : 'md'} className={collapsed ? '' : 'mt-0'} />
          {onToggleCollapse && !collapsed && (
            <button onClick={onToggleCollapse} aria-label="Collapse sidebar"
              className="rounded-md p-1.5 text-muted-foreground transition-all duration-200 hover:scale-105 hover:bg-muted hover:text-foreground">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
          {onToggleCollapse && collapsed && (
            <button onClick={onToggleCollapse} aria-label="Expand sidebar"
              className="absolute left-1/2 top-[54px] z-10 -translate-x-1/2 rounded-full border bg-background p-1 text-muted-foreground shadow-sm transition-all hover:scale-105 hover:text-foreground">
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn('flex-1 space-y-4 overflow-y-auto overflow-x-hidden py-4', collapsed ? 'px-2.5' : 'px-3')} aria-label="Main navigation">
          {NAV_GROUPS.map(group => {
            const groupItems = items.filter(i => i.group === group)
            if (!groupItems.length) return null
            return (
              <div key={group}>
                {collapsed ? (
                  <div className="mx-auto mb-1.5 h-px w-6 bg-border" role="presentation" />
                ) : (
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">{group}</p>
                )}
                <div className="space-y-0.5">
                  {groupItems.map(item => {
                    const Icon = ICONS[item.icon] || LayoutDashboard
                    const active = activeModule === item.key
                    const btn = (
                      <button key={item.key}
                        onClick={() => { setModule(item.key); onNavigate?.() }}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'group relative flex w-full items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                          collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2',
                          active
                            ? 'bg-primary/10 text-primary dark:bg-primary/15'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}>
                        {/* animated active indicator */}
                        {active && <span className="anim-pop absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
                        <Icon className={cn('h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110', active && 'text-primary')} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    )
                    return collapsed ? (
                      <Tooltip key={item.key}>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8} className="font-medium">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : btn
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Role footer */}
        <div className={cn('border-t', collapsed ? 'flex justify-center p-3' : 'p-3')}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex h-9 w-9 cursor-default items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {initials(session.name)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <p className="font-medium">{session.name}</p>
                <p className="text-[11px] opacity-70">{ROLE_LABELS[session.role] || session.role}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2 transition-colors hover:bg-muted">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{ROLE_LABELS[session.role] || session.role}</p>
                <p className="truncate text-[11px] text-muted-foreground">{session.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

/* ─────────────────────  COMMAND PALETTE  ───────────────────── */

const RESULT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  STUDENT: GraduationCap, PARENT: Users, TEACHER: Briefcase, EMPLOYEE: Briefcase,
  ADMISSION: UserPlus, FEE: Wallet, EXAM: ClipboardList, BOOK: Library,
  ASSET: Boxes, CERTIFICATE: FileBadge, VISITOR: ShieldCheck, LEAD: UserPlus,
}

const QUICK_ACTIONS = [
  { label: 'Add Student', hint: 'Students', module: 'students', icon: UserPlus },
  { label: 'Add Teacher', hint: 'Staff', module: 'teachers', icon: Briefcase },
  { label: 'New Admission Lead', hint: 'CRM', module: 'admissions', icon: UserPlus },
  { label: 'Collect Fee Payment', hint: 'Fees', module: 'fees', icon: Wallet },
  { label: 'Create Exam', hint: 'Examinations', module: 'examinations', icon: ClipboardList },
  { label: 'Mark Attendance', hint: 'Attendance', module: 'attendance', icon: CalendarCheck },
  { label: 'Generate Certificate', hint: 'Certificates', module: 'certificates', icon: FileBadge },
  { label: 'Send Announcement', hint: 'Communication', module: 'communication', icon: Megaphone },
  { label: 'Schedule Event', hint: 'Events', module: 'events', icon: CalendarDays },
]

function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const [results, setResults] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [activeIdx, setActiveIdx] = React.useState(0)
  const { setModule } = useErp()

  React.useEffect(() => {
    if (!open) { setQ(''); setResults([]); setActiveIdx(0) }
  }, [open])

  React.useEffect(() => {
    if (q.trim().length < 2) { setResults([]); setLoading(false); return }
    setLoading(true)
    const t = setTimeout(() => {
      api<{ data: any[] }>(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then(res => { setResults(res.data || []); setActiveIdx(0) })
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 280)
    return () => clearTimeout(t)
  }, [q])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const flat = React.useMemo(() => {
    // Order results into a flat list mirroring the grouped render
    const groups: Record<string, any[]> = {}
    results.forEach(r => { (groups[r.type] ||= []).push(r) })
    return Object.entries(groups).flatMap(([, arr]) => arr)
  }, [results])

  const goModule = (m: string) => { setModule(m); setOpen(false) }
  const goResult = (r: any) => { setModule(r.module); setOpen(false) }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const list = q.trim().length >= 2 ? flat : []
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => (i + 1) % Math.max(1, list.length)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => (i - 1 + list.length) % Math.max(1, list.length)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (list[activeIdx]) goResult(list[activeIdx])
    }
  }

  const grouped = React.useMemo(() => {
    const groups: Record<string, any[]> = {}
    results.forEach(r => { (groups[r.type] ||= []).push(r) })
    return Object.entries(groups)
  }, [results])

  return (
    <div className="relative w-full max-w-md">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open global search"
        className="flex h-9 w-full items-center gap-2 rounded-xl border bg-muted/40 px-3 text-sm text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-muted hover:shadow-sm md:w-64 lg:w-80">
        <Search className="h-4 w-4 shrink-0 transition-transform duration-200" />
        <span className="flex-1 truncate text-left">Search or jump to…</span>
        <kbd className="hidden rounded-md border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium md:inline-block">⌘K</kbd>
      </button>

      {open && (
        <div className="anim-fade-in fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
          <div
            className="anim-rise mx-auto mt-[10vh] w-[92%] max-w-xl overflow-hidden rounded-2xl border bg-popover shadow-[var(--shadow-pop)]"
            onClick={e => e.stopPropagation()}>
            {/* Input */}
            <div className="flex items-center gap-2.5 border-b px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKeyDown}
                placeholder="Search students, staff, fees, books…"
                className="h-13 border-0 bg-transparent py-4 shadow-none focus-visible:ring-0" />
              {q && <button onClick={() => setQ('')} aria-label="Clear search"><X className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" /></button>}
              <kbd className="hidden rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">ESC</kbd>
            </div>

            <div className="max-h-[56vh] overflow-y-auto p-2">
              {/* Quick actions (empty query) */}
              {q.trim().length < 2 && (
                <>
                  <p className="px-2 pb-1.5 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">Quick actions</p>
                  {QUICK_ACTIONS.map((a, i) => (
                    <button key={a.label} onClick={() => goModule(a.module)}
                      className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-all duration-150 hover:bg-muted"
                      style={{ ['--delay' as string]: `${i * 22}ms` }}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-150 group-hover:scale-105">
                        <a.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{a.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{a.hint}</span>
                      </span>
                      <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60" />
                    </button>
                  ))}
                </>
              )}

              {/* Search results */}
              {q.trim().length >= 2 && (
                <>
                  {loading && <div className="space-y-1.5 p-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-shimmer h-11 rounded-lg" />)}</div>}
                  {!loading && grouped.length === 0 && (
                    <div className="px-4 py-10 text-center">
                      <Search className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                      <p className="text-sm font-medium">No results for “{q}”</p>
                      <p className="mt-1 text-xs text-muted-foreground">Try a name, ID, phone, email or admission number.</p>
                    </div>
                  )}
                  {!loading && grouped.map(([type, arr]) => {
                    const GIcon = RESULT_ICONS[type] || Search
                    return (
                      <div key={type} className="pb-1">
                        <p className="flex items-center gap-1.5 px-2 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                          <GIcon className="h-3 w-3" /> {type.charAt(0) + type.slice(1).toLowerCase()}s
                        </p>
                        {arr.map(r => {
                          const idx = flat.indexOf(r)
                          const Icon = RESULT_ICONS[type] || Search
                          return (
                            <button key={`${r.type}-${r.id}`} onClick={() => goResult(r)} onMouseEnter={() => setActiveIdx(idx)}
                              className={cn('group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors duration-150',
                                idx === activeIdx && 'bg-primary/8 dark:bg-primary/15')}>
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{r.title}</span>
                                <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>
                              </span>
                              {idx === activeIdx && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </>
              )}
            </div>

            {/* Footer hints */}
            <div className="flex items-center gap-4 border-t bg-muted/30 px-4 py-2 text-[10.5px] text-muted-foreground">
              <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> navigate</span>
              <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> open</span>
              <span className="ml-auto flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> Powered by NIS Search</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────  NOTIFICATIONS  ───────────────────── */

const NOTIF_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  INFO: Bell, SUCCESS: BadgeCheck, WARNING: AlertTriangle, DANGER: AlertTriangle, ALERT: AlertTriangle,
}

function NotificationBell() {
  const [items, setItems] = React.useState<any[]>([])
  const [unread, setUnread] = React.useState(0)
  const [open, setOpen] = React.useState(false)
  const { setModule } = useErp()

  const load = React.useCallback(() => {
    api<{ data: any[]; unread: number }>('/api/notifications')
      .then(res => { setItems(res.data); setUnread(res.unread) })
      .catch(() => {})
  }, [])

  React.useEffect(() => { load() }, [load])
  React.useEffect(() => {
    if (!open) return
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [open, load])

  const markAll = async () => {
    try { await api('/api/notifications', { method: 'PATCH', body: JSON.stringify({ all: true }) }); load() } catch { }
  }

  const markOne = async (n: any) => {
    try { await api('/api/notifications', { method: 'PATCH', body: JSON.stringify({ id: n.id }) }); load() } catch { }
  }

  const toneCls: Record<string, string> = {
    INFO: 'bg-sky-500/12 text-sky-600 dark:text-sky-400',
    SUCCESS: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
    WARNING: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
    DANGER: 'bg-rose-500/12 text-rose-600 dark:text-rose-400',
    ALERT: 'bg-rose-500/12 text-rose-600 dark:text-rose-400',
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-9 w-9 rounded-xl transition-all hover:shadow-sm" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}>
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="anim-pop absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-xl p-0 sm:w-96">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="font-display text-sm font-bold">Notifications</p>
          {unread > 0 && <button onClick={markAll} className="text-xs font-semibold text-primary transition-colors hover:underline">Mark all read</button>}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 && (
            <div className="px-4 py-10 text-center">
              <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><BadgeCheck className="h-5 w-5" /></span>
              <p className="text-sm font-medium">You're all caught up</p>
              <p className="mt-0.5 text-xs text-muted-foreground">New notifications will appear here.</p>
            </div>
          )}
          {items.map((n, i) => {
            const NIcon = NOTIF_ICONS[n.type] || Bell
            return (
              <button key={n.id} onClick={() => { markOne(n); if (n.link) setModule(n.link) }}
                style={{ ['--delay' as string]: `${Math.min(i * 24, 200)}ms` }}
                className={cn('anim-fade-up flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted',
                  !n.read && 'bg-primary/[0.04] dark:bg-primary/[0.07]')}>
                <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', toneCls[n.type] || toneCls.INFO)}>
                  <NIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{n.title}</span>
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                  </span>
                  <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">{n.message}</span>
                  <span className="mt-1 block text-[10px] font-medium text-muted-foreground/70">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ─────────────────────  SELECTORS  ───────────────────── */

function YearSelector() {
  const { academicYearId, academicYearName, setAcademicYear } = useErp()
  const [years, setYears] = React.useState<any[]>([])
  React.useEffect(() => {
    api<{ data: any[] }>('/api/academics/years?all=1').then(r => {
      setYears(r.data)
      if (!academicYearId && r.data.length) {
        const current = r.data.find((y: any) => y.isCurrent) || r.data[0]
        setAcademicYear(current.id, current.name)
      }
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Select value={academicYearId} onValueChange={v => {
      const y = years.find(x => x.id === v)
      if (y) setAcademicYear(y.id, y.name)
    }}>
      <SelectTrigger className="hidden h-9 w-[130px] rounded-xl transition-shadow hover:shadow-sm sm:flex" aria-label="Academic year">
        <SelectValue placeholder="Year" />
      </SelectTrigger>
      <SelectContent>
        {years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function SchoolSelector() {
  const { schoolId, schoolName, setSchool } = useErp()
  const [schools, setSchools] = React.useState<any[]>([])
  React.useEffect(() => {
    api<{ data: any[] }>('/api/settings/schools?all=1').then(r => setSchools(r.data)).catch(() => {})
  }, [])

  return (
    <Select value={schoolId} onValueChange={v => {
      const s = schools.find(x => x.id === v)
      if (s) setSchool(s.id, s.name)
    }}>
      <SelectTrigger className="hidden h-9 w-[170px] rounded-xl transition-shadow hover:shadow-sm lg:flex" aria-label="Campus selector">
        <SelectValue placeholder="Campus" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="main">All Campuses</SelectItem>
        {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl transition-all hover:scale-105 hover:shadow-sm" aria-label="Toggle theme"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100" />
    </Button>
  )
}

function ProfileMenu() {
  const { session, setSession, setModule } = useErp()

  if (!session) return null

  const logout = async () => {
    try { await api('/api/auth/logout', { method: 'POST' }) } catch { }
    clearToken()
    setSession(null)
    window.location.reload()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-all duration-200 hover:bg-muted hover:shadow-sm" aria-label="Profile menu">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-[10px] font-bold text-white shadow-sm">
            {initials(session.name)}
          </span>
          <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">{session.name}</span>
          <ChevronsUpDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl p-1.5">
        <DropdownMenuLabel className="pb-2">
          <p className="text-sm font-bold">{session.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{session.email}</p>
          <p className="mt-1.5 inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            {ROLE_LABELS[session.role] || session.role}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setModule('settings')} className="rounded-lg"><User className="mr-2 h-4 w-4" /> Profile</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setModule('settings')} className="rounded-lg"><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setModule('audit-logs')} className="rounded-lg"><Activity className="mr-2 h-4 w-4" /> Activity Logs</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="rounded-lg text-rose-600 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-400">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ─────────────────────  SHELL  ───────────────────── */

export function AppShell({ children }: { children: React.ReactNode }) {
  const { activeModule, setModule, session, sidebarCollapsed, setSidebarCollapsed } = useErp()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const current = NAV_ITEMS.find(i => i.key === activeModule)

  const mobileNavItems = MOBILE_NAV.filter(k => can(session?.role || '', k))
  const showHomeMobile = !mobileNavItems.includes('dashboard') && can(session?.role || '', 'dashboard')

  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      {/* Desktop sidebar */}
      <aside className={cn('relative hidden shrink-0 border-r bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block',
        sidebarCollapsed ? 'w-[76px]' : 'w-64')}>
        <DynamicSidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 border-r bg-sidebar">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <DynamicSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="glass sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </Button>
          {/* Breadcrumb & Back to Dashboard */}
          {activeModule !== 'dashboard' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModule('dashboard')}
              className="h-8.5 gap-1.5 rounded-xl border-primary/30 bg-primary/10 text-xs font-bold text-primary hover:bg-primary/20 hover:text-primary transition-all shadow-2xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </Button>
          )}
          <div className="hidden min-w-0 items-center gap-1.5 text-sm md:flex" aria-label="Breadcrumb">
            {current?.group && (
              <>
                <span className="truncate text-muted-foreground/80">{current.group}</span>
                <span className="text-muted-foreground/40" aria-hidden>/</span>
              </>
            )}
            <span className="truncate font-display font-semibold">{current?.label || 'Dashboard'}</span>
          </div>
          <div className="flex flex-1 justify-center md:justify-start">
            <CommandPalette />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SchoolSelector />
            <YearSelector />
            <NotificationBell />
            <ThemeToggle />
            <ProfileMenu />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[1400px] flex-col px-3 pb-20 pt-5 sm:px-6 lg:pb-6">
            <div className="flex-1">{children}</div>
            <footer className="mt-auto pt-6">
              <div className="flex flex-col items-center justify-between gap-1 border-t py-3.5 text-[11px] text-muted-foreground sm:flex-row">
                <p className="flex items-center gap-1.5"><BrandMark tileClassName="h-4 w-4" /> Nehru International School — Unified School ERP</p>
                <p>© {new Date().getFullYear()} · Demo environment with sample data</p>
              </div>
            </footer>
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg supports-[backdrop-filter]:bg-background/75 lg:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
            {showHomeMobile && (
              <MobileNavButton icon={LayoutDashboard} label="Home" active={activeModule === 'dashboard'} onClick={() => setModule('dashboard')} />
            )}
            {mobileNavItems.map(key => {
              const item = NAV_ITEMS.find(i => i.key === key)!
              const Icon = ICONS[item.icon] || LayoutDashboard
              return (
                <MobileNavButton key={key} icon={Icon} label={item.label.split(' ')[0]} active={activeModule === key} onClick={() => setModule(key)} />
              )
            })}
            <MobileNavButton icon={Menu} label="Menu" active={false} onClick={() => setMobileOpen(true)} />
          </div>
        </nav>
      </div>
    </div>
  )
}

function MobileNavButton({ icon: Icon, label, active, onClick }: {
  icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined}
      className={cn('group relative flex min-w-[56px] flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-semibold transition-all duration-200',
        active ? 'text-primary' : 'text-muted-foreground active:scale-95')}>
      <span className={cn('flex h-7 w-10 items-center justify-center rounded-full transition-all duration-200',
        active ? 'bg-primary/12' : 'group-hover:bg-muted')}>
        <Icon className="h-[18px] w-[18px] transition-transform duration-200 group-active:scale-90" />
      </span>
      <span className="max-w-full truncate">{label}</span>
      {active && <span className="anim-fade-in absolute -bottom-0 h-0.5 w-8 rounded-full bg-primary" />}
    </button>
  )
}
