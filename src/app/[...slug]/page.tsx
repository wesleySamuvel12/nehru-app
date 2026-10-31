'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'

// Catch-all route to allow client-side SPA routing and page reloads on any subpath
const ErpApp = dynamic(() => import('@/components/erp/ErpApp').then((m) => m.ErpApp), {
  ssr: false,
})

export default function CatchAllPage() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return <ErpApp />
}
