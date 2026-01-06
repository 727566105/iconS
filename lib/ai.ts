/**
 * AliCloud Qwen API Service
 * For AI-powered icon tagging and categorization
 */

export interface QwenResponse {
  tags: string[]
  category: string
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
 * Call Qwen API to analyze SVG icon
 */
async function callQwenAPI(svgText: string): Promise<QwenResponse> {
  const apiKey = process.env.QWEN_API_KEY
  const endpoint = process.env.QWEN_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'

  if (!apiKey) {
    throw new Error('QWEN_API_KEY not configured')
  }

  const prompt = `Analyze this SVG icon and provide appropriate tags and category.

Icon description: ${svgText}

Please respond in the following JSON format only (no markdown):
{
  "tags": ["tag1", "tag2", "tag3"],
  "category": "UI Icons" | "Business" | "Social" | "Media" | "Navigation" | "Other"
}

Choose the most appropriate category from the list. Provide 3-5 relevant tags in English.`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
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
          temperature: 0.3,
          max_tokens: 150,
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
  } catch (error) {
    console.error('Qwen API call failed:', error)
    throw error
  }
}

/**
 * Analyze SVG icon and return AI-generated tags and category
 * Falls back to simple defaults if AI fails
 */
export async function analyzeIcon(svgContent: string): Promise<QwenResponse> {
  const svgText = extractSVGText(svgContent)

  console.log('Analyzing icon with AI:', svgText.substring(0, 100))

  try {
    const result = await callQwenAPI(svgText)
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

export { analyzeIcon as default }
