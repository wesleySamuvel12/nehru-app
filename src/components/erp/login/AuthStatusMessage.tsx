'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

interface AuthStatusMessageProps {
  type?: 'error' | 'success' | 'info'
  message: string | null
  onDismiss?: () => void
  className?: string
}

export function AuthStatusMessage({
  type = 'error',
  message,
  onDismiss,
  className,
}: AuthStatusMessageProps) {
  if (!message) return null

  const isError = type === 'error'
  const isSuccess = type === 'success'

  return (
    <div
      role="alert"
      className={cn(
        'anim-pop relative flex items-start gap-2.5 rounded-xl border p-3 text-xs backdrop-blur-md transition-all',
        isError && 'border-rose-500/30 bg-rose-500/15 text-rose-300',
        isSuccess && 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
        !isError && !isSuccess && 'border-sky-500/30 bg-sky-500/15 text-sky-300',
        className
      )}
    >
      <div className="shrink-0 pt-0.5">
        {isError && <AlertCircle className="h-4 w-4 text-rose-400" />}
        {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
        {!isError && !isSuccess && <Info className="h-4 w-4 text-sky-400" />}
      </div>
      <div className="flex-1 leading-relaxed">
        {message}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

