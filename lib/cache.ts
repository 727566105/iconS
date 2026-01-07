import Redis from 'ioredis'

let redis: Redis | null = null

/**
 * Initialize Redis connection with fallback
 */
export async function initRedis(): Promise<void> {
  try {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      console.warn('⚠️  REDIS_URL not configured, running without cache')
      return
    }

    console.log('🔗 Connecting to Redis...')

    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('❌ Redis connection failed after retries, running without cache')
          redis = null
          return null
        }
        return Math.min(times * 100, 2000)
      },
      connectTimeout: 10000, // 10 seconds timeout
    })

    redis.on('error', (err) => {
      console.error('❌ Redis error:', err.message)
      // Don't set redis = null here - let the connection timeout handle it
    })

    // Test connection with timeout
    const pingResult = await Promise.race([
      redis.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), 10000)
      ),
    ])

    if (pingResult === 'PONG') {
      console.log('✅ Redis connected successfully')
    } else {
      throw new Error('Redis ping failed')
    }
  } catch (error) {
    console.warn('⚠️  Redis unavailable, running without cache:', error instanceof Error ? error.message : error)
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
