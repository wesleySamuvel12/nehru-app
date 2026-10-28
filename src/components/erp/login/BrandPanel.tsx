'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/erp/brand'
import {
  GraduationCap, Users, Briefcase, Workflow, ShieldCheck,
  CheckCircle2, Sparkles, School, Building2, TrendingUp,
  Layers, Lock, Award, BookOpen
} from 'lucide-react'

const CAPABILITY_HIGHLIGHTS = [
  {
    icon: <GraduationCap className="h-4 w-4 text-sky-400" />,
    title: 'Academic & Curriculum',
    desc: 'Timetables, gradebooks, syllabi & report card generation.',
  },
  {
    icon: <Workflow className="h-4 w-4 text-amber-400" />,
    title: '4-Tier Approval Engine',
    desc: 'Automated Leave, OD & IOD routing with TO/CC auditing.',
  },
  {
    icon: <Briefcase className="h-4 w-4 text-emerald-400" />,
    title: 'Finance & Smart Payroll',
    desc: 'Tuition fees, concession rules, payslips & budget reports.',
  },
  {
    icon: <Users className="h-4 w-4 text-indigo-400" />,
    title: 'Connected Portals',
    desc: 'Zero-trust isolated student, parent & faculty workspaces.',
  },
]

export function BrandPanel() {
  const [activeMetricIndex, setActiveMetricIndex] = React.useState(0)

  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveMetricIndex(i => (i + 1) % 3)
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative hidden w-full flex-col justify-between overflow-hidden p-8 lg:flex lg:w-1/2 xl:p-12">
      {/* Subtle interior glow */}
      <div className="pointer-events-none absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-sky-600/10 blur-[120px] anim-float" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-80 w-80 rounded-full bg-orange-500/10 blur-[100px] anim-float" style={{ ['--delay' as string]: '3s' }} />

      {/* Top Brand Header */}
      <div className="anim-login-up relative z-10" style={{ ['--delay' as string]: '0ms' }}>
        <div className="flex items-center gap-3.5">
          <BrandMark tileClassName="h-12 w-12 rounded-2xl shadow-lg border-white/20" breathe />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-black tracking-tight text-white">Nehru ERP</span>
              <span className="rounded-full border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-sky-300">
                SaaS v2.4
              </span>
            </div>
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              School Management Platform
            </p>
          </div>
        </div>
      </div>

      {/* Center Visual & Narrative Showcase */}
      <div className="relative z-10 my-auto py-8">
        {/* Core Value Proposition */}
        <div className="anim-login-up" style={{ ['--delay' as string]: '80ms' }}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-3.5 py-1 text-xs font-semibold text-sky-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Next-Generation Institutional Operating System</span>
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl xl:text-5xl">
            One Platform. <br />
            <span className="bg-gradient-to-r from-sky-400 via-sky-300 to-orange-400 bg-clip-text text-transparent">
              Every School Workflow.
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
            Manage academics, attendance, staff, finance and institutional operations through one secure, unified multi-campus platform.
          </p>
        </div>

        {/* Tactile Mockup / Capability Grid */}
        <div className="anim-login-up mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ ['--delay' as string]: '160ms' }}>
          {CAPABILITY_HIGHLIGHTS.map((item, idx) => (
            <div
              key={item.title}
              className="group relative rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md transition-all duration-300 hover:border-sky-500/40 hover:bg-slate-900/90 hover:shadow-lg"
            >
              <div className="mb-2 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-transform duration-300 group-hover:scale-110">
                  {item.icon}
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-sky-300">
                  {item.title}
                </h4>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400 group-hover:text-slate-300">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Live Operational Metrics Capsule */}
        <div className="anim-login-up mt-6 rounded-2xl border border-sky-500/20 bg-sky-950/30 p-4 backdrop-blur-md" style={{ ['--delay' as string]: '220ms' }}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Institutional Health Status
            </span>
            <span className="font-mono text-[10px] text-sky-400">
              Verified Real-Time
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/5 pt-3">
            <div className="text-left">
              <span className="block text-[10px] text-slate-400">Tenant Isolation</span>
              <span className="font-display text-sm font-bold text-emerald-400">Strict Multi-Tenant</span>
            </div>
            <div className="text-left">
              <span className="block text-[10px] text-slate-400">Active Roles</span>
              <span className="font-display text-sm font-bold text-sky-400">20 Granular</span>
            </div>
            <div className="text-left">
              <span className="block text-[10px] text-slate-400">Security Architecture</span>
              <span className="font-display text-sm font-bold text-amber-400">Zero-Trust RBAC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Institutional Trust Banner */}
      <div className="anim-login-up relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs text-slate-400" style={{ ['--delay' as string]: '260ms' }}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>ISO 27001 & SOC-2 Compliant Architecture</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Nehru International School</span>
          <span>•</span>
          <span className="font-medium text-sky-400">A Tradition of Excellence</span>
        </div>
      </div>
    </div>
  )
}

