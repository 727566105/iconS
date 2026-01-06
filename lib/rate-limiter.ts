import { redis } from './cache'

const WRITE_LIMIT = 20 // requests per minute
const WRITE_WINDOW = 60 // seconds

/**
 * Rate limiter for write operations (upload, delete, update)
 * Uses Token Bucket algorithm with Redis
 */
export async function rateLimitWrite(
  identifier: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  if (!redis) {
    // No Redis = no rate limiting (degraded mode)
    return { allowed: true }
  }

  const key = `ratelimit:${identifier}:write`

  try {
    const current = await redis.incr(key)

    if (current === 1) {
      await redis.expire(key, WRITE_WINDOW)
    }

    if (current > WRITE_LIMIT) {
      const ttl = await redis.ttl(key)
      return { allowed: false, retryAfter: ttl }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Rate limit error:', error)
    // On error, allow the request (fail open)
    return { allowed: true }
  }
}

/**
 * Get rate limit status for client
 */
export async function getRateLimitStatus(
  identifier: string
): Promise<{ limit: number; remaining: number; resetAt: number }> {
  if (!redis) {
    return { limit: WRITE_LIMIT, remaining: WRITE_LIMIT, resetAt: Date.now() + WRITE_WINDOW * 1000 }
  }

  const key = `ratelimit:${identifier}:write`
  const current = parseInt((await redis.get(key)) || '0', 10)
  const ttl = await redis.ttl(key)

  return {
    limit: WRITE_LIMIT,
    remaining: Math.max(0, WRITE_LIMIT - current),
    resetAt: Date.now() + ttl * 1000,
  }
}
