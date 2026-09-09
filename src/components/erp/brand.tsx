'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/*
 * Nehru International School — brand assets.
 * The mark is the school-provided NIS emblem (public/nis-mark.png: blue book,
 * NIS shield, orange sun) served from /public; the full lockup with the
 * "A Tradition of Excellence" tagline lives at /public/nis-logo.png.
 */

export const SCHOOL_NAME = 'Nehru International School'
export const SCHOOL_SHORT = 'NIS'
export const SCHOOL_TAGLINE = 'A Tradition of Excellence'
export const SCHOOL_LOGO = '/nis-mark.png'
export const SCHOOL_LOGO_FULL = '/nis-logo.png'

/** The school's logo emblem rendered on a clean white tile. */
export function BrandMark({ className, tileClassName, breathe = false }: {
  className?: string
  tileClassName?: string
  breathe?: boolean
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] border border-border/60 bg-white shadow-[var(--shadow-soft)]',
        tileClassName,
      )}
    >
      {/* Brand-tinted ambient glow */}
      <span className="pointer-events-none absolute -right-1/3 -top-1/3 h-full w-full rounded-full bg-[oklch(0.62_0.14_240)]/12 blur-lg" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SCHOOL_LOGO}
        alt=""
        draggable={false}
        className={cn('relative h-[78%] w-[86%] object-contain mix-blend-multiply', breathe && 'anim-breathe', className)}
      />
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
          <span className={cn('block truncate font-display font-bold tracking-tight', text)}>Nehru International</span>
          <span className="block truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">School · A Tradition of Excellence</span>
        </span>
      )}
    </span>
  )
}

/** Branded full-screen loading experience. */
export function BrandSplash({ message = 'Preparing your school workspace…' }: { message?: string }) {
  return (
    <div role="status" aria-label="Loading" className="mesh-bg fixed inset-0 z-[100] flex min-h-screen flex-col items-center justify-center gap-6 bg-[oklch(0.22_0.045_248)] text-[oklch(0.96_0.01_240)]">
      {/* floating ambient orbs — brand blue + the signature orange dot */}
      <div className="pointer-events-none absolute left-[12%] top-[18%] h-40 w-40 rounded-full bg-[oklch(0.62_0.14_240)]/15 blur-3xl anim-float" style={{ ['--delay' as string]: '0.4s' }} />
      <div className="pointer-events-none absolute right-[14%] top-[30%] h-52 w-52 rounded-full bg-[oklch(0.66_0.18_46)]/10 blur-3xl anim-float" style={{ ['--delay' as string]: '1.6s' }} />
      <div className="pointer-events-none absolute bottom-[16%] left-[28%] h-44 w-44 rounded-full bg-[oklch(0.68_0.1_200)]/10 blur-3xl anim-float" style={{ ['--delay' as string]: '2.4s' }} />

      <div className="anim-rise" style={{ ['--delay' as string]: '60ms' }}>
        <BrandMark tileClassName="h-16 w-16 rounded-2xl" breathe />
      </div>
      <div className="anim-rise text-center" style={{ ['--delay' as string]: '160ms' }}>
        <p className="font-display text-xl font-bold tracking-tight">Nehru International School</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-[oklch(0.75_0.09_240)]/90">A Tradition of Excellence</p>
      </div>
      <div className="anim-fade-in w-48 overflow-hidden rounded-full bg-white/12" style={{ ['--delay' as string]: '260ms' }}>
        <div className="indeterminate-bar h-0.5 rounded-full bg-[oklch(0.72_0.125_240)]" />
      </div>
      <p className="anim-fade-in text-xs text-[oklch(0.9_0.01_240)]/65" style={{ ['--delay' as string]: '340ms' }}>{message}</p>
    </div>
  )
}
