import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  const uptime = Math.floor(process.uptime())
  const timestamp = new Date().toISOString()
  const environment = process.env.NODE_ENV || 'development'

  try {
    // Perform a lightweight database operation to verify active connectivity
    const pingStart = Date.now()
    await db.school.findFirst({ select: { id: true } })
    const responseTimeMs = Date.now() - pingStart

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp,
        uptime,
        environment,
        services: {
          application: 'available',
          database: {
            status: 'connected',
            responseTimeMs,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    // Log the error internally for debugging without leaking internal details to callers
    console.error('[Health Check Failed]:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp,
        uptime,
        environment,
        services: {
          application: 'available',
          database: {
            status: 'disconnected',
          },
        },
        error: 'Database connectivity check failed',
      },
      { status: 503 }
    )
  }
}
