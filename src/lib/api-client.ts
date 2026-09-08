'use client'

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
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError(0, 'Network error — please check your connection and try again.')
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
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
