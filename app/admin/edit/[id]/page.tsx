'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ColorEditor from '@/components/admin/ColorEditor'

export default function EditIconPage() {
  const params = useParams()
  const router = useRouter()
  const iconId = params.id as string

  const [svgContent, setSvgContent] = useState<string>('')
  const [iconName, setIconName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchIcon() {
      try {
        setLoading(true)
        const response = await fetch(`/api/icons/${iconId}/svg`)

        if (!response.ok) {
          throw new Error('Failed to load icon')
        }

        const svg = await response.text()
        setSvgContent(svg)

        // 获取图标信息
        const iconResponse = await fetch(`/api/icons/${iconId}/info`)
        if (iconResponse.ok) {
          const data = await iconResponse.json()
          setIconName(data.name)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }

    fetchIcon()
  }, [iconId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/admin"
            className="text-indigo-600 hover:text-indigo-700"
          >
            返回仪表板
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-gray-700 hover:text-gray-900">
                ← 返回仪表板
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              编辑图标颜色
            </h2>
            <p className="mt-1 text-sm text-gray-500">{iconName}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧:预览 */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">预览</h3>
            <div className="border border-gray-200 rounded-lg p-8 bg-white flex items-center justify-center min-h-[400px]">
              <div
                className="w-48 h-48"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </div>
          </div>

          {/* 右侧:颜色编辑器 */}
          <div className="bg-white shadow rounded-lg p-6">
            <ColorEditor
              svgContent={svgContent}
              onSvgChange={setSvgContent}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
