/** Shared constants for the communication module. */
export const COMM_MANAGEMENT = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL']
export const COMM_CHANNELS = ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH'] as const

export const CHANNEL_LABELS: Record<string, string> = {
  IN_APP: 'In-App',
  EMAIL: 'Email',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  PUSH: 'Push',
}

export const AUDIENCES = ['ALL', 'STUDENTS', 'PARENTS', 'TEACHERS', 'STAFF'] as const
