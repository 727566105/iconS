import Link from 'next/link'
import { prisma } from '@/lib/db'
import { IconActions } from '@/components/admin/IconActions'

interface IconsPageProps {
  searchParams: { page?: string; query?: string; status?: string }
}

async function getIcons(page: number = 1, query: string = '', status: string = '') {
  const limit = 20
  const skip = (page - 1) * limit

  const where = {
    ...(query && {
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { description: { contains: query, mode: 'insensitive' as const } },
      ],
    }),
    ...(status && { status: status as 'PUBLISHED' | 'PENDING' | 'PROCESSING' }),
  }

  const [icons, totalCount] = await Promise.all([
    prisma.icon.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          select: {
            name: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.icon.count({ where }),
  ])

  return {
    icons,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  }
}

export default async function IconsManagePage({ searchParams }: IconsPageProps) {
  const page = parseInt(searchParams.page || '1')
  const query = searchParams.query || ''
  const status = searchParams.status || ''

  const { icons, totalCount, totalPages, currentPage } = await getIcons(page, query, status)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="text-gray-700 hover:text-gray-900">
                ← 返回
              </Link>
              <h1 className="text-xl font-bold text-gray-900">图标管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-gray-900 text-sm"
              >
                返回首页
              </Link>
              <form action="/api/admin/logout" method="POST">
                <button
                  type="submit"
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  退出登录
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 搜索和筛选 */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <form className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                name="query"
                placeholder="搜索图标名称或描述..."
                defaultValue={query}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <select
                name="status"
                defaultValue={status}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">所有状态</option>
                <option value="PUBLISHED">已发布</option>
                <option value="PENDING">待处理</option>
                <option value="PROCESSING">处理中</option>
              </select>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                搜索
              </button>
              <Link
                href="/admin/icons"
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-center"
              >
                清空
              </Link>
            </form>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="mb-4 text-sm text-gray-600">
          共 {totalCount} 个图标
          {status && ` · 状态: ${status === 'PUBLISHED' ? '已发布' : status === 'PENDING' ? '待处理' : '处理中'}`}
          {query && ` · 搜索: "${query}"`}
        </div>

        {/* 图标列表 */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  图标
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  分类
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  统计
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {icons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    暂无图标
                  </td>
                </tr>
              ) : (
                icons.map((icon) => (
                  <tr key={icon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={`/icons/shard-${icon.shardId}/${icon.fileName}`}
                        alt={icon.name}
                        className="h-12 w-12 object-contain"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{icon.name}</div>
                      {icon.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {icon.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {icon.category?.name || '未分类'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        icon.status === 'PUBLISHED'
                          ? 'bg-green-100 text-green-800'
                          : icon.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {icon.status === 'PUBLISHED' ? '已发布' : icon.status === 'PENDING' ? '待处理' : '处理中'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>浏览: {icon.viewCount}</div>
                      <div>下载: {icon.downloadCount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <IconActions iconId={icon.id} iconName={icon.name} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              显示第 {(currentPage - 1) * 20 + 1} 到 {Math.min(currentPage * 20, totalCount)} 条，共 {totalCount} 条
            </div>
            <div className="flex space-x-2">
              {currentPage > 1 && (
                <Link
                  href={`/admin/icons?page=${currentPage - 1}&query=${query}&status=${status}`}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  上一页
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                .map((p, i, arr) => {
                  const prev = arr[i - 1]
                  const showEllipsis = prev && p - prev > 1

                  return (
                    <div key={p} className="flex items-center">
                      {showEllipsis && <span className="px-2 text-gray-500">...</span>}
                      <Link
                        href={`/admin/icons?page=${p}&query=${query}&status=${status}`}
                        className={`px-4 py-2 border rounded-md text-sm font-medium ${
                          p === currentPage
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </Link>
                    </div>
                  )
                })}
              {currentPage < totalPages && (
                <Link
                  href={`/admin/icons?page=${currentPage + 1}&query=${query}&status=${status}`}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  下一页
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
