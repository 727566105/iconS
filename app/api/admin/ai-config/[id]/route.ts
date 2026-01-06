import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth'
import {
  getProviderById,
  updateProvider,
  deleteProvider,
} from '@/lib/ai-config'

interface RouteContext {
  params: { id: string }
}

/**
 * GET /api/admin/ai-config/[id]
 * Get single AI provider configuration
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Validate admin session
    const session = await authService.validateSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const provider = await getProviderById(context.params.id)
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

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
    console.error('Failed to get AI provider:', error)
    return NextResponse.json(
      { error: 'Failed to get AI provider' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/ai-config/[id]
 * Update AI provider configuration
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // Validate admin session
    const session = await authService.validateSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Update provider
    const provider = await updateProvider(context.params.id, body)

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
    console.error('Failed to update AI provider:', error)

    // Handle not found
    if (
      error instanceof Error &&
      error.message.includes('Record to update not found')
    ) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

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
      { error: 'Failed to update AI provider' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/ai-config/[id]
 * Delete AI provider configuration
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // Validate admin session
    const session = await authService.validateSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await deleteProvider(context.params.id)

    return NextResponse.json({
      success: true,
      message: 'Provider deleted successfully',
    })
  } catch (error) {
    console.error('Failed to delete AI provider:', error)

    // Handle not found
    if (
      error instanceof Error &&
      error.message.includes('Record to delete not found')
    ) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to delete AI provider' },
      { status: 500 }
    )
  }
}
