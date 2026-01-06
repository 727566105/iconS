'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Provider {
  id: string
  name: string
  provider: string
  apiKey: string
  apiEndpoint: string | null
  modelId: string
  modelName: string
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

interface AIProviderListProps {
  providers: Provider[]
}

export function AIProviderList({ providers }: AIProviderListProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, string>>({})

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除配置 "${name}" 吗？`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/ai-config/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '删除失败')
      }

      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : '删除失败')
    }
  }

  const handleToggleEnabled = async (id: string, currentEnabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/ai-config/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '更新失败')
      }

      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : '更新失败')
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    setTestResults((prev) => ({ ...prev, [id]: '' }))

    try {
      const response = await fetch(`/api/admin/ai-config/${id}/test`, {
        method: 'POST',
      })

      const data = await response.json()
      setTestResults((prev) => ({
        ...prev,
        [id]: data.message,
      }))
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [id]: '连接测试失败',
      }))
    } finally {
      setTestingId(null)
    }
  }

  const getProviderDisplayName = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'OpenAI'
      case 'openai-response':
        return 'OpenAI-Response'
      case 'qwen':
        return 'AliCloud Qwen'
      default:
        return provider
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              配置名称
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              提供商
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              模型
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              创建时间
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {providers.map((provider) => (
            <tr key={provider.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {provider.name}
                </div>
                <div className="text-sm text-gray-500">
                  {provider.apiKey}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-900">
                  {getProviderDisplayName(provider.provider)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {provider.modelName}
                </div>
                <div className="text-sm text-gray-500">
                  {provider.modelId}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    provider.enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {provider.enabled ? '已启用' : '已禁用'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(provider.createdAt).toLocaleString('zh-CN')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onClick={() => handleToggleEnabled(provider.id, provider.enabled)}
                  className={`${
                    provider.enabled
                      ? 'text-yellow-600 hover:text-yellow-900'
                      : 'text-green-600 hover:text-green-900'
                  }`}
                >
                  {provider.enabled ? '禁用' : '启用'}
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => handleTest(provider.id)}
                  disabled={testingId === provider.id}
                  className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                >
                  {testingId === provider.id ? '测试中...' : '测试连接'}
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => handleDelete(provider.id, provider.name)}
                  className="text-red-600 hover:text-red-900"
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 测试结果 */}
      {Object.entries(testResults).map(([id, message]) => (
        <div
          key={id}
          className="mt-2 p-2 text-sm rounded bg-blue-50 border border-blue-200"
        >
          测试结果 ({providers.find((p) => p.id === id)?.name}): {message}
        </div>
      ))}
    </div>
  )
}
