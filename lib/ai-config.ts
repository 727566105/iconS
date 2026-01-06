/**
 * AI Provider Configuration Service
 * Manages AI provider configurations stored in database
 */

import { prisma } from './db'

export type AIProviderType = 'openai' | 'openai-response' | 'qwen' | 'deepseek'

export interface AIProviderConfig {
  id: string
  name: string
  provider: AIProviderType
  apiKey: string
  apiEndpoint: string | null
  modelId: string
  modelName: string
  enabled: boolean
  config: Record<string, any> | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateProviderDTO {
  name: string
  provider: AIProviderType
  apiKey: string
  apiEndpoint?: string
  modelId: string
  modelName: string
  enabled?: boolean
  config?: Record<string, any>
}

export interface UpdateProviderDTO {
  name?: string
  provider?: AIProviderType
  apiKey?: string
  apiEndpoint?: string
  modelId?: string
  modelName?: string
  enabled?: boolean
  config?: Record<string, any>
}

/**
 * Get all AI providers
 */
export async function getAllProviders(): Promise<AIProviderConfig[]> {
  const providers = await prisma.aIProvider.findMany({
    orderBy: [{ enabled: 'desc' }, { createdAt: 'desc' }],
  })

  return providers as unknown as AIProviderConfig[]
}

/**
 * Get enabled AI provider (only one should be enabled at a time)
 */
export async function getActiveProvider(): Promise<AIProviderConfig | null> {
  const provider = await prisma.aIProvider.findFirst({
    where: { enabled: true },
  })

  return provider as unknown as AIProviderConfig | null
}

/**
 * Get provider by ID
 */
export async function getProviderById(id: string): Promise<AIProviderConfig | null> {
  const provider = await prisma.aIProvider.findUnique({
    where: { id },
  })

  return provider as unknown as AIProviderConfig | null
}

/**
 * Create new AI provider
 */
export async function createProvider(data: CreateProviderDTO): Promise<AIProviderConfig> {
  // If this provider is enabled, disable all others
  if (data.enabled) {
    await prisma.aIProvider.updateMany({
      where: { enabled: true },
      data: { enabled: false },
    })
  }

  // Set default endpoint based on provider type
  let apiEndpoint = data.apiEndpoint
  if (!apiEndpoint) {
    switch (data.provider) {
      case 'openai':
        apiEndpoint = 'https://api.openai.com/v1'
        break
      case 'openai-response':
        apiEndpoint = 'https://api.openai.com/v1'
        break
      case 'qwen':
        apiEndpoint = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
        break
    }
  }

  const provider = await prisma.aIProvider.create({
    data: {
      name: data.name,
      provider: data.provider,
      apiKey: data.apiKey,
      apiEndpoint,
      modelId: data.modelId,
      modelName: data.modelName,
      enabled: data.enabled ?? false,
      config: data.config || {},
    },
  })

  return provider as unknown as AIProviderConfig
}

/**
 * Update existing AI provider
 */
export async function updateProvider(
  id: string,
  data: UpdateProviderDTO
): Promise<AIProviderConfig> {
  // If enabling this provider, disable all others
  if (data.enabled === true) {
    await prisma.aIProvider.updateMany({
      where: {
        enabled: true,
        id: { not: id },
      },
      data: { enabled: false },
    })
  }

  const provider = await prisma.aIProvider.update({
    where: { id },
    data,
  })

  return provider as unknown as AIProviderConfig
}

/**
 * Delete AI provider
 */
export async function deleteProvider(id: string): Promise<void> {
  await prisma.aIProvider.delete({
    where: { id },
  })
}

/**
 * Test AI provider connection
 */
export async function testProviderConnection(id: string): Promise<boolean> {
  const provider = await getProviderById(id)
  if (!provider) {
    throw new Error('Provider not found')
  }

  try {
    switch (provider.provider) {
      case 'openai':
      case 'openai-response':
      case 'deepseek':
        return await testOpenAIConnection(provider)
      case 'qwen':
        return await testQwenConnection(provider)
      default:
        throw new Error(`Unknown provider type: ${provider.provider}`)
    }
  } catch (error) {
    console.error('Provider connection test failed:', error)
    return false
  }
}

/**
 * Test OpenAI-compatible API connection
 */
async function testOpenAIConnection(provider: AIProviderConfig): Promise<boolean> {
  const endpoint = provider.apiEndpoint || 'https://api.openai.com/v1'

  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.modelId,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5,
    }),
  })

  return response.ok
}

/**
 * Test Qwen API connection
 */
async function testQwenConnection(provider: AIProviderConfig): Promise<boolean> {
  const endpoint =
    provider.apiEndpoint ||
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.modelId,
      input: {
        messages: [
          {
            role: 'user',
            content: 'Hi',
          },
        ],
      },
      parameters: {
        result_format: 'message',
        max_tokens: 5,
      },
    }),
  })

  return response.ok
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(data: CreateProviderDTO): string | null {
  if (!data.name || data.name.trim().length === 0) {
    return '配置名称不能为空'
  }

  if (!data.apiKey || data.apiKey.trim().length === 0) {
    return 'API 密钥不能为空'
  }

  if (!data.modelId || data.modelId.trim().length === 0) {
    return '模型 ID 不能为空'
  }

  if (!data.modelName || data.modelName.trim().length === 0) {
    return '模型名称不能为空'
  }

  // Provider-specific validation
  switch (data.provider) {
    case 'openai':
      if (!data.apiKey.startsWith('sk-')) {
        return 'OpenAI API 密钥格式无效（应以 sk- 开头）'
      }
      break
    case 'qwen':
      if (data.apiKey.length < 20) {
        return 'Qwen API 密钥格式无效'
      }
      break
  }

  return null
}
