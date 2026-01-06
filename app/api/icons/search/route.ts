import { NextRequest, NextResponse } from 'next/server'
import { searchIcons, recordSearchHistory } from '@/lib/search'
import { cachedGet } from '@/lib/cache'
import crypto from 'crypto'

/**
 * GET /api/icons/search
 * Search icons with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // 获取查询参数
    const query = searchParams.get('q') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const tagsParam = searchParams.get('tags')
    const tags = tagsParam ? tagsParam.split(',') : undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = (searchParams.get('sortBy') || 'createdAt') as
      | 'createdAt'
      | 'viewCount'
      | 'downloadCount'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    // 验证分页参数
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      )
    }

    // 计算缓存键
    const cacheKey = `search:${JSON.stringify({
      query,
      categoryId,
      tags,
      page,
      limit,
      sortBy,
      sortOrder,
    })}`

    // 使用缓存获取搜索结果
    const result = await cachedGet(
      cacheKey,
      async () => {
        return await searchIcons({
          query,
          categoryId,
          tags,
          page,
          limit,
          sortBy,
          sortOrder,
        })
      },
      1800 // 30分钟 TTL
    )

    // 记录搜索历史(仅当有查询词时)
    if (query && query.trim()) {
      const queryHash = crypto.createHash('md5').update(query).digest('hex')
      // 异步记录,不阻塞响应
      recordSearchHistory(query, queryHash).catch(() => {})
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
