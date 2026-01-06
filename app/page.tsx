'use client'

import { useState, useEffect } from 'react'
import { SearchInput } from '@/components/search/SearchInput'
import { SearchResultsGrid } from '@/components/search/SearchResultsGrid'
import { ToastProvider, useToast } from '@/components/ui/Toast'

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

function HomeContent() {
  const [icons, setIcons] = useState<Icon[]>([])
  const [popularIcons, setPopularIcons] = useState<Icon[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const { showToast } = useToast()

  // 加载热门图标
  useEffect(() => {
    async function loadPopularIcons() {
      try {
        const response = await fetch('/api/icons/popular?sortBy=viewCount&limit=12')
        if (!response.ok) throw new Error('Failed to load popular icons')
        const data = await response.json()
        setPopularIcons(data.icons || [])
      } catch (error) {
        console.error('Failed to load popular icons:', error)
        // 静默失败,不显示错误提示(因为可能只是数据库未配置)
        setPopularIcons([])
      }
    }

    loadPopularIcons()
  }, [])

  // 检查登录状态
  useEffect(() => {
    async function checkLoginStatus() {
      try {
        const response = await fetch('/api/admin/me')
        if (response.ok) {
          const data = await response.json()
          setIsLoggedIn(!!data.user)
        } else {
          setIsLoggedIn(false)
        }
      } catch (error) {
        setIsLoggedIn(false)
      }
    }

    checkLoginStatus()
  }, [])

  const handleSearch = async (query: string) => {
    if (!query) {
      setHasSearched(false)
      setIcons(popularIcons)
      return
    }

    setHasSearched(true)
    setLoading(true)

    try {
      const params = new URLSearchParams({
        q: query,
        limit: '24',
      })

      const response = await fetch(`/api/icons/search?${params}`)
      if (!response.ok) throw new Error('Search failed')
      const data = await response.json()

      setIcons(data.icons || [])

      if (data.icons.length === 0) {
        showToast(`未找到匹配"${query}"的图标`, 'info')
      } else {
        showToast(`找到 ${data.icons.length} 个图标`, 'success')
      }
    } catch (error) {
      console.error('Search failed:', error)
      setIcons([])
      showToast('搜索失败,请检查数据库配置', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SVG 图标库</h1>
              <p className="text-gray-600 mt-1">搜索并复制 SVG 图标代码</p>
            </div>
            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <>
                  <a
                    href="/admin"
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    管理后台
                  </a>
                  <a
                    href="/admin/login"
                    onClick={(e) => {
                      e.preventDefault()
                      fetch('/api/admin/logout', { method: 'POST' }).then(() => {
                        window.location.href = '/'
                      })
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    退出登录
                  </a>
                </>
              ) : (
                <a
                  href="/admin/login"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  管理员登录
                </a>
              )}
            </div>
          </div>

          {/* 搜索框 */}
          <div className="mt-6">
            <SearchInput
              onSearch={handleSearch}
              placeholder="搜索图标 (如: 用户, 设置, 首页...)"
              autoFocus
            />
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasSearched && popularIcons.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              热门图标
            </h2>
            <SearchResultsGrid icons={popularIcons} loading={loading} />
          </div>
        )}

        {hasSearched && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              搜索结果
            </h2>
            <SearchResultsGrid icons={icons} loading={loading} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            SVG 图标库 - 快速搜索并复制图标代码
          </p>
        </div>
      </footer>
    </div>
  )
}

export default function HomePage() {
  return (
    <ToastProvider>
      <HomeContent />
    </ToastProvider>
  )
}
