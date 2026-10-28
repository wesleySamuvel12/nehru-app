'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Eye, EyeOff, KeyRound } from 'lucide-react'

interface PasswordFieldProps {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  hasError?: boolean
  onForgotPassword?: () => void
  onFillSample?: () => void
}

export function PasswordField({
  id = 'password-input',
  value,
  onChange,
  disabled = false,
  hasError = false,
  onForgotPassword,
  onFillSample,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)

  // Password strength logic
  const strength = React.useMemo(() => {
    if (!value) return 0
    if (value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value)) return 3
    if (value.length >= 6) return 2
    return 1
  }, [value])

  return (
    <div className="space-y-1.5 text-left">
      <div className="flex items-center justify-between">
        <Label
          htmlFor={id}
          className={cn(
            'text-xs font-semibold text-slate-300 transition-colors duration-200',
            isFocused && 'text-sky-300',
            hasError && 'text-rose-400'
          )}
        >
          Password
        </Label>
        <div className="flex items-center gap-2">
          {onFillSample && (
            <button
              type="button"
              onClick={onFillSample}
              disabled={disabled}
              className="flex items-center gap-1 text-[11px] text-sky-400 transition-colors hover:text-sky-300 hover:underline"
              title="Fill sample demo password (demo1234)"
            >
              <KeyRound className="h-3 w-3" /> Fill Sample (demo1234)
            </button>
          )}
          {onForgotPassword && (
            <>
              <span className="text-xs text-slate-600">·</span>
              <button
                type="button"
                onClick={onForgotPassword}
                disabled={disabled}
                className="text-[11px] text-slate-400 transition-colors hover:text-sky-400"
              >
                Forgot password?
              </button>
            </>
          )}
        </div>
      </div>

      <div className="group relative">
        <Lock
          className={cn(
            'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-all duration-300 ease-out',
            isFocused && 'scale-110 -rotate-6 text-sky-400'
          )}
        />
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          className={cn(
            'input-playful h-11 rounded-xl border-white/10 bg-slate-950/60 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 hover:border-white/20',
            hasError && 'border-rose-500/70 focus:ring-rose-500/30',
            isFocused && !hasError && 'scale-[1.015] border-sky-400/90 bg-slate-950/90 shadow-[0_0_0_3.5px_rgba(56,189,248,0.22),0_8px_24px_-4px_rgba(14,165,233,0.28)]'
          )}
        />
        <button
          type="button"
          onClick={() => setShowPassword(v => !v)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          disabled={disabled}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-white"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {/* Visual strength meter */}
      {value.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1">
          <div className="flex flex-1 gap-1">
            <div className={cn('h-1 flex-1 rounded-full transition-colors duration-300', strength >= 1 ? 'bg-amber-400' : 'bg-slate-700')} />
            <div className={cn('h-1 flex-1 rounded-full transition-colors duration-300', strength >= 2 ? 'bg-emerald-400' : 'bg-slate-700')} />
            <div className={cn('h-1 flex-1 rounded-full transition-colors duration-300', strength >= 3 ? 'bg-sky-400' : 'bg-slate-700')} />
          </div>
          <span className="text-[10px] font-medium text-slate-400">
            {strength === 1 ? 'Basic' : strength === 2 ? 'Good' : 'Strong'}
          </span>
        </div>
      )}
    </div>
  )
}

