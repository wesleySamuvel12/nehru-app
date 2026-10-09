'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { api, ApiError, setToken } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { BrandMark } from '@/components/erp/brand'
import { Session } from '@/lib/store'
import { CursorFlowCanvas } from '@/components/erp/CursorFlowCanvas'
import {
  Lock, Mail, Loader2, ShieldCheck, ArrowRight, Eye, EyeOff,
  CheckCircle2, Sparkles, KeyRound, Crown, ShieldAlert, BookOpen,
  Briefcase, HeartHandshake, GraduationCap, Users, Heart, Library,
  Bus, Home, Stethoscope, Layers, Search
} from 'lucide-react'

const QUICK_ACCOUNTS = [
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

type LoginPhase = 'idle' | 'checking' | 'success'
type LoginType = 'Auto' | 'Super Admin' | 'School Admin'

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

  // Quick Access Category and Search Filter
  const [activeCategory, setActiveCategory] = React.useState<'All' | 'Admin' | 'Staff' | 'Portals'>('All')
  const [quickSearch, setQuickSearch] = React.useState('')
  const [loginType, setLoginType] = React.useState<LoginType>('Auto')

  // Card 3D tilt & dynamic spotlight tracking
  const cardRef = React.useRef<HTMLDivElement | null>(null)
  const [transformStyle, setTransformStyle] = React.useState('perspective(1000px) rotateX(0deg) rotateY(0deg)')

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    cardRef.current.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`)
    cardRef.current.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`)

    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -4
    const rotateY = ((x - centerX) / centerX) * 4
    setTransformStyle(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.005, 1.005, 1.005)`)
  }

  const handleMouseLeave = () => {
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)')
  }

  const submit = async (e?: React.FormEvent, overrideEmail?: string, overridePw?: string, overrideLoginType?: LoginType) => {
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
    setPhase('checking')
    setError(null)
    setErrorField(null)

    try {
      const res = await api<{ data: Session; token?: string; defaultModule: string }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email: targetEmail, password: targetPw, selectedLoginType: overrideLoginType || loginType, remember }),
      })
      if (res.token) setToken(res.token)
      setPhase('success')
      setTimeout(() => onLogin(res.data, res.defaultModule), 550)
    } catch (err) {
      setPhase('idle')
      setLoading(false)
      const msg = (err as ApiError).message || 'Sign-in failed. Please try again.'
      setError(msg)
      setErrorField(/password/i.test(msg) ? 'password' : /email/i.test(msg) ? 'email' : null)
      setShake(s => s + 1)
    }
  }

  const handleQuickLogin = (accEmail: string) => {
    const account = QUICK_ACCOUNTS.find(item => item.email === accEmail)
    if (account?.role === 'Super Admin' || account?.role === 'School Admin') {
      setLoginType(account.role)
    } else {
      setLoginType('Auto')
    }
    setEmail(accEmail)
    setPassword('demo1234')
    submit(undefined, accEmail, 'demo1234', account?.role === 'Super Admin' || account?.role === 'School Admin' ? account.role : 'Auto')
  }

  // Password strength calculation
  const pwStrength = React.useMemo(() => {
    if (!password) return 0
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return 3
    if (password.length >= 6) return 2
    return 1
  }, [password])

  return (
    <div className="mesh-bg relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-slate-100 selection:bg-sky-500 selection:text-white sm:px-6 lg:px-8">
      {/* Dynamic Cursor Flow Canvas */}
      <CursorFlowCanvas />

      {/* Ambient glowing color halos */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-sky-600/15 blur-[130px] anim-float" style={{ ['--delay' as string]: '0s' }} />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-orange-500/10 blur-[140px] anim-float" style={{ ['--delay' as string]: '2s' }} />

      {/* Main Centered Universal Form Container */}
      <div className="relative z-20 flex w-full max-w-[560px] flex-col items-center">
        
        {/* School Logo & Brand Header */}
        <div className="anim-rise mb-6 flex flex-col items-center text-center" style={{ ['--delay' as string]: '60ms' }}>
          <div className="group relative mb-3 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-sky-500 to-orange-500 blur-md opacity-40 transition-opacity duration-300 group-hover:opacity-75" />
            <BrandMark tileClassName="relative h-14 w-14 shadow-xl" breathe />
          </div>
          <h1 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            Nehru International
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-sky-400 uppercase">
            <span>School ERP</span>
            <span className="h-1 w-1 rounded-full bg-orange-400" />
            <span className="text-slate-400">A Tradition of Excellence</span>
          </div>
        </div>

        {/* Universal 3D Glassmorphic Card */}
        <div
          key={shake}
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ transform: transformStyle, ['--delay' as string]: '180ms' }}
          className={cn(
            'spotlight-card anim-rise relative w-full rounded-3xl border border-white/15 bg-slate-900/85 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.7)] transition-all duration-200 ease-out',
            shake > 0 && 'anim-nudge'
          )}
        >
          {/* Card Header */}
          <div className="relative z-10 mb-6 text-center">
            <div className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-300">
              <Sparkles className="h-3 w-3 text-orange-400" /> Unified Portal Sign-In
            </div>
            <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
              {phase === 'success' ? 'Authenticated' : 'Welcome Back'}
            </h2>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              {phase === 'success'
                ? 'Resolving permissions & generating sidebar…'
                : 'Sign in to access your school workspace.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="relative z-10 space-y-4" noValidate>
            <div className="space-y-1.5 text-left">
              <Label className="text-xs font-semibold text-slate-300">Login type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['Auto', 'Super Admin', 'School Admin'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLoginType(type)}
                    disabled={loading}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors',
                      loginType === type
                        ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                        : 'border-white/10 bg-slate-950/50 text-slate-400 hover:border-white/25 hover:text-white'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Email / Username Input */}
            <div className="space-y-1.5 text-left">
              <Label htmlFor="email" className={cn('text-xs font-semibold text-slate-300 transition-colors', errorField === 'email' && 'text-rose-400')}>
                Email Address
              </Label>
              <div className="group relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@nis.edu.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                  className={cn(
                    'h-11 rounded-xl border-white/10 bg-slate-950/60 pl-10 text-sm text-white placeholder:text-slate-500 transition-all duration-200 hover:border-white/20 focus:border-sky-500 focus:bg-slate-950/80 focus:ring-2 focus:ring-sky-500/30',
                    errorField === 'email' && 'border-rose-500/60 focus:ring-rose-500/30'
                  )}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className={cn('text-xs font-semibold text-slate-300 transition-colors', errorField === 'password' && 'text-rose-400')}>
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => setError('Password reset is handled by system administrators.')}
                  className="text-[11px] text-slate-400 hover:text-sky-400 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-400" />
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  className={cn(
                    'h-11 rounded-xl border-white/10 bg-slate-950/60 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 transition-all duration-200 hover:border-white/20 focus:border-sky-500 focus:bg-slate-950/80 focus:ring-2 focus:ring-sky-500/30',
                    errorField === 'password' && 'border-rose-500/60 focus:ring-rose-500/30'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="flex flex-1 gap-1">
                    <div className={cn('h-1 flex-1 rounded-full transition-colors duration-300', pwStrength >= 1 ? 'bg-amber-400' : 'bg-slate-700')} />
                    <div className={cn('h-1 flex-1 rounded-full transition-colors duration-300', pwStrength >= 2 ? 'bg-emerald-400' : 'bg-slate-700')} />
                    <div className={cn('h-1 flex-1 rounded-full transition-colors duration-300', pwStrength >= 3 ? 'bg-sky-400' : 'bg-slate-700')} />
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">
                    {pwStrength === 1 ? 'Basic' : pwStrength === 2 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}
            </div>

            {/* Remember Me & Security Badge */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex cursor-pointer items-center gap-2 text-slate-300 hover:text-white transition-colors">
                <Checkbox
                  checked={remember}
                  onCheckedChange={v => setRemember(v === true)}
                  className="border-white/20 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                />
                Remember me
              </label>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> SSL Encrypted
              </span>
            </div>

            {/* Error Alert */}
            {error && (
              <div role="alert" className="anim-pop rounded-xl border border-rose-500/30 bg-rose-500/15 px-3.5 py-2.5 text-xs text-rose-300 text-left">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || phase === 'success'}
              className={cn(
                'group relative h-12 w-full overflow-hidden rounded-xl font-semibold text-white shadow-xl transition-all duration-300',
                phase === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-600 scale-[1.01]'
                  : 'bg-gradient-to-r from-sky-600 via-sky-500 to-orange-500 hover:from-sky-500 hover:to-orange-400 hover:shadow-sky-500/25'
              )}
            >
              <div className="relative z-10 flex items-center justify-center gap-2">
                {phase === 'idle' && (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
                {phase === 'checking' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying Credentials…
                  </>
                )}
                {phase === 'success' && (
                  <>
                    <CheckCircle2 className="h-4 w-4 animate-bounce" /> Authentication Successful
                  </>
                )}
              </div>
            </Button>
          </form>

          {/* Quick Access Demo Login Section (All 14 Roles) */}
          <div className="relative z-10 mt-6 border-t border-white/10 pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-orange-400" /> Quick Access (All 14 User Roles)
              </span>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-950/60 px-2 py-0.5 rounded-full border border-white/10">
                Password: demo1234
              </span>
            </div>

            {/* Category Filter Tabs & Quick Search */}
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-950/60 p-1 border border-white/10">
                {(['All', 'Admin', 'Staff', 'Portals'] as const).map(cat => {
                  const count = cat === 'All' ? QUICK_ACCOUNTS.length : QUICK_ACCOUNTS.filter(a => a.category === cat).length
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        'px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all duration-200',
                        activeCategory === cat
                          ? 'bg-sky-500 text-white shadow-sm font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      )}
                    >
                      {cat} <span className="opacity-70 text-[10px]">({count})</span>
                    </button>
                  )
                })}
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-36">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter role..."
                  value={quickSearch}
                  onChange={e => setQuickSearch(e.target.value)}
                  className="h-7 w-full rounded-lg border border-white/10 bg-slate-950/80 pl-7 pr-2 text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Quick Access Account Cards Grid */}
            <div className="max-h-[220px] overflow-y-auto pr-1 custom-scrollbar grid grid-cols-2 gap-2 sm:grid-cols-3">
              {QUICK_ACCOUNTS.filter(acc => {
                const matchCat = activeCategory === 'All' || acc.category === activeCategory
                const q = quickSearch.toLowerCase().trim()
                const matchQuery = !q || acc.role.toLowerCase().includes(q) || acc.label.toLowerCase().includes(q) || acc.email.toLowerCase().includes(q)
                return matchCat && matchQuery
              }).map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={loading || phase === 'success'}
                  onClick={() => handleQuickLogin(acc.email)}
                  className="group relative flex flex-col items-start rounded-xl border border-white/10 bg-slate-950/50 p-2.5 text-left transition-all duration-200 hover:border-sky-500/50 hover:bg-sky-500/10 hover:shadow-md disabled:opacity-50"
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200 group-hover:text-sky-300">
                    {acc.icon} {acc.role}
                  </span>
                  <span className="mt-0.5 text-[10px] text-slate-400 truncate w-full">
                    {acc.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="anim-rise mt-6 flex flex-wrap items-center justify-center gap-4 text-center text-xs text-slate-400" style={{ ['--delay' as string]: '300ms' }}>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-sky-400" /> Dynamic Role-Based Access Control
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-600" />
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-orange-400" /> Nehru International ERP v2.4
          </span>
        </div>
      </div>
    </div>
  )
}
