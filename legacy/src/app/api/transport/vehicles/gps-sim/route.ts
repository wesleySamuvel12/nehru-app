import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { err, json } from '@/lib/crud'
import { audit } from '@/lib/audit'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Mumbai demo bounding box — must match the Live Tracking map */
const LAT_MIN = 19.0, LAT_MAX = 19.15, LNG_MIN = 72.78, LNG_MAX = 72.9
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * POST /api/transport/vehicles/gps-sim
 * Simulates one GPS tick: jitters every vehicle's position slightly (staying inside the
 * Mumbai bounding box) and assigns a plausible speed. Used by the Live Tracking tab.
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err(401, 'Please sign in to continue.')
  if (!can(session.role, 'transport')) return err(403, 'You do not have permission to access this module.')
  try {
    const vehicles = await db.vehicle.findMany({ select: { id: true, gpsLat: true, gpsLng: true } })
    await Promise.all(vehicles.map(async (v: any) => {
      const baseLat = typeof v.gpsLat === 'number' ? v.gpsLat : 19.07
      const baseLng = typeof v.gpsLng === 'number' ? v.gpsLng : 72.84
      const drift = Math.random() > 0.2 ? 1 : -0.4 // most buses keep moving forward
      const gpsLat = clamp(baseLat + (Math.random() - 0.5) * 0.006 * drift, LAT_MIN, LAT_MAX)
      const gpsLng = clamp(baseLng + (Math.random() - 0.5) * 0.007 * drift, LNG_MIN, LNG_MAX)
      const moving = Math.random() > 0.22
      return db.vehicle.update({
        where: { id: v.id },
        data: {
          gpsLat,
          gpsLng,
          speedKmph: moving ? Math.round(8 + Math.random() * 38) : 0,
          lastGpsAt: new Date(),
        },
      })
    }))
    await audit({
      userId: session.sub, userName: session.name, userRole: session.role,
      action: 'UPDATE', entity: 'Vehicle', entityId: 'gps-sim', details: { ticks: vehicles.length },
      ip: req.headers.get('x-forwarded-for'),
    })
    return json({ data: { updated: vehicles.length, at: new Date().toISOString() } })
  } catch (e) {
    console.error('[transport:gps-sim]', e)
    return err(500, 'GPS simulation failed. Please try again.')
  }
}
