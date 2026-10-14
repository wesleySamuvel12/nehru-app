/**
 * Generic CRUD engine for App Router API routes.
 * Provides list (search/filter/sort/pagination), create, detail, update, delete
 * with auth, RBAC, audit logging, role scoping and lifecycle hooks.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from './db'
import { Session, requireAuth } from './auth'
import { can, normalizeRole } from './rbac'
import { audit } from './audit'
import { resolveTenantContext, validateParentOwnership, TenantContext } from './tenant'

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CrudConfig {
  model: string // prisma delegate: 'student', 'feeInvoice', ...
  module: string // rbac module key
  searchFields?: string[]
  defaultSort?: { field: string; dir?: 'asc' | 'desc' }
  filterFields?: string[] // exact-match query params (ids, status, etc.)
  scope?: (session: Session) => Promise<any> | any // extra where per role (row-level security)
  include?: any
  required?: string[] // required fields on create
  beforeSave?: (data: any, session: Session, mode: 'create' | 'update') => Promise<any> | any
  afterCreate?: (row: any, session: Session) => Promise<void>
  afterUpdate?: (row: any, session: Session, before: any) => Promise<void>
  afterDelete?: (row: any, session: Session) => Promise<void>
  auditEntity?: string
  omitFields?: string[]
  publicRead?: boolean
}

export function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export function err(status: number, message: string, extra?: any) {
  return NextResponse.json({ error: message, ...(extra || {}) }, { status })
}

function delegate(config: CrudConfig): any {
  return (db as any)[config.model]
}

function strip(row: any, config: CrudConfig) {
  if (!config.omitFields || !row) return row
  const c = { ...row }
  config.omitFields.forEach(f => delete c[f])
  return c
}

/** Coerce plain date strings (YYYY-MM-DD) and digit-strings to Prisma-friendly types. */
function coercePrismaValues(body: any): any {
  if (!body || typeof body !== 'object') return body
  const out: any = Array.isArray(body) ? [...body] : { ...body }
  for (const k of Object.keys(out)) {
    const v = out[k]
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      out[k] = new Date(`${v}T00:00:00.000Z`)
    } else if (v === '') {
      // empty strings for nullable scalars are fine to keep; Prisma errors on non-nullable — leave as-is
    }
  }
  return out
}

function buildWhere(req: NextRequest, config: CrudConfig, session: Session | null) {
  const where: any = {}
  const sp = req.nextUrl.searchParams
  const q = sp.get('q')
  if (q && config.searchFields?.length) {
    where.OR = config.searchFields.map(f => ({ [f]: { contains: q, mode: 'insensitive' } }))
  }
  for (const f of config.filterFields || []) {
    const v = sp.get(f)
    if (v !== null && v !== '' && v !== 'ALL') {
      // typed values: pass through; Prisma handles ids & statuses. Support date ranges.
      if (f === 'dateFrom') { where.date = { ...(where.date || {}), gte: new Date(v) } }
      else if (f === 'dateTo') { where.date = { ...(where.date || {}), lte: new Date(v + 'T23:59:59.999Z') } }
      else { where[f] = v }
    }
  }
  return where
}

