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
   * Returns sessionId for the caller to set as cookie
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

    // Return sessionId - caller must set cookie
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
   * Caller must provide sessionId and manually delete cookie
   */
  async destroySession(sessionId: string): Promise<void> {
    if (redis && sessionId) {
      await redis.del(`session:${sessionId}`)
    }
  }

  /**
   * Get cookie options for session cookie
   * Used by Route Handlers to set cookies correctly
   */
  getSessionCookieOptions(): { name: string; options: any } {
    return {
      name: 'sessionId',
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: SESSION_DURATION,
        path: '/',
      },
    }
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

