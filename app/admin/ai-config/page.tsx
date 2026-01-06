import Link from 'next/link'
import { prisma } from '@/lib/db'
import { AIProviderForm } from '@/components/admin/AIProviderForm'
import { AIProviderList } from '@/components/admin/AIProviderList'

export default async function AIConfigPage() {
  // 获取所有 AI 提供商配置
  const providers = await prisma.aIProvider.findMany({
    orderBy: [{ enabled: 'desc' }, { createdAt: 'desc' }],
  })

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
              <h1 className="text-xl font-bold text-gray-900">AI 配置管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-gray-900 text-sm"
              >
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 说明文字 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1 md:flex md:justify-between">
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">
                  配置大模型后才能进行图标识别
                </p>
                <p className="text-blue-600">
                  支持 OpenAI、OpenAI-Response（兼容服务）和 AliCloud
                  Qwen。只有启用的配置才会被使用。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 新建配置表单 */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              新建 AI 配置
            </h2>
          </div>
          <div className="px-4 py-5 sm:px-6">
            <AIProviderForm />
          </div>
        </div>

        {/* 配置列表 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              已配置的 AI 提供商 ({providers.length})
            </h2>
          </div>
          <div className="px-4 py-5 sm:px-6">
            {providers.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  暂无配置
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  请先创建一个 AI 提供商配置
                </p>
              </div>
            ) : (
              <AIProviderList providers={providers} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
