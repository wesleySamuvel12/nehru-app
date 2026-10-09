/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SchoolSettings {
  id: string
  schoolName: string
  logoUrl: string | null
  address: string | null
  phone: string | null
  email: string | null
  timezone: string
  currency: string
  attendanceLockHours: number
  mfaRequired: boolean
  smsEnabled: boolean
  emailEnabled: boolean
  whatsappEnabled: boolean
  pushEnabled: boolean
  dataEncryption: boolean
  backupFrequency: string
  sessionTimeoutMin: number
  [key: string]: any
}

export interface SettingsStats {
  counts: { key: string; label: string; count: number; exportable?: string }[]
  gradingScales?: { grade: string; name: string; minPercent: number; maxPercent: number; gpa: number; remark?: string }[]
  currentYear?: { id: string; name: string; startDate?: string; endDate?: string; terms?: { name: string; startDate: string; endDate: string; isCurrent: boolean }[] } | null
}
