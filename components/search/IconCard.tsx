'use client'

import { useState } from 'react'
import { Eye, Download } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

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

interface IconCardProps {
  icon: Icon
}

export function IconCard({ icon }: IconCardProps) {
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const { showToast } = useToast()

  const handleCardClick = () => {
    setShowModal(true)
    // 增加浏览次数
    fetch(`/api/icons/${icon.id}/view`, { method: 'POST' }).catch(() => {})
  }

  const handleCopySVG = async () => {
    try {
      const response = await fetch(`/api/icons/${icon.id}/svg`)
      if (!response.ok) throw new Error('Failed to fetch SVG')

      const svgContent = await response.text()
      await navigator.clipboard.writeText(svgContent)

      setCopied(true)
      showToast('已复制到剪贴板', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy SVG:', error)
      showToast('复制失败,请重试', 'error')
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/icons/${icon.id}/download`)
      if (!response.ok) throw new Error('Failed to download')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = icon.fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showToast('下载成功', 'success')
      setShowModal(false)
    } catch (error) {
      console.error('Failed to download:', error)
      showToast('下载失败,请重试', 'error')
    }
  }

  // 构建图标 URL (使用数据库中存储的 shardId)
  const iconUrl = `/icons/shard-${icon.shardId}/${icon.fileName}`

  return (
    <>
      <div
        onClick={handleCardClick}
        className="group relative aspect-square bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-500 transition-all cursor-pointer overflow-hidden"
      >
        {/* 图标预览 */}
        <div className="p-4 flex items-center justify-center h-full">
          <img
            src={iconUrl}
            alt={icon.name}
            className="max-w-full max-h-full object-contain"
            loading="lazy"
          />
        </div>

        {/* 悬浮信息 */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="text-white text-center p-2">
            <p className="text-sm font-medium truncate">{icon.name}</p>
            <div className="flex items-center justify-center gap-3 mt-2 text-xs text-gray-300">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {icon.viewCount}
              </span>
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {icon.downloadCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 操作浮层 */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{icon.name}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* 图标预览 */}
            <div className="bg-gray-50 rounded-lg p-8 mb-4 flex items-center justify-center">
              <img src={iconUrl} alt={icon.name} className="max-h-48" />
            </div>

            {/* 元数据 */}
            {icon.description && (
              <p className="text-sm text-gray-600 mb-4">{icon.description}</p>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleCopySVG}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                {copied ? '✓ 已复制' : '复制 SVG 代码'}
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                下载图标
              </button>
            </div>

            {/* 标签 */}
            {icon.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {icon.tags.map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
