'use client'

import * as React from 'react'
import { useErp, Session } from '@/lib/store'
import { api, ApiError } from '@/lib/api-client'
import { can } from '@/lib/rbac'
import { LoginScreen } from './LoginScreen'
import { AppShell } from './AppShell'
import { BrandSplash, BrandMark } from './brand'
import { MODULE_REGISTRY } from '@/lib/registry'
import { Button } from '@/components/ui/button'
import { ShieldAlert } from 'lucide-react'

export function ErpApp() {
  const { session, setSession, activeModule, setModule } = useErp()
  const [booting, setBooting] = React.useState(true)

  React.useEffect(() => {
    api<{ data: Session }>('/api/auth/me')
      .then(res => setSession(res.data))
      .catch(() => setSession(null))
      .finally(() => setBooting(false))
  }, [setSession])

  // Role-appropriate landing: parents/students go to their portal instead of the admin dashboard
  React.useEffect(() => {
    if (!session) return
    if (activeModule === 'dashboard') {
      if (session.role === 'PARENT') setModule('parent-portal')
      else if (session.role === 'STUDENT') setModule('student-portal')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const onLogin = (s: Session, defaultModule: string) => {
    setSession(s)
    setModule(defaultModule)
  }

  if (booting) return <BrandSplash />
  if (!session) return <LoginScreen onLogin={onLogin} />

  // Enforce RBAC on the client too (API enforces server-side)
  const allowed = can(session.role, activeModule) ||
    (activeModule === 'dashboard' && session.role !== 'PARENT' && session.role !== 'STUDENT')
  const ModuleView = MODULE_REGISTRY[activeModule] || MODULE_REGISTRY.dashboard

  return (
    <AppShell>
      {allowed ? (
        <div key={activeModule} className="anim-page-in">
          <React.Suspense fallback={<ModuleFallback />}>
            <ModuleView />
          </React.Suspense>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Access restricted</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Your role ({session.role.replace(/_/g, ' ')}) does not have permission to open this module.
            </p>
          </div>
          <Button variant="outline" onClick={() => setModule(session.role === 'PARENT' ? 'parent-portal' : session.role === 'STUDENT' ? 'student-portal' : 'dashboard')}>
            {session.role === 'PARENT' ? 'Go to Parent Portal' : session.role === 'STUDENT' ? 'Go to My Space' : 'Back to Dashboard'}
          </Button>
        </div>
      )}
    </AppShell>
  )
}

function ModuleFallback() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <BrandMark tileClassName="h-10 w-10" breathe />
      <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
        <div className="indeterminate-bar h-full rounded-full bg-primary/70" />
      </div>
    </div>
  )
}
