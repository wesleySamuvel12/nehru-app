'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'

// Client-only mount avoids SSR hydration mismatches caused by browser extensions
const ErpApp = dynamic(() => import('@/components/erp/ErpApp').then((m) => m.ErpApp), {
  ssr: false,
})

export default function Page() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return <ErpApp />
}
