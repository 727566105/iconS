import { NextResponse } from 'next/server'
import { authService } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    // Get current sessionId from cookie
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('sessionId')?.value

    // Delete session from Redis
    if (sessionId) {
      await authService.destroySession(sessionId)
    }

    // Create response object
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    // Delete cookie using NextResponse.cookies.delete()
    response.cookies.delete('sessionId')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
