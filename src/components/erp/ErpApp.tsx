'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { useErp, Session } from '@/lib/store'
import { api } from '@/lib/api-client'
import { BrandSplash } from './brand'
import { LoginScreen } from './LoginScreen'

// Dynamically import the heavy role module registries ONLY when user is authenticated
const AuthenticatedApp = dynamic(
  () => import('./AuthenticatedApp').then(m => m.AuthenticatedApp),
  {
    loading: () => <BrandSplash message="Preparing your school workspace…" />,
    ssr: false,
  }
)

export function ErpApp() {
  const { session, setSession, setModule } = useErp()
  const [booting, setBooting] = React.useState(true)

  React.useEffect(() => {
    api<{ data: Session }>('/api/auth/me')
      .then(res => setSession(res.data))
      .catch(() => setSession(null))
      .finally(() => setBooting(false))
  }, [setSession])

  const onLogin = (s: Session, defaultModule: string) => {
    setSession(s)
    setModule(defaultModule)
  }

  if (booting) return <BrandSplash />
  if (!session) return <LoginScreen onLogin={onLogin} />

  return <AuthenticatedApp />
}
