import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth'
import { testProviderConnection } from '@/lib/ai-config'

interface RouteContext {
  params: { id: string }
}

/**
 * POST /api/admin/ai-config/[id]/test
 * Test AI provider connection
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Validate admin session
    const session = await authService.validateSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Test connection
    const success = await testProviderConnection(context.params.id)

    return NextResponse.json({
      success,
      message: success
        ? '连接测试成功'
        : '连接测试失败，请检查配置',
    })
  } catch (error) {
    console.error('Failed to test AI provider:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        success: false,
        message: `连接测试失败: ${errorMessage}`,
      },
      { status: 500 }
    )
  }
}
