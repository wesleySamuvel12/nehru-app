'use client'

import * as React from 'react'
import { CursorFlowCanvas } from '@/components/erp/CursorFlowCanvas'

interface AnimatedBackgroundProps {
  activeRole?: string
}

export function AnimatedBackground({ activeRole = 'DEFAULT' }: AnimatedBackgroundProps) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-slate-950">
      {/* Dynamic Cursor Flow Canvas (Fluid interactive nodes) */}
      <CursorFlowCanvas activeRole={activeRole} />

      {/* Atmospheric glowing color halos (Deep Navy / Sky Blue / Emblem Orange) */}
      <div
        className="pointer-events-none absolute -top-48 -left-48 h-[650px] w-[650px] rounded-full bg-sky-600/15 blur-[140px] anim-float"
        style={{ ['--delay' as string]: '0s' }}
      />
      <div
        className="pointer-events-none absolute top-1/4 -right-48 h-[700px] w-[700px] rounded-full bg-orange-500/10 blur-[150px] anim-float"
        style={{ ['--delay' as string]: '2.5s' }}
      />
      <div
        className="pointer-events-none absolute -bottom-48 left-1/4 h-[550px] w-[550px] rounded-full bg-indigo-600/10 blur-[130px] anim-float"
        style={{ ['--delay' as string]: '4.5s' }}
      />

      {/* Fine architectural dot grid overlay for high-end SaaS feel */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  )
}

