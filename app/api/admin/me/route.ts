import { NextResponse } from 'next/server'
import { authService } from '@/lib/auth'
import { ensureServicesInitialized } from '@/lib/init'

export async function GET() {
  try {
    // Ensure Redis is initialized
    await ensureServicesInitialized()

    const session = await authService.validateSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: session.userId,
        username: session.username,
      },
    })
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
