import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth'
import { ensureServicesInitialized } from '@/lib/init'

export async function POST(request: NextRequest) {
  try {
    // Ensure Redis is initialized
    await ensureServicesInitialized()

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Verify credentials
    const isValid = await authService.verifyAdminCredentials(username, password)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Get admin user from database
    const { prisma } = await import('@/lib/db')
    const admin = await prisma.adminUser.findUnique({
      where: { username },
      select: { id: true, username: true },
    })

    if (!admin) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create session
    await authService.createSession(admin.id, admin.username)

    // Update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        username: admin.username,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
