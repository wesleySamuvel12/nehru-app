'use client'

/** Shared constants for the Admissions & CRM module. */

export const LEAD_STAGES = ['NEW', 'CONTACTED', 'COUNSELLING', 'APPLICATION', 'TEST', 'INTERVIEW', 'APPROVED', 'ENROLLED', 'LOST'] as const

export const LEAD_SOURCES = ['WALK_IN', 'WEBSITE', 'REFERRAL', 'CAMPAIGN', 'PHONE', 'EVENT'] as const

export const STAGE_LABELS: Record<string, string> = {
  NEW: 'New', CONTACTED: 'Contacted', COUNSELLING: 'Counselling', APPLICATION: 'Application',
  TEST: 'Test', INTERVIEW: 'Interview', APPROVED: 'Approved', ENROLLED: 'Enrolled', LOST: 'Lost',
}

export const STAGE_BADGE: Record<string, string> = {
  NEW: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  CONTACTED: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  COUNSELLING: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  APPLICATION: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  TEST: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  INTERVIEW: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  ENROLLED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  LOST: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
}

export const SOURCE_BADGE: Record<string, string> = {
  WALK_IN: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  WEBSITE: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  REFERRAL: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  CAMPAIGN: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  PHONE: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  EVENT: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
}

export const SOURCE_LABELS: Record<string, string> = {
  WALK_IN: 'Walk-in', WEBSITE: 'Website', REFERRAL: 'Referral', CAMPAIGN: 'Campaign',
  PHONE: 'Phone', EVENT: 'Event', GOOGLE: 'Google Ads', OFFLINE: 'Offline', SOCIAL: 'Social',
}

export const APP_STATUS_BADGE: Record<string, string> = {
  SUBMITTED: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  SCREENING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  DOC_VERIFICATION: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  TEST: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  INTERVIEW: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  ENROLLED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  WITHDRAWN: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
}

/** Allowed next steps in the application workflow. */
export const APP_WORKFLOW: Record<string, string[]> = {
  SUBMITTED: ['SCREENING'],
  SCREENING: ['DOC_VERIFICATION'],
  DOC_VERIFICATION: ['TEST'],
  TEST: ['INTERVIEW'],
  INTERVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['ENROLLED'],
  ENROLLED: [],
  REJECTED: [],
  WITHDRAWN: [],
}

export const APP_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted', SCREENING: 'Screening', DOC_VERIFICATION: 'Doc Verification',
  TEST: 'Test', INTERVIEW: 'Interview', APPROVED: 'Approved', REJECTED: 'Rejected',
  ENROLLED: 'Enrolled', WITHDRAWN: 'Withdrawn',
}

export const FOLLOWUP_OUTCOMES = ['INTERESTED', 'NOT_INTERESTED', 'FOLLOW_UP', 'NO_RESPONSE', 'ENROLLED'] as const

export const CAMPAIGN_SOURCES = ['GOOGLE', 'SOCIAL', 'OFFLINE', 'REFERRAL', 'SMS', 'EMAIL', 'EVENT', 'OTHER'] as const

/** Is the given ISO date strictly before today (local midnight)? */
export function isPastDay(d?: string | Date | null): boolean {
  if (!d) return false
  const date = new Date(d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date.getTime() < today.getTime()
}
