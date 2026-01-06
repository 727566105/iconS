import { IconCard } from './IconCard'

interface Icon {
  id: string
  name: string
  fileName: string
  description: string | null
  categoryId: string | null
  contentHash: string
  shardId: number
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
}

interface SearchResultsGridProps {
  icons: Icon[]
  loading?: boolean
}

export function SearchResultsGrid({ icons, loading }: SearchResultsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-200 rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (icons.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">未找到匹配的图标</p>
        <p className="text-gray-400 text-sm mt-2">请尝试其他关键词</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {icons.map((icon) => (
        <IconCard key={icon.id} icon={icon} />
      ))}
    </div>
  )
}
