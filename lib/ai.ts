/**
 * Multi-Provider AI Service
 * Supports OpenAI, OpenAI-Response, and Qwen for icon tagging and categorization
 */

import { getActiveProvider } from './ai-config'

export interface AIAnalysisResult {
  tags: string[]
  category: string
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

interface QwenAPIResponse {
  output: {
    text: string
  }
  usage?: {
    total_tokens: number
  }
}

/**
 * Extract readable text from SVG for AI analysis
 */
function extractSVGText(svgContent: string): string {
  // Remove XML declarations and DOCTYPE
  let cleaned = svgContent
    .replace(/<\?xml[^?]*\?>/g, '')
    .replace(/<!DOCTYPE[^>]*>/g, '')

  // Extract class names, IDs, and titles (these often describe the icon)
  const classes = cleaned.match(/class="([^"]*)"/g) || []
  const ids = cleaned.match(/id="([^"]*)"/g) || []
  const titles = cleaned.match(/<title[^>]*>([^<]*)<\/title>/g) || []
  const descriptions = cleaned.match(/<desc[^>]*>([^<]*)<\/desc>/g) || []

  const parts = [
    ...classes.map((m) => m.replace(/class="([^"]*)"/, '$1').replace(/-/g, ' ')),
    ...ids.map((m) => m.replace(/id="([^"]*)"/, '$1').replace(/-/g, ' ')),
    ...titles.map((m) => m.replace(/<title[^>]*>([^<]*)<\/title>/, '$1')),
    ...descriptions.map((m) => m.replace(/<desc[^>]*>([^<]*)<\/desc>/, '$1')),
  ]

  // Also include basic SVG structure info
  const hasCircle = cleaned.includes('<circle')
  const hasRect = cleaned.includes('<rect')
  const hasPath = cleaned.includes('<path')
  const hasLine = cleaned.includes('<line')

  parts.push('SVG icon')
  if (hasCircle) parts.push('circle')
  if (hasRect) parts.push('rectangle')
  if (hasPath) parts.push('path')
  if (hasLine) parts.push('line')

  return parts.join(' ').substring(0, 500) // Limit to 500 chars
}

/**
 * Call OpenAI API to analyze SVG icon
 */
async function callOpenAIAPI(
  provider: any,
  svgText: string
): Promise<AIAnalysisResult> {
  const endpoint = provider.apiEndpoint || 'https://api.openai.com/v1'
  const prompt = `Analyze this SVG icon and provide appropriate tags and category.

Icon description: ${svgText}

Please respond in the following JSON format only (no markdown):
{
  "tags": ["tag1", "tag2", "tag3"],
  "category": "UI Icons" | "Business" | "Social" | "Media" | "Navigation" | "Other"
}

Choose the most appropriate category from the list. Provide 3-5 relevant tags in English.`

  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.modelId,
      messages: [
        {
          role: 'system',
          content: 'You are an icon tagging assistant. Respond only with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: provider.config?.temperature || 0.3,
      max_tokens: provider.config?.maxTokens || 150,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
  }

  const data: OpenAIResponse = await response.json()
  const content = data.choices[0]?.message?.content || '{}'

  // Parse JSON response (handle markdown code blocks)
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json\n?/, '').replace(/```\n?$/, '')
  }

  const parsed = JSON.parse(jsonStr)

  return {
    tags: Array.isArray(parsed.tags) ? parsed.tags : ['icon'],
    category: parsed.category || 'Other',
  }
}

/**
 * Call Qwen API to analyze SVG icon
 */
async function callQwenAPI(
  provider: any,
  svgText: string
): Promise<AIAnalysisResult> {
  const endpoint =
    provider.apiEndpoint ||
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
  const prompt = `Analyze this SVG icon and provide appropriate tags and category.

Icon description: ${svgText}

Please respond in the following JSON format only (no markdown):
{
  "tags": ["tag1", "tag2", "tag3"],
  "category": "UI Icons" | "Business" | "Social" | "Media" | "Navigation" | "Other"
}

Choose the most appropriate category from the list. Provide 3-5 relevant tags in English.`

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
            role: 'system',
            content: 'You are an icon tagging assistant. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
      parameters: {
        result_format: 'message',
        temperature: provider.config?.temperature || 0.3,
        max_tokens: provider.config?.maxTokens || 150,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Qwen API error: ${response.status} - ${errorText}`)
  }

  const data: QwenAPIResponse = await response.json()
  const content = data.output?.text || '{}'

  // Parse JSON response (handle markdown code blocks)
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json\n?/, '').replace(/```\n?$/, '')
  }

  const parsed = JSON.parse(jsonStr)

  return {
    tags: Array.isArray(parsed.tags) ? parsed.tags : ['icon'],
    category: parsed.category || 'Other',
  }
}

/**
 * Call appropriate AI provider API
 */
async function callAIAPI(svgText: string): Promise<AIAnalysisResult> {
  const provider = await getActiveProvider()

  if (!provider) {
    throw new Error('No active AI provider configured')
  }

  console.log(`Using AI provider: ${provider.provider} (${provider.modelName})`)

  switch (provider.provider) {
    case 'openai':
    case 'openai-response':
      return await callOpenAIAPI(provider, svgText)
    case 'qwen':
      return await callQwenAPI(provider, svgText)
    default:
      throw new Error(`Unknown AI provider type: ${provider.provider}`)
  }
}

/**
 * Analyze SVG icon and return AI-generated tags and category
 * Falls back to simple defaults if AI fails or no provider configured
 */
export async function analyzeIcon(
  svgContent: string
): Promise<AIAnalysisResult> {
  const svgText = extractSVGText(svgContent)

  console.log('Analyzing icon with AI:', svgText.substring(0, 100))

  try {
    const result = await callAIAPI(svgText)
    console.log('AI analysis result:', result)
    return result
  } catch (error) {
    console.error('AI analysis failed, using fallback:', error)

    // Fallback to simple keyword-based categorization
    const text = svgText.toLowerCase()

    // Simple keyword matching for fallback
    const keywordMap: Record<string, { tags: string[]; category: string }> = {
      home: { tags: ['home', 'house', 'building'], category: 'Navigation' },
      search: { tags: ['search', 'find', 'magnifier'], category: 'Navigation' },
      user: { tags: ['user', 'person', 'profile'], category: 'UI Icons' },
      settings: { tags: ['settings', 'gear', 'config'], category: 'UI Icons' },
      arrow: { tags: ['arrow', 'direction', 'pointer'], category: 'Navigation' },
      chart: { tags: ['chart', 'graph', 'analytics'], category: 'Business' },
      facebook: { tags: ['facebook', 'social', 'media'], category: 'Social' },
      twitter: { tags: ['twitter', 'social', 'media'], category: 'Social' },
    }

    for (const [keyword, data] of Object.entries(keywordMap)) {
      if (text.includes(keyword)) {
        return data
      }
    }

    // Default fallback
    return {
      tags: ['icon', 'svg'],
      category: 'Other',
    }
  }
}

/**
 * Check if AI provider is configured
 */
export async function isAIConfigured(): Promise<boolean> {
  const provider = await getActiveProvider()
  return provider !== null
}

export { analyzeIcon as default }
