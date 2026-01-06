'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ProviderType = 'openai' | 'openai-response' | 'qwen' | 'deepseek'

export function AIProviderForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    provider: 'qwen' as ProviderType,
    apiKey: '',
    apiEndpoint: '',
    modelId: 'qwen-turbo',
    modelName: 'Qwen Turbo',
    enabled: false,
  })

  const handleProviderChange = (
    provider: ProviderType
  ) => {
    setFormData((prev) => ({
      ...prev,
      provider,
      // 根据提供商设置默认值
      ...(provider === 'openai' && {
        modelId: 'gpt-4',
        modelName: 'GPT-4',
        apiEndpoint: 'https://api.openai.com/v1',
      }),
      ...(provider === 'openai-response' && {
        modelId: 'gpt-3.5-turbo',
        modelName: 'GPT-3.5 Turbo',
        apiEndpoint: '',
      }),
      ...(provider === 'qwen' && {
        modelId: 'qwen-turbo',
        modelName: 'Qwen Turbo',
        apiEndpoint:
          'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      }),
      ...(provider === 'deepseek' && {
        modelId: 'deepseek-chat',
        modelName: 'DeepSeek Chat',
        apiEndpoint: 'https://api.deepseek.com/v1',
      }),
    }))
    setTestResult(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '创建配置失败')
      }

      // 重置表单
      setFormData({
        name: '',
        provider: 'qwen',
        apiKey: '',
        apiEndpoint: '',
        modelId: 'qwen-turbo',
        modelName: 'Qwen Turbo',
        enabled: false,
      })

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTest = async () => {
    // 首先需要创建配置才能测试
    if (!formData.name || !formData.apiKey) {
      setError('请先填写配置名称和 API 密钥')
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      // 先创建配置
      const createResponse = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!createResponse.ok) {
        const data = await createResponse.json()
        throw new Error(data.error || '创建配置失败')
      }

      const createData = await createResponse.json()
      const providerId = createData.provider.id

      // 测试连接
      const testResponse = await fetch(
        `/api/admin/ai-config/${providerId}/test`,
        {
          method: 'POST',
        }
      )

      const testData = await testResponse.json()
      setTestResult({
        success: testData.success,
        message: testData.message,
      })

      // 刷新页面
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setTesting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {testResult && (
        <div
          className={`border px-4 py-3 rounded ${
            testResult.success
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-yellow-50 border-yellow-200 text-yellow-700'
          }`}
        >
          {testResult.message}
        </div>
      )}

      {/* 配置名称 */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          配置名称 *
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="例如: default, backup, qwen-primary"
        />
      </div>

      {/* 提供商选择 */}
      <div>
        <label
          htmlFor="provider"
          className="block text-sm font-medium text-gray-700"
        >
          提供商 *
        </label>
        <select
          id="provider"
          value={formData.provider}
          onChange={(e) =>
            handleProviderChange(e.target.value as ProviderType)
          }
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="openai">OpenAI</option>
          <option value="openai-response">OpenAI-Response (兼容)</option>
          <option value="qwen">AliCloud Qwen</option>
          <option value="deepseek">DeepSeek</option>
        </select>
      </div>

      {/* API 密钥 */}
      <div>
        <label
          htmlFor="apiKey"
          className="block text-sm font-medium text-gray-700"
        >
          API 密钥 *
        </label>
        <input
          type="password"
          id="apiKey"
          required
          value={formData.apiKey}
          onChange={(e) =>
            setFormData({ ...formData, apiKey: e.target.value })
          }
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="sk-... 或你的 API 密钥"
        />
      </div>

      {/* API 地址 */}
      <div>
        <label
          htmlFor="apiEndpoint"
          className="block text-sm font-medium text-gray-700"
        >
          API 地址 {formData.provider !== 'openai' && '(可选)'}
        </label>
        <input
          type="text"
          id="apiEndpoint"
          required={formData.provider === 'openai'}
          value={formData.apiEndpoint}
          onChange={(e) =>
            setFormData({ ...formData, apiEndpoint: e.target.value })
          }
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={(() => {
            switch (formData.provider) {
              case 'openai':
                return 'https://api.openai.com/v1'
              case 'qwen':
                return 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
              case 'deepseek':
                return 'https://api.deepseek.com/v1'
              default:
                return '自定义 API 地址'
            }
          })()}
        />
      </div>

      {/* 模型 ID */}
      <div>
        <label
          htmlFor="modelId"
          className="block text-sm font-medium text-gray-700"
        >
          模型 ID *
        </label>
        <input
          type="text"
          id="modelId"
          required
          value={formData.modelId}
          onChange={(e) =>
            setFormData({ ...formData, modelId: e.target.value })
          }
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="gpt-4, qwen-turbo 等"
        />
      </div>

      {/* 模型名称 */}
      <div>
        <label
          htmlFor="modelName"
          className="block text-sm font-medium text-gray-700"
        >
          模型名称 (显示用) *
        </label>
        <input
          type="text"
          id="modelName"
          required
          value={formData.modelName}
          onChange={(e) =>
            setFormData({ ...formData, modelName: e.target.value })
          }
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="GPT-4, Qwen Turbo 等"
        />
      </div>

      {/* 启用开关 */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="enabled"
          checked={formData.enabled}
          onChange={(e) =>
            setFormData({ ...formData, enabled: e.target.checked })
          }
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label
          htmlFor="enabled"
          className="ml-2 block text-sm text-gray-900"
        >
          启用此配置（将禁用其他已启用的配置）
        </label>
      </div>

      {/* 操作按钮 */}
      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={submitting || testing}
          className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '创建中...' : '创建配置'}
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || submitting}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? '测试中...' : '保存并测试连接'}
        </button>
      </div>
    </form>
  )
}
