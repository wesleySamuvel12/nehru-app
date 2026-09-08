'use client'

import * as React from 'react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GraduationCap, Lock, Mail, Loader2, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Session, useErp } from '@/lib/store'

const DEMO_ACCOUNTS: { role: string; email: string; label: string }[] = [
  { role: 'Super Admin', email: 'admin@greenwood.edu.in', label: 'Full system control' },
  { role: 'Principal', email: 'principal@greenwood.edu.in', label: 'Management & approvals' },
  { role: 'Teacher', email: 'teacher@greenwood.edu.in', label: 'Classes & academics' },
  { role: 'Accountant', email: 'accounts@greenwood.edu.in', label: 'Fees & finance' },
  { role: 'Parent', email: 'parent@greenwood.edu.in', label: 'Child dashboard' },
  { role: 'Student', email: 'student@greenwood.edu.in', label: 'My learning space' },
]

export function LoginScreen({ onLogin }: { onLogin: (s: Session, defaultModule: string) => void }) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPw, setShowPw] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const submit = async (e?: React.FormEvent, overrideEmail?: string, overridePw?: string) => {
    e?.preventDefault()
    const em = overrideEmail || email
    const pw = overridePw || password
    if (!em || !pw) { setError('Please enter both email and password.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await api<{ data: Session; defaultModule: string }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email: em, password: pw }),
      })
      onLogin(res.data, res.defaultModule)
    } catch (err) {
      setError((err as ApiError).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-emerald-950 p-10 text-emerald-50 lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-800/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-teal-700/30 blur-3xl" />
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/15 ring-1 ring-emerald-300/30">
            <GraduationCap className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">Greenwood ERP</p>
            <p className="text-xs text-emerald-300/80">Unified School Management Platform</p>
          </div>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            One platform for every corner of your school.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-emerald-200/80">
            Admissions, academics, attendance, examinations, fees, HR, transport, hostel,
            library, health and communication — connected in a single secure system.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[['20+', 'Modules'], ['14', 'Roles'], ['100%', 'Connected']].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-emerald-900/50 px-3 py-4 ring-1 ring-emerald-700/40">
                <p className="text-xl font-bold text-emerald-300">{v}</p>
                <p className="mt-0.5 text-xs text-emerald-200/70">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="flex items-center gap-2 text-xs text-emerald-300/60">
          <ShieldCheck className="h-4 w-4" /> Role-based access · Audit logged · Encrypted sessions
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Greenwood ERP</p>
              <p className="text-xs text-muted-foreground">Greenwood International School</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your workspace to continue.</p>

          <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" autoComplete="email" placeholder="you@greenwood.edu.in"
                  className="h-10 pl-9" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setError('Password reset is handled by your system administrator in this demo.')}>
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type={showPw ? 'text' : 'password'} autoComplete="current-password"
                  placeholder="••••••••" className="h-10 pl-9 pr-9"
                  value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPw(v => !v)} aria-label="Toggle password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            <Button type="submit" className="h-10 w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="ml-2 h-4 w-4" />}
              Sign In
            </Button>
          </form>

          <div className="my-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Demo accounts</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map(acc => (
              <button key={acc.email} type="button" disabled={loading}
                onClick={() => submit(undefined, acc.email, 'demo1234')}
                className="group rounded-lg border p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/50 disabled:opacity-50">
                <p className="text-sm font-medium">{acc.role}</p>
                <p className="truncate text-xs text-muted-foreground">{acc.label}</p>
              </button>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            All demo accounts use password <code className="rounded bg-muted px-1 py-0.5 font-mono">demo1234</code>
          </p>
        </div>
      </div>
    </div>
  )
}
