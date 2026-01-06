import Redis from 'ioredis'

let redis: Redis | null = null

/**
 * Initialize Redis connection with fallback
 */
export async function initRedis(): Promise<void> {
  try {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      console.warn('REDIS_URL not configured, running without cache')
      return
    }

    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('Redis connection failed, running without cache')
          redis = null
          return null
        }
        return Math.min(times * 100, 2000)
      },
    })

    redis.on('error', (err) => {
      console.error('Redis error:', err.message)
      redis = null
    })

    // Test connection
    await redis.ping()
    console.log('Redis connected successfully')
  } catch (error) {
    console.warn('Redis unavailable, running without cache:', error)
    redis = null
  }
}

/**
 * Get cached value
 */
export async function cachedGet<T>(
  key: string,
  factory: () => Promise<T>,
  ttl: number
): Promise<T> {
  if (redis) {
    try {
      const cached = await redis.get(key)
      if (cached) {
        return JSON.parse(cached) as T
      }
    } catch (error) {
      console.error('Cache get error:', error)
    }
  }

  const value = await factory()

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttl)
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  return value
}

/**
 * Delete cache key
 */
export async function cachedDelete(key: string): Promise<void> {
  if (redis) {
    try {
      await redis.del(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }
}

/**
 * Delete multiple cache keys by pattern
 */
export async function cachedDeletePattern(pattern: string): Promise<void> {
  if (redis) {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error)
    }
  }
}

export { redis }