export function defineCrud(config: CrudConfig) {
  const entity = config.auditEntity || config.model
  const isGlobalModel = config.model === 'school' || config.model === 'permission'

  async function guard(req: NextRequest, isWrite = false) {
    const session = await requireAuth(req)
    if (!session) return { error: err(401, 'Please sign in to continue.') }
    const role = normalizeRole(session.role)
    if ((isWrite || !config.publicRead) && !can(role, config.module)) {
      return { error: err(403, 'You do not have permission to access this module.') }
    }

    let tenant: TenantContext | null = null
    if (!isGlobalModel) {
      const tenantRes = await resolveTenantContext(req, session, {
        isWrite,
        allowAllSchoolsForSuperAdmin: !isWrite,
      })
      if (tenantRes.error) return { error: tenantRes.error }
      tenant = tenantRes.context
    }

    return { session: { ...session, role }, tenant }
  }

  async function applyScope(where: any, session: Session | null) {
    if (!session || !config.scope) return where
    const extra = await config.scope(session)
    if (!extra) return where
    return { AND: [where, extra] }
  }

  const list = async (req: NextRequest) => {
    const g = await guard(req)
    if (g.error) return g.error
    const session = g.session!
    const tenant = g.tenant
    try {
      const sp = req.nextUrl.searchParams
      const page = Math.max(1, parseInt(sp.get('page') || '1'))
      const pageSize = Math.min(200, Math.max(1, parseInt(sp.get('pageSize') || '10')))
      const all = sp.get('all') === '1'
      const sortBy = sp.get('sortBy') || config.defaultSort?.field
      const sortDir = (sp.get('sortDir') || config.defaultSort?.dir || 'desc') as 'asc' | 'desc'
      let where = await applyScope(buildWhere(req, config, session), session)

      if (!isGlobalModel && tenant?.schoolId) {
        where = where && Object.keys(where).length ? { AND: [where, { schoolId: tenant.schoolId }] } : { schoolId: tenant.schoolId }
      }

      const d = delegate(config)
      const findManyArgs: any = { where, orderBy: sortBy ? { [sortBy]: sortDir } : undefined }
      if (config.include) findManyArgs.include = config.include
      if (!all) {
        findManyArgs.skip = (page - 1) * pageSize
        findManyArgs.take = pageSize
      } else {
        findManyArgs.take = 5000
      }
      const [rows, total] = await Promise.all([
        d.findMany(findManyArgs),
        d.count({ where }),
      ])
      return json({
        data: rows.map((r: any) => strip(r, config)),
        meta: { page, pageSize: all ? rows.length : pageSize, total, totalPages: all ? 1 : Math.ceil(total / pageSize) },
      })
    } catch (e: any) {
      console.error(`[crud:list:${entity}]`, e)
      return err(500, 'Unable to load records right now. Please try again.')
    }
  }

  const create = async (req: NextRequest) => {
    const g = await guard(req, true)
    if (g.error) return g.error
    const session = g.session!
    const tenant = g.tenant
    try {
      let body = await req.json()
      if (config.required) {
        const missing = config.required.filter(f => body[f] === undefined || body[f] === null || body[f] === '')
        if (missing.length) return err(400, `Missing required fields: ${missing.join(', ')}`, { fields: missing })
      }
      if (config.beforeSave) body = await config.beforeSave(body, session, 'create')
      body = coercePrismaValues(body)

      if (!isGlobalModel && tenant?.schoolId) {
        body.schoolId = tenant.schoolId
        const parentCheck = await validateParentOwnership(body, tenant.schoolId)
        if (!parentCheck.valid) {
          return err(400, parentCheck.reason || 'Referenced entity does not belong to your school.')
        }
      }

      const d = delegate(config)
      const row = await d.create({ data: body, ...(config.include ? { include: config.include } : {}) })
      await audit({
        schoolId: tenant?.schoolId || session.schoolId || null,
        userId: session.sub,
        userName: session.name,
        userRole: session.role,
        action: 'CREATE',
        entity,
        entityId: row.id,
        details: { title: body.name || body.title || body.studentName || row.id },
        ip: req.headers.get('x-forwarded-for'),
      })
      if (config.afterCreate) await config.afterCreate(row, session)
      return json({ data: strip(row, config) }, 201)
    } catch (e: any) {
      if (String(e?.code) === 'P2002') return err(409, 'A record with this value already exists.')
      if (String(e?.code) === 'P2003') return err(400, 'Invalid reference — a related record was not found.')
      console.error(`[crud:create:${entity}]`, e)
      return err(500, 'Could not save the record. Please check the form and try again.')
    }
  }

  const detail = async (req: NextRequest, context: IdContext | string) => {
    const g = await guard(req)
    if (g.error) return g.error
    const tenant = g.tenant
    const id = typeof context === 'string' ? context : await getId(context)
    try {
      const d = delegate(config)
      const row = await d.findUnique({ where: { id }, ...(config.include ? { include: config.include } : {}) })
      if (!row) return err(404, 'Record not found.')

      if (!isGlobalModel && tenant?.schoolId && row.schoolId && row.schoolId !== tenant.schoolId) {
        return err(404, 'Record not found.')
      }

      return json({ data: strip(row, config) })
    } catch (e) {
      console.error(`[crud:detail:${entity}]`, e)
      return err(500, 'Unable to load the record.')
    }
  }

  const update = async (req: NextRequest, context: IdContext | string) => {
    const g = await guard(req, true)
    if (g.error) return g.error
    const session = g.session!
    const tenant = g.tenant
    const id = typeof context === 'string' ? context : await getId(context)
    try {
      const d = delegate(config)
      const before = await d.findUnique({ where: { id } })
      if (!before) return err(404, 'Record not found.')

      if (!isGlobalModel && tenant?.schoolId && before.schoolId && before.schoolId !== tenant.schoolId) {
        return err(404, 'Record not found.')
      }

      let body = await req.json()
      delete body.id
      delete body.schoolId
      delete body.createdAt
      delete body.updatedAt

      if (!isGlobalModel && tenant?.schoolId) {
        const parentCheck = await validateParentOwnership(body, tenant.schoolId)
        if (!parentCheck.valid) {
          return err(400, parentCheck.reason || 'Referenced entity does not belong to your school.')
        }
      }

      if (config.beforeSave) body = await config.beforeSave(body, session, 'update')
      body = coercePrismaValues(body)
      const row = await d.update({ where: { id }, data: body, ...(config.include ? { include: config.include } : {}) })
      await audit({
        schoolId: tenant?.schoolId || session.schoolId || null,
        userId: session.sub,
        userName: session.name,
        userRole: session.role,
        action: 'UPDATE',
        entity,
        entityId: id,
        details: { changes: Object.keys(body) },
        ip: req.headers.get('x-forwarded-for'),
      })
      if (config.afterUpdate) await config.afterUpdate(row, session, before)
      return json({ data: strip(row, config) })
    } catch (e: any) {
      if (String(e?.code) === 'P2002') return err(409, 'A record with this value already exists.')
      console.error(`[crud:update:${entity}]`, e)
      return err(500, 'Could not update the record. Please try again.')
    }
  }

  const remove = async (req: NextRequest, context: IdContext | string) => {
    const g = await guard(req, true)
    if (g.error) return g.error
    const session = g.session!
    const tenant = g.tenant
    const id = typeof context === 'string' ? context : await getId(context)
    try {
      const d = delegate(config)
      const before = await d.findUnique({ where: { id } })
      if (!before) return err(404, 'Record not found.')

      if (!isGlobalModel && tenant?.schoolId && before.schoolId && before.schoolId !== tenant.schoolId) {
        return err(404, 'Record not found.')
      }

      const row = await d.delete({ where: { id } })
      await audit({
        schoolId: tenant?.schoolId || session.schoolId || null,
        userId: session.sub,
        userName: session.name,
        userRole: session.role,
        action: 'DELETE',
        entity,
        entityId: id,
        details: { title: row.name || row.title || id },
        ip: req.headers.get('x-forwarded-for'),
      })
      if (config.afterDelete) await config.afterDelete(row, session)
      return json({ data: { ok: true } })
    } catch (e: any) {
      if (String(e?.code) === 'P2025') return err(404, 'Record not found.')
      console.error(`[crud:delete:${entity}]`, e)
      return err(500, 'Could not delete the record. It may be referenced by other data.')
    }
  }

  return { list, create, detail, update, remove, guard, config }
}

/** Helper for item routes ([id] folder): extract id from params */
export type IdContext = { params: Promise<{ id: string }> | { id: string } }

export async function getId(ctx: IdContext): Promise<string> {
  const p = (ctx.params as any)
  const resolved = typeof p?.then === 'function' ? await p : p
  return resolved?.id
}
