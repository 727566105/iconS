import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Health check: database, cache, etc.
    // For now, just return OK
    // TODO: Add actual health checks for PostgreSQL and Redis

    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
