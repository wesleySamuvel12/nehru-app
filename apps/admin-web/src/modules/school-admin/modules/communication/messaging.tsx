'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft, Check, CheckCheck, Loader2, MessageSquarePlus, RefreshCw, Send, User as UserIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, createOne, ApiError } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { fmtTime, initials, timeAgo } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/rbac'
import { useErp } from '@/lib/store'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/erp/ui'


interface Msg {
  id: string
  threadId: string
  fromUserId: string
  fromName: string
  fromRole: string
  toUserId: string
  toName: string
  toRole: string
  subject: string
  body: string
  readAt: string | null
  createdAt: string
}

interface Thread {
  threadId: string
  partnerId: string
  partnerName: string
  partnerRole: string
  subject: string
  lastBody: string
  lastAt: string
  unread: number
  count: number
}

export default function MessagingTab() {
  const session = useErp(s => s.session)
  const me = session?.sub || ''

  const [messages, setMessages] = React.useState<Msg[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeThreadId, setActiveThreadId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [newOpen, setNewOpen] = React.useState(false)
  const [tick, setTick] = React.useState(0)

  const load = React.useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(null) }
    try {
      const res = await api<{ data: Msg[] }>('api/communication/messages')
      setMessages(res.data || [])
    } catch (e) {
      if (!silent) setError((e as ApiError).message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load, tick])

  // Light polling keeps the inbox fresh
  React.useEffect(() => {
    const iv = setInterval(() => { if (document.visibilityState === 'visible') load(true) }, 20000)
    return () => clearInterval(iv)
  }, [load])

  const threads = React.useMemo<Thread[]>(() => {
    const map = new Map<string, Thread>()
    const sorted = [...messages].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    for (const m of sorted) {
      const mine = m.fromUserId === me
      const partnerId = mine ? m.toUserId : m.fromUserId
      const partnerName = mine ? m.toName : m.fromName
      const partnerRole = mine ? m.toRole : m.fromRole
      const t = map.get(m.threadId) || {
        threadId: m.threadId, partnerId, partnerName, partnerRole,
        subject: m.subject, lastBody: m.body, lastAt: m.createdAt, unread: 0, count: 0,
      }
      t.lastBody = m.body
      t.lastAt = m.createdAt
      t.count += 1
      if (!mine && !m.readAt) t.unread += 1
      map.set(m.threadId, t)
    }
    return [...map.values()].sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt))
  }, [messages, me])

  const activeThread = threads.find(t => t.threadId === activeThreadId) || null
  const threadMsgs = React.useMemo(
    () => messages.filter(m => m.threadId === activeThreadId).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [messages, activeThreadId],
  )

  const openThread = async (t: Thread) => {
    setActiveThreadId(t.threadId)
    const unreadIds = messages
      .filter(m => m.threadId === t.threadId && m.toUserId === me && !m.readAt)
      .map(m => m.id)
    if (!unreadIds.length) return
    // optimistic local read + fire-and-forget PATCHes
    setMessages(prev => prev.map(m => (unreadIds.includes(m.id) ? { ...m, readAt: new Date().toISOString() } : m)))
    await Promise.allSettled(unreadIds.map(id => api(`api/communication/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ read: true }) })))
  }

  const send = async () => {
    if (!activeThread || !draft.trim()) return
    setSending(true)
    try {
      const res = await createOne('api/communication/messages', {
        toUserId: activeThread.partnerId,
        toName: activeThread.partnerName,
        toRole: activeThread.partnerRole,
        threadId: activeThread.threadId,
        subject: activeThread.subject?.startsWith('Re:') ? activeThread.subject : `Re: ${activeThread.subject}`,
        body: draft.trim(),
      })
      setMessages(prev => [...prev, (res as any).data])
      setDraft('')
    } catch (e) {
      toast.error((e as ApiError).message || 'Message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="rounded-xl border bg-card"><TableSkeleton rows={6} /></div>
        <div className="hidden rounded-xl border bg-card lg:block"><TableSkeleton rows={8} /></div>
      </div>
    )
  }
  if (error) return <ErrorState message={error} onRetry={() => load()} />

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      {/* Thread list */}
      <div className={cn('rounded-xl border bg-card', activeThreadId ? 'hidden lg:flex' : 'flex', 'flex-col overflow-hidden')}>
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold">Inbox</h3>
            <p className="text-xs text-muted-foreground">
              {threads.reduce((n, t) => n + t.unread, 0)} unread · {threads.length} conversations
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Refresh" onClick={() => setTick(t => t + 1)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" className="h-8" onClick={() => setNewOpen(true)}>
              <MessageSquarePlus className="mr-1.5 h-4 w-4" /> New
            </Button>
          </div>
        </div>
        <div className="max-h-[300px] flex-1 overflow-y-auto lg:max-h-[520px]">
          {threads.length === 0 ? (
            <EmptyState
              title="No conversations yet"
              description="Start a conversation with a teacher, parent or staff member."
              icon={<UserIcon className="h-7 w-7" />}
              action={<Button size="sm" onClick={() => setNewOpen(true)}><MessageSquarePlus className="mr-1.5 h-4 w-4" /> New Message</Button>}
            />
          ) : threads.map(t => (
            <button
              key={t.threadId}
              onClick={() => openThread(t)}
              className={cn(
                'flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/50',
                activeThreadId === t.threadId && 'bg-muted/60',
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials(t.partnerName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{t.partnerName}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(t.lastAt)}</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">{t.lastBody}</span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium">{ROLE_LABELS[t.partnerRole] || t.partnerRole}</span>
                  {t.unread > 0 && (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                      {t.unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className={cn('flex-col overflow-hidden rounded-xl border bg-card', activeThreadId ? 'flex' : 'hidden lg:flex')}>
        {!activeThread ? (
          <EmptyState
            title="Select a conversation"
            description="Pick a thread from the inbox, or start a new message."
            icon={<Send className="h-7 w-7" />}
            action={<Button size="sm" variant="outline" onClick={() => setNewOpen(true)}><MessageSquarePlus className="mr-1.5 h-4 w-4" /> New Message</Button>}
          />
        ) : (
          <>
            <div className="flex items-center gap-2 border-b px-3 py-2.5 sm:px-4 sm:py-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" aria-label="Back to inbox" onClick={() => setActiveThreadId(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials(activeThread.partnerName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{activeThread.partnerName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {ROLE_LABELS[activeThread.partnerRole] || activeThread.partnerRole} · {activeThread.subject}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">{activeThread.count} msgs</Badge>
            </div>

            <div className="max-h-[340px] min-h-[240px] flex-1 space-y-3 overflow-y-auto p-3 sm:p-4 lg:max-h-[420px]">
              {threadMsgs.map(m => {
                const mine = m.fromUserId === me
                return (
                  <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[70%]',
                      mine
                        ? 'rounded-br-md bg-emerald-600 text-emerald-50'
                        : 'rounded-bl-md border bg-card',
                    )}>
                      {!mine && <p className="mb-0.5 text-xs font-semibold">{m.fromName}</p>}
                      <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                      <p className={cn('mt-1 flex items-center justify-end gap-1 text-[10px]', mine ? 'text-emerald-100/80' : 'text-muted-foreground')}>
                        {fmtTime(m.createdAt)}
                        {mine && (m.readAt ? <CheckCheck className="h-3 w-3" aria-label="Read" /> : <Check className="h-3 w-3" aria-label="Sent" />)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="border-t p-3 sm:p-4">
              <div className="flex items-end gap-2">
                <Textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                  }}
                  placeholder={`Reply to ${activeThread.partnerName}…`}
                  className="min-h-[44px] flex-1 resize-none"
                  rows={2}
                  aria-label="Message body"
                />
                <Button onClick={send} disabled={sending || !draft.trim()} className="h-11 px-4" aria-label="Send message">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="ml-1.5 hidden sm:inline">Send</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <NewMessageDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onSent={(msg: Msg) => {
          setMessages(prev => [...prev, msg])
          setActiveThreadId(msg.threadId)
        }}
      />
    </div>
  )
}

function NewMessageDialog({ open, onOpenChange, onSent }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSent: (msg: Msg) => void
}) {
  const [role, setRole] = React.useState('')
  const [userId, setUserId] = React.useState('')
  const [users, setUsers] = React.useState<{ id: string; name: string; role: string }[]>([])
  const [loadingUsers, setLoadingUsers] = React.useState(false)
  const [subject, setSubject] = React.useState('')
  const [body, setBody] = React.useState('')
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [sending, setSending] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setRole(''); setUserId(''); setUsers([]); setSubject(''); setBody(''); setErrors({})
  }, [open])

  React.useEffect(() => {
    if (!role) { setUsers([]); return }
    let alive = true
    setLoadingUsers(true)
    setUserId('')
    api<{ data: { id: string; name: string; role: string }[] }>(`api/communication/users?role=${role}`)
      .then(res => { if (alive) setUsers(res.data || []) })
      .catch(() => { if (alive) setUsers([]) })
      .finally(() => { if (alive) setLoadingUsers(false) })
    return () => { alive = false }
  }, [role])

  const send = async () => {
    const errs: Record<string, string> = {}
    if (!userId) errs.userId = 'Select a recipient'
    if (!subject.trim()) errs.subject = 'Subject is required'
    if (!body.trim()) errs.body = 'Message body is required'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const recipient = users.find(u => u.id === userId)
    setSending(true)
    try {
      const res = await createOne('api/communication/messages', {
        toUserId: userId,
        toName: recipient?.name || '',
        toRole: recipient?.role || '',
        subject: subject.trim(),
        body: body.trim(),
      })
      toast.success(`Message sent to ${recipient?.name || 'recipient'}.`)
      onOpenChange(false)
      onSent((res as any).data as Msg)
    } catch (e) {
      toast.error((e as ApiError).message || 'Message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!sending) onOpenChange(v) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>The recipient gets an in-app notification instantly.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Recipient Role <span className="text-rose-500">*</span></Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Recipient <span className="text-rose-500">*</span></Label>
              <Select value={userId} onValueChange={setUserId} disabled={!role || loadingUsers}>
                <SelectTrigger className={cn('w-full', errors.userId && 'border-rose-500')}>
                  <SelectValue placeholder={loadingUsers ? 'Loading…' : role ? 'Select person' : 'Pick role first'} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {users.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No users found for this role.</div>}
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.userId && <p className="text-xs font-medium text-rose-500">{errors.userId}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="msg-subject">Subject <span className="text-rose-500">*</span></Label>
            <Input id="msg-subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Leave approval for tomorrow" className={cn(errors.subject && 'border-rose-500')} />
            {errors.subject && <p className="text-xs font-medium text-rose-500">{errors.subject}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="msg-body">Message <span className="text-rose-500">*</span></Label>
            <Textarea id="msg-body" value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message…" className={cn('min-h-[110px]', errors.body && 'border-rose-500')} />
            {errors.body && <p className="text-xs font-medium text-rose-500">{errors.body}</p>}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={sending} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
