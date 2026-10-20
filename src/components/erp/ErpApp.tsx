'use client'

import * as React from 'react'
import { useErp, Session } from '@/lib/store'
import { api, ApiError } from '@/lib/api-client'
import { can } from '@/lib/rbac'
import { AppShell } from './AppShell'
import { BrandSplash, BrandMark } from './brand'
import { LoginScreen } from './LoginScreen'
import { SUPER_ADMIN_MODULE_REGISTRY } from '@/role/super-admin/modules/registry'
import { SCHOOL_ADMIN_MODULE_REGISTRY } from '@/role/school-admin/modules/registry'
import { PRINCIPAL_MODULE_REGISTRY } from '@/role/principal/modules/registry'
import { HOD_MODULE_REGISTRY } from '@/role/hod/modules/registry'
import { TEACHER_MODULE_REGISTRY } from '@/role/teacher/modules/registry'
import { STUDENT_MODULE_REGISTRY } from '@/role/student/modules/registry'
import { PARENT_MODULE_REGISTRY } from '@/role/parent/modules/registry'
import { ACCOUNTANT_MODULE_REGISTRY } from '@/role/accountant/modules/registry'
import { HR_MODULE_REGISTRY } from '@/role/hr/modules/registry'
import { LIBRARIAN_MODULE_REGISTRY } from '@/role/librarian/modules/registry'
import { TRANSPORT_MODULE_REGISTRY } from '@/role/transport/modules/registry'
import { HOSTEL_MODULE_REGISTRY } from '@/role/hostel/modules/registry'
import { SECURITY_MODULE_REGISTRY } from '@/role/security/modules/registry'
import { HEALTH_MODULE_REGISTRY } from '@/role/health/modules/registry'
import { COUNSELLOR_MODULE_REGISTRY } from '@/role/counsellor/modules/registry'
import { getRoleLandingModule } from '@/role'
import { ROLE_APPLICATIONS } from '@/role/client'
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

  // Role-appropriate landing: redirect if role cannot access the active module
  React.useEffect(() => {
    if (!session) return
    if (!can(session.role, activeModule)) {
      setModule(getRoleLandingModule(session.role))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, activeModule])

  const onLogin = (s: Session, defaultModule: string) => {
    setSession(s)
    setModule(defaultModule)
  }

  if (booting) return <BrandSplash />
  if (!session) return <LoginScreen onLogin={onLogin} />

  // Enforce RBAC on the client too (API enforces server-side)
  const allowed = can(session.role, activeModule)
  const roleModuleRegistries = {
    SUPER_ADMIN: SUPER_ADMIN_MODULE_REGISTRY,
    SCHOOL_ADMIN: SCHOOL_ADMIN_MODULE_REGISTRY,
    PRINCIPAL: PRINCIPAL_MODULE_REGISTRY,
    HOD: HOD_MODULE_REGISTRY,
    TEACHER: TEACHER_MODULE_REGISTRY,
    STUDENT: STUDENT_MODULE_REGISTRY,
    PARENT: PARENT_MODULE_REGISTRY,
    ACCOUNTANT: ACCOUNTANT_MODULE_REGISTRY,
    HR: HR_MODULE_REGISTRY,
    LIBRARIAN: LIBRARIAN_MODULE_REGISTRY,
    TRANSPORT: TRANSPORT_MODULE_REGISTRY,
    WARDEN: HOSTEL_MODULE_REGISTRY,
    SECURITY: SECURITY_MODULE_REGISTRY,
    NURSE: HEALTH_MODULE_REGISTRY,
    COUNSELLOR: COUNSELLOR_MODULE_REGISTRY,
  } as const
  const roleModuleRegistry = roleModuleRegistries[session.role as keyof typeof roleModuleRegistries]
  const ModuleView = roleModuleRegistry[activeModule] || roleModuleRegistry.dashboard
  const roleApplication = ROLE_APPLICATIONS[session.role as keyof typeof ROLE_APPLICATIONS]
  const isRoleLanding = activeModule === getRoleLandingModule(session.role)
  const ActiveView = isRoleLanding && roleApplication ? roleApplication : ModuleView

  return (
    <AppShell>
      {allowed ? (
        <div key={activeModule} className="anim-page-in">
          <React.Suspense fallback={<ModuleFallback />}>
            <ActiveView />
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
