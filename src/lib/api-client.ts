'use client'

/*
 * Auth token fallback: the preview panel can embed the app in a cross-site
 * iframe where browsers block third-party cookies, so the httpOnly session
 * cookie may never be stored/sent. The JWT is also kept in localStorage and
 * sent as an Authorization header — the server accepts both.
 */
const TOKEN_KEY = 'erp_auth_token'

export function getToken(): string | null {
  try { return window.localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(token: string) {
  try { window.localStorage.setItem(TOKEN_KEY, token) } catch { /* storage unavailable */ }
}

export function clearToken() {
  try { window.localStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ }
}

export interface ApiMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export class ApiError extends Error {
  status: number
  fields?: string[]
  constructor(status: number, message: string, fields?: string[]) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  const token = getToken()
  const url = path.startsWith('http') || path.startsWith('/') ? path : `/${path}`
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError(0, 'Network error — please check your connection and try again.')
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) clearToken()
    throw new ApiError(res.status, body.error || 'Something went wrong. Please try again.', body.fields)
  }
  return body as T
}

export interface ListParams {
  page?: number
  pageSize?: number
  q?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  all?: boolean
  [key: string]: unknown
}

export function qs(params: ListParams): string {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'ALL') sp.set(k, String(v))
  })
  return sp.toString()
}

export async function list<T = any>(endpoint: string, params: ListParams = {}): Promise<{ data: T[]; meta: ApiMeta }> {
  return api(`/${endpoint.replace(/^\//, '')}${params ? `?${qs(params)}` : ''}`)
}

export async function createOne(endpoint: string, body: unknown) {
  return api(`/${endpoint.replace(/^\//, '')}`, { method: 'POST', body: JSON.stringify(body) })
}

export async function updateOne(endpoint: string, id: string, body: unknown) {
  return api(`/${endpoint.replace(/^\//, '')}/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export async function deleteOne(endpoint: string, id: string) {
  return api(`/${endpoint.replace(/^\//, '')}/${id}`, { method: 'DELETE' })
}
