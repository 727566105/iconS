import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { storageService } from '@/lib/storage'

/**
 * GET /api/icons/[id]/svg
 * Get SVG content as text
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const icon = await prisma.icon.findUnique({
      where: { id: params.id },
    })

    if (!icon) {
      return NextResponse.json({ error: 'Icon not found' }, { status: 404 })
    }

    // 读取 SVG 文件
    const svgContent = await storageService.readIcon(icon.id, icon.fileName, icon.shardId)

    // 返回 SVG 内容
    return new NextResponse(svgContent, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000', // 1年缓存
      },
    })
  } catch (error) {
    console.error('Failed to get SVG:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
