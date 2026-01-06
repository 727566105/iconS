import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cachedGet } from '@/lib/cache'

/**
 * GET /api/icons/suggest
 * Get search suggestions using pg_trgm fuzzy matching
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    const cacheKey = `suggest:${query}:${limit}`

    const suggestions = await cachedGet(
      cacheKey,
      async () => {
        // 使用 PostgreSQL 的 pg_trgm 扩展进行模糊匹配
        const result = await prisma.$queryRawUnsafe<
          Array<{ name: string; similarity: number }>
        >(
          `
          SELECT name, similarity(name, $1) as sim
          FROM icons
          WHERE name % $1
            AND status = 'PUBLISHED'
          ORDER BY sim DESC, name ASC
          LIMIT $2
          `,
          query,
          limit
        )

        return result.map((r) => r.name)
      },
      3600 // 1小时 TTL
    )

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Suggest error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
