/**
 * Email service with an auditable delivery log.
 *
 * Never reports a successful send unless the underlying transport actually
 * returned success. When SMTP is unconfigured the message is recorded as
 * NOT_CONFIGURED; when a send fails it is recorded as FAILED (with the error)
 * and can be retried. A `dedupeKey` prevents duplicate deliveries.
 */
import nodemailer from 'nodemailer'
import { db } from './db'

export interface EmailInput {
  schoolId?: string | null
  to: string | string[]
  cc?: string | string[]
  subject: string
  body: string
  dedupeKey?: string | null
}

export interface EmailResult {
  status: 'SENT' | 'FAILED' | 'NOT_CONFIGURED' | 'DUPLICATE'
  emailLogId?: string
  error?: string
  messageId?: string
}

function smtpConfig() {
  return {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || process.env.SMTP_FROM || '',
    secure: process.env.SMTP_SECURE === 'true',
  }
}

function joinAddrs(v?: string | string[]): string {
  if (!v) return ''
  return (Array.isArray(v) ? v : [v]).filter(Boolean).join(',')
}

export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const to = joinAddrs(input.to)
  const cc = joinAddrs(input.cc)

  // Duplicate-send protection: a prior successful delivery for this key is final.
  if (input.dedupeKey) {
    const prior = await db.emailLog.findFirst({
      where: { dedupeKey: input.dedupeKey, status: 'SENT' },
      select: { id: true },
    })
    if (prior) return { status: 'DUPLICATE', emailLogId: prior.id }
  }

  const cfg = smtpConfig()
  const record = await db.emailLog.create({
    data: {
      schoolId: input.schoolId || null,
      to, cc: cc || null,
      subject: input.subject,
      body: input.body,
      status: 'PENDING',
      dedupeKey: input.dedupeKey || null,
      attempts: 0,
    },
  })

  if (!cfg.host || !cfg.from) {
    await db.emailLog.update({
      where: { id: record.id },
      data: { status: 'NOT_CONFIGURED', attempts: 1, error: 'SMTP is not configured (SMTP_HOST / EMAIL_FROM missing).' },
    })
    return { status: 'NOT_CONFIGURED', emailLogId: record.id }
  }

  try {
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    })

    const info = await transport.sendMail({
      from: cfg.from,
      to: to.split(',').map((s: string) => s.trim()).filter(Boolean),
      ...(cc ? { cc: cc.split(',').map((s: string) => s.trim()).filter(Boolean) } : {}),
      subject: input.subject,
      text: input.body,
    })

    await db.emailLog.update({
      where: { id: record.id },
      data: { status: 'SENT', attempts: 1, providerMessageId: info?.messageId || null, sentAt: new Date() },
    })
    return { status: 'SENT', emailLogId: record.id, messageId: info?.messageId || undefined }
  } catch (e: any) {
    await db.emailLog.update({
      where: { id: record.id },
      data: { status: 'FAILED', attempts: 1, error: String(e?.message || e) },
    })
    return { status: 'FAILED', emailLogId: record.id, error: String(e?.message || e) }
  }
}
