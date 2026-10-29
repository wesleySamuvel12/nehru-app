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

interface CacheEntry {
  at: number
  data: any
}

const clientApiCache = new Map<string, CacheEntry>()
const inflightRequests = new Map<string, Promise<any>>()
const CLIENT_CACHE_TTL = 8_000 // 8 seconds memory cache for rapid navigation

/** Invalidate all client API cache entries, or matching a specific endpoint prefix */
export function invalidateApiCache(prefix?: string) {
  if (!prefix) {
    clientApiCache.clear()
    return
  }
  for (const key of clientApiCache.keys()) {
    if (key.includes(prefix)) {
      clientApiCache.delete(key)
    }
  }
}

async function fetchDirect<T = any>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  const token = getToken()
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

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || 'GET').toUpperCase()
  const isGet = method === 'GET'
  const isNoStore = init?.cache === 'no-store'
  const url = path.startsWith('http') || path.startsWith('/') ? path : `/${path}`

  // Non-GET requests (mutations) bypass cache and invalidate matching cached endpoints
  if (!isGet || isNoStore) {
    if (!isGet) {
      const resource = path.split('?')[0].split('/').slice(0, 3).join('/')
      invalidateApiCache(resource)
    }
    return fetchDirect<T>(url, init)
  }

  const token = getToken()
  const cacheKey = `${url}::${token || ''}`
  const now = Date.now()
  const cached = clientApiCache.get(cacheKey)

  // 1. Return fresh cached data if within TTL
  if (cached && now - cached.at < CLIENT_CACHE_TTL) {
    return cached.data as T
  }

  // 2. Inflight request deduplication (prevent redundant parallel network calls)
  const inflight = inflightRequests.get(cacheKey)
  if (inflight) {
    return inflight as Promise<T>
  }

  // 3. Dispatch network fetch and cache
  const reqPromise = fetchDirect<T>(url, init)
    .then(data => {
      clientApiCache.set(cacheKey, { at: Date.now(), data })
      return data
    })
    .finally(() => {
      inflightRequests.delete(cacheKey)
    })

  inflightRequests.set(cacheKey, reqPromise)
  return reqPromise
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
