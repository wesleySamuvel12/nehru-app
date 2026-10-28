'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { School, Building2, Check, ChevronDown } from 'lucide-react'

export interface SchoolOption {
  id: string
  name: string
  code: string
  isMaster?: boolean
}

interface SchoolSelectionProps {
  schools?: SchoolOption[]
  selectedSchoolId?: string | null
  onSelectSchool?: (schoolId: string) => void
  disabled?: boolean
  className?: string
}

const DEFAULT_CAMPUSES: SchoolOption[] = [
  { id: 'cmvf3male00055zxkw5dvahtr', name: 'Nehru International — Main Campus', code: 'NIS-MAIN', isMaster: true },
  { id: 'cmvf3malj00065zxkwx5de08a', name: 'Nehru International — Pune Campus', code: 'NIS-PUNE', isMaster: false },
]

export function SchoolSelection({
  schools = DEFAULT_CAMPUSES,
  selectedSchoolId,
  onSelectSchool,
  disabled = false,
  className,
}: SchoolSelectionProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const currentSchool = schools.find(s => s.id === selectedSchoolId) || schools[0]

  return (
    <div className={cn('relative text-left', className)}>
      <label className="mb-1 block text-[11px] font-semibold text-slate-300">
        Institutional Campus / Branch
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(v => !v)}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 text-xs text-white transition-all hover:border-white/20',
            isOpen && 'border-sky-500 ring-2 ring-sky-500/30'
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-sky-400" />
            <span className="truncate">{currentSchool?.name || 'All Campuses (Auto)'}</span>
            {currentSchool?.isMaster && (
              <span className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[9px] font-bold text-sky-300">
                HQ
              </span>
            )}
          </div>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>

        {isOpen && (
          <div className="anim-pop absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-white/15 bg-slate-900/95 p-1 shadow-2xl backdrop-blur-xl">
            {schools.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelectSchool?.(s.id)
                  setIsOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-white/10',
                  s.id === currentSchool?.id ? 'bg-sky-500/20 font-semibold text-sky-200' : 'text-slate-300'
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <School className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">{s.name}</span>
                </div>
                {s.id === currentSchool?.id && <Check className="h-3 w-3 text-sky-400" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

