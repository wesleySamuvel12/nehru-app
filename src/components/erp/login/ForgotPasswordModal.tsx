'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  KeyRound, Mail, ArrowRight, CheckCircle2, AlertCircle, X,
  Loader2, ShieldCheck, Lock, RefreshCw
} from 'lucide-react'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  initialEmail?: string
}

export function ForgotPasswordModal({ isOpen, onClose, initialEmail = '' }: ForgotPasswordModalProps) {
  const [step, setStep] = React.useState<'request' | 'reset'>('request')
  const [email, setEmail] = React.useState(initialEmail)
  const [resetToken, setResetToken] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  React.useEffect(() => {
    if (initialEmail) setEmail(initialEmail)
  }, [initialEmail])

  // Reset state when closing/opening
  React.useEffect(() => {
    if (isOpen) {
      setError(null)
      setMessage(null)
      setSuccess(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please provide your institutional email address.')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const res = await api<{ message: string; resetToken?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ action: 'request', email: email.trim() }),
      })

      setMessage(res.message)
      // If server returned resetToken (in non-production/test), prefill it for convenience
      if (res.resetToken) {
        setResetToken(res.resetToken)
      }
      setStep('reset')
    } catch (err) {
      setError((err as ApiError).message || 'Failed to submit recovery request.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetToken.trim()) {
      setError('Password reset token is required.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters in length.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await api<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reset',
          token: resetToken.trim(),
          newPassword,
        }),
      })

      setSuccess(true)
      setMessage(res.message)
      setTimeout(() => {
        onClose()
      }, 2400)
    } catch (err) {
      setError((err as ApiError).message || 'Failed to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-pw-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="anim-fade-in fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
      />

      {/* Dialog Card */}
      <div className="anim-login-up relative z-10 w-full max-w-md rounded-2xl border border-white/15 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 id="forgot-pw-title" className="font-display text-lg font-bold text-white">
              {step === 'request' ? 'Account Recovery' : 'Set New Password'}
            </h3>
            <p className="text-xs text-slate-400">
              {step === 'request'
                ? 'Request a secure, single-use password reset link'
                : 'Enter your verification token & choose a new password'}
            </p>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div role="alert" className="anim-pop mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div role="status" className="anim-pop mb-4 flex items-start gap-2 rounded-xl border border-sky-500/30 bg-sky-500/15 p-3 text-xs text-sky-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400" />
            <span>{message}</span>
          </div>
        )}

        {/* Success screen */}
        {success ? (
          <div className="anim-pop py-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-white">Password Updated Successfully</p>
            <p className="mt-1 text-xs text-slate-400">You may now sign in with your new credentials. Closing in a moment…</p>
          </div>
        ) : step === 'request' ? (
          /* Step 1: Request Email */
          <form onSubmit={handleRequestToken} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="recovery-email" className="text-xs font-semibold text-slate-300">
                Institutional Email Address
              </Label>
              <div className="group relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-400" />
                <Input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@nis.edu.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                  className="input-playful h-11 rounded-xl border-white/10 bg-slate-950/60 pl-10 text-sm text-white placeholder:text-slate-500 hover:border-white/20 focus:border-sky-500 focus:bg-slate-950/80 focus:ring-2 focus:ring-sky-500/30"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                A short-lived verification token will be dispatched to your registered address.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('reset')}
                className="text-xs text-sky-400 transition-colors hover:text-sky-300 hover:underline"
              >
                Already have a reset token?
              </button>

              <Button
                type="submit"
                disabled={loading}
                className="btn-playful h-10 gap-1.5 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white shadow-md hover:bg-sky-500"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          /* Step 2: Enter Token and New Password */
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div className="space-y-1 text-left">
              <Label htmlFor="reset-token" className="text-xs font-semibold text-slate-300">
                Reset Token
              </Label>
              <div className="group relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-400" />
                <Input
                  id="reset-token"
                  type="text"
                  placeholder="Paste your reset token here"
                  value={resetToken}
                  onChange={e => setResetToken(e.target.value)}
                  disabled={loading}
                  className="input-playful h-10 rounded-xl border-white/10 bg-slate-950/60 pl-10 font-mono text-xs text-white placeholder:text-slate-500 hover:border-white/20 focus:border-sky-500 focus:bg-slate-950/80"
                />
              </div>
            </div>

            <div className="space-y-1 text-left">
              <Label htmlFor="new-pw" className="text-xs font-semibold text-slate-300">
                New Password
              </Label>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-400" />
                <Input
                  id="new-pw"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  disabled={loading}
                  className="input-playful h-10 rounded-xl border-white/10 bg-slate-950/60 pl-10 text-sm text-white placeholder:text-slate-500 hover:border-white/20 focus:border-sky-500 focus:bg-slate-950/80"
                />
              </div>
            </div>

            <div className="space-y-1 text-left">
              <Label htmlFor="confirm-pw" className="text-xs font-semibold text-slate-300">
                Confirm New Password
              </Label>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-400" />
                <Input
                  id="confirm-pw"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="input-playful h-10 rounded-xl border-white/10 bg-slate-950/60 pl-10 text-sm text-white placeholder:text-slate-500 hover:border-white/20 focus:border-sky-500 focus:bg-slate-950/80"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('request')}
                className="text-xs text-slate-400 transition-colors hover:text-sky-300"
              >
                Back to email request
              </button>

              <Button
                type="submit"
                disabled={loading}
                className="btn-playful h-10 gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-md hover:bg-emerald-500"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>
                    <span>Confirm New Password</span>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Security badge footer */}
        <div className="mt-5 flex items-center justify-center gap-1.5 border-t border-white/10 pt-3 text-[10px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Single-use cryptographic reset tokens with replay protection</span>
        </div>
      </div>
    </div>
  )
}

