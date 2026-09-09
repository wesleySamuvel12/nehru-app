'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { api, ApiError, setToken } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { BrandMark, BrandLogo } from '@/components/erp/brand'
import { Session } from '@/lib/store'
import {
  GraduationCap, Lock, Mail, Loader2, ShieldCheck, ArrowRight, Eye, EyeOff,
  CheckCircle2, Sparkles, BookOpenCheck, Users, LifeBuoy,
} from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const DEMO_ACCOUNTS: { role: string; email: string; label: string }[] = [
  { role: 'Super Admin', email: 'admin@greenwood.edu.in', label: 'Full system control' },
  { role: 'Principal', email: 'principal@greenwood.edu.in', label: 'Management & approvals' },
  { role: 'Teacher', email: 'teacher@greenwood.edu.in', label: 'Classes & academics' },
  { role: 'Accountant', email: 'accounts@greenwood.edu.in', label: 'Fees & finance' },
  { role: 'Parent', email: 'parent@greenwood.edu.in', label: 'Child dashboard' },
  { role: 'Student', email: 'student@greenwood.edu.in', label: 'My learning space' },
]

type LoginPhase = 'idle' | 'checking' | 'success'

export function LoginScreen({ onLogin }: { onLogin: (s: Session, defaultModule: string) => void }) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPw, setShowPw] = React.useState(false)
  const [remember, setRemember] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const [phase, setPhase] = React.useState<LoginPhase>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const [errorField, setErrorField] = React.useState<'email' | 'password' | null>(null)
  const [shake, setShake] = React.useState(0)

  const submit = async (e?: React.FormEvent, overrideEmail?: string, overridePw?: string) => {
    e?.preventDefault()
    if (loading) return
    const em = overrideEmail || email
    const pw = overridePw || password
    if (!em || !pw) {
      setError('Please enter both email and password.')
      setErrorField(!em ? 'email' : 'password')
      setShake(s => s + 1)
      return
    }
    setLoading(true)
    setPhase('checking')
    setError(null)
    setErrorField(null)
    try {
      const res = await api<{ data: Session; token?: string; defaultModule: string }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email: em, password: pw, remember }),
      })
      if (res.token) setToken(res.token)
      setPhase('success')
      // A brief, deliberate success beat before the workspace takes over
      setTimeout(() => onLogin(res.data, res.defaultModule), 650)
    } catch (err) {
      setPhase('idle')
      setLoading(false)
      const msg = (err as ApiError).message || 'Sign-in failed. Please try again.'
      setError(msg)
      setErrorField(/password/i.test(msg) ? 'password' : /email/i.test(msg) ? 'email' : null)
      setShake(s => s + 1)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ─────────── Brand panel ─────────── */}
      <div className="mesh-bg relative hidden w-[46%] flex-col justify-between overflow-hidden bg-emerald-950 p-10 text-emerald-50 lg:flex xl:w-[52%]">
        {/* Ambient floating orbs */}
        <div className="pointer-events-none absolute left-[10%] top-[14%] h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl anim-float" style={{ ['--delay' as string]: '0.6s' }} />
        <div className="pointer-events-none absolute right-[8%] top-[38%] h-72 w-72 rounded-full bg-teal-400/15 blur-3xl anim-float" style={{ ['--delay' as string]: '2s' }} />
        <div className="pointer-events-none absolute bottom-[10%] left-[30%] h-64 w-64 rounded-full bg-lime-300/10 blur-3xl anim-float" style={{ ['--delay' as string]: '3.2s' }} />
        {/* drifting motes */}
        {[
          { l: '18%', t: '22%', d: '0s' }, { l: '64%', t: '16%', d: '1.4s' }, { l: '78%', t: '64%', d: '2.2s' },
          { l: '36%', t: '72%', d: '0.9s' }, { l: '52%', t: '44%', d: '2.8s' },
        ].map((p, i) => (
          <span key={i} aria-hidden
            className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-emerald-200/40 anim-float"
            style={{ left: p.l, top: p.t, ['--delay' as string]: p.d }} />
        ))}

        {/* Logo reveal */}
        <div className="anim-rise relative z-10 flex items-center gap-3.5" style={{ ['--delay' as string]: '80ms' }}>
          <BrandMark tileClassName="h-12 w-12" breathe />
          <div>
            <p className="font-display text-lg font-bold tracking-tight">Greenwood International</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-300/80">School · Est. 1998</p>
          </div>
        </div>

        {/* Headline reveal */}
        <div className="relative z-10 max-w-lg">
          <div className="anim-rise mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-emerald-200" style={{ ['--delay' as string]: '200ms' }}>
            <Sparkles className="h-3.5 w-3.5" /> One platform for your whole school
          </div>
          <h1 className="anim-rise font-display text-[2.6rem] font-extrabold leading-[1.12] tracking-tight" style={{ ['--delay' as string]: '300ms' }}>
            Where great schools<br />run beautifully.
          </h1>
          <p className="anim-rise mt-5 text-[15px] leading-relaxed text-emerald-100/75" style={{ ['--delay' as string]: '420ms' }}>
            Admissions, academics, attendance, fees, transport, hostel, library and health —
            every corner of Greenwood, connected in a single secure system.
          </p>
          <div className="anim-rise mt-9 grid max-w-md grid-cols-3 gap-4 text-center" style={{ ['--delay' as string]: '540ms' }}>
            {[
              { v: '20+', l: 'Modules', icon: <GraduationCap className="h-4 w-4" /> },
              { v: '14', l: 'Roles', icon: <Users className="h-4 w-4" /> },
              { v: '100%', l: 'Connected', icon: <BookOpenCheck className="h-4 w-4" /> },
            ].map(s => (
              <div key={s.l} className="rounded-2xl border border-emerald-700/40 bg-emerald-900/45 px-3 py-4 backdrop-blur-sm transition-colors hover:border-emerald-500/40">
                <span className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">{s.icon}</span>
                <p className="font-display text-xl font-bold text-emerald-100">{s.v}</p>
                <p className="mt-0.5 text-[11px] text-emerald-200/70">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="anim-rise relative z-10 flex items-center gap-2 text-xs text-emerald-300/60" style={{ ['--delay' as string]: '640ms' }}>
          <ShieldCheck className="h-4 w-4" /> Role-based access · Audit logged · Encrypted sessions
        </p>
      </div>

      {/* ─────────── Auth panel ─────────── */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[400px]">
          {/* Compact brand for small screens */}
          <div className="anim-rise mb-8 flex items-center gap-3 lg:hidden" style={{ ['--delay' as string]: '60ms' }}>
            <BrandMark tileClassName="h-10 w-10" />
            <div>
              <p className="font-display font-bold tracking-tight">Greenwood International</p>
              <p className="text-[11px] text-muted-foreground">Unified School ERP</p>
            </div>
          </div>

          <div
            key={shake}
            className={cn(
              'anim-rise rounded-2xl border bg-card p-7 shadow-[var(--shadow-lift)] sm:p-8',
              shake > 0 && 'anim-nudge',
            )}
            style={{ ['--delay' as string]: '240ms' }}
          >
              <div className="mb-6 flex items-center gap-3">
                <span className="hidden sm:block"><BrandMark tileClassName="h-10 w-10" /></span>
                <div>
                  <h2 className="font-display text-[22px] font-bold tracking-tight">
                    {phase === 'success' ? 'Welcome back' : 'Welcome back'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {phase === 'success' ? 'Taking you to your workspace…' : 'Sign in to your school workspace.'}
                  </p>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-4" noValidate>
                <div className="anim-rise space-y-1.5" style={{ ['--delay' as string]: '320ms' }}>
                  <Label htmlFor="email" className={cn('transition-colors', errorField === 'email' && 'text-rose-600 dark:text-rose-400')}>
                    Email address
                  </Label>
                  <div className="group relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-all duration-200 group-focus-within:scale-110 group-focus-within:text-primary" />
                    <Input id="email" type="email" autoComplete="email" placeholder="you@greenwood.edu.in"
                      className={cn('h-11 rounded-xl pl-9 transition-all duration-200 hover:shadow-sm focus-visible:shadow-sm',
                        errorField === 'email' && 'border-rose-400 focus-visible:ring-rose-300')}
                      value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
                  </div>
                </div>

                <div className="anim-rise space-y-1.5" style={{ ['--delay' as string]: '380ms' }}>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className={cn('transition-colors', errorField === 'password' && 'text-rose-600 dark:text-rose-400')}>
                      Password
                    </Label>
                    <button type="button" tabIndex={0}
                      className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                      onClick={() => setError('Password reset is handled by your system administrator in this demo.')}>
                      Forgot password?
                    </button>
                  </div>
                  <div className="group relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-all duration-200 group-focus-within:scale-110 group-focus-within:text-primary" />
                    <Input id="password" type={showPw ? 'text' : 'password'} autoComplete="current-password"
                      placeholder="••••••••" className={cn('h-11 rounded-xl pl-9 pr-10 transition-all duration-200 hover:shadow-sm focus-visible:shadow-sm',
                        errorField === 'password' && 'border-rose-400 focus-visible:ring-rose-300')}
                      value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
                    <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-all duration-200 hover:scale-110 hover:text-foreground">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="anim-rise flex items-center justify-between" style={{ ['--delay' as string]: '440ms' }}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                    <Checkbox checked={remember} onCheckedChange={v => setRemember(v === true)} className="transition-transform" />
                    Remember me
                  </label>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Secured
                  </span>
                </div>

                {error && (
                  <div role="alert" className="anim-pop rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-600 dark:text-rose-400">
                    {error}
                  </div>
                )}

                <Button type="submit" size="lg" disabled={loading || phase === 'success'}
                  className={cn('press h-11 w-full rounded-xl text-[15px] font-semibold shadow-[var(--shadow-soft)] transition-all duration-300',
                    phase === 'success' && 'bg-emerald-600 hover:bg-emerald-600')}
                  style={{ ['--delay' as string]: '500ms' }}>
                  {phase === 'idle' && (<>Sign In <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" /></>)}
                  {phase === 'checking' && (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking credentials…</>)}
                  {phase === 'success' && (<><CheckCircle2 className="mr-2 h-4 w-4" /> Welcome back</>)}
                </Button>
              </form>
          </div>

          {/* Demo accounts */}
          <div className="anim-rise mt-6" style={{ ['--delay' as string]: '560ms' }}>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Demo accounts</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((acc, i) => (
                <button key={acc.email} type="button" disabled={loading || phase === 'success'}
                  onClick={() => { setEmail(acc.email); submit(undefined, acc.email, 'demo1234') }}
                  className="card-lift press group rounded-xl border bg-card p-2.5 text-left disabled:opacity-50"
                  style={{ ['--delay' as string]: `${620 + i * 40}ms` }}>
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 transition-transform duration-200 group-hover:scale-125" />
                    {acc.role}
                  </p>
                  <p className="truncate pl-3 text-xs text-muted-foreground">{acc.label}</p>
                </button>
              ))}
            </div>
            <p className="mt-3.5 text-center text-xs text-muted-foreground">
              All demo accounts use password <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[11px]">demo1234</kbd>
            </p>
          </div>

          <p className="anim-rise mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground" style={{ ['--delay' as string]: '860ms' }}>
            <LifeBuoy className="h-3.5 w-3.5" /> Need help? Contact <span className="font-medium text-foreground">support@greenwood.edu.in</span>
          </p>
        </div>
      </div>
    </div>
  )
}
