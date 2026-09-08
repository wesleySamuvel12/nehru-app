'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useErp } from '@/lib/store'
import { NAV_ITEMS, MOBILE_NAV, can, ROLE_LABELS } from '@/lib/rbac'
import { api, ApiError } from '@/lib/api-client'
import { timeAgo, initials } from '@/lib/format'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LayoutDashboard, GraduationCap, UserPlus, Users, Briefcase, BookOpen, MonitorPlay, CalendarCheck,
  ClipboardList, Wallet, BadgeCheck, Bus, Building2, ShieldCheck, HeartPulse, Library, Boxes,
  Megaphone, CalendarDays, FileBadge, BarChart3, Plug, Settings, ScrollText, Search, Bell, Sun,
  Moon, LogOut, Menu, ChevronsUpDown, X, Home,
} from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, GraduationCap, UserPlus, Users, Briefcase, BookOpen, MonitorPlay, CalendarCheck,
  ClipboardList, Wallet, BadgeCheck, Bus, Building2, ShieldCheck, HeartPulse, Library, Boxes,
  Megaphone, CalendarDays, FileBadge, BarChart3, Plug, Settings, ScrollText,
}

const NAV_GROUPS = ['Overview', 'Operations', 'Academics', 'Finance', 'Engagement', 'System']

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { session, activeModule, setModule } = useErp()
  if (!session) return null
  const items = NAV_ITEMS.filter(item => can(session.role, item.key))

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <GraduationCap className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">Greenwood ERP</p>
          <p className="truncate text-[11px] text-muted-foreground">Greenwood International</p>
        </div>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        {NAV_GROUPS.map(group => {
          const groupItems = items.filter(i => i.group === group)
          if (!groupItems.length) return null
          return (
            <div key={group}>
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{group}</p>
              <div className="space-y-0.5">
                {groupItems.map(item => {
                  const Icon = ICONS[item.icon] || LayoutDashboard
                  const active = activeModule === item.key
                  return (
                    <button key={item.key}
                      onClick={() => { setModule(item.key); onNavigate?.() }}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>
      <div className="border-t p-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{ROLE_LABELS[session.role] || session.role}</p>
            <p className="truncate text-[11px] text-muted-foreground">{session.email}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function GlobalSearch() {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const [results, setResults] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const { setModule } = useErp()
  const boxRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(() => {
      api<{ data: any[] }>(`/api/search?q=${encodeURIComponent(q)}`)
        .then(res => setResults(res.data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (r: any) => { setModule(r.module); setOpen(false); setQ('') }

  return (
    <div className="relative w-full max-w-md" ref={boxRef}>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted md:w-72 lg:w-80">
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">Search students, staff, fees…</span>
        <kbd className="hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium md:inline-block">⌘K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}>
          <div className="mx-auto mt-[12vh] w-[92%] max-w-xl overflow-hidden rounded-xl border bg-popover shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, ID, phone, email, admission no…"
                className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0" />
              {q && <button onClick={() => setQ('')}><X className="h-4 w-4 text-muted-foreground" /></button>}
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {loading && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Searching…</p>}
              {!loading && q.length >= 2 && results.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results found for “{q}”</p>
              )}
              {!loading && results.map(r => (
                <button key={`${r.type}-${r.id}`} onClick={() => go(r)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted">
                  <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{r.type}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>
                  </span>
                </button>
              ))}
              {q.length < 2 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Type at least 2 characters to search across the school.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
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
    // poll while open
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
    INFO: 'bg-sky-500', SUCCESS: 'bg-emerald-500', WARNING: 'bg-amber-500', DANGER: 'bg-rose-500', ALERT: 'bg-rose-500',
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-9 w-9" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}>
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && <button onClick={markAll} className="text-xs font-medium text-primary hover:underline">Mark all read</button>}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">You're all caught up 🎉</p>}
          {items.map(n => (
            <button key={n.id} onClick={() => { markOne(n); if (n.link) setModule(n.link) }}
              className={cn('flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted', !n.read && 'bg-primary/5')}>
              <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', toneCls[n.type] || 'bg-sky-500', n.read && 'opacity-30')} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{n.title}</span>
                <span className="block line-clamp-2 text-xs text-muted-foreground">{n.message}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground/70">{timeAgo(n.createdAt)}</span>
              </span>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

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
      <SelectTrigger className="hidden h-9 w-[130px] sm:flex" aria-label="Academic year">
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
      <SelectTrigger className="hidden h-9 w-[170px] lg:flex" aria-label="Campus selector">
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
    <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Toggle theme"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
    </Button>
  )
}

function ProfileMenu() {
  const { session, setSession } = useErp()
  if (!session) return null
  const logout = async () => {
    try { await api('/api/auth/logout', { method: 'POST' }) } catch { }
    setSession(null)
    window.location.reload()
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors hover:bg-muted" aria-label="Profile menu">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
            {initials(session.name)}
          </span>
          <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">{session.name}</span>
          <ChevronsUpDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="text-sm font-medium">{session.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{session.email}</p>
          <p className="mt-1 text-[11px] font-medium text-primary">{ROLE_LABELS[session.role]}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => useErp.getState().setModule('settings')}><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { activeModule, setModule, session } = useErp()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const current = NAV_ITEMS.find(i => i.key === activeModule)

  const mobileNavItems = MOBILE_NAV.filter(k => can(session?.role || '', k))
  const showHomeMobile = !mobileNavItems.includes('dashboard') && can(session?.role || '', 'dashboard')

  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-background lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 sm:px-4">
          <Button variant="outline" size="icon" className="h-9 w-9 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </Button>
          <div className="hidden min-w-0 items-center gap-1.5 text-sm text-muted-foreground md:flex">
            <Home className="h-3.5 w-3.5" />
            <span className="text-muted-foreground/50">/</span>
            <span className="truncate font-medium text-foreground">{current?.label || 'Dashboard'}</span>
          </div>
          <div className="flex flex-1 justify-center md:justify-start">
            <GlobalSearch />
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
          <div className="mx-auto flex min-h-full w-full max-w-[1400px] flex-col px-3 pb-20 pt-4 sm:px-5 lg:pb-6">
            <div className="flex-1">{children}</div>
            <footer className="mt-auto pt-6">
              <div className="flex flex-col items-center justify-between gap-1 border-t py-3 text-[11px] text-muted-foreground sm:flex-row">
                <p>Greenwood International School — Unified School ERP</p>
                <p>© {new Date().getFullYear()} · Demo environment with sample data</p>
              </div>
            </footer>
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden" aria-label="Mobile navigation">
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
      className={cn('flex min-w-[56px] flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-medium transition-colors',
        active ? 'text-primary' : 'text-muted-foreground')}>
      <Icon className={cn('h-5 w-5', active && 'drop-shadow-sm')} />
      <span className="max-w-full truncate">{label}</span>
    </button>
  )
}
