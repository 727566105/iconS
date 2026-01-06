import { prisma } from './db'

export interface SearchOptions {
  query?: string
  categoryId?: string
  tags?: string[]
  status?: string
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'viewCount' | 'downloadCount'
  sortOrder?: 'asc' | 'desc'
}

export interface SearchResult {
  icons: Array<{
    id: string
    name: string
    fileName: string
    description: string | null
    categoryId: string | null
    contentHash: string
    viewCount: number
    downloadCount: number
    category: {
      id: string
      name: string
      slug: string
    } | null
    tags: Array<{
      tag: {
        id: string
        name: string
      }
    }>
  }>
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Search icons with filters and pagination
 * Uses PostgreSQL full-text search with TSVECTOR
 */
export async function searchIcons(options: SearchOptions): Promise<SearchResult> {
  const {
    query,
    categoryId,
    tags,
    status = 'PUBLISHED',
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options

  // Build where clause
  const where: any = {
    status,
  }

  if (categoryId) {
    where.categoryId = categoryId
  }

  if (tags && tags.length > 0) {
    where.tags = {
      some: {
        tag: {
          name: {
            in: tags,
          },
        },
      },
    }
  }

  // For full-text search, we need to use raw query
  // because Prisma doesn't support TSVECTOR directly
  let searchText: string | undefined
  if (query && query.trim()) {
    // Convert to PostgreSQL search format
    const terms = query.trim().split(/\s+/).join(' & ')
    searchText = terms
  }

  // Calculate pagination
  const skip = (page - 1) * limit

  // Execute search
  let icons: any[]
  let total: number

  if (searchText) {
    // Use full-text search
    const searchQuery = searchText

    // Get total count
    const countParams: any[] = [searchQuery, status]
    let countQuery = `
      SELECT COUNT(*) as count
      FROM icons
      WHERE to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '')) @@ to_tsquery('simple', $1)
        AND status = $2
    `

    if (categoryId) {
      countQuery += ` AND category_id = $3`
      countParams.push(categoryId)
    }

    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      countQuery,
      ...countParams
    )

    total = Number(countResult[0].count)

    // Get paginated results
    const queryParams: any[] = [searchQuery, status]
    let searchQueryText = `
      SELECT
        id, name, file_name, description, category_id, content_hash,
        view_count, download_count, created_at, updated_at
      FROM icons
      WHERE to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '')) @@ to_tsquery('simple', $1)
        AND status = $2
    `

    if (categoryId) {
      searchQueryText += ` AND category_id = $3`
      queryParams.push(categoryId)
    }

    const paramOffset = queryParams.length + 1
    searchQueryText += `
      ORDER BY ${sortBy === 'createdAt' ? 'created_at' : sortBy === 'viewCount' ? 'view_count' : 'download_count'} ${sortOrder.toUpperCase()}
      LIMIT $${paramOffset} OFFSET $${paramOffset + 1}
    `
    queryParams.push(limit, skip)

    icons = await prisma.$queryRawUnsafe<any>(
      searchQueryText,
      ...queryParams
    )

    // Fetch related data (category and tags)
    const iconIds = icons.map((icon) => icon.id)
    const categories = await prisma.category.findMany({
      where: { id: { in: icons.map((i) => i.categoryId).filter(Boolean) } },
    })
    const iconTags = await prisma.iconTag.findMany({
      where: { iconId: { in: iconIds } },
      include: { tag: true },
    })

    // Merge related data
    const categoryMap = new Map(categories.map((c) => [c.id, c]))
    const tagsMap = new Map<string, Array<{ tag: { id: string; name: string } }>>()

    for (const it of iconTags) {
      if (!tagsMap.has(it.iconId)) {
        tagsMap.set(it.iconId, [])
      }
      tagsMap.get(it.iconId)!.push({ tag: { id: it.tag.id, name: it.tag.name } })
    }

    icons = icons.map((icon) => ({
      id: icon.id,
      name: icon.name,
      fileName: icon.file_name,
      description: icon.description,
      categoryId: icon.category_id,
      contentHash: icon.content_hash,
      viewCount: icon.view_count,
      downloadCount: icon.download_count,
      createdAt: icon.created_at,
      updatedAt: icon.updated_at,
      category: icon.categoryId ? categoryMap.get(icon.categoryId) || null : null,
      tags: tagsMap.get(icon.id) || [],
    }))
  } else {
    // Regular query without full-text search
    [icons, total] = await Promise.all([
      prisma.icon.findMany({
        where,
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
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      prisma.icon.count({ where }),
    ])
  }

  // Calculate total pages
  const totalPages = Math.ceil(total / limit)

  return {
    icons,
    total,
    page,
    limit,
    totalPages,
  }
}

/**
 * Record search history
 */
export async function recordSearchHistory(
  query: string,
  queryHash: string
): Promise<void> {
  try {
    await prisma.searchHistory.upsert({
      where: { queryHash },
      create: {
        query,
        queryHash,
        count: 1,
      },
      update: {
        count: {
          increment: 1,
        },
        lastSearched: new Date(),
      },
    })
  } catch (error) {
    // Silently fail - search history is not critical
    console.error('Failed to record search history:', error)
  }
}

/**
 * Get popular search queries
 */
export async function getPopularSearches(limit = 10): Promise<
  Array<{
    query: string
    count: number
  }>
> {
  const searches = await prisma.searchHistory.findMany({
    orderBy: {
      count: 'desc',
    },
    take: limit,
    select: {
      query: true,
      count: true,
    },
  })

  return searches
}

export { searchIcons as default }
