'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'

interface PrimaryAuthButtonProps {
  phase: 'idle' | 'checking' | 'success'
  disabled?: boolean
  label?: string
  className?: string
}

export function PrimaryAuthButton({
  phase,
  disabled = false,
  label = 'Sign In to Nehru ERP',
  className,
}: PrimaryAuthButtonProps) {
  const isChecking = phase === 'checking'
  const isSuccess = phase === 'success'

  return (
    <Button
      type="submit"
      disabled={disabled || isChecking || isSuccess}
      className={cn(
        'btn-playful group relative h-12 w-full overflow-hidden rounded-xl font-semibold text-white shadow-xl',
        isSuccess
          ? 'bg-emerald-600 scale-[1.02] shadow-[0_0_30px_rgba(16,185,129,0.4)]'
          : 'bg-gradient-to-r from-sky-600 via-sky-500 to-orange-500 hover:from-sky-500 hover:to-orange-400',
        className
      )}
    >
      <div className="relative z-10 flex items-center justify-center gap-2">
        {phase === 'idle' && (
          <>
            <span>{label}</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </>
        )}
        {phase === 'checking' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-white" />
            <span className="tracking-wide">Authenticating…</span>
          </>
        )}
        {phase === 'success' && (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-100 anim-check-bounce" />
            <span className="font-bold tracking-wide">Access Granted</span>
          </>
        )}
      </div>
    </Button>
  )
}

