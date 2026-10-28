'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Session } from '@/lib/store'
import { CursorFlowCanvas } from '@/components/erp/CursorFlowCanvas'
import { BrandPanel } from '@/components/erp/login/BrandPanel'
import { LoginForm } from '@/components/erp/login/LoginForm'
import { ForgotPasswordModal } from '@/components/erp/login/ForgotPasswordModal'
import { BrandMark } from '@/components/erp/brand'
import { ShieldCheck, Sparkles } from 'lucide-react'

export function LoginScreen({ onLogin }: { onLogin: (s: Session, defaultModule: string) => void }) {
  const [successFade, setSuccessFade] = React.useState(false)
  const [forgotPasswordOpen, setForgotPasswordOpen] = React.useState(false)
  const [prefilledEmail, setPrefilledEmail] = React.useState('')
  const [activeRolePalette, setActiveRolePalette] = React.useState('DEFAULT')

  // 3D Card tilt tracking on mousemove for desktop
  const cardRef = React.useRef<HTMLDivElement | null>(null)
  const [transformStyle, setTransformStyle] = React.useState('perspective(1000px) rotateX(0deg) rotateY(0deg)')

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    cardRef.current.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`)
    cardRef.current.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`)

    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -3
    const rotateY = ((x - centerX) / centerX) * 3
    setTransformStyle(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.003, 1.003, 1.003)`)
  }

  const handleMouseLeave = () => {
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)')
  }

  const handleOpenForgotPassword = (email?: string) => {
    setPrefilledEmail(email || '')
    setForgotPasswordOpen(true)
  }

  return (
    <div className="mesh-bg relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-slate-950 px-4 py-8 text-slate-100 selection:bg-sky-500 selection:text-white sm:px-6 lg:px-12">
      {/* Dynamic Cursor Flow Canvas */}
      <CursorFlowCanvas activeRole={activeRolePalette} />

      {/* Atmospheric glowing color halos */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-sky-600/15 blur-[140px] anim-float"
        style={{ ['--delay' as string]: '0s' }}
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-40 h-[650px] w-[650px] rounded-full bg-orange-500/10 blur-[150px] anim-float"
        style={{ ['--delay' as string]: '2.5s' }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 left-1/3 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[130px] anim-float"
        style={{ ['--delay' as string]: '4s' }}
      />

      {/* Two-Panel Enterprise Container */}
      <div
        className={cn(
          'relative z-20 mx-auto flex w-full max-w-6xl flex-col items-center justify-center transition-all duration-500 ease-out lg:flex-row lg:items-stretch lg:gap-12',
          successFade && 'pointer-events-none -translate-y-3 scale-[0.98] opacity-0 blur-[2px]'
        )}
      >
        {/* Left Panel: Enterprise Branding & Workflow Highlights (Desktop) */}
        <BrandPanel />

        {/* Mobile-Only Header */}
        <div className="anim-login-up mb-6 flex flex-col items-center text-center lg:hidden" style={{ ['--delay' as string]: '0ms' }}>
          <div className="group relative mb-2.5 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-sky-500 to-orange-500 opacity-40 blur-md transition-opacity duration-300 group-hover:opacity-75" />
            <BrandMark tileClassName="relative h-14 w-14 shadow-xl border-white/20" breathe />
          </div>
          <h1 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            Nehru International
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-sky-400 uppercase">
            <span>School ERP</span>
            <span className="h-1 w-1 rounded-full bg-orange-400" />
            <span className="text-slate-400">A Tradition of Excellence</span>
          </div>
        </div>

        {/* Right Panel: Authentication Card */}
        <div className="flex w-full max-w-[500px] flex-col items-center justify-center lg:w-1/2">
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ transform: transformStyle, ['--delay' as string]: '120ms' }}
            className="spotlight-card anim-login-up relative w-full rounded-3xl border border-white/15 bg-slate-900/85 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-all duration-200 ease-out sm:p-8"
          >
            <LoginForm
              onLogin={(s, defaultModule) => {
                setSuccessFade(true)
                setTimeout(() => onLogin(s, defaultModule), 400)
              }}
              onForgotPassword={handleOpenForgotPassword}
              onPhaseChange={phase => {
                if (phase === 'success') {
                  setSuccessFade(true)
                }
              }}
            />
          </div>

          {/* Footer Metadata */}
          <div
            className="anim-login-up mt-5 flex flex-wrap items-center justify-center gap-3 text-center text-xs text-slate-400"
            style={{ ['--delay' as string]: '260ms' }}
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-400" /> Dynamic Role-Based Access Control
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-orange-400" /> Nehru International ERP v2.4
            </span>
          </div>
        </div>
      </div>

      {/* Forgot Password / Account Recovery Dialog */}
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        initialEmail={prefilledEmail}
      />
    </div>
  )
}
