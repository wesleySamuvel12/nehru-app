'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { api, ApiError, setToken } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Session } from '@/lib/store'
import { PasswordField } from './PasswordField'
import { PrimaryAuthButton } from './PrimaryAuthButton'
import { AuthStatusMessage } from './AuthStatusMessage'
import {
  Mail, ShieldCheck, CheckCircle2, Sparkles, KeyRound,
  Crown, ShieldAlert, BookOpen, Briefcase, HeartHandshake,
  GraduationCap, Users, Heart, Library, Bus, Home, Stethoscope,
  Search, Copy, Check, Zap, ChevronDown, ChevronUp
} from 'lucide-react'

export const QUICK_ACCOUNTS = [
  { role: 'Super Admin', email: 'admin@nis.edu.in', category: 'Admin', label: 'Full System Control', icon: <ShieldAlert className="h-3.5 w-3.5 text-amber-400" /> },
  { role: 'School Admin', email: 'schooladmin@nis.edu.in', category: 'Admin', label: 'Campus Administration', icon: <ShieldCheck className="h-3.5 w-3.5 text-orange-400" /> },
  { role: 'Principal', email: 'principal@nis.edu.in', category: 'Admin', label: 'Management & Approvals', icon: <Crown className="h-3.5 w-3.5 text-yellow-400" /> },
  { role: 'Teacher', email: 'teacher@nis.edu.in', category: 'Staff', label: 'Academics & Grading', icon: <BookOpen className="h-3.5 w-3.5 text-emerald-400" /> },
  { role: 'Accountant', email: 'accounts@nis.edu.in', category: 'Staff', label: 'Fees, Payroll & Finance', icon: <Briefcase className="h-3.5 w-3.5 text-teal-400" /> },
  { role: 'HR Manager', email: 'hr@nis.edu.in', category: 'Staff', label: 'Staff & Recruitment', icon: <Users className="h-3.5 w-3.5 text-blue-400" /> },
  { role: 'Counsellor', email: 'counsellor@nis.edu.in', category: 'Staff', label: 'Admissions & Welfare', icon: <Heart className="h-3.5 w-3.5 text-rose-400" /> },
  { role: 'Librarian', email: 'librarian@nis.edu.in', category: 'Staff', label: 'Library Catalog & Books', icon: <Library className="h-3.5 w-3.5 text-purple-400" /> },
  { role: 'Transport', email: 'transport@nis.edu.in', category: 'Staff', label: 'Routes, Vehicles & Fleet', icon: <Bus className="h-3.5 w-3.5 text-sky-400" /> },
  { role: 'Warden', email: 'warden@nis.edu.in', category: 'Staff', label: 'Hostel & Dormitories', icon: <Home className="h-3.5 w-3.5 text-cyan-400" /> },
  { role: 'Nurse', email: 'nurse@nis.edu.in', category: 'Staff', label: 'Clinic & Student Health', icon: <Stethoscope className="h-3.5 w-3.5 text-pink-400" /> },
  { role: 'Security', email: 'security@nis.edu.in', category: 'Staff', label: 'Gate Pass & Visitors', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
  { role: 'Parent', email: 'parent@nis.edu.in', category: 'Portals', label: 'Child Dashboard & Fees', icon: <HeartHandshake className="h-3.5 w-3.5 text-rose-400" /> },
  { role: 'Student', email: 'student@nis.edu.in', category: 'Portals', label: 'My Learning & Grades', icon: <GraduationCap className="h-3.5 w-3.5 text-indigo-400" /> },
]

export type LoginPhase = 'idle' | 'checking' | 'success'

interface LoginFormProps {
  onLogin: (s: Session, defaultModule: string) => void
  onForgotPassword: (email?: string) => void
  onPhaseChange?: (phase: LoginPhase) => void
}

export function LoginForm({ onLogin, onForgotPassword, onPhaseChange }: LoginFormProps) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [remember, setRemember] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const [phase, setPhase] = React.useState<LoginPhase>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const [errorField, setErrorField] = React.useState<'email' | 'password' | null>(null)
  const [shake, setShake] = React.useState(0)
  const [copiedEmail, setCopiedEmail] = React.useState<string | null>(null)
  const [focusedField, setFocusedField] = React.useState<'email' | 'search' | null>(null)
  const [showAllRoles, setShowAllRoles] = React.useState(false)

  // Category and search filter for sample drawer
  const [activeCategory, setActiveCategory] = React.useState<'All' | 'Admin' | 'Staff' | 'Portals'>('All')
  const [quickSearch, setQuickSearch] = React.useState('')

  const handlePhase = (p: LoginPhase) => {
    setPhase(p)
    onPhaseChange?.(p)
  }

  const submit = async (e?: React.FormEvent, overrideEmail?: string, overridePw?: string) => {
    e?.preventDefault()
    if (loading) return
    const targetEmail = (overrideEmail || email).trim()
    const targetPw = overridePw || password

    if (!targetEmail || !targetPw) {
      setError('Please enter both email and password.')
      setErrorField(!targetEmail ? 'email' : 'password')
      setShake(s => s + 1)
      return
    }

    setLoading(true)
    handlePhase('checking')
    setError(null)
    setErrorField(null)

    try {
      const res = await api<{ data: Session; token?: string; defaultModule: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, password: targetPw, selectedLoginType: 'Auto', remember }),
      })
      if (res.token) setToken(res.token)
      handlePhase('success')
      // Hand over smoothly after success animation
      setTimeout(() => onLogin(res.data, res.defaultModule), 680)
    } catch (err) {
      handlePhase('idle')
      setLoading(false)
      const msg = (err as ApiError).message || 'Sign-in failed. Please verify credentials.'
      setError(msg)
      setErrorField(/password/i.test(msg) ? 'password' : /email/i.test(msg) ? 'email' : null)
      setShake(s => s + 1)
    }
  }

  const handleFillSample = (accEmail: string, accPw = 'demo1234') => {
    setEmail(accEmail)
    setPassword(accPw)
    setError(null)
    setErrorField(null)
  }

  const handleCopyEmail = (e: React.MouseEvent, accEmail: string) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(accEmail)
    setCopiedEmail(accEmail)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  const handleQuickLogin = (accEmail: string) => {
    setEmail(accEmail)
    setPassword('demo1234')
    submit(undefined, accEmail, 'demo1234')
  }

  return (
    <div key={shake} className={cn('w-full', shake > 0 && 'anim-nudge')}>
      {/* Header */}
      <div className="mb-5 text-left">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-300">
          <Sparkles className="h-3 w-3 text-orange-400" /> Enterprise Sign-In
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {phase === 'success' ? 'Authenticated' : 'Welcome back'}
        </h2>
        <p className="mt-1 text-xs text-slate-400 sm:text-sm">
          {phase === 'success'
            ? 'Resolving authorized school roles & opening workspace…'
            : 'Sign in with your authorized credentials to continue.'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="space-y-4" noValidate>
        {/* Sample Quick Selector */}
        <div className="rounded-2xl border border-sky-500/25 bg-sky-950/40 p-3 backdrop-blur-md transition-all duration-200">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Sample Login Quick Fill</span>
            </div>
            <span className="rounded-md border border-white/10 bg-slate-900/80 px-2 py-0.5 font-mono text-[10px] text-slate-300">
              PW: <span className="font-semibold text-emerald-400">demo1234</span>
            </span>
          </div>

          {/* Dropdown with all 14 sample accounts */}
          <div className="flex items-center gap-2">
            <select
              value={QUICK_ACCOUNTS.some(a => a.email === email) ? email : ''}
              onChange={e => {
                const target = e.target.value
                if (target) handleFillSample(target)
              }}
              className="input-playful h-9 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-xs text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="" disabled>Choose any of the 14 sample logins to autofill…</option>
              <optgroup label="── Administration ──">
                {QUICK_ACCOUNTS.filter(a => a.category === 'Admin').map(a => (
                  <option key={a.email} value={a.email}>
                    Sample: {a.role} ({a.email})
                  </option>
                ))}
              </optgroup>
              <optgroup label="── Staff & Operations ──">
                {QUICK_ACCOUNTS.filter(a => a.category === 'Staff').map(a => (
                  <option key={a.email} value={a.email}>
                    Sample: {a.role} ({a.email})
                  </option>
                ))}
              </optgroup>
              <optgroup label="── Portals (Students & Parents) ──">
                {QUICK_ACCOUNTS.filter(a => a.category === 'Portals').map(a => (
                  <option key={a.email} value={a.email}>
                    Sample: {a.role} ({a.email})
                  </option>
                ))}
              </optgroup>
            </select>

            {QUICK_ACCOUNTS.find(a => a.email === email) && (
              <Button
                type="button"
                size="sm"
                disabled={loading || phase === 'success'}
                onClick={() => handleQuickLogin(email)}
                className="btn-playful h-9 shrink-0 gap-1.5 rounded-xl bg-sky-600 px-3 text-xs text-white shadow-md hover:bg-sky-500"
                title="Instant sign-in with this sample account"
              >
                <Zap className="h-3.5 w-3.5 text-amber-300" />
                Sign In
              </Button>
            )}
          </div>

          {/* Quick sample chips */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium text-slate-400">Quick sample:</span>
            {[
              { name: 'Super Admin', email: 'admin@nis.edu.in' },
              { name: 'Teacher', email: 'teacher@nis.edu.in' },
              { name: 'Student', email: 'student@nis.edu.in' },
              { name: 'Parent', email: 'parent@nis.edu.in' },
            ].map(chip => (
              <button
                key={chip.email}
                type="button"
                onClick={() => handleFillSample(chip.email)}
                className={cn(
                  'flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-medium transition-all duration-200 active:scale-95',
                  email === chip.email
                    ? 'border-sky-400 bg-sky-500/25 text-sky-200 shadow-sm'
                    : 'border-white/10 bg-slate-900/60 text-slate-300 hover:border-sky-500/40 hover:bg-white/5'
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {chip.name}
              </button>
            ))}
          </div>
        </div>

        {/* Email Address Input */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="email-input"
              className={cn(
                'text-xs font-semibold text-slate-300 transition-colors duration-200',
                focusedField === 'email' && 'text-sky-300',
                errorField === 'email' && 'text-rose-400'
              )}
            >
              Institutional Email
            </Label>
            {QUICK_ACCOUNTS.find(a => a.email === email) && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <CheckCircle2 className="h-2.5 w-2.5" /> Sample {QUICK_ACCOUNTS.find(a => a.email === email)?.role}
              </span>
            )}
          </div>
          <div className="group relative">
            <Mail
              className={cn(
                'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-all duration-300 ease-out',
                focusedField === 'email' && 'scale-110 -rotate-6 text-sky-400'
              )}
            />
            <Input
              id="email-input"
              type="email"
              autoComplete="email"
              placeholder="you@nis.edu.in"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              disabled={loading}
              className={cn(
                'input-playful h-11 rounded-xl border-white/10 bg-slate-950/60 pl-10 text-sm text-white placeholder:text-slate-500 hover:border-white/20',
                errorField === 'email' && 'border-rose-500/70 focus:ring-rose-500/30',
                focusedField === 'email' && !errorField && 'scale-[1.015] border-sky-400/90 bg-slate-950/90 shadow-[0_0_0_3.5px_rgba(56,189,248,0.22),0_8px_24px_-4px_rgba(14,165,233,0.28)]'
              )}
            />
          </div>
        </div>

        {/* Modular PasswordField */}
        <PasswordField
          value={password}
          onChange={setPassword}
          disabled={loading || phase === 'success'}
          hasError={errorField === 'password'}
          onForgotPassword={() => onForgotPassword(email)}
          onFillSample={() => setPassword('demo1234')}
        />

        {/* Remember me & Security Badge */}
        <div className="flex items-center justify-between pt-0.5 text-xs">
          <label className="flex cursor-pointer items-center gap-2 text-slate-300 transition-colors hover:text-white">
            <Checkbox
              checked={remember}
              onCheckedChange={v => setRemember(v === true)}
              className="border-white/20 data-[state=checked]:border-sky-500 data-[state=checked]:bg-sky-500"
            />
            Remember session
          </label>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> SSL 256-bit
          </span>
        </div>

        {/* Modular AuthStatusMessage for Errors */}
        {error && (
          <AuthStatusMessage
            type="error"
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        {/* Modular PrimaryAuthButton */}
        <PrimaryAuthButton
          phase={phase}
          disabled={loading}
        />
      </form>

      {/* Collapsible 14 Roles Grid Drawer */}
      <div className="relative z-10 mt-5 border-t border-white/10 pt-3.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAllRoles(v => !v)}
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300 transition-colors hover:text-sky-300"
          >
            <KeyRound className="h-3.5 w-3.5 text-orange-400" />
            <span>Sample Accounts (14 Roles)</span>
            {showAllRoles ? (
              <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>
          <span className="rounded-full border border-white/10 bg-slate-950/60 px-2 py-0.5 font-mono text-[10px] text-slate-300">
            PW: <span className="font-bold text-emerald-400">demo1234</span>
          </span>
        </div>

        {showAllRoles && (
          <div className="anim-fade-up mt-3 space-y-2">
            {/* Category Filter & Search */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-slate-950/60 p-1">
                {(['All', 'Admin', 'Staff', 'Portals'] as const).map(cat => {
                  const count = cat === 'All' ? QUICK_ACCOUNTS.length : QUICK_ACCOUNTS.filter(a => a.category === cat).length
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all duration-200 active:scale-95',
                        activeCategory === cat
                          ? 'bg-sky-500 font-semibold text-white shadow-sm'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      {cat} <span className="text-[10px] opacity-70">({count})</span>
                    </button>
                  )
                })}
              </div>

              <div className="relative w-full sm:w-36">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter role..."
                  value={quickSearch}
                  onChange={e => setQuickSearch(e.target.value)}
                  onFocus={() => setFocusedField('search')}
                  onBlur={() => setFocusedField(null)}
                  className={cn(
                    'input-playful h-7 w-full rounded-lg border border-white/10 bg-slate-950/80 pl-7 pr-2 text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500',
                    focusedField === 'search' && 'scale-[1.02] border-sky-400'
                  )}
                />
              </div>
            </div>

            {/* Grid of Accounts */}
            <div className="custom-scrollbar grid max-h-[220px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {QUICK_ACCOUNTS.filter(acc => {
                const matchCat = activeCategory === 'All' || acc.category === activeCategory
                const q = quickSearch.toLowerCase().trim()
                const matchQuery = !q || acc.role.toLowerCase().includes(q) || acc.label.toLowerCase().includes(q) || acc.email.toLowerCase().includes(q)
                return matchCat && matchQuery
              }).map(acc => (
                <div
                  key={acc.email}
                  className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-slate-950/60 p-2.5 transition-all duration-200 hover:border-sky-500/50 hover:bg-sky-500/5 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200 group-hover:text-sky-300">
                        {acc.icon} {acc.role}
                      </span>
                      <span className="rounded border border-sky-500/30 bg-sky-500/15 px-1.5 py-0.2 font-mono text-[9px] font-semibold tracking-wider uppercase text-sky-300">
                        Sample
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-1">
                      <span className="truncate font-mono text-[11px] text-slate-400 group-hover:text-slate-300">
                        {acc.email}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyEmail(e, acc.email)}
                        aria-label={`Copy ${acc.email}`}
                        className="shrink-0 rounded p-1 text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
                        title="Copy sample email"
                      >
                        {copiedEmail === acc.email ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>

                    <span className="mt-0.5 block line-clamp-1 text-[10px] text-slate-400">
                      {acc.label}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5 border-t border-white/5 pt-1.5">
                    <button
                      type="button"
                      disabled={loading || phase === 'success'}
                      onClick={() => handleFillSample(acc.email)}
                      className="flex-1 rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1 text-center text-[10px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 active:scale-95"
                    >
                      Autofill
                    </button>
                    <button
                      type="button"
                      disabled={loading || phase === 'success'}
                      onClick={() => handleQuickLogin(acc.email)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-sky-600/80 px-2 py-1 text-[10px] font-semibold text-white shadow-sm transition-colors hover:bg-sky-500 disabled:opacity-50 active:scale-95"
                    >
                      <Zap className="h-2.5 w-2.5 text-amber-300" />
                      Sign In
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
