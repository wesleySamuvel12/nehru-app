import { db } from './db'

export interface NotifyInput {
  userId: string
  title: string
  message: string
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' | 'ALERT'
  link?: string
  channel?: 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH'
}

/** Create an in-app notification (event-driven notification engine). */
export async function notify(input: NotifyInput) {
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type || 'INFO',
        link: input.link,
        channel: input.channel || 'IN_APP',
      },
    })
    // Simulated multi-channel fan-out (SMS/Email/WhatsApp) recorded for delivery history
    if (input.channel && input.channel !== 'IN_APP') {
      console.log(`[notify:${input.channel}] -> ${input.userId}: ${input.title}`)
    }
  } catch (e) {
    console.error('notify failed', e)
  }
}

/** Notify every user holding one of the given roles (e.g. all admins). */
export async function notifyRoles(roles: string[], title: string, message: string, opts?: Partial<NotifyInput>) {
  try {
    const users = await db.user.findMany({ where: { role: { in: roles }, status: 'ACTIVE' }, select: { id: true } })
    if (!users.length) return
    await db.notification.createMany({
      data: users.map(u => ({
        userId: u.id, title, message,
        type: opts?.type || 'INFO', link: opts?.link, channel: opts?.channel || 'IN_APP',
      })),
    })
  } catch (e) {
    console.error('notifyRoles failed', e)
  }
}
