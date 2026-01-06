import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth'
import {
  getAllProviders,
  createProvider,
  validateProviderConfig,
} from '@/lib/ai-config'

/**
 * GET /api/admin/ai-config
 * Get all AI provider configurations
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const session = await authService.validateSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const providers = await getAllProviders()

    // Don't expose full API keys in the response
    const sanitizedProviders = providers.map((p) => ({
      ...p,
      apiKey: p.apiKey.substring(0, 8) + '...',
    }))

    return NextResponse.json({
      success: true,
      providers: sanitizedProviders,
    })
  } catch (error) {
    console.error('Failed to get AI providers:', error)
    return NextResponse.json(
      { error: 'Failed to get AI providers' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/ai-config
 * Create new AI provider configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin session
    const session = await authService.validateSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request body
    const validationError = validateProviderConfig(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Create provider
    const provider = await createProvider(body)

    // Don't expose full API key
    const sanitizedProvider = {
      ...provider,
      apiKey: provider.apiKey.substring(0, 8) + '...',
    }

    return NextResponse.json({
      success: true,
      provider: sanitizedProvider,
    })
  } catch (error) {
    console.error('Failed to create AI provider:', error)

    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: '配置名称已存在' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create AI provider' },
      { status: 500 }
    )
  }
}
