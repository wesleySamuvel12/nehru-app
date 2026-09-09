'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/*
 * Greenwood International School — brand assets.
 * The mark is the school-provided "Z" logo (public/logo.svg) inlined so it can
 * sit on branded tiles and inherit the breathing animation defined there.
 */

export const SCHOOL_NAME = 'Greenwood International School'
export const SCHOOL_SHORT = 'Greenwood'

/** The school's logo mark rendered on a branded tile. */
export function BrandMark({ className, tileClassName, breathe = false }: {
  className?: string
  tileClassName?: string
  breathe?: boolean
}) {
  return (
    <span aria-hidden className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),var(--shadow-soft)]', tileClassName)}>
      {/* ambient glow */}
      <span className="pointer-events-none absolute -right-1/3 -top-1/3 h-full w-full rounded-full bg-emerald-300/25 blur-lg" />
      <svg viewBox="0 0 30 30" className={cn('relative h-[68%] w-[68%]', className)} fill="none">
        <g className={breathe ? 'anim-breathe' : undefined}>
          <path fill="#fff" d="M15.47,7.1l-1.3,1.85c-0.2,0.29-0.54,0.47-0.9,0.47h-7.1V7.09C6.16,7.1,15.47,7.1,15.47,7.1z" />
          <path fill="#fff" d="M24.3,7.1L13.14,22.91H5.7L16.86,7.1H24.3z" />
          <path fill="#fff" d="M14.53,22.91l1.31-1.86c0.2-0.29,0.54-0.47,0.9-0.47h7.09v2.33H14.53z" />
        </g>
      </svg>
    </span>
  )
}

/** Full lockup — mark + school name + optional descriptor. */
export function BrandLogo({ compact = false, size = 'md', className }: {
  compact?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dims = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-12 w-12' }[size]
  const text = { sm: 'text-[13px]', md: 'text-sm', lg: 'text-lg' }[size]
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <BrandMark tileClassName={dims} />
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className={cn('block truncate font-display font-bold tracking-tight', text)}>Greenwood</span>
          <span className="block truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">International School</span>
        </span>
      )}
    </span>
  )
}

/** Branded full-screen loading experience. */
export function BrandSplash({ message = 'Preparing your school workspace…' }: { message?: string }) {
  return (
    <div role="status" aria-label="Loading" className="mesh-bg fixed inset-0 z-[100] flex min-h-screen flex-col items-center justify-center gap-6 bg-emerald-950 text-emerald-50">
      {/* floating ambient orbs */}
      <div className="pointer-events-none absolute left-[12%] top-[18%] h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl anim-float" style={{ ['--delay' as string]: '0.4s' }} />
      <div className="pointer-events-none absolute right-[14%] top-[30%] h-52 w-52 rounded-full bg-teal-400/10 blur-3xl anim-float" style={{ ['--delay' as string]: '1.6s' }} />
      <div className="pointer-events-none absolute bottom-[16%] left-[28%] h-44 w-44 rounded-full bg-lime-300/10 blur-3xl anim-float" style={{ ['--delay' as string]: '2.4s' }} />

      <div className="anim-rise" style={{ ['--delay' as string]: '60ms' }}>
        <BrandMark tileClassName="h-16 w-16" breathe />
      </div>
      <div className="anim-rise text-center" style={{ ['--delay' as string]: '160ms' }}>
        <p className="font-display text-xl font-bold tracking-tight">Greenwood International School</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-emerald-300/80">Unified School ERP</p>
      </div>
      <div className="anim-fade-in w-48 overflow-hidden rounded-full bg-emerald-400/15" style={{ ['--delay' as string]: '260ms' }}>
        <div className="indeterminate-bar h-0.5 rounded-full bg-emerald-300" />
      </div>
      <p className="anim-fade-in text-xs text-emerald-200/70" style={{ ['--delay' as string]: '340ms' }}>{message}</p>
    </div>
  )
}
