import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cachedGet } from '@/lib/cache'

/**
 * GET /api/icons/popular
 * Get popular icons based on view and download counts
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = (searchParams.get('sortBy') || 'viewCount') as
      | 'viewCount'
      | 'downloadCount'

    const cacheKey = `popular:icons:${sortBy}:${limit}`

    const icons = await cachedGet(
      cacheKey,
      async () => {
        return await prisma.icon.findMany({
          where: {
            status: 'PUBLISHED',
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            tags: {
              select: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          take: limit,
          orderBy: {
            [sortBy]: 'desc',
          },
        })
      },
      3600 // 1小时 TTL
    )

    return NextResponse.json({ icons })
  } catch (error) {
    console.error('Popular icons error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
