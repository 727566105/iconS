import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { prisma } from './db'
import { redis } from './cache'

const SESSION_DURATION = 7 * 24 * 60 * 60 // 7 days in seconds

export interface Session {
  sessionId: string
  userId: string
  username: string
  createdAt: number
}

export class AuthService {
  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return randomUUID()
  }

  /**
   * Hash password using SHA-256
   */
  private hashPassword(password: string): string {
    const { createHash } = require('crypto')
    return createHash('sha256').update(password).digest('hex')
  }

  /**
   * Verify admin credentials against database
   */
  async verifyAdminCredentials(username: string, password: string): Promise<boolean> {
    try {
      const admin = await prisma.adminUser.findUnique({
        where: { username },
      })

      if (!admin) {
        return false
      }

      const passwordHash = this.hashPassword(password)
      return passwordHash === admin.passwordHash
    } catch (error) {
      console.error('Error verifying admin credentials:', error)
      return false
    }
  }

  /**
   * Create session after successful login
   */
  async createSession(userId: string, username: string): Promise<string> {
    const sessionId = this.generateSessionId()
    const session: Session = {
      sessionId,
      userId,
      username,
      createdAt: Date.now(),
    }

    // Store in Redis
    if (redis) {
      await redis.set(
        `session:${sessionId}`,
        JSON.stringify(session),
        'EX',
        SESSION_DURATION
      )
    } else {
      console.warn('Redis not available, session not persisted')
    }

    // Set HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION,
      path: '/',
    })

    return sessionId
  }

  /**
   * Validate session from cookie
   */
  async validateSession(): Promise<Session | null> {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('sessionId')?.value

    if (!sessionId) {
      return null
    }

    // Retrieve from Redis
    if (redis) {
      try {
        const sessionData = await redis.get(`session:${sessionId}`)
        if (sessionData) {
          return JSON.parse(sessionData) as Session
        }
      } catch (error) {
        console.error('Error retrieving session:', error)
      }
    }

    return null
  }

  /**
   * Destroy session (logout)
   */
  async destroySession(): Promise<void> {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('sessionId')?.value

    if (sessionId && redis) {
      await redis.del(`session:${sessionId}`)
    }

    cookieStore.delete('sessionId')
  }

  /**
   * Check if user is authenticated (for middleware)
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.validateSession()
    return session !== null
  }
}

// Singleton instance
export const authService = new AuthService()

